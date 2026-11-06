import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as modules from 'node:module';
import { freshProject } from '../lib/studio/model';
import { publicSiteFiles } from '../lib/studio/render';
import { resolveAccount } from '../lib/studio/accounts';
import { chatGPTSignInPath } from '../lib/studio/auth-paths';
import { sql, env, requestContext, migrateAccounts } from './auth-fixture';

(modules as any).registerHooks({
  resolve(specifier: string, context: any, next: any) {
    if (specifier === 'cloudflare:workers' || specifier === 'next/headers')
      return { url: new URL('./auth-fixture.ts', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
});
const original = freshProject();
original.name = 'Preserve this existing site';
original.pages[0].blocks[0].values.title = 'Owner private content';
const originalJSON = JSON.stringify(original);
sql
  .prepare('INSERT INTO studio_projects VALUES (?,?,?,?)')
  .run('main', originalJSON, 1731, '2026-11-04');
sql
  .prepare('INSERT INTO studio_versions (id,document,created_at,kind) VALUES (?,?,?,?)')
  .run('old-backup', originalJSON, '2026-11-04', 'snapshot');
migrateAccounts();
const routes: Record<string, any> = {};
for (const name of [
  'account',
  'studio',
  'history',
  'connection',
  'publish',
  'export',
  'sync',
  'generate',
  'domain',
])
  routes[name] = await import('../app/api/' + name + '/route.ts');
const draft = await import('../app/[file]/route');
const server = await import('../lib/studio/server');
const identity = (id: string, email: string) => ({
  userId: id,
  email,
  displayName: email,
  fullName: null,
});
const owner = identity('owner-stable-id', 'owner@example.test');
const visitor = identity('visitor-id', 'visitor@example.test');
const authenticated = (user: typeof owner | null) =>
  new Headers(
    user
      ? { 'oai-authenticated-user-id': user.userId, 'oai-authenticated-user-email': user.email }
      : {},
  );
async function call(
  route: string,
  method: string,
  user: typeof owner | null,
  body?: any,
  query = '',
  expected = user?.userId || '',
) {
  const headers = new Headers({
    'X-Studio-Account': expected,
    'Content-Type': 'application/json',
    Origin: 'https://studio.test',
  });
  const request = new Request('https://studio.test/api/' + route + query, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return requestContext.run(authenticated(user), () =>
    routes[route][method](request),
  ) as Promise<Response>;
}

test('all private API methods reject anonymous requests before any data or external effect', async () => {
  for (const [name, route] of Object.entries(routes))
    for (const method of ['GET', 'PUT', 'POST', 'DELETE'])
      if (route[method]) {
        const response = await call(name, method, null, method === 'GET' ? undefined : {});
        assert.equal(response.status, 401, name + ':' + method);
        assert.equal(((await response.json()) as { code: string }).code, 'AUTH_REQUIRED');
      }
  assert.equal(sql.prepare('SELECT count(*) AS n FROM studio_accounts').get()!.n, 0);
});

test('first registered stranger cannot claim existing project; owner keeps exact document, revision and history', async () => {
  const b = await resolveAccount(env.DB, visitor, env.STUDIO_LEGACY_OWNER_EMAIL);
  assert.equal(b.projectId, 'user:visitor-id');
  const a = await resolveAccount(env.DB, owner, env.STUDIO_LEGACY_OWNER_EMAIL);
  assert.equal(a.projectId, 'main');
  const row = sql.prepare('SELECT * FROM studio_projects WHERE id=?').get('main')!;
  assert.equal(row.document, originalJSON);
  assert.equal(row.revision, 1731);
  assert.equal(
    sql.prepare('SELECT project_id FROM studio_versions WHERE id=?').get('old-backup')!.project_id,
    'main',
  );
  await assert.rejects(
    resolveAccount(env.DB, identity('different-id', owner.email), env.STUDIO_LEGACY_OWNER_EMAIL),
    /закреплён/,
  );
});

test('account binding persists after email changes and missing bootstrap config fails closed', async () => {
  assert.equal(
    (await resolveAccount(env.DB, { ...owner, email: 'changed@example.test' }, undefined))
      .projectId,
    'main',
  );
  await assert.rejects(
    resolveAccount(env.DB, identity('new-id', 'new@example.test'), undefined),
    /не настроен/,
  );
});

test('each signed-in account reads, edits, backs up and exports only its own project', async () => {
  const a = (await (await call('studio', 'GET', owner)).json()) as {
    project: ReturnType<typeof freshProject>;
  };
  const b = (await (await call('studio', 'GET', visitor)).json()) as {
    project: ReturnType<typeof freshProject>;
    revision: number;
  };
  assert.equal(a.project.name, original.name);
  assert.notEqual(b.project.name, original.name);
  b.project.name = 'Visitor site';
  assert.equal(
    (
      await call('studio', 'PUT', visitor, {
        project: b.project,
        revision: b.revision,
        projectId: 'main',
      })
    ).status,
    200,
  );
  assert.equal(
    sql.prepare('SELECT document FROM studio_projects WHERE id=?').get('main')!.document,
    originalJSON,
  );
  assert.equal((await call('history', 'GET', visitor, undefined, '?id=old-backup')).status, 404);
  assert.deepEqual(await (await call('history', 'GET', visitor)).json(), []);
  const saved = (await (await call('history', 'POST', visitor, {})).json()) as { id: string };
  assert.equal((await call('history', 'GET', owner, undefined, '?id=' + saved.id)).status, 404);
  const exported = JSON.stringify(await (await call('export', 'GET', visitor)).json());
  assert.ok(!exported.includes(original.name));
});

test('stale tabs and forged account headers cannot save, publish, disconnect or read as another account', async () => {
  for (const [name, route] of Object.entries(routes))
    for (const method of ['GET', 'PUT', 'POST', 'DELETE'])
      if (route[method]) {
        const response = await call(
          name,
          method,
          visitor,
          method === 'GET' ? undefined : {},
          '',
          owner.userId,
        );
        assert.equal(response.status, 403, name + ':' + method);
        assert.equal(((await response.json()) as { code: string }).code, 'ACCOUNT_CHANGED');
      }
  assert.equal((await call('studio', 'GET', null, undefined, '', owner.userId)).status, 401);
});

test('encrypted credentials, connection indicators and disconnect are account-scoped', async () => {
  const a = await resolveAccount(env.DB, owner, env.STUDIO_LEGACY_OWNER_EMAIL);
  const b = await resolveAccount(env.DB, visitor, env.STUDIO_LEGACY_OWNER_EMAIL);
  await server.putSecret(a, 'github', 'owner-private-test-token');
  assert.equal(await server.getSecret(b, 'github'), null);
  assert.equal((await server.connectionState(b)).github, false);
  await server.putSecret(b, 'github', 'visitor-private-test-token');
  assert.equal((await call('connection', 'DELETE', visitor, { provider: 'github' })).status, 200);
  assert.equal(await server.getSecret(a, 'github'), 'owner-private-test-token');
  assert.equal(await server.getSecret(b, 'github'), null);
});

test('draft HTML is private and cannot expose the owner site through a public-looking URL', async () => {
  const req = new Request('https://studio.test/index.html');
  const response = await requestContext.run(new Headers(), () =>
    draft.GET(req, { params: Promise.resolve({ file: 'index.html' }) }),
  );
  assert.equal(response.status, 401);
  const responseB = await requestContext.run(authenticated(visitor), () =>
    draft.GET(req, { params: Promise.resolve({ file: 'index.html' }) }),
  );
  assert.ok(!(await responseB.text()).includes(original.name));
});

test('cross-origin authenticated write is rejected and public publication excludes editor project data', async () => {
  const req = new Request('https://studio.test/api/studio', {
    method: 'PUT',
    headers: {
      Origin: 'https://attacker.test',
      'Content-Type': 'application/json',
      'X-Studio-Account': owner.userId,
    },
    body: JSON.stringify({ project: original, revision: 1731 }),
  });
  assert.equal(
    (await requestContext.run(authenticated(owner), () => routes.studio.PUT(req))).status,
    403,
  );
  const files = publicSiteFiles(original);
  assert.ok(files.some((f) => f.path === 'index.html'));
  assert.ok(!files.some((f) => f.path === 'project.json' || f.path.startsWith('blocks/')));
  assert.equal(
    sql.prepare('SELECT document FROM studio_projects WHERE id=?').get('main')!.document,
    originalJSON,
  );
});

test('sign-in return paths preserve editor location and reject external redirect targets', () => {
  assert.equal(
    chatGPTSignInPath('/?section=editor&page=abc'),
    '/signin-with-chatgpt?return_to=%2F%3Fsection%3Deditor%26page%3Dabc',
  );
  for (const path of ['https://attacker.test', '//attacker.test', '/\\attacker.test', '/callback'])
    assert.equal(chatGPTSignInPath(path), '/signin-with-chatgpt?return_to=%2F');
});
