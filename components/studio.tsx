'use client';
import { useState } from 'react';
import {
  Settings2,
  PanelTop,
  Palette,
  Sparkles,
  Globe,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Check,
  Cloud,
  Loader2,
  Undo2,
  Redo2,
  Menu,
  X,
  HelpCircle,
  GitBranch,
  ShieldCheck,
  Download,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { useStudio } from '@/lib/studio/use-studio';
import { useStudioNavigation } from '@/lib/studio/use-navigation';
import { freshProject, makeBlock } from '@/lib/studio/model';
import { renderPage } from '@/lib/studio/render';
import { api } from '@/lib/studio/client';
import Settings from './studio-settings';
import SiteFrame from './studio-preview';
import Brand from './studio-brand';
import Editor, { Modal } from './studio-editor';
import AIBlocks from './studio-ai';
import Publish from './studio-publish';
const navigation = [
  { id: 'settings', name: 'Настройки', Icon: Settings2 },
  { id: 'editor', name: 'Конструктор сайта', Icon: PanelTop },
  { id: 'brand', name: 'Общий брендинг', Icon: Palette },
  { id: 'ai', name: 'ИИ-блоки', Icon: Sparkles },
  { id: 'publish', name: 'Публикация', Icon: Globe },
];
export default function Studio() {
  const s = useStudio(),
    [navOpen, setNavOpen] = useState(false),
    [templates, setTemplates] = useState(false),
    [template, setTemplate] = useState('starter'),
    [preview, setPreview] = useState(false),
    [previewDevice, setPreviewDevice] = useState('desktop'),
    [help, setHelp] = useState(false),
    [applying, setApplying] = useState(false);
  const { view, pageId, setPageId, go: navigate } = useStudioNavigation(s.project);
  function go(v: string) {
    navigate(v);
    setNavOpen(false);
    window.scrollTo(0, 0);
  }
  const p = s.project;
  const page = p?.pages.find((pg) => pg.id === pageId) || p?.pages[0];
  if (!p)
    return (
      <div className="loading-screen">
        <img className="studio-logo" src="/favicon.svg?v=leaf" alt="" aria-hidden="true" />
        <h1>Site Studio</h1>
        <p>{s.status === 'error' ? s.error : 'Открываем ваше рабочее пространство…'}</p>
        {s.status === 'error' ? (
          <button className="btn primary" onClick={s.load}>
            <RefreshCw size={14} />
            Повторить
          </button>
        ) : (
          <Loader2 className="spin" size={22} />
        )}
      </div>
    );
  return (
    <div className={'app-shell ' + (view === 'editor' ? 'editor-mode' : '')}>
      <aside className={'main-sidebar ' + (navOpen ? 'nav-open' : '')}>
        <div className="app-brand">
          <img className="studio-logo" src="/favicon.svg?v=leaf" alt="" aria-hidden="true" />
          <span>
            site<span>studio</span>
            <sup>β</sup>
          </span>
          <button
            className="icon-btn mobile-nav-close"
            aria-label="Закрыть меню"
            onClick={() => setNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <button className="project-selector" onClick={() => go('settings')}>
          <span className="project-avatar">{p.name.slice(0, 1).toUpperCase() || 'М'}</span>
          <span>
            <strong>{p.name || 'Мой сайт'}</strong>
            <small>Личный проект</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <div className="nav-label">УПРАВЛЕНИЕ САЙТОМ</div>
        <nav className="main-nav" aria-label="Основное меню">
          {navigation.map(({ id, name, Icon }) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => go(id)}>
              <Icon size={18} strokeWidth={1.6} />
              <span>{name}</span>
              {id === 'ai' ? (
                <span className="nav-badge">AI</span>
              ) : view === id ? (
                <span className="active-mark" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="github-status">
            <GitBranch size={16} />
            <span>
              GitHub
              <small>{s.connections.github ? 'Подключён к проекту' : 'Можно подключить'}</small>
            </span>
            <span className={'dot ' + (s.connections.github ? '' : 'gray')} />
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <HelpCircle size={16} />
            Как это работает
            <ArrowUpRight size={13} />
          </button>
          <div className="profile">
            <span className="profile-avatar">И</span>
            <div>
              <strong>Моё пространство</strong>
              <small>Личное · только для вас</small>
            </div>
            <ShieldCheck size={15} />
          </div>
        </div>
      </aside>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
      <main className="app-main">
        <header className="app-topbar">
          <div className="breadcrumbs">
            <button
              className="icon-btn mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-project">{p.name}</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === view)?.name}</strong>
          </div>
          <div className="topbar-actions">
            <div className={'save-indicator ' + s.status} role="status">
              {s.status === 'saving' ? (
                <Loader2 className="spin" size={13} />
              ) : s.status === 'saved' ? (
                <Check size={13} />
              ) : s.status === 'error' ? (
                <Cloud size={13} />
              ) : (
                <span className="dot" />
              )}
              <span>
                {s.status === 'saving'
                  ? 'Сохраняем…'
                  : s.status === 'saved'
                    ? 'Всё сохранено'
                    : s.status === 'error'
                      ? 'Ошибка сохранения'
                      : 'Есть изменения'}
              </span>
            </div>
            <div className="undo-buttons">
              <button
                className="icon-btn"
                title="Отменить (⌘Z)"
                aria-label="Отменить"
                disabled={!s.canUndo || s.locked}
                onClick={s.undo}
              >
                <Undo2 size={16} />
              </button>
              <button
                className="icon-btn"
                title="Повторить (⌘⇧Z)"
                aria-label="Повторить"
                disabled={!s.canRedo || s.locked}
                onClick={s.redo}
              >
                <Redo2 size={16} />
              </button>
            </div>
            <button className="btn primary top-publish" onClick={() => go('publish')}>
              Публикация
              <ArrowUpRight size={14} />
            </button>
          </div>
        </header>
        {s.error && (
          <div className="save-error" role="alert">
            <Cloud size={17} />
            <p>{s.error}</p>
            <button onClick={s.backup} className="btn compact">
              <Download size={13} />
              Скачать копию
            </button>
            <button className="text-btn" onClick={() => s.flush().catch(() => {})}>
              Повторить
            </button>
            <button
              className="text-btn"
              onClick={() => {
                s.backup();
                s.load();
              }}
            >
              Загрузить с сервера
            </button>
          </div>
        )}
        {s.recovery && (
          <div className="recovery-banner">
            <p>На этом устройстве остался несохранённый черновик.</p>
            <button
              className="btn compact"
              onClick={() => {
                s.replace(s.recovery!);
                s.setRecovery(null);
              }}
            >
              Восстановить
            </button>
            <button
              className="text-btn"
              onClick={() => {
                s.setRecovery(null);
                localStorage.removeItem('studio-recovery');
              }}
            >
              Использовать серверную версию
            </button>
          </div>
        )}
        {view === 'settings' ? (
          <Settings s={s} go={go} onTemplates={() => setTemplates(true)} />
        ) : view === 'brand' ? (
          <Brand s={s} />
        ) : view === 'editor' ? (
          <Editor
            s={s}
            pageId={pageId}
            setPageId={setPageId}
            go={go}
            onPreview={() => setPreview(true)}
          />
        ) : view === 'ai' ? (
          <AIBlocks s={s} go={go} pageId={pageId} />
        ) : (
          <Publish s={s} go={go} onPreview={() => setPreview(true)} />
        )}
      </main>
      {s.notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{s.notice}</span>
          <button
            aria-label="Закрыть уведомление"
            className="icon-btn"
            onClick={() => s.notify('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {templates && (
        <Modal wide title="С чего начнём?" close={() => setTemplates(false)}>
          <div className="modal-body">
            <p className="modal-description">
              Выберите основу для проекта. Содержимое текущих страниц заменится; перед этим сохраним
              его в истории.
            </p>
            <div className="template-grid">
              {[
                {
                  id: 'starter',
                  name: 'Точка роста',
                  desc: 'История, преимущества и контакты',
                  cls: 'sage',
                },
                {
                  id: 'services',
                  name: 'Ваше дело',
                  desc: 'Услуги, отзывы и ответы на вопросы',
                  cls: 'clay',
                },
                {
                  id: 'blank',
                  name: 'Чистый лист',
                  desc: 'Только общая шапка и подвал',
                  cls: 'blank',
                },
              ].map((t) => (
                <button
                  key={t.id}
                  className={'template-option ' + (template === t.id ? 'selected' : '')}
                  onClick={() => setTemplate(t.id)}
                >
                  <div className={'template-art ' + t.cls}>
                    {t.id === 'blank' ? (
                      <span className="template-plus">+</span>
                    ) : (
                      <>
                        <div className="template-mini-nav" />
                        <div className="template-mini-title" />
                        <div className="template-mini-line" />
                        <div className="template-mini-button" />
                        <div className="template-mini-shape" />
                      </>
                    )}
                  </div>
                  <strong>
                    {t.name}
                    {template === t.id && <Check size={14} />}
                  </strong>
                  <p>{t.desc}</p>
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <span>Брендинг и подключения сохранятся.</span>
              <button
                className="btn primary"
                disabled={applying}
                onClick={async () => {
                  setApplying(true);
                  try {
                    await s.flush();
                    await api('history', {});
                    const n = freshProject();
                    if (template === 'blank') n.pages[0].blocks = [];
                    if (template === 'services')
                      n.pages[0].blocks = ['hero', 'features', 'quote', 'faq', 'contact'].map((t) =>
                        makeBlock(t),
                      );
                    s.update((d) => {
                      d.pages = n.pages;
                      d.shared = n.shared;
                    }, false);
                    setPageId(n.pages[0].id);
                    setTemplates(false);
                    go('editor');
                    s.notify('Шаблон применён. Предыдущий вариант сохранён в истории.');
                  } catch (e) {
                    s.notify((e as Error).message);
                  } finally {
                    setApplying(false);
                  }
                }}
              >
                Применить шаблон
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="Ваш сайт — шаг за шагом" close={() => setHelp(false)}>
          <div className="modal-body">
            <ol className="help-steps">
              <li>В настройках назовите проект и при необходимости подключите GitHub и OpenAI.</li>
              <li>
                Откройте конструктор. Добавляйте блоки через «+», меняйте порядок и редактируйте
                содержимое справа.
              </li>
              <li>В брендинге настройте цвета, шрифты и оформление всех страниц.</li>
              <li>Создавайте свои ИИ-блоки. Они останутся в библиотеке для следующих страниц.</li>
              <li>
                Проверьте сайт на разных экранах, скачайте HTML или опубликуйте через GitHub Pages.
              </li>
            </ol>
            <div className="keyboard-help">
              <span>
                <kbd>⌘ / Ctrl</kbd> + <kbd>S</kbd> сохранить
              </span>
              <span>
                <kbd>⌘ / Ctrl</kbd> + <kbd>Z</kbd> отменить
              </span>
            </div>
            <p className="small-note">
              Черновик сохраняется на сервере. Экспорт проекта не содержит ключей доступа. При
              каждом новом входе открываются настройки.
            </p>
          </div>
        </Modal>
      )}
      {preview && page && (
        <div className="preview-overlay">
          <div className="preview-overlay-bar">
            <button className="btn compact" onClick={() => setPreview(false)}>
              <ArrowLeft size={14} />
              Вернуться в редактор
            </button>
            <select
              aria-label="Страница предпросмотра"
              value={page.id}
              onChange={(e) => setPageId(e.target.value)}
            >
              {p.pages.map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.name}
                </option>
              ))}
            </select>
            <div className="segmented">
              {[
                ['desktop', Monitor],
                ['tablet', Tablet],
                ['mobile', Smartphone],
              ].map(([v, I]) => {
                const Icon = I as typeof Monitor;
                return (
                  <button
                    key={v as string}
                    aria-label={'Предпросмотр ' + v}
                    className={previewDevice === v ? 'active' : ''}
                    onClick={() => setPreviewDevice(v as string)}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
            <button
              className="icon-btn"
              aria-label="Закрыть предпросмотр"
              onClick={() => setPreview(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className={'full-preview device-' + previewDevice}>
            <SiteFrame
              title="Предпросмотр готового сайта"
              width={
                previewDevice === 'mobile'
                  ? 390
                  : previewDevice === 'tablet'
                    ? 768
                    : Math.max(1000, p.brand.width + 80)
              }
              sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation"
              html={renderPage(p, page)}
            />
          </div>
        </div>
      )}
      {s.locked && (
        <div className="working-overlay" role="status">
          <div>
            <Loader2 className="spin" size={28} />
            <h2>{view === 'ai' ? 'Создаём ваш новый блок' : 'Подготавливаем публикацию'}</h2>
            <p>
              {view === 'ai'
                ? 'ИИ пишет код и редактируемые поля. Обычно это занимает до минуты.'
                : 'Сохраняем выбранную версию и передаём файлы в GitHub.'}
            </p>
            <small>Пожалуйста, оставьте эту вкладку открытой.</small>
          </div>
        </div>
      )}
    </div>
  );
}
