'use client';
import { useState, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  GitFork as Github,
  ShieldCheck,
  Sparkles,
  Download,
  Upload,
  Layers,
  Settings2,
  ExternalLink,
  Loader2,
  Palette,
  Link as LinkIcon,
} from 'lucide-react';
import { type StudioState } from '@/lib/studio/use-studio';
import { projectSchema } from '@/lib/studio/model';
import { validateDefinitionHTML, renderPage, projectFiles } from '@/lib/studio/render';
import { api, download, zipFiles } from '@/lib/studio/client';
import { Field, TextField, ImageField, Card, Tag } from './studio-controls';
export default function Settings({
  s,
  go,
  onTemplates,
}: {
  s: StudioState;
  go: (v: string) => void;
  onTemplates: () => void;
}) {
  const p = s.project!;
  const [tab, setTab] = useState('Общие'),
    [busy, setBusy] = useState(''),
    [key, setKey] = useState({ github: '', openai: '' }),
    [domain, setDomain] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function connect(provider: 'github' | 'openai') {
    setBusy(provider);
    try {
      await s.flush();
      const d = await api('connection', { provider, key: key[provider] });
      s.setConnections(d);
      setKey((k) => ({ ...k, [provider]: '' }));
      s.notify(
        provider === 'github'
          ? 'GitHub подключён' + (d.login ? ': ' + d.login : '')
          : 'OpenAI подключён',
      );
    } catch (e) {
      s.notify((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function disconnect(provider: string) {
    setBusy(provider);
    try {
      s.setConnections(await api('connection', { provider }, 'DELETE'));
      s.notify('Подключение отключено');
    } catch (e) {
      s.notify((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="page-content settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow-ui">ВАШЕ ПРОСТРАНСТВО ДЛЯ СОЗДАНИЯ</p>
          <h1>
            Настройки проекта<span className="title-dot">.</span>
          </h1>
          <p>Всё, что нужно вашему сайту, — в одном месте.</p>
        </div>
        <Tag tone="green">
          <span className="dot" />
          Рабочее пространство
        </Tag>
      </div>
      <div className="welcome-card">
        <div className="welcome-copy">
          <div className="mini-label">
            <span className="dot" />
            ПРОЕКТ ГОТОВ К РАБОТЕ
          </div>
          <h2>
            От хорошей идеи
            <br />
            до вашего сайта.
          </h2>
          <p>
            Соберите страницу, настройте стиль
            <br className="desktop-only" />и расскажите миру о своём проекте.
          </p>
          <div className="button-row">
            <button className="btn primary" onClick={() => go('editor')}>
              Конструктор сайта <ArrowUpRight size={16} />
            </button>
            <button className="text-btn" onClick={onTemplates}>
              Выбрать шаблон <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="welcome-preview">
          <div className="mini-browser">
            <div className="mini-browser-bar">
              <i />
              <i />
              <i />
              <span>ваш-сайт</span>
              <ArrowUpRight size={12} />
            </div>
            <div className="mini-site">
              <iframe
                title="Миниатюра вашего сайта"
                sandbox="allow-scripts"
                srcDoc={renderPage(p, p.pages[0])}
                tabIndex={-1}
              />
            </div>
          </div>
          <div className="floating-stamp">
            <Layers size={15} />
            <div>
              Ваш сайт. Ваши правила.<small>Создавайте без ограничений</small>
            </div>
          </div>
        </div>
      </div>
      <div className="project-stats">
        <div>
          <span className="stat-icon">
            <Layers size={17} />
          </span>
          <strong>
            {p.pages.length}
            <small>{p.pages.length === 1 ? 'страница' : 'страниц'}</small>
          </strong>
          <button aria-label="Открыть страницы" onClick={() => go('editor')}>
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div>
          <span className="stat-icon">
            <Sparkles size={17} />
          </span>
          <strong>
            {p.library.length}
            <small>своих блоков</small>
          </strong>
          <button aria-label="Открыть ИИ-блоки" onClick={() => go('ai')}>
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div>
          <span className="stat-icon">
            <Globe size={17} />
          </span>
          <strong className="stat-word">
            Черновик<small>изменения сохраняются отдельно</small>
          </strong>
          <button aria-label="Открыть публикацию" onClick={() => go('publish')}>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      <div className="settings-layout">
        <div>
          <div className="tabs" role="tablist" aria-label="Раздел настроек">
            {['Общие', 'Подключения', 'Адрес сайта', 'Данные'].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={t === tab ? 'active' : ''}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'Общие' && (
            <>
              <Card
                title="Основная информация"
                description="Название проекта и язык вашего сайта."
                extra={<Settings2 size={17} />}
              >
                <TextField
                  label="Название проекта"
                  value={p.name}
                  onChange={(v) =>
                    s.update((d) => {
                      d.name = v;
                    })
                  }
                  hint="Видно только в рабочем пространстве. Заголовки страниц настраиваются в редакторе."
                />
                <div className="field-grid">
                  <Field label="Язык сайта">
                    <select
                      value={p.language}
                      onChange={(e) =>
                        s.update((d) => {
                          d.language = e.target.value as typeof d.language;
                        })
                      }
                    >
                      <option value="ru">Русский</option>
                      <option value="kk">Қазақша</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                  <Field label="Стартовый экран">
                    <div className="readonly-field">
                      <Settings2 size={14} />
                      Настройки проекта
                      <Check size={14} />
                    </div>
                  </Field>
                </div>
                <div className="inline-note">
                  <ShieldCheck size={15} />
                  <p>Изменения сохраняются автоматически. Посетители увидят их после публикации.</p>
                </div>
              </Card>
              <Card
                title="Иконка сайта"
                description="Небольшая деталь, по которой узнают вашу вкладку."
              >
                <ImageField
                  label="Иконка вкладки"
                  value={p.brand.favicon}
                  onChange={(v) =>
                    s.update((d) => {
                      d.brand.favicon = v;
                    })
                  }
                  notify={s.notify}
                />
              </Card>
            </>
          )}
          {tab === 'Подключения' && (
            <>
              <Card
                title="GitHub"
                description="Храните код блоков и публикуйте собранный сайт."
                extra={<Github size={20} />}
              >
                <div className="connection-state">
                  <Tag tone={s.connections.github ? 'green' : 'neutral'}>
                    {s.connections.github ? 'Подключён' : 'Не подключён'}
                  </Tag>
                  {s.connections.github && (
                    <button className="text-btn" onClick={() => disconnect('github')}>
                      Отключить
                    </button>
                  )}
                </div>
                <TextField
                  label="Репозиторий"
                  placeholder="username/site-builder"
                  value={p.github.repo}
                  onChange={(v) =>
                    s.update((d) => {
                      d.github.repo = v
                        .trim()
                        .replace(/^https:\/\/github.com\//, '')
                        .replace(/\/$/, '');
                    })
                  }
                  hint="Отдельный репозиторий с первым коммитом. Например, созданный с README."
                />
                <Field
                  label="Токен доступа GitHub"
                  hint="Fine-grained token: доступ только к выбранному репозиторию, Contents — Read and write, Pages — Read and write."
                >
                  <input
                    type="password"
                    autoComplete="off"
                    value={key.github}
                    onChange={(e) => setKey((k) => ({ ...k, github: e.target.value }))}
                    placeholder={
                      s.connections.github ? '•••••••• · ключ сохранён на сервере' : 'github_pat_…'
                    }
                  />
                </Field>
                <button
                  className="btn"
                  disabled={!key.github || !!busy}
                  onClick={() => connect('github')}
                >
                  {busy === 'github' ? (
                    <Loader2 className="spin" size={14} />
                  ) : (
                    <Github size={14} />
                  )}
                  Проверить и подключить
                </button>
                <p className="small-note">
                  Ключ шифруется на сервере и не попадает в код сайта или резервную копию.
                </p>
              </Card>
              <Card
                title="OpenAI"
                description="Генерация новых блоков по вашему описанию."
                extra={<Sparkles size={20} />}
              >
                <div className="connection-state">
                  <Tag tone={s.connections.openai ? 'green' : 'neutral'}>
                    {s.connections.openai ? 'Подключён' : 'Не подключён'}
                  </Tag>
                  {s.connections.openai && (
                    <button className="text-btn" onClick={() => disconnect('openai')}>
                      Отключить
                    </button>
                  )}
                </div>
                <Field
                  label="API-ключ OpenAI"
                  hint="Используется отдельный баланс OpenAI API. Подписка ChatGPT не оплачивает API-запросы."
                >
                  <input
                    type="password"
                    autoComplete="off"
                    value={key.openai}
                    onChange={(e) => setKey((k) => ({ ...k, openai: e.target.value }))}
                    placeholder={
                      s.connections.openai ? '•••••••• · ключ сохранён на сервере' : 'sk-…'
                    }
                  />
                </Field>
                <TextField
                  label="Модель"
                  value={p.ai.model}
                  onChange={(v) =>
                    s.update((d) => {
                      d.ai.model = v;
                    })
                  }
                  hint="Модель должна поддерживать Chat Completions и JSON-ответы."
                />
                <button
                  className="btn"
                  disabled={!key.openai || !!busy}
                  onClick={() => connect('openai')}
                >
                  {busy === 'openai' ? (
                    <Loader2 className="spin" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Проверить и подключить
                </button>
              </Card>
            </>
          )}
          {tab === 'Адрес сайта' && (
            <>
              <Card
                title="Адрес и публикация"
                description="Настройте место, где будет жить готовый сайт."
                extra={<Globe size={20} />}
              >
                <TextField
                  label="Репозиторий GitHub"
                  value={p.github.repo}
                  onChange={(v) =>
                    s.update((d) => {
                      d.github.repo = v;
                    })
                  }
                  placeholder="username/site-builder"
                />
                <TextField
                  label="Ветка публикации"
                  value={p.github.branch}
                  onChange={(v) =>
                    s.update((d) => {
                      d.github.branch = v;
                    })
                  }
                  hint="Рекомендуем gh-pages. Код конструктора и черновик хранятся отдельно."
                />
                <TextField
                  label="Собственный домен (необязательно)"
                  value={p.github.domain}
                  onChange={(v) => {
                    setDomain(null);
                    s.update((d) => {
                      d.github.domain = v.toLowerCase().trim();
                    });
                  }}
                  placeholder="example.kz"
                  hint="Без https:// и пути. Домен подключается при публикации."
                />
                {p.github.domain && (
                  <>
                    <button
                      className="btn"
                      disabled={!!busy}
                      onClick={async () => {
                        setBusy('domain');
                        try {
                          await s.flush();
                          const d = await api('domain');
                          setDomain(d.matches);
                          s.notify(
                            d.matches
                              ? 'DNS указывает на GitHub Pages'
                              : 'DNS пока не настроен. Проверьте записи у регистратора.',
                          );
                        } catch (e) {
                          s.notify((e as Error).message);
                        } finally {
                          setBusy('');
                        }
                      }}
                    >
                      <LinkIcon size={14} />
                      Проверить DNS
                    </button>
                    {domain !== null && (
                      <Tag tone={domain ? 'green' : 'amber'}>
                        {domain ? 'DNS настроен' : 'Ожидается настройка DNS'}
                      </Tag>
                    )}
                  </>
                )}
                <div className="dns-help">
                  <strong>Как привязать домен</strong>
                  <p>
                    Для поддомена создайте CNAME на{' '}
                    <code>{p.github.repo.split('/')[0] || 'username'}.github.io</code>. Для
                    основного домена — A-записи:
                  </p>
                  <code>
                    185.199.108.153 · 185.199.109.153
                    <br />
                    185.199.110.153 · 185.199.111.153
                  </code>
                  <p>
                    Обновление DNS может занять до 24 часов. HTTPS включается в настройках GitHub
                    Pages после проверки домена.
                  </p>
                </div>
              </Card>
            </>
          )}
          {tab === 'Данные' && (
            <Card
              title="Ваш проект всегда с вами"
              description="Скачайте резервную копию или готовый сайт."
            >
              <div className="data-action">
                <div>
                  <strong>Резервная копия проекта</strong>
                  <p>Страницы, настройки и все ваши блоки. Без ключей доступа.</p>
                </div>
                <button className="btn" onClick={s.backup}>
                  <Download size={14} />
                  Скачать JSON
                </button>
              </div>
              <div className="data-action">
                <div>
                  <strong>Готовый сайт</strong>
                  <p>HTML-страницы, код блоков и project.json в ZIP-архиве.</p>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    download('my-website.zip', zipFiles(projectFiles(p)), 'application/zip');
                    s.notify('Архив сайта подготовлен');
                  }}
                >
                  <Download size={14} />
                  Скачать сайт
                </button>
              </div>
              <div className="data-action">
                <div>
                  <strong>Восстановить проект</strong>
                  <p>
                    Открывает JSON-копию как новый черновик. Текущая версия сначала сохранится в
                    истории.
                  </p>
                </div>
                <button className="btn" onClick={() => input.current?.click()}>
                  <Upload size={14} />
                  Импорт JSON
                </button>
              </div>
              <input
                hidden
                ref={input}
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 4e6) throw new Error('Файл больше 4 МБ');
                    const next = projectSchema.parse(JSON.parse(await file.text()));
                    next.library.forEach((d) => validateDefinitionHTML(d.html));
                    await s.flush();
                    await api('history', {});
                    s.replace(next);
                    s.notify('Проект восстановлен как черновик');
                  } catch (e) {
                    s.notify((e as Error).message);
                  } finally {
                    if (input.current) input.current.value = '';
                  }
                }}
              />
            </Card>
          )}
        </div>
        <aside className="setup-aside">
          <div className="aside-heading">
            <span className="small-icon">
              <Check size={15} />
            </span>
            <h3>С чего начать</h3>
            <span>
              0
              {
                [p.name !== 'Мой первый сайт', s.connections.github, s.connections.openai].filter(
                  Boolean,
                ).length
              }
              /03
            </span>
          </div>
          <button className="checklist-row" onClick={() => setTab('Общие')}>
            <span className={'step-check ' + (p.name !== 'Мой первый сайт' ? 'done' : '')}>
              {p.name !== 'Мой первый сайт' ? <Check size={12} /> : 1}
            </span>
            <div>
              <strong>Назовите проект</strong>
              <small>Дайте вашей идее имя</small>
            </div>
            <ChevronRight size={14} />
          </button>
          <button className="checklist-row" onClick={() => setTab('Подключения')}>
            <span className={'step-check ' + (s.connections.github ? 'done' : '')}>
              {s.connections.github ? <Check size={12} /> : 2}
            </span>
            <div>
              <strong>Подключите GitHub</strong>
              <small>Для кода и публикации</small>
            </div>
            <ChevronRight size={14} />
          </button>
          <button className="checklist-row" onClick={() => setTab('Подключения')}>
            <span className={'step-check ' + (s.connections.openai ? 'done' : '')}>
              {s.connections.openai ? <Check size={12} /> : 3}
            </span>
            <div>
              <strong>Добавьте возможности ИИ</strong>
              <small>Создавайте свои блоки</small>
            </div>
            <ChevronRight size={14} />
          </button>
          <div className="aside-tip">
            <Palette size={19} />
            <h3>Один стиль. Весь сайт.</h3>
            <p>Цвета, шрифты и кнопки можно изменить сразу на всех страницах.</p>
            <button className="text-btn" onClick={() => go('brand')}>
              Настроить брендинг <ArrowRight size={14} />
            </button>
          </div>
          <p className="aside-footnote">
            <ShieldCheck size={13} />
            Ваше рабочее пространство доступно только вам.
          </p>
        </aside>
      </div>
    </div>
  );
}
