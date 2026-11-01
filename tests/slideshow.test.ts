import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { slideshowScript } from '../lib/studio/slideshow';

test('slideshow controls wrap, stay independent, support keyboard, and pause automatic playback', () => {
  type Element = {
    attributes: Record<string, string>;
    setAttribute: (key: string, value: string) => void;
    textContent: string;
  };
  const element = (): Element => ({
    attributes: {},
    textContent: '',
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
  });
  function carousel(count: number, autoplay: boolean) {
    const events: Record<string, (event: any) => void> = {};
    const track = {
      children: Array.from({ length: count }, element),
      clientWidth: 640,
      scrollLeft: 0,
      addEventListener() {},
      scrollTo({ left }: { left: number }) {
        this.scrollLeft = left;
      },
    };
    const status = element(),
      toggle = element(),
      dots = Array.from({ length: count }, element);
    const root = {
      dataset: { autoplay: String(autoplay), interval: '5' },
      querySelector(selector: string) {
        return selector === '[data-slide-track]'
          ? track
          : selector === '[data-slide-status]'
            ? status
            : toggle;
      },
      querySelectorAll() {
        return dots;
      },
      addEventListener(name: string, fn: (event: any) => void) {
        events[name] = fn;
      },
      contains() {
        return false;
      },
    };
    function click(attributes: Record<string, string>) {
      events.click({
        target: {
          closest: () => ({
            dataset: {
              slideIndex: attributes['data-slide-index'],
              slideDirection: attributes['data-slide-direction'],
            },
            hasAttribute: (key: string) => key in attributes,
          }),
        },
      });
    }
    return { root, events, status, dots, track, toggle, click };
  }
  const first = carousel(2, true),
    second = carousel(3, false);
  const timers = new Map<number, () => void>();
  let sequence = 0;
  runInNewContext(slideshowScript, {
    document: {
      hidden: false,
      querySelectorAll: () => [first.root, second.root],
      addEventListener() {},
    },
    window: {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener() {},
    },
    setInterval: (fn: () => void) => {
      const id = ++sequence;
      timers.set(id, fn);
      return id;
    },
    clearInterval: (id: number) => timers.delete(id),
    requestAnimationFrame: (fn: () => void) => {
      fn();
      return 1;
    },
    cancelAnimationFrame() {},
  });
  assert.equal(first.status.textContent, 'Слайд 1 из 2');
  assert.equal(timers.size, 1);
  [...timers.values()][0]();
  assert.equal(first.status.textContent, 'Слайд 2 из 2');
  assert.equal(second.status.textContent, 'Слайд 1 из 3');
  first.click({ 'data-slide-direction': '1' });
  assert.equal(first.status.textContent, 'Слайд 1 из 2');
  assert.equal(timers.size, 0);
  assert.equal(first.toggle.textContent, 'Воспроизвести');
  second.click({ 'data-slide-index': '2' });
  assert.equal(second.status.textContent, 'Слайд 3 из 3');
  second.events.keydown({ key: 'ArrowLeft', preventDefault() {} });
  assert.equal(second.track.scrollLeft, 640);
  assert.equal(second.status.textContent, 'Слайд 2 из 3');
  assert.equal(second.dots[1].attributes['aria-current'], 'true');
  assert.equal(second.status.attributes['aria-live'], 'polite');
  first.click({ 'data-slide-toggle': '' });
  assert.equal(timers.size, 1);
  first.events.focusin({});
  assert.equal(timers.size, 0);
});
