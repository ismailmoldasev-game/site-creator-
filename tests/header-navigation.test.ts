import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clonePage, freshProject, makeBlock, projectSchema } from '../lib/studio/model';
import { headerLinks } from '../lib/studio/header-navigation';
import { renderBlock, renderPage, projectFiles } from '../lib/studio/render';
import { recoverDraft } from '../lib/studio/draft';

test('legacy menus preserve existing pages once and never include newly created or copied pages automatically', () => {
  const legacy = freshProject();
  legacy.pages.push(clonePage(legacy.pages[0]));
  legacy.pages[1].id = 'x'.repeat(100);
  delete legacy.shared.header[0].navigation;
  const before = JSON.stringify(legacy);
  const loaded = projectSchema.parse(JSON.parse(before));
  assert.equal(JSON.stringify(legacy), before);
  assert.deepEqual(
    headerLinks(loaded.shared.header[0], loaded).map((link) => link.label),
    legacy.pages.map((page) => page.name),
  );
  loaded.pages.push(clonePage(loaded.pages[0]));
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(loaded)));
  assert.equal(headerLinks(restored.shared.header[0], restored).length, 2);
  assert.deepEqual(projectSchema.parse(restored), restored);
  assert.deepEqual(makeBlock('header').navigation, []);
});

test('menu order, hidden items and custom labels persist; page addresses follow renames and deleted targets disappear', () => {
  const project = freshProject();
  const other = clonePage(project.pages[0]);
  other.name = 'Команда';
  other.slug = 'team';
  project.pages.push(other);
  const header = project.shared.header[0];
  header.navigation = [
    { id: 'team', kind: 'page', pageId: other.id, label: '', hidden: false },
    { id: 'home', kind: 'page', pageId: project.pages[0].id, label: 'На главную', hidden: true },
    { id: 'contacts', kind: 'link', label: 'Написать нам', href: '#contacts', hidden: false },
  ];
  other.slug = 'about-team';
  other.name = 'Наши люди';
  let restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(headerLinks(restored.shared.header[0], restored), [
    { id: 'team', label: 'Наши люди', href: 'about-team.html' },
    { id: 'contacts', label: 'Написать нам', href: '#contacts' },
  ]);
  restored.shared.header[0].navigation![0].label = 'О нас';
  for (const mode of ['normal', 'fixed', 'reveal', 'compact'] as const) {
    restored.shared.header[0].headerMode = mode;
    const html = renderPage(restored, restored.pages[0]);
    assert.ok(html.includes('<a href="about-team.html">О нас</a>'));
    assert.ok(!html.includes('>На главную</a>'));
    assert.ok(html.indexOf('>О нас</a>') < html.indexOf('>Написать нам</a>'));
  }
  restored.pages = [restored.pages[0]];
  assert.deepEqual(
    headerLinks(restored.shared.header[0], restored).map((item) => item.id),
    ['contacts'],
  );
  restored.shared.header[0].navigation = [];
  restored = projectSchema.parse(restored);
  assert.ok(!renderBlock(restored.shared.header[0], restored).includes('<nav '));
  assert.ok(renderBlock(restored.shared.header[0], restored).includes('class="wordmark"'));
});

test('unsent menu edits recover after refresh and are exported with escaped text and safe URLs', () => {
  const base = freshProject();
  const edited = structuredClone(base);
  edited.shared.header[0].navigation = [
    {
      id: 'external',
      kind: 'link',
      label: 'Заказать <&>',
      href: 'https://example.com/?a=1&b=2',
      hidden: false,
    },
    { id: 'unsafe', kind: 'link', label: 'Текст', href: 'javascript:alert(1)', hidden: false },
  ];
  const draft = recoverDraft(JSON.stringify({ project: edited, base, revision: 4 }), base, 4);
  assert.equal(draft.kind, 'restore');
  assert.deepEqual(draft.project.shared.header[0].navigation, edited.shared.header[0].navigation);
  const html = projectFiles(draft.project).find((file) => file.path === 'index.html')!.content;
  assert.ok(html.includes('href="https://example.com/?a=1&amp;b=2">Заказать &lt;&amp;&gt;</a>'));
  assert.ok(html.includes('href="#">Текст</a>'));
  assert.ok(!html.includes('javascript:'));
});

test('menu schema bounds saved data and rejects duplicate item IDs', () => {
  const project = freshProject();
  const header = project.shared.header[0];
  const item = { id: 'one', kind: 'link' as const, label: 'Ссылка', href: '#', hidden: false };
  header.navigation = [item, { ...item }];
  assert.equal(projectSchema.safeParse(project).success, false);
  header.navigation = Array.from({ length: 51 }, (_, i) => ({ ...item, id: String(i) }));
  assert.equal(projectSchema.safeParse(project).success, false);
  header.navigation = [{ ...item, label: 'a'.repeat(81) }];
  assert.equal(projectSchema.safeParse(project).success, false);
});
