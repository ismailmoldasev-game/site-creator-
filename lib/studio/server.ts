import { env } from 'cloudflare:workers';
import { APIError } from './errors';
export { APIError } from './errors';
import { credentialKey, type StudioAccount } from './accounts';
import { freshProject, projectSchema, type Project } from './model';
import { validateDefinitionHTML } from './render';
export const database = () => {
  if (!env.DB) throw new Error('Хранилище проекта не подключено');
  return env.DB;
};
export async function readProject(account: StudioAccount) {
  const db = database();
  let row = await db
    .prepare('SELECT document,revision,updated_at FROM studio_projects WHERE id=?')
    .bind(account.projectId)
    .first<{ document: string; revision: number; updated_at: string }>();
  if (!row) {
    await db
      .prepare(
        'INSERT OR IGNORE INTO studio_projects (id,document,revision,updated_at) VALUES (?,?,?,?)',
      )
      .bind(account.projectId, JSON.stringify(freshProject()), 1, new Date().toISOString())
      .run();
    row = await db
      .prepare('SELECT document,revision,updated_at FROM studio_projects WHERE id=?')
      .bind(account.projectId)
      .first();
  }
  if (!row) throw new Error('Не удалось открыть проект');
  return {
    project: projectSchema.parse(JSON.parse(row.document)),
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}
export async function writeProject(account: StudioAccount, project: Project, revision: number) {
  const p = projectSchema.parse(project);
  p.library.forEach((definition) => validateDefinitionHTML(definition.html));
  const now = new Date().toISOString();
  const result = await database()
    .prepare(
      'UPDATE studio_projects SET document=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',
    )
    .bind(JSON.stringify(p), now, account.projectId, revision)
    .run();
  if (!result.meta.changes)
    throw new APIError(
      'Проект изменён в другой вкладке. Скачайте резервную копию своих правок и загрузите свежую версию.',
      409,
    );
  return { revision: revision + 1, updatedAt: now };
}
export function replyError(e: unknown) {
  const status = e instanceof APIError ? e.status : 400;
  let message = e instanceof Error ? e.message : 'Не удалось выполнить действие';
  if (e && typeof e === 'object' && 'issues' in e)
    message = (e as { issues: { message: string }[] }).issues
      .map((i) => i.message)
      .slice(0, 3)
      .join('. ');
  return Response.json(
    { error: message.slice(0, 500), code: e instanceof APIError ? e.code : undefined },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export async function readBody(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    throw new APIError('Запрос с другого сайта отклонён', 403);
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new APIError('Ожидается JSON', 415);
  const body = await req.text();
  if (body.length > 4_000_000)
    throw new APIError('Проект слишком большой. Уменьшите изображения.', 413);
  return JSON.parse(body);
}
const runtime = env as unknown as Record<string, string | undefined>;
async function secretKey() {
  const s = runtime.STUDIO_ENCRYPTION_KEY;
  if (!s)
    throw new APIError(
      'Для сохранения ключей нужен STUDIO_ENCRYPTION_KEY в настройках сервера.',
      503,
    );
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
export async function putSecret(account: StudioAccount, provider: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await secretKey(),
    new TextEncoder().encode(value),
  );
  const bytes = new Uint8Array(12 + cipher.byteLength);
  bytes.set(iv);
  bytes.set(new Uint8Array(cipher), 12);
  const encoded = btoa(String.fromCharCode(...bytes));
  await database()
    .prepare(
      'INSERT INTO studio_credentials (provider,ciphertext,updated_at) VALUES (?,?,?) ON CONFLICT(provider) DO UPDATE SET ciphertext=excluded.ciphertext,updated_at=excluded.updated_at',
    )
    .bind(credentialKey(account, provider), encoded, new Date().toISOString())
    .run();
}
export async function getSecret(account: StudioAccount, provider: string) {
  const row = await database()
    .prepare('SELECT ciphertext FROM studio_credentials WHERE provider=?')
    .bind(credentialKey(account, provider))
    .first<{ ciphertext: string }>();
  if (!row) return null;
  const bytes = Uint8Array.from(atob(row.ciphertext), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    await secretKey(),
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}
export async function connectionState(account: StudioAccount) {
  const rows = await database()
    .prepare('SELECT provider FROM studio_credentials WHERE provider IN (?,?)')
    .bind(credentialKey(account, 'github'), credentialKey(account, 'openai'))
    .all<{ provider: string }>();
  return {
    github: rows.results.some((r) => r.provider === credentialKey(account, 'github')),
    openai: rows.results.some((r) => r.provider === credentialKey(account, 'openai')),
    vault: !!runtime.STUDIO_ENCRYPTION_KEY,
  };
}
export async function githubFetch(path: string, token: string, method = 'GET', body?: unknown) {
  const r = await fetch('https://api.github.com' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Site-Studio',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) {
    if (r.status === 404)
      throw new APIError('Репозиторий или ветка не найдены. Проверьте доступ токена.', 404);
    if (r.status === 401 || r.status === 403)
      throw new APIError(
        'GitHub отклонил доступ. Проверьте токен и разрешения Contents / Pages.',
        r.status,
      );
    throw new APIError('Ошибка GitHub (' + r.status + '). Повторите действие позже.', 502);
  }
  return r.status === 204 ? {} : ((await r.json()) as Record<string, any>);
}
export async function commitFiles(
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  token: string,
  message: string,
  replace = false,
) {
  if (['main', 'master'].includes(branch))
    throw new APIError('Для публикации используйте отдельную ветку, например gh-pages.');
  if (replace && branch === 'studio-content')
    throw new APIError('Ветка studio-content хранит черновик. Для публикации выберите gh-pages.');
  const info = await githubFetch('/repos/' + repo, token);
  if (replace && branch === info.default_branch)
    throw new APIError('Ветка публикации должна отличаться от основной ветки репозитория.');
  let ref;
  try {
    ref = await githubFetch(`/repos/${repo}/git/ref/heads/${branch}`, token);
  } catch (e) {
    if (!(e instanceof APIError) || e.status !== 404) throw e;
    const base = await githubFetch(`/repos/${repo}/git/ref/heads/${info.default_branch}`, token);
    ref = { object: base.object };
    await githubFetch(`/repos/${repo}/git/refs`, token, 'POST', {
      ref: 'refs/heads/' + branch,
      sha: base.object.sha,
    });
  }
  const parent = await githubFetch(`/repos/${repo}/git/commits/${ref.object.sha}`, token);
  const tree = await githubFetch(`/repos/${repo}/git/trees`, token, 'POST', {
    ...(replace ? {} : { base_tree: parent.tree.sha }),
    tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
  });
  const commit = await githubFetch(`/repos/${repo}/git/commits`, token, 'POST', {
    message,
    tree: tree.sha,
    parents: [ref.object.sha],
  });
  await githubFetch(`/repos/${repo}/git/refs/heads/${branch}`, token, 'PATCH', {
    sha: commit.sha,
    force: false,
  });
  return commit.sha as string;
}
