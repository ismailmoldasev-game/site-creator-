import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { editorPreviewScript, readPreviewPosition } from '../lib/studio/editor-preview';

function previewRuntime({ blockId = 'target', offset = -120, y = 1120 } = {}) {
  const events: Record<string, (event?: any) => void> = {};
  const messages: any[] = [];
  const scrolls: { top: number; behavior: string }[] = [];
  const tasks: (() => void)[] = [];
  let blockTop = 1000,
    observer: (() => void) | undefined;
  const selection = new Map<string, boolean>();
  const parent = {
    postMessage(message: unknown) {
      messages.push(message);
    },
  };
  const win = {
    scrollY: 0,
    addEventListener(name: string, callback: () => void) {
      events[name] = callback;
    },
    scrollTo(value: { top: number; behavior: string }) {
      scrolls.push(value);
      this.scrollY = value.top;
    },
  };
  const block = {
    dataset: { block: 'target' },
    getBoundingClientRect() {
      return { top: blockTop - win.scrollY, bottom: blockTop + 2000 - win.scrollY };
    },
    classList: {
      toggle(name: string, enabled: boolean) {
        selection.set(name, enabled);
      },
    },
  };
  runInNewContext(
    editorPreviewScript({ id: 'current-document', position: { y, blockId, offset } }),
    {
      window: win,
      parent,
      document: {
        body: {},
        querySelectorAll: () => [block],
        addEventListener(name: string, callback: () => void) {
          events[name] = callback;
        },
      },
      requestAnimationFrame: (callback: () => void) => {
        tasks.push(callback);
        return tasks.length;
      },
      cancelAnimationFrame() {},
      ResizeObserver: class {
        constructor(callback: () => void) {
          observer = callback;
        }
        observe() {}
      },
    },
  );
  function flushFrames() {
    while (tasks.length) tasks.shift()!();
  }
  return {
    events,
    messages,
    scrolls,
    win,
    parent,
    selection,
    flushFrames,
    resize(top: number) {
      blockTop = top;
      observer?.();
    },
  };
}

test('editing restores the same point in a block instantly, including late image layout', () => {
  const runtime = previewRuntime();
  assert.equal(runtime.win.scrollY, 1120);
  runtime.flushFrames();
  assert.equal(runtime.messages.at(-1).studio, 'ready');
  assert.equal(runtime.messages.at(-1).previewId, 'current-document');
  runtime.resize(1600);
  assert.equal(runtime.win.scrollY, 1720);
  assert.ok(runtime.scrolls.every((scroll) => scroll.behavior === 'instant'));
  runtime.events.scroll();
  runtime.flushFrames();
  assert.equal(runtime.messages.filter((message) => message.studio === 'scroll').length, 0);
});

test('user scrolling is reported and is never undone by load or resize callbacks', () => {
  const runtime = previewRuntime();
  runtime.flushFrames();
  runtime.events.wheel();
  runtime.win.scrollY = 1400;
  runtime.events.scroll();
  runtime.flushFrames();
  const position = runtime.messages.at(-1).position;
  assert.equal(position.y, 1400);
  assert.equal(position.blockId, 'target');
  assert.equal(position.offset, -400);
  runtime.resize(1800);
  runtime.events.load();
  runtime.flushFrames();
  assert.equal(runtime.win.scrollY, 1400);
});

test('missing blocks fall back to the previous offset and stale documents cannot select blocks', () => {
  const runtime = previewRuntime({ blockId: 'removed', y: 650 });
  runtime.flushFrames();
  assert.equal(runtime.win.scrollY, 650);
  runtime.events.message({
    source: runtime.parent,
    data: { studio: 'select-block', previewId: 'old-document', id: 'target' },
  });
  assert.equal(runtime.selection.has('is-selected'), false);
  runtime.events.message({
    source: {},
    data: { studio: 'select-block', previewId: 'current-document', id: 'target' },
  });
  assert.equal(runtime.selection.has('is-selected'), false);
  runtime.events.message({
    source: runtime.parent,
    data: { studio: 'select-block', previewId: 'current-document', id: 'target' },
  });
  assert.equal(runtime.selection.get('is-selected'), true);
  assert.equal(runtime.win.scrollY, 650);
});

test('preview position validates messages and escapes inline script configuration', () => {
  assert.equal(readPreviewPosition({ y: NaN, blockId: '', offset: 0 }), null);
  assert.equal(readPreviewPosition({ y: -1, blockId: '', offset: 0 }), null);
  assert.equal(readPreviewPosition({ y: 15, blockId: '', offset: Infinity }), null);
  assert.deepEqual(readPreviewPosition({ y: 15, blockId: 'hero', offset: -5 }), {
    y: 15,
    blockId: 'hero',
    offset: -5,
  });
  const script = editorPreviewScript({
    id: '</script>',
    position: { y: 0, blockId: '</script>', offset: 0 },
  });
  assert.ok(!script.includes('</script>'));
});
