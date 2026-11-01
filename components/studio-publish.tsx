'use client';
import { useState, useEffect } from 'react';
import {
  Globe,
  ArrowUpRight,
  Check,
  Clock,
  GitBranch,
  Download,
  RefreshCw,
  History,
  ArrowRight,
  CloudUpload,
  GitFork as Github,
  ShieldCheck,
  Eye,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { type StudioState } from '@/lib/studio/use-studio';
import { api, download, stamp, zipFiles } from '@/lib/studio/client';
import { projectFiles } from '@/lib/studio/render';
import { Card, Tag } from './studio-controls';
import { Modal } from './studio-editor';
export default function Publish({
  s,
  go,
  onPreview,
}: {
  s: StudioState;
  go: (v: string) => void;
  onPreview: () => void;
}) {
  const p = s.project!,
    [versions, setVersions] = useState<any[]>([]),
    [busy, setBusy] = useState(''),
    [deployment, setDeployment] = useState<{ status: string; url?: string; error?: string } | null>(
      null,
    ),
    [restore, setRestore] = useState(''),
    [error, setError] = useState('');
  const ready = s.connections.github && !!p.github.repo;
  async function refresh() {
    try {
      setVersions(await api('history'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function perform(kind: 'publish' | 'snapshot' | 'sync') {
    setBusy(kind);
    setError('');
    try {
      await s.flush();
      if (kind === 'publish') {
        s.setLocked(true);
        const d = await api('publish', {});
        setDeployment(d);
        s.notify('Файлы отправлены в GitHub Pages. Сайт собирается.');
      } else if (kind === 'snapshot') {
        await api('history', {});
        s.notify('Контрольная версия сохранена');
      } else {
        await api('sync', {});
        s.notify('Проект и код блоков сохранены в GitHub');
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      s.setLocked(false);
      setBusy('');
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow-ui">ПОКАЖИТЕ СВОЙ ПРОЕКТ МИРУ</p>
          <h1>
            Готовы к следующему шагу<span className="title-dot">?</span>
          </h1>
          <p>Проверьте результат и опубликуйте выбранную версию.</p>
        </div>
        <button className="btn" onClick={onPreview}>
          <Eye size={14} />
          Предпросмотр
        </button>
      </div>
      <div className="publish-layout">
        <div>
          <div className="publication-hero">
            <span className="publication-icon">
              <Globe size={30} strokeWidth={1.2} />
            </span>
            <Tag tone={ready ? 'green' : 'amber'}>
              {ready ? 'Можно публиковать' : 'Требуется подключение'}
            </Tag>
            <h2>{ready ? 'Ваш сайт готов к публикации.' : 'Остался один шаг до публикации.'}</h2>
            <p>
              {ready
                ? 'Сохраним черновик и отправим готовые страницы в GitHub Pages.'
                : 'Подключите GitHub и укажите отдельный репозиторий в настройках. Редактор и экспорт доступны уже сейчас.'}
            </p>
            <div className="publication-address">
              <Globe size={15} />
              <span>
                {p.github.domain ||
                  (p.github.repo &&
                    p.github.repo.split('/')[0] + '.github.io/' + p.github.repo.split('/')[1]) ||
                  'Адрес ещё не подключён'}
              </span>
            </div>
            <div className="button-row">
              <button
                className="btn primary"
                disabled={!!busy}
                onClick={() => (ready ? perform('publish') : go('settings'))}
              >
                <CloudUpload size={15} />
                {ready ? 'Опубликовать сайт' : 'Подключить публикацию'}
                <ArrowUpRight size={14} />
              </button>
              <button
                className="btn"
                onClick={() =>
                  download('my-website.zip', zipFiles(projectFiles(p)), 'application/zip')
                }
              >
                <Download size={14} />
                Скачать HTML
              </button>
            </div>
          </div>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          {deployment && (
            <Card
              title="Состояние GitHub Pages"
              extra={
                <Tag tone={deployment.status === 'built' ? 'green' : 'amber'}>
                  {deployment.status === 'built'
                    ? 'Опубликован'
                    : deployment.status === 'errored'
                      ? 'Ошибка сборки'
                      : 'Сборка'}
                </Tag>
              }
            >
              <p>{deployment.error || 'GitHub обновляет сайт отдельно от сохранения черновика.'}</p>
              <div className="button-row">
                {deployment.url && (
                  <a className="btn compact" href={deployment.url} target="_blank" rel="noreferrer">
                    Открыть сайт <ArrowUpRight size={13} />
                  </a>
                )}
                <button
                  className="btn compact"
                  onClick={async () => {
                    try {
                      setDeployment(await api('publish'));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <RefreshCw size={13} />
                  Проверить состояние
                </button>
              </div>
            </Card>
          )}
          <Card
            title="История версий"
            description="Сохраняйте этапы работы и возвращайтесь к ним."
            extra={
              <button className="btn compact" disabled={!!busy} onClick={() => perform('snapshot')}>
                <PlusIcon />
                Сохранить версию
              </button>
            }
          >
            {!versions.length ? (
              <div className="history-empty">
                <History size={24} />
                <p>Здесь появятся сохранённые версии проекта.</p>
              </div>
            ) : (
              <div className="version-list">
                {versions.map((v, i) => (
                  <div className="version-row" key={v.id}>
                    <span className="version-icon">
                      {v.kind === 'publication' ? <Globe size={16} /> : <Clock size={16} />}
                    </span>
                    <div>
                      <strong>
                        {v.kind === 'publication' ? 'Публикация сайта' : 'Контрольная версия'}
                      </strong>
                      <small>
                        {stamp(v.created_at)}
                        {v.commit_sha ? ' · ' + v.commit_sha.slice(0, 7) : ''}
                      </small>
                    </div>
                    <button className="btn compact" onClick={() => setRestore(v.id)}>
                      <RotateCcw size={12} />В черновик
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <aside>
          <Card title="Перед публикацией">
            <ul className="publish-checklist">
              <li>
                <Check size={15} />
                <span>Проверьте тексты и ссылки</span>
              </li>
              <li>
                <Check size={15} />
                <span>Посмотрите мобильную версию</span>
              </li>
              <li>
                <Check size={15} />
                <span>Добавьте заголовки страниц</span>
              </li>
              <li className={ready ? '' : 'muted'}>
                <Github size={15} />
                <span>{ready ? 'GitHub подключён' : 'Подключите GitHub в настройках'}</span>
              </li>
            </ul>
            <button className="text-btn" onClick={() => go('editor')}>
              Перейти в конструктор <ArrowRight size={14} />
            </button>
          </Card>
          <Card
            title="Сохранить код в GitHub"
            description="Запишите структуру проекта и собственные блоки в ветку studio-content."
          >
            <button className="btn" disabled={!ready || !!busy} onClick={() => perform('sync')}>
              <GitBranch size={14} />
              Синхронизировать
            </button>
          </Card>
          <p className="aside-footnote">
            <ShieldCheck size={14} />
            Изменения в редакторе не обновляют опубликованный сайт автоматически.
          </p>
        </aside>
      </div>
      {restore && (
        <Modal title="Восстановить версию в черновик?" close={() => setRestore('')}>
          <div className="modal-body">
            <p>
              Текущий черновик сначала сохранится в истории. Опубликованный сайт останется доступен
              до следующей публикации.
            </p>
            <div className="button-row">
              <button className="btn" onClick={() => setRestore('')}>
                Отмена
              </button>
              <button
                className="btn primary"
                disabled={!!busy}
                onClick={async () => {
                  setBusy('restore');
                  try {
                    await s.flush();
                    await api('history', {});
                    const d = await api('history?id=' + encodeURIComponent(restore));
                    s.replace(d.project);
                    setRestore('');
                    s.notify('Версия восстановлена в черновик');
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy('');
                  }
                }}
              >
                <RotateCcw size={14} />
                Восстановить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function PlusIcon() {
  return <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>;
}
