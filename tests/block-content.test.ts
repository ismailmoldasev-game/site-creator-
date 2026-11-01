import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProject, makeBlock, projectSchema, uid } from '../lib/studio/model';
import {
  blockAnchor,
  blockSlides,
  defaultImageSettings,
  featureCards,
  moveItem,
  pageBlocks,
} from '../lib/studio/block-content';
import { projectFiles, renderBlock, renderPage } from '../lib/studio/render';
import { slideshowScript } from '../lib/studio/slideshow';

test('older blocks keep their existing labels without a data migration', () => {
  const project = freshProject();
  for (const [type, key, expected] of [
    ['features', 'eyebrow', 'НАШ ПОДХОД'],
    ['image-text', 'eyebrow', 'В ДЕТАЛЯХ'],
    ['contact', 'eyebrow', 'БУДЕМ НА СВЯЗИ'],
    ['hero', 'note', 'Большие перемены начинаются с малого.'],
    ['hero', 'artLabel', 'СОЗДАВАЙТЕ СВОЁ ↗'],
  ]) {
    const block = makeBlock(type);
    delete block.values[key];
    block.values.title = 'Мой заполненный заголовок';
    const before = JSON.stringify(block);
    const rendered = renderBlock(block, project);
    assert.ok(rendered.includes(expected));
    assert.ok(rendered.includes('Мой заполненный заголовок'));
    assert.equal(JSON.stringify(block), before);
  }
});

test('template labels are editable, escaped, saved, and fully hidden when cleared', () => {
  const project = freshProject();
  for (const [type, key, className] of [
    ['features', 'eyebrow', 'eyebrow'],
    ['image-text', 'eyebrow', 'eyebrow'],
    ['contact', 'eyebrow', 'eyebrow'],
    ['hero', 'eyebrow', 'eyebrow'],
    ['hero', 'note', 'hero-note'],
    ['hero', 'artLabel', 'art-tag'],
  ]) {
    const block = makeBlock(type);
    block.values[key] = 'Свой текст <&>';
    project.pages[0].blocks = [block];
    const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
    assert.ok(
      renderBlock(restored.pages[0].blocks[0], restored).includes('Свой текст &lt;&amp;&gt;'),
    );
    block.values[key] = '  ';
    assert.ok(!renderBlock(block, project).includes(`class="${className}"`));
  }
});

test('old project content survives parsing and editing the legacy feature cards', () => {
  const project = freshProject();
  const features = project.pages[0].blocks.find((block) => block.type === 'features')!;
  features.values.oneTitle = 'Наши бычки';
  features.values.twoText = 'Индивидуальный рацион';
  const before = JSON.stringify(project);
  const cards = featureCards(features);
  assert.equal(cards[0].title, 'Наши бычки');
  assert.equal(cards[1].text, 'Индивидуальный рацион');
  assert.equal(JSON.stringify(project), before);
  assert.deepEqual(projectSchema.parse(project), JSON.parse(before));
  features.cards = [...cards, { id: uid(), title: 'Новая карточка', text: '<Без потерь>' }];
  const saved = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  const block = saved.pages[0].blocks.find((b) => b.type === 'features')!;
  assert.equal((renderBlock(block, saved).match(/<article>/g) || []).length, 4);
  assert.ok(renderBlock(block, saved).includes('&lt;Без потерь&gt;'));
  block.cards = moveItem(block.cards!, 3, -1).filter((_, index) => index !== 1);
  assert.equal(block.cards[1].title, 'Новая карточка');
  assert.equal((renderBlock(block, saved).match(/<article>/g) || []).length, 3);
});

test('hero layout and optional button survive save/reload without losing the link', () => {
  const project = freshProject();
  const hero = project.pages[0].blocks[0];
  hero.layout = 'image-first';
  hero.values.href = 'about.html#team';
  hero.buttonVisible = false;
  let rendered = renderBlock(hero, project);
  assert.ok(rendered.includes('hero wrap image-first'));
  assert.ok(!rendered.includes('class="sbtn"'));
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  restored.pages[0].blocks[0].buttonVisible = true;
  rendered = renderBlock(restored.pages[0].blocks[0], restored);
  assert.ok(rendered.includes('href="about.html#team"'));
  hero.values.button = '  ';
  hero.buttonVisible = true;
  assert.ok(!renderBlock(hero, project).includes('class="sbtn"'));
});

test('image framing defaults to no cropping, supports focal position and original proportions', () => {
  const project = freshProject();
  const hero = project.pages[0].blocks[0];
  hero.values.image = 'https://example.com/photo.jpg';
  assert.ok(renderBlock(hero, project).includes('object-fit:contain'));
  assert.ok(!renderBlock(hero, project).includes('art-circle'));
  hero.images = { image: { ...defaultImageSettings, fit: 'cover', x: 20, y: 80, ratio: '3/4' } };
  assert.ok(renderBlock(hero, project).includes('object-fit:cover;object-position:20% 80%'));
  assert.ok(renderBlock(hero, project).includes('aspect-ratio:3/4'));
  hero.images.image.fit = 'original';
  const parsed = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  const html = renderBlock(parsed.pages[0].blocks[0], parsed);
  assert.ok(html.includes('height:auto;aspect-ratio:auto'));
  assert.ok(html.includes('position:static;width:100%;height:auto'));
});

test('anchors preserve old #about/#contacts links and remain unique when blocks repeat', () => {
  const project = freshProject();
  const page = project.pages[0];
  page.blocks.push(makeBlock('text'));
  let blocks = pageBlocks(project, page);
  const text = blocks.filter((b) => b.type === 'text');
  assert.equal(blockAnchor(text[0], blocks), 'about');
  assert.equal(blockAnchor(text[1], blocks), 'about-2');
  assert.ok(renderPage(project, page).includes('id="contacts"'));
  text[1].anchor = 'team';
  assert.ok(renderPage(project, page).includes('id="team"'));
  text[1].anchor = 'about';
  blocks = pageBlocks(project, page);
  assert.equal(blockAnchor(text[1], blocks), 'about');
  assert.equal(blockAnchor(text[0], blocks), 'about-2');
  assert.equal(new Set(blocks.map((b) => blockAnchor(b, blocks))).size, blocks.length);
});

test('slideshow is exported with working trusted controls and no editing code', () => {
  const project = freshProject();
  const slideshow = makeBlock('slideshow');
  slideshow.slides = blockSlides(slideshow);
  slideshow.slides[0].title = '<script>bad</script>';
  slideshow.slides[0].button = 'О нас';
  slideshow.slides[0].href = '#about';
  slideshow.slides[1].image = 'javascript:bad()';
  slideshow.slideshow = { autoplay: true, interval: 4 };
  project.pages[0].blocks.push(slideshow);
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  const html = projectFiles(restored).find((f) => f.path === 'index.html')!.content;
  assert.ok(html.includes('data-slide-track'));
  assert.ok(html.includes('aria-label="Следующий слайд"'));
  assert.ok(html.includes('data-autoplay="true" data-interval="4"'));
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(!html.includes('javascript:bad'));
  assert.ok(html.includes("script-src 'nonce-"));
  assert.ok(html.includes('document.querySelectorAll'));
  assert.ok(!html.includes("studio:'select"));
  assert.doesNotThrow(() => new Function(slideshowScript));
  assert.ok(slideshowScript.includes('prefers-reduced-motion'));
  slideshow.slides = [slideshow.slides[0]];
  assert.ok(!renderBlock(slideshow, project).includes('Следующий слайд'));
});

test('schema bounds repeated items and rejects injected framing properties', () => {
  const project = freshProject();
  const hero = project.pages[0].blocks[0];
  hero.images = { image: { ...defaultImageSettings, x: 101 } };
  assert.equal(projectSchema.safeParse(project).success, false);
  delete hero.images;
  hero.anchor = 'a" onclick="alert(1)';
  assert.equal(projectSchema.safeParse(project).success, false);
  delete hero.anchor;
  const features = project.pages[0].blocks.find((b) => b.type === 'features')!;
  features.cards = [];
  assert.equal(projectSchema.safeParse(project).success, false);
  features.cards = Array.from({ length: 24 }, (_, index) => ({
    id: String(index),
    title: 'Пункт',
    text: '',
  }));
  assert.equal(projectSchema.safeParse(project).success, true);
  features.cards.push({ id: 'extra', title: 'Лишний', text: '' });
  assert.equal(projectSchema.safeParse(project).success, false);
});
