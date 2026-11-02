import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProject, makeBlock, projectSchema } from '../lib/studio/model';
import { fullImageFrame } from '../lib/studio/full-image';
import { projectFiles, renderBlock, renderPage } from '../lib/studio/render';
import { recoverDraft } from '../lib/studio/draft';

test('legacy images preserve desktop crop while mobile and fitted images adapt without changing saved data', () => {
  const project = freshProject();
  const block = makeBlock('full-image');
  delete block.fullImage;
  block.images = { image: { fit: 'cover', x: 25, y: 80, ratio: 'auto' } };
  const original = JSON.stringify(block);
  assert.deepEqual(fullImageFrame(block, 'desktop'), { mode: 'cover', height: 100, x: 25, y: 80 });
  assert.deepEqual(fullImageFrame(block, 'mobile'), { mode: 'natural', height: 100, x: 25, y: 80 });
  assert.ok(renderBlock(block, project).includes('data-image-mobile="natural"'));
  assert.equal(JSON.stringify(block), original);
  for (const fit of ['contain', 'original'] as const) {
    block.images.image.fit = fit;
    assert.equal(fullImageFrame(block, 'desktop').mode, 'natural');
  }
});

test('desktop and phone frames and alternate mobile image survive draft recovery and export independently', () => {
  const base = freshProject();
  const edited = structuredClone(base);
  const image = makeBlock('full-image');
  image.values.image = 'https://example.com/landscape.jpg';
  image.values.imageMobile = 'https://example.com/portrait.jpg?a=1&b=2';
  image.values.imageAlt = 'Хозяйство <&>';
  image.fullImage = {
    desktop: { mode: 'cover', height: 60, x: 80, y: 25 },
    mobile: { mode: 'natural', height: 100, x: 30, y: 90 },
  };
  image.padding = 120;
  edited.pages[0].blocks = [image];
  const recovered = recoverDraft(JSON.stringify({ project: edited, base, revision: 3 }), base, 3);
  assert.equal(recovered.kind, 'restore');
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(recovered.project)));
  assert.deepEqual(restored.pages[0].blocks[0].fullImage, image.fullImage);
  const html = projectFiles(restored).find((file) => file.path === 'index.html')!.content;
  assert.ok(html.includes('data-image-desktop="cover" data-image-mobile="natural"'));
  assert.ok(html.includes('--fi-height:60;--fi-fit:cover;--fi-x:80%;--fi-y:25%'));
  assert.ok(
    html.includes(
      '--fi-mobile-height:100;--fi-mobile-fit:contain;--fi-mobile-x:30%;--fi-mobile-y:90%',
    ),
  );
  assert.ok(
    html.includes(
      '<source media="(max-width:700px)" srcset="https://example.com/portrait.jpg?a=1&amp;b=2">',
    ),
  );
  assert.ok(html.includes('src="https://example.com/landscape.jpg" alt="Хозяйство &lt;&amp;&gt;"'));
  assert.ok(html.includes('full-image-block" style="padding-block:0px;'));
  restored.pages[0].blocks[0].fullImage!.mobile!.mode = 'cover';
  restored.pages[0].blocks[0].fullImage!.mobile!.height = 40;
  assert.equal(fullImageFrame(restored.pages[0].blocks[0], 'desktop').height, 60);
  assert.equal(fullImageFrame(restored.pages[0].blocks[0], 'mobile').height, 40);
});

test('mobile picture sources fall back safely and data URLs remain valid', () => {
  const project = freshProject();
  const block = makeBlock('full-image');
  block.values.image = 'https://example.com/main.png';
  block.values.imageMobile = 'javascript:alert(1)';
  let html = renderBlock(block, project);
  assert.ok(!html.includes('<source'));
  assert.ok(!html.includes('javascript:'));
  block.values.imageMobile = 'data:image/png;base64,YWJj';
  html = renderBlock(block, project);
  assert.ok(html.includes('srcset="data:image/png;base64,YWJj"'));
  block.values.imageMobile = 'https://example.com/a b,c.png';
  assert.ok(renderBlock(block, project).includes('srcset="https://example.com/a%20b%2Cc.png"'));
  block.values.image = '';
  assert.ok(renderBlock(block, project).includes('src="https://example.com/a b,c.png"'));
  block.values.imageMobile = '';
  assert.ok(!renderBlock(block, project).includes('<img'));
});

test('new image blocks default to full-width natural proportions and reject invalid frame dimensions', () => {
  const project = freshProject();
  const image = makeBlock('full-image');
  project.pages[0].blocks = [image];
  assert.equal(fullImageFrame(image, 'desktop').mode, 'natural');
  assert.equal(fullImageFrame(image, 'mobile').mode, 'natural');
  image.fullImage!.mobile!.height = 101;
  assert.equal(projectSchema.safeParse(project).success, false);
  image.fullImage!.mobile!.height = 10;
  assert.equal(projectSchema.safeParse(project).success, false);
  image.fullImage!.mobile!.height = 100;
  image.fullImage!.desktop!.x = -1;
  assert.equal(projectSchema.safeParse(project).success, false);
  image.fullImage!.desktop!.x = 50;
  assert.ok(renderPage(project, project.pages[0]).includes('full-image-empty'));
});
