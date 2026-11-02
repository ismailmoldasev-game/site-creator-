import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshProject,
  clonePage,
  makeBlock,
  projectSchema,
  builtin,
  uid,
} from '../lib/studio/model';
import {
  renderPage,
  renderBlock,
  safeURL,
  safeImage,
  validateDefinitionHTML,
  projectFiles,
} from '../lib/studio/render';
import { zipFiles } from '../lib/studio/client';
test('new projects have distinct IDs and copies do not share content', () => {
  const p = freshProject();
  assert.ok(projectSchema.safeParse(p).success);
  const copy = clonePage(p.pages[0]);
  copy.blocks[0].values.title = 'Другая история';
  assert.notEqual(copy.blocks[0].id, p.pages[0].blocks[0].id);
  assert.notEqual(copy.blocks[0].values.title, p.pages[0].blocks[0].values.title);
  assert.notEqual(freshProject().pages[0].id, p.pages[0].id);
});
test('schema rejects conflicting slugs, duplicate IDs and missing home page', () => {
  const p = freshProject(),
    copy = clonePage(p.pages[0]);
  copy.slug = '';
  p.pages.push(copy);
  assert.equal(projectSchema.safeParse(p).success, false);
  copy.slug = 'about';
  copy.blocks[0].id = p.pages[0].blocks[0].id;
  assert.equal(projectSchema.safeParse(p).success, false);
  copy.blocks[0].id = uid();
  p.pages[0].slug = 'home';
  assert.equal(projectSchema.safeParse(p).success, false);
});
test('render escapes field values, unsafe links and image URLs', () => {
  const p = freshProject(),
    b = p.pages[0].blocks[0];
  b.values.title = '</h1><script>alert(1)</script>';
  b.values.href = 'javascript:alert(1)';
  b.values.image = 'data:text/html;base64,abcd';
  const h = renderBlock(b, p);
  assert.ok(h.includes('&lt;script&gt;'));
  assert.ok(!h.includes('<script>'));
  assert.ok(!h.includes('javascript:'));
  assert.ok(!h.includes('data:text/html'));
  assert.equal(safeURL('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(safeURL('javascript:alert(1)'), '#');
  assert.equal(safeURL('about.html'), 'about.html');
  assert.equal(safeImage('http://insecure.example/a.png'), '');
});
test('custom HTML cannot add active code, event handlers or external styles', () => {
  for (const h of [
    '<script>alert(1)</script>',
    '<div onclick = "alert(1)">Hi</div>',
    '<iframe src="https://example.com"></iframe>',
    '<style>@import "https://example.com";</style>',
    '<svg onload="alert(1)"></svg>',
    '<meta http-equiv="refresh" content="0;url=https://example.com">',
  ])
    assert.throws(() => validateDefinitionHTML(h));
  assert.equal(
    validateDefinitionHTML('<section class="custom"><h2>{{title}}</h2></section>'),
    '<section class="custom"><h2>{{title}}</h2></section>',
  );
});
test('export contains only visible blocks, safe CSP, page metadata, code and domain', () => {
  const p = freshProject();
  p.pages[0].blocks[1].hidden = true;
  p.pages[0].description = 'Описание <script>';
  p.github.domain = 'example.kz';
  const html = renderPage(p, p.pages[0]);
  assert.ok(html.includes("script-src 'nonce-"));
  assert.ok(html.includes('<script nonce='));
  assert.ok(!html.includes('unsafe-eval'));
  assert.ok(!html.includes(p.pages[0].blocks[1].values.title));
  assert.ok(html.includes('Описание &lt;script&gt;'));
  assert.ok(!html.includes("studio:'select"));
  p.library.push({
    id: 'ai-test',
    name: 'Мой блок',
    category: 'Мои блоки',
    description: 'Тест',
    html: '<h2>{{title}}</h2>',
    fields: [{ key: 'title', label: 'Заголовок', type: 'text', default: 'Привет' }],
  });
  assert.equal(makeBlock('ai-test', p.library).values.title, 'Привет');
  const f = projectFiles(p);
  assert.ok(f.some((x) => x.path === 'blocks/ai-test/block.html'));
  assert.equal(f.find((x) => x.path === 'CNAME')?.content, 'example.kz\n');
  assert.ok(!JSON.stringify(f).includes('ciphertext'));
});
test('editor frames include only nonce-authorized editing script', () => {
  const p = freshProject();
  const html = renderPage(p, p.pages[0], true, p.pages[0].blocks[0].id);
  assert.ok(html.includes('class="studio-block is-selected"'));
  assert.ok(html.includes('e.source===parent'));
  assert.ok(html.includes("script-src 'nonce-"));
  assert.ok(!html.includes('allow-same-origin'));
});
test('every built-in template is safe and supports settings', () => {
  for (const d of builtin) {
    assert.doesNotThrow(() => validateDefinitionHTML(d.html));
    const p = freshProject();
    const html = renderBlock(makeBlock(d.id), p);
    assert.ok(!html.includes('{{'));
  }
});
test('ZIP exports store valid CRC and UTF-8 contents', () => {
  const files = [
    { path: 'index.html', content: 'Привет, мир! 🌿' },
    { path: 'blocks/пример.html', content: '<h2>Test</h2>' },
  ];
  const zip = zipFiles(files),
    view = new DataView(zip.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const e = zip.length - 22;
  assert.equal(view.getUint32(e, true), 0x06054b50);
  assert.equal(view.getUint16(e + 10, true), 2);
  assert.equal(view.getUint16(6, true), 0x800);
});

import { recoverDraft } from '../lib/studio/draft';
test('immediate reload restores an unsent draft automatically', () => {
  const base = freshProject(),
    next = structuredClone(base);
  next.name = 'Мои правки';
  assert.equal(
    recoverDraft(JSON.stringify({ project: next, base, revision: 1 }), base, 1).kind,
    'restore',
  );
  assert.equal(
    recoverDraft(JSON.stringify({ project: next, base, revision: 1 }), next, 2).kind,
    'clean',
  );
});
test('draft recovery keeps another tab changes intact', () => {
  const base = freshProject(),
    local = structuredClone(base),
    remote = structuredClone(base);
  local.name = 'Локальная правка';
  remote.name = 'Другая вкладка';
  assert.equal(
    recoverDraft(JSON.stringify({ project: local, base, revision: 1 }), remote, 2).kind,
    'conflict',
  );
  assert.equal(
    recoverDraft(JSON.stringify({ project: local, revision: 1 }), base, 1).kind,
    'restore',
  );
  assert.equal(
    recoverDraft(JSON.stringify({ project: local, revision: 1 }), remote, 2).kind,
    'conflict',
  );
});
test('a newer edit survives acknowledgement of the previous save', () => {
  const initial = freshProject(),
    acknowledged = structuredClone(initial),
    pending = structuredClone(initial);
  acknowledged.name = 'Первая правка';
  pending.name = 'Вторая правка';
  assert.equal(
    recoverDraft(
      JSON.stringify({ project: pending, base: acknowledged, revision: 2 }),
      acknowledged,
      2,
    ).kind,
    'restore',
  );
});
