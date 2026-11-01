import { z } from 'zod';
export const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9_]{0,30}$/),
  label: z.string().min(1).max(80),
  type: z.enum(['text', 'textarea', 'url', 'image']),
  default: z.string().max(10000),
});
export const definitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,70}$/),
  name: z.string().min(1).max(100),
  description: z.string().max(300),
  category: z.enum(['Основные', 'Контент', 'Контакты', 'Мои блоки']),
  html: z.string().max(60000),
  fields: z.array(fieldSchema).max(30),
  generated: z.boolean().optional(),
});
export const blockSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().max(80),
  values: z.record(z.string().max(900000)),
  hidden: z.boolean().default(false),
  padding: z.number().int().min(0).max(160).default(0),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export const pageSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .max(80),
  title: z.string().max(150),
  description: z.string().max(400),
  blocks: z.array(blockSchema).max(80),
});
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().min(1).max(100),
    language: z.enum(['ru', 'kk', 'en']),
    brand: z.object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      font: z.enum(['system', 'serif', 'mono']),
      headingFont: z.enum(['system', 'serif', 'mono']),
      radius: z.number().min(0).max(40),
      width: z.number().min(800).max(1600),
      logo: z.string().max(900000),
      favicon: z.string().max(900000),
    }),
    pages: z.array(pageSchema).min(1).max(30),
    library: z.array(definitionSchema).max(100),
    shared: z.object({ header: z.array(blockSchema).max(5), footer: z.array(blockSchema).max(5) }),
    github: z.object({
      repo: z
        .string()
        .max(180)
        .refine((v) => !v || /^[\w.-]+\/[\w.-]+$/.test(v), 'Используйте owner/repository'),
      branch: z
        .string()
        .regex(/^[a-zA-Z0-9._/-]+$/)
        .max(80),
      domain: z
        .string()
        .max(253)
        .refine(
          (v) =>
            !v || /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(v),
          'Введите домен без https:// и пути',
        ),
    }),
    ai: z.object({
      model: z
        .string()
        .regex(/^[a-zA-Z0-9._:-]+$/)
        .max(100),
    }),
  })
  .superRefine((v, ctx) => {
    const slugs = new Set<string>();
    const ids = new Set<string>();
    for (const p of v.pages) {
      if (slugs.has(p.slug || 'index'))
        ctx.addIssue({ code: 'custom', message: 'Адреса страниц должны отличаться' });
      slugs.add(p.slug || 'index');
    }
    if (!v.pages.some((p) => p.slug === ''))
      ctx.addIssue({ code: 'custom', message: 'Нужна главная страница с пустым адресом' });
    for (const b of [...v.shared.header, ...v.shared.footer, ...v.pages.flatMap((p) => p.blocks)]) {
      if (ids.has(b.id)) ctx.addIssue({ code: 'custom', message: 'Повторяющийся ID блока' });
      ids.add(b.id);
    }
    if (new Set(v.library.map((b) => b.id)).size !== v.library.length)
      ctx.addIssue({ code: 'custom', message: 'Повторяющийся ID шаблона' });
    if (new Set(v.pages.map((p) => p.id)).size !== v.pages.length)
      ctx.addIssue({ code: 'custom', message: 'Повторяющийся ID страницы' });
    const reserved = new Set(builtin.map((d) => d.id));
    if (v.library.some((d) => reserved.has(d.id)))
      ctx.addIssue({ code: 'custom', message: 'Свой блок не может заменять системный шаблон' });
    const known = new Set([...reserved, ...v.library.map((d) => d.id)]);
    if (
      [...v.shared.header, ...v.shared.footer, ...v.pages.flatMap((p) => p.blocks)].some(
        (b) => !known.has(b.type),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'В проекте есть блок без шаблона' });
  });
export type Project = z.infer<typeof projectSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Definition = z.infer<typeof definitionSchema>;
export type Page = z.infer<typeof pageSchema>;
export function uid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 15) | 64;
  a[8] = (a[8] & 63) | 128;
  const h = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  return (
    h.slice(0, 8) +
    '-' +
    h.slice(8, 12) +
    '-' +
    h.slice(12, 16) +
    '-' +
    h.slice(16, 20) +
    '-' +
    h.slice(20)
  );
}
export const builtin: Definition[] = [
  {
    id: 'header',
    name: 'Шапка сайта',
    description: 'Название, навигация и кнопка действия',
    category: 'Основные',
    fields: [
      { key: 'name', label: 'Название', type: 'text', default: 'Точка роста' },
      { key: 'button', label: 'Текст кнопки', type: 'text', default: 'Давайте обсудим' },
      { key: 'href', label: 'Ссылка кнопки', type: 'url', default: '#contacts' },
    ],
    html: '<header class="site-nav wrap"><a class="wordmark" href="index.html">{{name}}</a><nav>{{navigation}}</nav><a class="sbtn small" href="{{href}}">{{button}}</a></header>',
  },
  {
    id: 'hero',
    name: 'Первый экран',
    description: 'Крупный заголовок и выразительная композиция',
    category: 'Основные',
    fields: [
      {
        key: 'eyebrow',
        label: 'Надзаголовок',
        type: 'text',
        default: 'ВАШИ ИДЕИ. НОВЫЕ ВОЗМОЖНОСТИ.',
      },
      {
        key: 'title',
        label: 'Заголовок',
        type: 'textarea',
        default: 'Всё начинается\nс хорошей идеи.',
      },
      {
        key: 'text',
        label: 'Описание',
        type: 'textarea',
        default:
          'Создаём пространство для смелых решений. Расскажите о себе, покажите главное и сделайте следующий шаг.',
      },
      { key: 'button', label: 'Текст кнопки', type: 'text', default: 'Узнать больше' },
      { key: 'href', label: 'Ссылка', type: 'url', default: '#about' },
      { key: 'image', label: 'Изображение (необязательно)', type: 'image', default: '' },
    ],
    html: '<section class="hero wrap"><div><p class="eyebrow">{{eyebrow}}</p><h1>{{title}}</h1><p class="lead">{{text}}</p><a class="sbtn" href="{{href}}">{{button}} <span>↗</span></a><p class="hero-note">Большие перемены начинаются с малого.</p></div><div class="hero-art"><img class="hero-photo" src="{{image}}" alt=""><div class="art-arch"></div><div class="art-circle"></div><div class="art-stone"></div><div class="art-tag">СОЗДАВАЙТЕ СВОЁ ↗</div></div></section>',
  },
  {
    id: 'text',
    name: 'Текст и история',
    description: 'Заголовок и текст в две колонки',
    category: 'Контент',
    fields: [
      { key: 'eyebrow', label: 'Метка', type: 'text', default: 'О НАС' },
      {
        key: 'title',
        label: 'Заголовок',
        type: 'text',
        default: 'Место, где идеи обретают форму.',
      },
      {
        key: 'text',
        label: 'Текст',
        type: 'textarea',
        default:
          'За каждым проектом стоят люди и их история. Здесь можно рассказать о своём подходе, опыте и том, что для вас действительно важно.',
      },
    ],
    html: '<section id="about" class="story wrap"><div><p class="eyebrow">{{eyebrow}}</p><h2>{{title}}</h2></div><p class="lead">{{text}}</p></section>',
  },
  {
    id: 'features',
    name: 'Преимущества',
    description: 'Три карточки с главными особенностями',
    category: 'Контент',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text', default: 'Внимание к каждой детали.' },
      ...['one', 'two', 'three'].flatMap((key, i) => [
        {
          key: key + 'Title',
          label: 'Карточка ' + (i + 1) + ' — заголовок',
          type: 'text' as const,
          default: ['Простой подход', 'Продуманные решения', 'Личное участие'][i],
        },
        {
          key: key + 'Text',
          label: 'Карточка ' + (i + 1) + ' — описание',
          type: 'textarea' as const,
          default: [
            'Убираем лишнее, оставляем то, что работает.',
            'Соединяем красоту и удобство в одном месте.',
            'На связи на каждом шаге вашего проекта.',
          ][i],
        },
      ]),
    ],
    html: '<section class="features wrap"><p class="eyebrow">НАШ ПОДХОД</p><h2>{{title}}</h2><div class="cards"><article><span class="card-num">01 ↗</span><h3>{{oneTitle}}</h3><p>{{oneText}}</p></article><article><span class="card-num">02 ↗</span><h3>{{twoTitle}}</h3><p>{{twoText}}</p></article><article><span class="card-num">03 ↗</span><h3>{{threeTitle}}</h3><p>{{threeText}}</p></article></div></section>',
  },
  {
    id: 'image-text',
    name: 'Изображение с текстом',
    description: 'Фотография и описание рядом',
    category: 'Контент',
    fields: [
      { key: 'image', label: 'Изображение', type: 'image', default: '' },
      { key: 'title', label: 'Заголовок', type: 'text', default: 'Покажите главное.' },
      {
        key: 'text',
        label: 'Описание',
        type: 'textarea',
        default:
          'Добавьте фотографию проекта, продукта или команды. Хорошие истории заслуживают хорошего представления.',
      },
    ],
    html: '<section class="split wrap"><div class="image-placeholder"><img src="{{image}}" alt="{{title}}"></div><div><p class="eyebrow">В ДЕТАЛЯХ</p><h2>{{title}}</h2><p class="lead">{{text}}</p></div></section>',
  },
  {
    id: 'quote',
    name: 'Отзыв',
    description: 'Цитата с именем автора',
    category: 'Контент',
    fields: [
      {
        key: 'quote',
        label: 'Цитата',
        type: 'textarea',
        default: 'Хороший результат начинается с внимания к людям.',
      },
      { key: 'author', label: 'Автор', type: 'text', default: 'Ваша команда' },
    ],
    html: '<section class="quote wrap"><span>“</span><blockquote>{{quote}}</blockquote><p>{{author}}</p></section>',
  },
  {
    id: 'faq',
    name: 'Вопросы и ответы',
    description: 'Раскрывающиеся ответы на частые вопросы',
    category: 'Контент',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text', default: 'Остались вопросы?' },
      { key: 'question', label: 'Вопрос', type: 'text', default: 'С чего начать сотрудничество?' },
      {
        key: 'answer',
        label: 'Ответ',
        type: 'textarea',
        default: 'Напишите нам. Обсудим вашу задачу и подберём удобный следующий шаг.',
      },
    ],
    html: '<section class="faq wrap"><h2>{{title}}</h2><details><summary>{{question}}</summary><p>{{answer}}</p></details></section>',
  },
  {
    id: 'contact',
    name: 'Контакты и действие',
    description: 'Приглашение написать или позвонить',
    category: 'Контакты',
    fields: [
      {
        key: 'title',
        label: 'Заголовок',
        type: 'text',
        default: 'Давайте создадим\nчто-нибудь хорошее.',
      },
      {
        key: 'text',
        label: 'Описание',
        type: 'textarea',
        default: 'Расскажите о своей идее. Мы поможем сделать первый шаг.',
      },
      { key: 'button', label: 'Текст кнопки', type: 'text', default: 'Связаться с нами' },
      {
        key: 'href',
        label: 'Ссылка (email, телефон, WhatsApp)',
        type: 'url',
        default: 'mailto:hello@example.com',
      },
    ],
    html: '<section id="contacts" class="contact"><div class="wrap"><p class="eyebrow">БУДЕМ НА СВЯЗИ</p><h2>{{title}}</h2><p>{{text}}</p><a class="sbtn" href="{{href}}">{{button}} ↗</a></div></section>',
  },
  {
    id: 'footer',
    name: 'Подвал сайта',
    description: 'Подпись и контакты внизу страницы',
    category: 'Контакты',
    fields: [
      { key: 'name', label: 'Название', type: 'text', default: 'Точка роста' },
      { key: 'note', label: 'Подпись', type: 'text', default: 'Создано с вниманием к деталям.' },
      { key: 'email', label: 'Электронная почта', type: 'text', default: 'hello@example.com' },
    ],
    html: '<footer class="site-footer wrap"><strong>{{name}}</strong><p>{{note}}</p><a href="mailto:{{email}}">{{email}}</a></footer>',
  },
];
export function makeBlock(type: string, library: Definition[] = []): Block {
  const d = [...builtin, ...library].find((d) => d.id === type);
  if (!d) throw new Error('Блок не найден');
  return {
    id: uid(),
    type,
    values: Object.fromEntries(d.fields.map((f) => [f.key, f.default])),
    hidden: false,
    padding: 0,
  };
}
export function freshProject(): Project {
  return {
    schemaVersion: 1,
    name: 'Мой первый сайт',
    language: 'ru',
    brand: {
      primary: '#365548',
      background: '#fafaf7',
      text: '#24372d',
      accent: '#d6e3cb',
      font: 'system',
      headingFont: 'serif',
      radius: 8,
      width: 1120,
      logo: '',
      favicon: '',
    },
    pages: [
      {
        id: uid(),
        name: 'Главная',
        slug: '',
        title: 'Точка роста — ваши новые возможности',
        description: 'Идеи, которые обретают форму.',
        blocks: ['hero', 'text', 'features', 'contact'].map((t) => makeBlock(t)),
      },
    ],
    shared: { header: [makeBlock('header')], footer: [makeBlock('footer')] },
    library: [],
    github: { repo: '', branch: 'gh-pages', domain: '' },
    ai: { model: 'gpt-4.1-mini' },
  };
}
export function clonePage(p: Page): Page {
  return {
    ...structuredClone(p),
    id: uid(),
    name: p.name + ' — копия',
    slug: (p.slug || 'page') + '-' + uid().slice(0, 6),
    blocks: p.blocks.map((b) => ({ ...structuredClone(b), id: uid() })),
  };
}
