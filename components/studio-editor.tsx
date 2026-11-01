'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  GripVertical,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Layers,
  PanelLeft,
  SlidersHorizontal,
  ArrowLeft,
  FileText,
  Sparkles,
  Search,
  X,
  Check,
  Globe,
  Settings2,
  Type,
  Image as ImageIcon,
  Quote,
  LayoutTemplate,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { type StudioState } from '@/lib/studio/use-studio';
import {
  type Project,
  type Block,
  type Definition,
  builtin,
  makeBlock,
  uid,
  clonePage,
} from '@/lib/studio/model';
import { renderPage } from '@/lib/studio/render';
import SiteFrame from './studio-preview';
import { TextField, Field, ImageField, Tag } from './studio-controls';
const blockIcons: Record<string, typeof Layers> = {
  header: LayoutTemplate,
  hero: LayoutTemplate,
  text: Type,
  features: Layers,
  'image-text': ImageIcon,
  quote: Quote,
  faq: HelpCircle,
  contact: Mail,
  footer: LayoutTemplate,
};
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const focus = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button, input, textarea, select')?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose.current();
      if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,textarea,select,a[href],[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      focus?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={'modal ' + (wide ? 'wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Закрыть окно">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function BlockLibrary({
  library,
  choose,
  close,
  onAI,
}: {
  library: Definition[];
  choose: (id: string) => void;
  close: () => void;
  onAI: () => void;
}) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState('Все');
  const definitions = [...builtin, ...library].filter(
    (d) =>
      (category === 'Все' || d.category === category) &&
      (d.name + ' ' + d.description).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Modal wide title="Добавить блок" close={close}>
      <div className="library-tools">
        <div className="search-field">
          <Search size={16} />
          <input
            placeholder="Найти блок…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn primary" onClick={onAI}>
          <Sparkles size={14} />
          Создать с ИИ
        </button>
      </div>
      <div className="tabs library-tabs">
        {['Все', 'Основные', 'Контент', 'Контакты', 'Мои блоки'].map((c) => (
          <button className={c === category ? 'active' : ''} key={c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="library-grid">
        {definitions.map((d, i) => {
          const Icon = blockIcons[d.id] || Sparkles;
          return (
            <button className="block-card" onClick={() => choose(d.id)} key={d.id}>
              <div className={'block-thumbnail block-thumb-' + (i % 4)}>
                <Icon size={26} strokeWidth={1.2} />
                <div className="thumb-lines">
                  <i />
                  <i />
                  <i />
                </div>
                {d.generated && <span>ИИ</span>}
              </div>
              <strong>{d.name}</strong>
              <p>{d.description}</p>
              <span className="block-add">
                <Plus size={14} />
              </span>
            </button>
          );
        })}
      </div>
      {!definitions.length && (
        <div className="empty-state">
          <Layers size={28} />
          <h3>Здесь пока пусто</h3>
          <p>Попробуйте другой запрос или создайте свой блок с ИИ.</p>
        </div>
      )}
    </Modal>
  );
}
export default function Editor({
  s,
  pageId,
  setPageId,
  go,
  onPreview,
}: {
  s: StudioState;
  pageId: string;
  setPageId: (id: string) => void;
  go: (v: string) => void;
  onPreview: () => void;
}) {
  const p = s.project!;
  const page = p.pages.find((pg) => pg.id === pageId) || p.pages[0];
  const [selected, setSelected] = useState(''),
    [device, setDevice] = useState('desktop'),
    [panel, setPanel] = useState<'tree' | 'inspect' | null>(null),
    [add, setAdd] = useState<{ group: 'header' | 'footer' | 'page'; index: number } | null>(null),
    [pageModal, setPageModal] = useState(false),
    [pageName, setPageName] = useState(''),
    [deleteId, setDeleteId] = useState(''),
    [pageSettings, setPageSettings] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null),
    scroll = useRef(0),
    drag = useRef<{ id: string; group: string } | null>(null);
  useEffect(() => {
    if (window.matchMedia('(max-width:680px)').matches) setDevice('mobile');
  }, []);
  const all = [...p.shared.header, ...page.blocks, ...p.shared.footer],
    block = all.find((b) => b.id === selected),
    definition = [...builtin, ...p.library].find((d) => d.id === block?.type);
  function list(d: Project, group: string) {
    return group === 'page'
      ? d.pages.find((pg) => pg.id === page.id)!.blocks
      : d.shared[group as 'header' | 'footer'];
  }
  function groupOf(id: string) {
    return p.shared.header.some((b) => b.id === id)
      ? 'header'
      : p.shared.footer.some((b) => b.id === id)
        ? 'footer'
        : 'page';
  }
  function editBlock(fn: (b: Block) => void) {
    s.update((d) => {
      const b = list(d, groupOf(selected)).find((b) => b.id === selected);
      if (b) fn(b);
    });
  }
  function move(id: string, delta: number) {
    s.update((d) => {
      const a = list(d, groupOf(id)),
        i = a.findIndex((b) => b.id === id),
        j = i + delta;
      if (i >= 0 && j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]];
    }, false);
  }
  function duplicate(id: string) {
    const newId = uid();
    s.update((d) => {
      const a = list(d, groupOf(id)),
        i = a.findIndex((b) => b.id === id);
      if (i >= 0) a.splice(i + 1, 0, { ...structuredClone(a[i]), id: newId });
    }, false);
    setSelected(newId);
  }
  useEffect(() => {
    function message(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.studio === 'select' && all.some((b) => b.id === e.data.id)) {
        setSelected(e.data.id);
        setPanel('inspect');
        setPageSettings(false);
      }
      if (e.data?.studio === 'scroll' && typeof e.data.y === 'number') scroll.current = e.data.y;
    }
    window.addEventListener('message', message);
    return () => window.removeEventListener('message', message);
  }, [all]);
  function pick(id: string) {
    setSelected(id);
    setPageSettings(false);
    setPanel('inspect');
  }
  function tree(title: string, blocks: Block[], group: 'header' | 'footer' | 'page') {
    return (
      <div className="tree-group">
        <div className="tree-heading">
          <span>{title}</span>
          {group !== 'page' && <Tag>Общие</Tag>}
        </div>
        {blocks.map((b, i) => {
          const def = [...builtin, ...p.library].find((d) => d.id === b.type),
            Icon = blockIcons[b.type] || Sparkles;
          return (
            <div
              draggable
              onDragStart={() => {
                drag.current = { id: b.id, group };
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag.current?.group !== group) return;
                const source = drag.current.id;
                s.update((d) => {
                  const a = list(d, group),
                    from = a.findIndex((x) => x.id === source),
                    to = a.findIndex((x) => x.id === b.id);
                  if (from >= 0 && to >= 0) a.splice(to, 0, ...a.splice(from, 1));
                }, false);
                drag.current = null;
              }}
              className={
                'tree-row ' +
                (selected === b.id && !pageSettings ? 'active' : '') +
                (b.hidden ? ' hidden-block' : '')
              }
              key={b.id}
            >
              <GripVertical size={13} className="grip" />
              <button className="tree-label" onClick={() => pick(b.id)}>
                <Icon size={15} />
                <span>{b.values.title || b.values.name || def?.name || 'Блок'}</span>
              </button>
              <button
                className="icon-btn tiny"
                aria-label={b.hidden ? 'Показать блок' : 'Скрыть блок'}
                onClick={() =>
                  s.update((d) => {
                    list(d, group)[i].hidden = !b.hidden;
                  }, false)
                }
              >
                {b.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          );
        })}
        <button className="add-section" onClick={() => setAdd({ group, index: blocks.length })}>
          <Plus size={14} />
          Добавить блок
        </button>
      </div>
    );
  }
  return (
    <div className="editor-shell">
      <div className="editor-bar">
        <div className="editor-bar-left">
          <button
            className="icon-btn mobile-panel-btn"
            aria-label="Структура страницы"
            onClick={() => setPanel(panel === 'tree' ? null : 'tree')}
          >
            <PanelLeft size={18} />
          </button>
          <select
            aria-label="Текущая страница"
            value={page.id}
            onChange={(e) => {
              setPageId(e.target.value);
              setSelected('');
              scroll.current = 0;
            }}
          >
            {p.pages.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.name}
              </option>
            ))}
          </select>
          <button
            className="icon-btn"
            aria-label="Настройки страницы"
            onClick={() => {
              setPageSettings(true);
              setPanel('inspect');
            }}
          >
            <Settings2 size={16} />
          </button>
        </div>
        <div className="segmented device-switch">
          {[
            ['desktop', Monitor, 'Компьютер'],
            ['tablet', Tablet, 'Планшет'],
            ['mobile', Smartphone, 'Телефон'],
          ].map(([key, Icon, label]) => {
            const I = Icon as typeof Monitor;
            return (
              <button
                key={key as string}
                aria-label={label as string}
                onClick={() => setDevice(key as string)}
                className={device === key ? 'active' : ''}
              >
                <I size={16} />
              </button>
            );
          })}
        </div>
        <div className="editor-bar-right">
          <span className="canvas-size">
            {device === 'mobile' ? '390' : device === 'tablet' ? '768' : 'Адаптивно'} px
          </span>
          <button className="btn compact" onClick={onPreview}>
            <Eye size={14} />
            <span>Предпросмотр</span>
          </button>
          <button
            className="icon-btn mobile-panel-btn"
            aria-label="Настройки блока"
            onClick={() => setPanel(panel === 'inspect' ? null : 'inspect')}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </div>
      <div className="editor-workspace">
        <aside className={'editor-tree ' + (panel === 'tree' ? 'panel-open' : '')}>
          <div className="panel-title">
            <h3>Структура страницы</h3>
            <button
              className="icon-btn mobile-panel-btn"
              aria-label="Закрыть структуру"
              onClick={() => setPanel(null)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="tree-scroll">
            {tree('Шапка сайта', p.shared.header, 'header')}
            {tree('Содержимое', page.blocks, 'page')}
            {tree('Подвал сайта', p.shared.footer, 'footer')}
          </div>
          <div className="pages-section">
            <div className="tree-heading">
              <span>СТРАНИЦЫ</span>
              <button
                className="icon-btn tiny"
                aria-label="Создать страницу"
                onClick={() => setPageModal(true)}
              >
                <Plus size={15} />
              </button>
            </div>
            {p.pages.map((pg) => (
              <div className={'page-row ' + (pg.id === page.id ? 'active' : '')} key={pg.id}>
                <button
                  onClick={() => {
                    setPageId(pg.id);
                    setSelected('');
                    scroll.current = 0;
                    setPanel(null);
                  }}
                >
                  <FileText size={14} />
                  {pg.name}
                </button>
                <button
                  className="icon-btn tiny"
                  aria-label={'Дублировать страницу ' + pg.name}
                  onClick={() => {
                    const copy = clonePage(pg);
                    s.update((d) => {
                      d.pages.push(copy);
                    }, false);
                    setPageId(copy.id);
                  }}
                >
                  <Copy size={12} />
                </button>
                {pg.slug && (
                  <button
                    className="icon-btn tiny"
                    aria-label={'Удалить страницу ' + pg.name}
                    onClick={() => setDeleteId('page:' + pg.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="tree-brand" onClick={() => go('brand')}>
            <span className="brand-dots">
              <i />
              <i />
              <i />
            </span>
            Общий брендинг
            <ChevronRight size={14} />
          </button>
        </aside>
        <div className={'canvas-area device-' + device}>
          <div className="canvas-top-label">
            <span className="dot" />
            {page.slug ? '/' + page.slug : 'Главная страница'}
            <span>ЧЕРНОВИК</span>
          </div>
          <div className="canvas-frame">
            <SiteFrame
              frameRef={frame}
              title="Редактируемый сайт"
              width={
                device === 'mobile'
                  ? 390
                  : device === 'tablet'
                    ? 768
                    : Math.max(1000, p.brand.width + 80)
              }
              sandbox="allow-scripts"
              html={renderPage(p, page, true, selected)}
              onLoad={() =>
                frame.current?.contentWindow?.postMessage(
                  { studio: 'scroll-to', y: scroll.current },
                  '*',
                )
              }
            />
          </div>
          <button
            className="canvas-add"
            onClick={() => setAdd({ group: 'page', index: page.blocks.length })}
          >
            <Plus size={16} />
            Добавить блок на страницу
          </button>
          <p className="canvas-hint">
            Нажмите на блок, чтобы изменить его · ⌘Z отменить · ⌘S сохранить
          </p>
        </div>
        <aside className={'editor-inspector ' + (panel === 'inspect' ? 'panel-open' : '')}>
          <div className="panel-title">
            <h3>{pageSettings ? 'Настройки страницы' : definition?.name || 'Настройки блока'}</h3>
            <button
              className="icon-btn mobile-panel-btn"
              aria-label="Закрыть настройки"
              onClick={() => setPanel(null)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="inspector-scroll">
            {pageSettings ? (
              <>
                <TextField
                  label="Название в меню"
                  value={page.name}
                  onChange={(v) =>
                    s.update((d) => {
                      d.pages.find((pg) => pg.id === page.id)!.name = v;
                    })
                  }
                />
                {page.slug !== '' && (
                  <TextField
                    label="Адрес страницы"
                    value={page.slug}
                    onChange={(v) =>
                      s.update((d) => {
                        d.pages.find((pg) => pg.id === page.id)!.slug = v
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '');
                      })
                    }
                    hint="Латинские буквы, цифры и дефис. Например: about"
                  />
                )}
                <TextField
                  label="Заголовок для поисковиков"
                  value={page.title}
                  onChange={(v) =>
                    s.update((d) => {
                      d.pages.find((pg) => pg.id === page.id)!.title = v;
                    })
                  }
                />
                <TextField
                  multiline
                  label="Описание страницы"
                  value={page.description}
                  onChange={(v) =>
                    s.update((d) => {
                      d.pages.find((pg) => pg.id === page.id)!.description = v;
                    })
                  }
                />
              </>
            ) : block && definition ? (
              <>
                <div className="inspector-meta">
                  <Tag>
                    {groupOf(block.id) === 'page' ? 'На этой странице' : 'На всех страницах'}
                  </Tag>
                  {definition.generated && (
                    <Tag>
                      <Sparkles size={10} />
                      ИИ-блок
                    </Tag>
                  )}
                </div>
                {definition.fields.map((f) =>
                  f.type === 'image' ? (
                    <ImageField
                      key={f.key}
                      label={f.label}
                      value={block.values[f.key] ?? f.default}
                      onChange={(v) =>
                        editBlock((b) => {
                          b.values[f.key] = v;
                        })
                      }
                      notify={s.notify}
                    />
                  ) : (
                    <TextField
                      key={f.key}
                      label={f.label}
                      value={block.values[f.key] ?? f.default}
                      multiline={f.type === 'textarea'}
                      onChange={(v) =>
                        editBlock((b) => {
                          b.values[f.key] = v;
                        })
                      }
                    />
                  ),
                )}
                <div className="inspector-divider" />
                <h4>Оформление секции</h4>
                <Field label={'Отступ сверху и снизу: ' + block.padding + ' px'}>
                  <input
                    type="range"
                    min="0"
                    max="160"
                    step="4"
                    value={block.padding}
                    onChange={(e) =>
                      editBlock((b) => {
                        b.padding = +e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Фон секции">
                  <div className="color-field">
                    <input
                      aria-label="Цвет фона секции"
                      type="color"
                      value={block.background || p.brand.background}
                      onChange={(e) =>
                        editBlock((b) => {
                          b.background = e.target.value;
                        })
                      }
                    />
                    <span>{block.background || 'Из брендинга'}</span>
                    {block.background && (
                      <button
                        className="icon-btn tiny"
                        aria-label="Сбросить фон"
                        onClick={() =>
                          editBlock((b) => {
                            delete b.background;
                          })
                        }
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </Field>
                <div className="block-actions">
                  <button className="btn compact" onClick={() => move(block.id, -1)}>
                    <ChevronUp size={14} />
                    Выше
                  </button>
                  <button className="btn compact" onClick={() => move(block.id, 1)}>
                    <ChevronDown size={14} />
                    Ниже
                  </button>
                  <button className="btn compact" onClick={() => duplicate(block.id)}>
                    <Copy size={14} />
                    Копия
                  </button>
                </div>
                <button
                  className="add-section"
                  onClick={() => {
                    const a = groupOf(block.id);
                    setAdd({ group: a, index: list(p, a).findIndex((b) => b.id === block.id) + 1 });
                  }}
                >
                  <Plus size={14} />
                  Добавить блок после этого
                </button>
                <button
                  className="text-btn danger delete-block"
                  onClick={() => setDeleteId(block.id)}
                >
                  <Trash2 size={14} />
                  Удалить блок
                </button>
              </>
            ) : (
              <div className="inspector-empty">
                <SlidersHorizontal size={28} strokeWidth={1.2} />
                <h3>Каждая деталь под контролем</h3>
                <p>
                  Выберите блок на странице или в структуре слева. Здесь появятся его настройки.
                </p>
                <button
                  className="btn compact"
                  onClick={() => {
                    setPageSettings(true);
                  }}
                >
                  Настройки страницы
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
      {add && (
        <BlockLibrary
          library={p.library}
          close={() => setAdd(null)}
          onAI={() => {
            setAdd(null);
            go('ai');
          }}
          choose={(type) => {
            const b = makeBlock(type, p.library);
            s.update((d) => {
              list(d, add.group).splice(add.index, 0, b);
            }, false);
            setSelected(b.id);
            setPageSettings(false);
            setAdd(null);
            setPanel('inspect');
            s.notify('Блок добавлен');
          }}
        />
      )}
      {pageModal && (
        <Modal title="Новая страница" close={() => setPageModal(false)}>
          <div className="modal-body">
            <TextField
              label="Название страницы"
              placeholder="Например: О нас"
              value={pageName}
              onChange={setPageName}
            />
            <p className="small-note">Общие шапка и подвал появятся автоматически.</p>
            <button
              className="btn primary"
              disabled={!pageName.trim()}
              onClick={() => {
                const id = uid();
                s.update((d) => {
                  d.pages.push({
                    id,
                    name: pageName.trim(),
                    slug: 'page-' + id.slice(0, 6),
                    title: pageName.trim(),
                    description: '',
                    blocks: [],
                  });
                }, false);
                setPageId(id);
                setPageName('');
                setPageModal(false);
                setPageSettings(true);
                setPanel('inspect');
              }}
            >
              <Plus size={14} />
              Создать страницу
            </button>
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal
          title={deleteId.startsWith('page:') ? 'Удалить страницу?' : 'Удалить блок?'}
          close={() => setDeleteId('')}
        >
          <div className="modal-body">
            <p>Действие можно отменить кнопкой «Отменить» в верхней панели.</p>
            <div className="button-row">
              <button className="btn" onClick={() => setDeleteId('')}>
                Оставить
              </button>
              <button
                className="btn danger-solid"
                onClick={() => {
                  s.update((d) => {
                    if (deleteId.startsWith('page:'))
                      d.pages = d.pages.filter((pg) => pg.id !== deleteId.slice(5));
                    else {
                      const a = list(d, groupOf(deleteId)),
                        i = a.findIndex((b) => b.id === deleteId);
                      if (i >= 0) a.splice(i, 1);
                    }
                  }, false);
                  setSelected('');
                  setDeleteId('');
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
