import { builtin, uid, type Project, type Block, type Page } from './model';
import {
  blockAnchor,
  blockSlides,
  defaultImageSettings,
  featureCards,
  pageBlocks,
} from './block-content';
import { slideshowCSS, slideshowScript } from './slideshow';
import { editorPreviewScript, initialPreviewPosition, type EditorPreview } from './editor-preview';
import { headerCSS, headerScript } from './site-header';
import { fullImageCSS, fullImageFrame } from './full-image';
import { headerLinks } from './header-navigation';
export const escapeHTML = (v: string) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function safeURL(v: string) {
  const s = v.trim();
  return /^(https?:\/\/|mailto:|tel:|#|\/?[a-z0-9][a-z0-9./_-]*\.html(?:#.*)?$)/i.test(s) ? s : '#';
}
export function safeImage(v: string) {
  return /^(https:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(v) ? v : '';
}
export function validateDefinitionHTML(html: string) {
  if (!html.trim() || html.length > 60000) throw new Error('Пустой или слишком большой код блока');
  if (
    /<\s*\/?\s*(?:script|iframe|object|embed|base|link|meta|form|input|button|textarea|select|svg|math)\b/i.test(
      html,
    ) ||
    /\bon[a-z]+\s*=/i.test(html) ||
    /(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i.test(html) ||
    /@import\b|expression\s*\(|url\s*\(/i.test(html)
  )
    throw new Error(
      'Блок содержит неподдерживаемый активный код. Используйте HTML и CSS без скриптов и внешних стилей.',
    );
  return html;
}
const fonts = {
  system: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SFMono-Regular", Consolas, monospace',
};
function imageStyle(settings = defaultImageSettings) {
  return `object-fit:${settings.fit === 'cover' ? 'cover' : 'contain'};object-position:${settings.x}% ${settings.y}%;${settings.fit === 'original' ? 'position:static;width:100%;height:auto;' : ''}`;
}
function mediaStyle(settings = defaultImageSettings) {
  return settings.fit === 'original'
    ? 'height:auto;aspect-ratio:auto;'
    : settings.ratio !== 'auto'
      ? `height:auto;aspect-ratio:${settings.ratio};`
      : '';
}
function action(button: string, href: string) {
  return button.trim()
    ? `<a class="sbtn" href="${escapeHTML(safeURL(href))}">${escapeHTML(button)} <span aria-hidden="true">↗</span></a>`
    : '';
}
function renderHeader(block: Block, project: Project) {
  const definition = builtin.find((d) => d.id === 'header')!;
  const value = (key: string) =>
    block.values[key] ?? definition.fields.find((field) => field.key === key)?.default ?? '';
  const logo = safeImage(project.brand.logo);
  const brand = logo
    ? `<img class="brand-logo" src="${escapeHTML(logo)}" alt="${escapeHTML(value('name') || project.name)}">`
    : escapeHTML(value('name'));
  const navigation = headerLinks(block, project)
    .map((item) => `<a href="${escapeHTML(safeURL(item.href))}">${escapeHTML(item.label)}</a>`)
    .join('');
  const button =
    block.buttonVisible === false
      ? ''
      : action(value('button'), value('href')).replace('class="sbtn"', 'class="sbtn small"');
  return `<header class="site-nav wrap" data-site-header><a class="wordmark" href="index.html">${brand}</a><div class="site-header-content" id="nav-${escapeHTML(block.id)}" data-header-panel>${navigation ? `<nav aria-label="Основная навигация">${navigation}</nav>` : ''}${button}</div><button type="button" class="site-menu-toggle" data-header-control aria-controls="nav-${escapeHTML(block.id)}" aria-expanded="false" aria-label="Открыть меню"><span></span><span></span><span></span></button></header>`;
}
function renderFullImage(block: Block) {
  const mobileSource = safeImage(block.values.imageMobile ?? '');
  const src = safeImage(block.values.image ?? '') || mobileSource;
  const desktop = fullImageFrame(block, 'desktop');
  const mobile = fullImageFrame(block, 'mobile');
  const frameStyle = `--fi-height:${desktop.height};--fi-fit:${desktop.mode === 'cover' ? 'cover' : 'contain'};--fi-x:${desktop.x}%;--fi-y:${desktop.y}%;--fi-mobile-height:${mobile.height};--fi-mobile-fit:${mobile.mode === 'cover' ? 'cover' : 'contain'};--fi-mobile-x:${mobile.x}%;--fi-mobile-y:${mobile.y}%;`;
  const mobileSrcset = mobileSource.startsWith('data:')
    ? mobileSource
    : mobileSource.replaceAll(',', '%2C').replace(/\s/g, (c) => encodeURIComponent(c));
  const position = block.buttonPosition ?? { x: 50, y: 80 };
  const button =
    block.buttonVisible === true && (block.values.button ?? 'Подробнее').trim()
      ? `<div class="full-image-button-area"><a class="sbtn full-image-action" href="${escapeHTML(safeURL(block.values.href ?? '#about'))}" style="left:${position.x}%;top:${position.y}%;transform:translate(-${position.x}%,-${position.y}%);">${escapeHTML(block.values.button ?? 'Подробнее')}</a></div>`
      : '';
  return `<section class="full-image" data-image-desktop="${desktop.mode}" data-image-mobile="${mobile.mode}" style="${frameStyle}">${src ? `<picture class="full-image-media">${mobileSource && mobileSource !== src ? `<source media="(max-width:700px)" srcset="${escapeHTML(mobileSrcset)}">` : ''}<img class="full-image-photo" src="${escapeHTML(src)}" alt="${escapeHTML(block.values.imageAlt ?? '')}"></picture>` : '<div class="full-image-media full-image-empty" aria-hidden="true"></div>'}${button}</section>`;
}
function renderSlideshow(block: Block) {
  const slides = blockSlides(block);
  const title = block.values.title ?? 'История в фотографиях.';
  const controls = slides.length > 1;
  return `<section class="slideshow wrap" data-slideshow data-autoplay="${!!block.slideshow?.autoplay}" data-interval="${block.slideshow?.interval ?? 5}" role="region" aria-roledescription="слайдшоу" aria-label="${escapeHTML(title || 'Фотографии')}">${title ? `<h2>${escapeHTML(title)}</h2>` : ''}<div class="slide-track" data-slide-track tabindex="0" aria-label="Слайды. Используйте стрелки влево и вправо">${slides
    .map((slide, index) => {
      const settings = slide.imageSettings ?? defaultImageSettings;
      const src = safeImage(slide.image);
      return `<article class="slide" role="group" aria-roledescription="слайд" aria-label="${index + 1} из ${slides.length}"><div class="slide-media" style="${mediaStyle(settings)}">${src ? `<img src="${escapeHTML(src)}" alt="${escapeHTML(slide.title)}" style="${imageStyle(settings)}"${index ? ' loading="lazy"' : ''}>` : '<div class="slide-placeholder">Добавьте изображение в настройках слайда</div>'}</div><div class="slide-caption">${slide.title ? `<h3>${escapeHTML(slide.title)}</h3>` : ''}${slide.text ? `<p>${escapeHTML(slide.text)}</p>` : ''}${action(slide.button, slide.href)}</div></article>`;
    })
    .join(
      '',
    )}</div>${controls ? `<div class="slide-controls"><button type="button" data-slideshow-control data-slide-direction="-1" aria-label="Предыдущий слайд">←</button><div class="slide-dots">${slides.map((_, index) => `<button type="button" data-slideshow-control data-slide-index="${index}" aria-label="Показать слайд ${index + 1}" aria-current="${index === 0}"></button>`).join('')}</div><button type="button" data-slideshow-control data-slide-direction="1" aria-label="Следующий слайд">→</button><span class="slide-status" data-slide-status aria-live="polite">Слайд 1 из ${slides.length}</span>${block.slideshow?.autoplay ? '<button type="button" data-slideshow-control data-slide-toggle aria-label="Приостановить слайдшоу">Пауза</button>' : ''}</div>` : '<span data-slide-status class="slide-status">Слайд 1 из 1</span>'}</section>`;
}
export function renderBlock(b: Block, p: Project) {
  const d = [...builtin, ...p.library].find((x) => x.id === b.type);
  if (!d) return '<div class="wrap">Блок недоступен</div>';
  const value = (key: string) =>
    b.values[key] ?? d.fields.find((field) => field.key === key)?.default ?? '';
  if (b.type === 'header') return renderHeader(b, p);
  if (b.type === 'full-image') return renderFullImage(b);
  if (b.type === 'slideshow') return renderSlideshow(b);
  if (b.type === 'features')
    return `<section class="features wrap">${value('eyebrow').trim() ? `<p class="eyebrow">${escapeHTML(value('eyebrow'))}</p>` : ''}<h2>${escapeHTML(value('title'))}</h2><div class="cards">${featureCards(
      b,
    )
      .map(
        (card, index) =>
          `<article><span class="card-num">${String(index + 1).padStart(2, '0')} <span aria-hidden="true">↗</span></span><h3>${escapeHTML(card.title)}</h3><p>${escapeHTML(card.text)}</p></article>`,
      )
      .join('')}</div></section>`;
  let template = d.html;
  if (b.type === 'hero') {
    template = template.replace(
      '<section class="hero wrap">',
      `<section class="hero wrap ${b.layout === 'image-first' ? 'image-first' : 'text-first'}">`,
    );
    const hasPhoto = !!safeImage(b.values.image ?? '');
    const settings = b.images?.image ?? defaultImageSettings;
    template = template.replace(
      '<div class="hero-art">',
      `<div class="hero-art${hasPhoto ? ' has-photo' : ''}" style="${hasPhoto ? mediaStyle(settings) : ''}">`,
    );
    if (hasPhoto)
      template = template.replace(
        /<div class="art-arch">[\s\S]*?<div class="art-tag">[\s\S]*?<\/div>/,
        '',
      );
  }
  if (b.type === 'image-text') {
    template = template.replace(
      '<section class="split wrap">',
      `<section class="split wrap ${b.layout === 'text-first' ? 'text-first' : 'image-first'}">`,
    );
    template = template.replace(
      '<div class="image-placeholder">',
      `<div class="image-placeholder" style="${mediaStyle(b.images?.image)}">`,
    );
  }
  if (
    ['hero', 'header', 'contact'].includes(b.type) &&
    (b.buttonVisible === false ||
      !(b.values.button ?? d.fields.find((f) => f.key === 'button')?.default ?? '').trim())
  )
    template = template.replace(/<a class="sbtn[^\"]*"[^>]*>[\s\S]*?<\/a>/, '');
  if (b.type === 'text' || b.type === 'contact')
    template = template.replace(/ id="(?:about|contacts)"/, '');
  template = template.replace(
    /<img\b[^>]*\bsrc="\{\{([a-zA-Z0-9_]+)\}\}"[^>]*>/g,
    (tag, key: string) => {
      const settings = b.images?.[key] ?? defaultImageSettings;
      const style = imageStyle(settings);
      return tag.includes('style="')
        ? tag.replace(/style="([^"]*)"/, (_, existing: string) => `style="${existing};${style}"`)
        : tag.replace('<img', `<img style="${style}"`);
    },
  );
  let h = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, k: string) => {
    if (k === 'navigation')
      return p.pages
        .map((pg) => `<a href="${pg.slug || 'index'}.html">${escapeHTML(pg.name)}</a>`)
        .join('');
    const f = d.fields.find((f) => f.key === k);
    const v = b.values[k] ?? f?.default ?? '';
    return escapeHTML(f?.type === 'url' ? safeURL(v) : f?.type === 'image' ? safeImage(v) : v);
  });
  h = h.replace(/<img\b[^>]*\bsrc=""[^>]*>/gi, '');
  if (!d.generated) h = h.replace(/<(p|div) class="(?:eyebrow|hero-note|art-tag)">\s*<\/\1>/g, '');
  return h;
}
export function renderPage(
  p: Project,
  page: Page,
  editing = false,
  selected = '',
  preview?: EditorPreview,
) {
  const nonce = 's' + uid().replaceAll('-', '');
  const blocks = pageBlocks(p, page);
  const hasSlideshow = blocks.some((block) => block.type === 'slideshow');
  const hasHeader = blocks.some((block) => block.type === 'header');
  const content = blocks
    .map((b) => {
      const header = b.type === 'header';
      const mode = b.headerMode ?? 'normal';
      const className = header
        ? ' header-shell header-mode-' + mode
        : b.type === 'full-image'
          ? ' full-image-block'
          : '';
      const padding = b.type === 'full-image' || (header && mode === 'compact') ? 0 : b.padding;
      return `<div id="${escapeHTML(blockAnchor(b, blocks))}" data-block="${escapeHTML(b.id)}"${header ? ` data-header-shell data-header-mode="${mode}"${mode !== 'normal' ? ' data-preview-floating="true"' : ''}` : ''} class="studio-block${selected === b.id ? ' is-selected' : ''}${className}" style="padding-block:${padding}px;${b.background ? 'background:' + b.background : ''}">${renderBlock(b, p)}</div>`;
    })
    .join('');
  const b = p.brand;
  return `<!DOCTYPE html><html lang="${p.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHTML(page.description)}"><title>${escapeHTML(page.title || p.name)}</title><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src ${editing || hasSlideshow || hasHeader ? "'nonce-" + nonce + "'" : "'none'"}; base-uri 'none'; form-action 'none'">${safeImage(b.favicon) ? `<link rel="icon" href="${escapeHTML(safeImage(b.favicon))}">` : ''}<style>
 :root{--primary:${b.primary};--background:${b.background};--text:${b.text};--accent:${b.accent};--radius:${b.radius}px;--width:${b.width}px;--font:${fonts[b.font]};--heading-font:${fonts[b.headingFont]}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--background);color:var(--text);font-family:var(--font);font-size:16px;line-height:1.65}a{color:inherit;text-decoration:none}img{max-width:100%;display:block}h1,h2,h3,p{margin:0}h1,h2{font-family:var(--heading-font);font-weight:400;line-height:1.06;letter-spacing:-.045em;white-space:pre-line}h1{font-size:clamp(44px,5.2vw,74px)}h2{font-size:clamp(32px,3.5vw,48px)}h3{font-size:20px;line-height:1.3;margin-bottom:12px}p{white-space:pre-line}.wrap{width:calc(100% - 80px);max-width:var(--width);margin-inline:auto}.eyebrow{font-size:10px;letter-spacing:.16em;font-weight:650;margin-bottom:24px}.lead{font-size:16px;opacity:.7;line-height:1.85}.sbtn{display:inline-flex;align-items:center;justify-content:center;gap:30px;background:var(--primary);color:white;padding:15px 24px;border-radius:var(--radius);font-size:13px;font-weight:600;margin-top:28px}.sbtn.small{margin:0;padding:11px 18px;gap:12px}.site-nav{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:94px}.site-nav nav{display:flex;gap:24px;font-size:12px;opacity:.7}.wordmark{font-size:21px;font-weight:650;letter-spacing:-.05em}.brand-logo{max-height:48px;max-width:150px}.hero{display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:55px;padding-block:60px 90px}.hero .lead{max-width:440px;margin-top:25px}.hero-note{font-size:10px;opacity:.45;margin-top:34px}.hero-art{height:420px;position:relative;background:var(--accent);border-radius:50% 50% var(--radius) var(--radius);overflow:hidden}.art-arch{position:absolute;inset:56px 60px -20px;background:var(--primary);border-radius:50% 50% 0 0;transform:rotate(-15deg);opacity:.93}.art-circle{position:absolute;width:130px;height:130px;border-radius:50%;background:#d99b72;right:22px;top:57px;box-shadow:12px 15px 20px #162f2020}.art-stone{position:absolute;width:230px;height:110px;background:#eae6d6;bottom:32px;left:-15px;transform:rotate(-15deg);border-radius:80px;box-shadow:0 20px 30px #162f2029}.art-tag{position:absolute;bottom:35px;right:24px;font-size:9px;letter-spacing:.17em;writing-mode:vertical-rl;color:var(--background)}.hero-photo{position:absolute;inset:0;z-index:2;width:100%;height:100%;object-fit:cover}.story{border-top:1px solid #80808022;display:grid;grid-template-columns:1fr 1fr;gap:90px;padding-block:75px}.story .lead{padding-top:40px}.features{padding-block:70px 95px}.features h2{max-width:540px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:35px}.cards article{background:color-mix(in srgb,var(--accent) 35%,transparent);border:1px solid #80808015;border-radius:var(--radius);padding:30px}.card-num{display:block;font-size:12px;opacity:.6;margin-bottom:45px}.cards p{font-size:13px;opacity:.7}.contact{background:var(--accent);padding-block:75px}.contact h2{max-width:700px}.contact p:not(.eyebrow){opacity:.7;margin-top:20px}.site-footer{display:flex;align-items:center;gap:24px;justify-content:space-between;padding-block:30px;font-size:11px}.site-footer strong{font-size:17px}.site-footer p{opacity:.5}.split{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:60px;padding-block:70px}.split .lead{margin-top:24px}.image-placeholder{height:340px;background:var(--accent);border-radius:var(--radius);overflow:hidden}.image-placeholder img{width:100%;height:100%;object-fit:cover}.quote{padding-block:75px;text-align:center;max-width:800px}.quote>span{font-family:Georgia;font-size:70px;color:var(--primary)}blockquote{margin:0 0 25px;font-family:var(--heading-font);font-size:34px;line-height:1.3}.quote p{font-size:12px;opacity:.6}.faq{padding-block:70px}.faq details{border-block:1px solid #80808033;margin-top:30px;padding:22px 0}.faq summary{cursor:pointer;font-weight:600}.faq p{padding-top:20px;opacity:.7}.studio-block{position:relative}${editing ? 'html{scroll-behavior:auto!important;overflow-anchor:none}.studio-block{cursor:pointer;min-height:40px}.studio-block:hover{outline:2px solid #8ca49a;outline-offset:-2px}.studio-block.is-selected{outline:2px solid #365548;outline-offset:-2px}' : ''}
 ${slideshowCSS}
 .hero.image-first>div:first-child{order:2}.hero.image-first>.hero-art{order:1}.hero.image-first{grid-template-columns:1fr 1.15fr}.hero-art.has-photo{border-radius:var(--radius)}.split.text-first>div:first-child{order:2}.split.text-first>div:last-child{order:1}.cards{grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}.hero>div,.split>div,.cards article{min-width:0;overflow-wrap:anywhere}.studio-block{scroll-margin-top:20px}
 @media(max-width:700px){.hero.image-first{grid-template-columns:1fr}.wrap{width:calc(100% - 40px)}.site-nav{min-height:76px}.site-nav nav{display:none}.site-nav .sbtn{font-size:10px;padding:9px 12px}.wordmark{font-size:18px}.hero{grid-template-columns:1fr;gap:35px;padding-block:35px 55px}.hero-art{height:320px;max-width:380px;width:100%;margin-inline:auto}.hero-note{margin-top:20px}.hero .eyebrow{font-size:9px}.story,.split{grid-template-columns:1fr;gap:24px;padding-block:50px}.story .lead{padding:0}.features{padding-block:50px}.cards{grid-template-columns:1fr}.card-num{margin-bottom:24px}.contact{padding-block:50px}.site-footer{flex-wrap:wrap;gap:12px}.site-footer strong{width:100%}.faq,.quote{padding-block:50px}blockquote{font-size:28px}}
 ${headerCSS}
 ${fullImageCSS}
 </style></head><body>${content}${hasHeader ? `<script nonce="${nonce}">${headerScript}<\/script>` : ''}${hasSlideshow ? `<script nonce="${nonce}">${slideshowScript}<\/script>` : ''}${editing ? `<script nonce="${nonce}">${editorPreviewScript(preview ?? { id: '', position: initialPreviewPosition })}<\/script>` : ''}</body></html>`;
}
export function projectFiles(p: Project) {
  return [
    ...p.pages.map((pg) => ({ path: (pg.slug || 'index') + '.html', content: renderPage(p, pg) })),
    { path: 'project.json', content: JSON.stringify(p, null, 2) },
    { path: '.nojekyll', content: '' },
    ...p.library.flatMap((d) => [
      { path: `blocks/${d.id}/block.html`, content: d.html },
      { path: `blocks/${d.id}/schema.json`, content: JSON.stringify(d, null, 2) },
    ]),
    ...(p.github.domain ? [{ path: 'CNAME', content: p.github.domain + '\n' }] : []),
  ];
}

/** Only visitor-facing files belong in a public publication. Draft schemas stay private. */
export function publicSiteFiles(p: Project) {
  return projectFiles(p).filter(
    (file) =>
      (file.path.endsWith('.html') && !file.path.startsWith('blocks/')) ||
      file.path === '.nojekyll' ||
      file.path === 'CNAME',
  );
}
