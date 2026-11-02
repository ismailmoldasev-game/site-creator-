import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { freshProject, makeBlock, projectSchema } from '../lib/studio/model';
import { projectFiles, renderBlock, renderPage } from '../lib/studio/render';
import { headerScript } from '../lib/studio/site-header';

test('full-screen image has no section spacing and its optional button survives saving at every edge', () => {
  const project = freshProject();
  const image = makeBlock('full-image');
  image.values.image = 'https://example.com/photo.webp';
  image.values.imageAlt = 'Наше хозяйство';
  image.padding = 100;
  project.pages[0].blocks = [image];
  const html = renderPage(project, project.pages[0]);
  assert.ok(html.includes('full-image-block" style="padding-block:0px;'));
  assert.ok(html.includes('height:calc(var(--fi-height)*1svh)'));
  assert.ok(renderBlock(image, project).includes('data-image-desktop="natural"'));
  assert.ok(renderBlock(image, project).includes('data-image-mobile="natural"'));
  assert.ok(!renderBlock(image, project).includes('<a '));
  assert.ok(!renderBlock(image, project).includes('<p>'));
  image.buttonVisible = true;
  image.values.button = 'О проекте <&>';
  image.values.href = 'about.html#team';
  for (const x of [0, 50, 100])
    for (const y of [0, 50, 100]) {
      image.buttonPosition = { x, y };
      const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
      const output = renderBlock(restored.pages[0].blocks[0], restored);
      assert.ok(output.includes(`left:${x}%;top:${y}%;transform:translate(-${x}%,-${y}%);`));
      assert.ok(output.includes('О проекте &lt;&amp;&gt;'));
      assert.ok(output.includes('href="about.html#team"'));
    }
  image.buttonPosition = { x: 101, y: 50 };
  assert.equal(projectSchema.safeParse(project).success, false);
});

test('all header modes survive export while old projects retain a free-flowing header', () => {
  const project = freshProject();
  const header = project.shared.header[0];
  const before = JSON.stringify(project);
  assert.ok(renderPage(project, project.pages[0]).includes('data-header-mode="normal"'));
  assert.equal(JSON.stringify(project), before);
  for (const mode of ['normal', 'fixed', 'reveal', 'compact'] as const) {
    header.headerMode = mode;
    const saved = projectSchema.parse(JSON.parse(JSON.stringify(project)));
    const html = projectFiles(saved).find((file) => file.path === 'index.html')!.content;
    assert.ok(html.includes('data-header-mode="' + mode + '"'));
    assert.ok(html.includes('data-header-control'));
    assert.ok(html.includes('data-header-panel'));
    assert.ok(html.includes('aria-controls="nav-' + header.id + '"'));
    assert.ok(html.includes("script-src 'nonce-"));
    assert.ok(!html.includes('unsafe-eval'));
    assert.ok(
      html.includes("var headers=Array.from(document.querySelectorAll('[data-header-shell]'))"),
    );
    assert.ok(html.includes('data-preview-floating="true"') === (mode !== 'normal'));
  }
  header.hidden = true;
  const plain = renderPage(project, project.pages[0]);
  assert.ok(plain.includes("script-src 'none'"));
  assert.ok(!plain.includes('<script nonce='));
});

function headerRuntime(isMobile = false) {
  const frames: (() => void)[] = [];
  const windowEvents: Record<string, () => void> = {};
  const documentEvents: Record<string, (event: any) => void> = {};
  const css = new Map<string, string>();
  const document = {
    activeElement: {},
    documentElement: {
      style: {
        setProperty(key: string, value: string) {
          css.set(key, value);
        },
      },
    },
    querySelectorAll: () => shells.map((item) => item.shell),
    addEventListener(name: string, handler: (event: any) => void) {
      documentEvents[name] = handler;
    },
  };
  function menu(mode: string) {
    const classes = new Set<string>(),
      attributes = new Map<string, string>();
    const events: Record<string, (event?: any) => void> = {};
    const buttonEvents: Record<string, () => void> = {};
    const panelEvents: Record<string, (event: any) => void> = {};
    const offsets = new Map<string, string>();
    let focused = false;
    const button = {
      addEventListener(name: string, handler: () => void) {
        buttonEvents[name] = handler;
      },
      getAttribute: (key: string) => attributes.get(key),
      setAttribute(key: string, value: string) {
        attributes.set(key, value);
      },
      focus() {
        focused = true;
      },
    };
    const panel = {
      inert: false,
      addEventListener(name: string, handler: (event: any) => void) {
        panelEvents[name] = handler;
      },
    };
    const shell = {
      dataset: { headerMode: mode },
      querySelector: (key: string) => (key === '[data-header-control]' ? button : panel),
      style: {
        setProperty(key: string, value: string) {
          offsets.set(key, value);
        },
      },
      getBoundingClientRect: () => ({ height: 76 }),
      classList: {
        toggle(key: string, on: boolean) {
          if (on) classes.add(key);
          else classes.delete(key);
        },
      },
      addEventListener(name: string, handler: (event: any) => void) {
        events[name] = handler;
      },
      contains: (node: unknown) => node === button || node === panel,
    };
    return {
      shell,
      button,
      panel,
      classes,
      attributes,
      offsets,
      events,
      panelEvents,
      click: () => buttonEvents.click(),
      focused: () => focused,
    };
  }
  const shells = ['normal', 'fixed', 'reveal', 'compact'].map(menu);
  const win = {
    scrollY: 0,
    addEventListener(name: string, handler: () => void) {
      windowEvents[name] = handler;
    },
    matchMedia(query: string) {
      return { matches: query.includes('700px') ? isMobile : !isMobile, addEventListener() {} };
    },
  };
  runInNewContext(headerScript, {
    document,
    window: win,
    requestAnimationFrame(callback: () => void) {
      frames.push(callback);
      return frames.length;
    },
  });
  function scroll(y: number) {
    win.scrollY = y;
    windowEvents.scroll();
    while (frames.length) frames.shift()!();
  }
  return { shells, scroll, css, documentEvents };
}

test('reveal header follows scroll direction and compact menu opens by hover and closes on scroll or Escape', () => {
  const { shells, scroll, css } = headerRuntime();
  const [normal, fixed, reveal, compact] = shells;
  assert.equal(normal.panel.inert, false);
  assert.equal(fixed.offsets.get('--header-top'), '0px');
  assert.equal(reveal.offsets.get('--header-top'), '76px');
  assert.equal(css.get('--site-header-space'), '152px');
  compact.events.mouseenter();
  assert.equal(compact.attributes.get('aria-expanded'), 'true');
  assert.equal(compact.panel.inert, false);
  scroll(100);
  assert.equal(compact.attributes.get('aria-expanded'), 'false');
  assert.equal(compact.panel.inert, true);
  assert.equal(reveal.classes.has('is-header-hidden'), true);
  scroll(96);
  assert.equal(reveal.classes.has('is-header-hidden'), true);
  scroll(80);
  assert.equal(reveal.classes.has('is-header-hidden'), false);
  assert.equal(fixed.classes.has('is-header-hidden'), false);
  compact.click();
  compact.events.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(compact.attributes.get('aria-expanded'), 'false');
  assert.equal(compact.focused(), true);
});

test('mobile menus use tap rather than hover, close outside and remain keyboard-accessible', () => {
  const { shells, scroll, documentEvents } = headerRuntime(true);
  const [normal, , , compact] = shells;
  compact.events.mouseenter();
  assert.equal(compact.attributes.get('aria-expanded'), 'false');
  compact.click();
  assert.equal(compact.attributes.get('aria-expanded'), 'true');
  documentEvents.pointerdown({ target: {} });
  assert.equal(compact.panel.inert, true);
  assert.equal(normal.panel.inert, true);
  normal.click();
  assert.equal(normal.panel.inert, false);
  scroll(40);
  assert.equal(normal.panel.inert, true);
});
