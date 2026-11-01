'use client';
import { useState } from 'react';
import {
  Sparkles,
  ArrowUpRight,
  Plus,
  Code2,
  Copy,
  Layers,
  Check,
  ArrowRight,
  ShieldCheck,
  Download,
  Loader2,
} from 'lucide-react';
import { type StudioState } from '@/lib/studio/use-studio';
import { makeBlock, type Definition } from '@/lib/studio/model';
import { api, download } from '@/lib/studio/client';
import { Card, Tag } from './studio-controls';
import { Modal } from './studio-editor';
const ideas = [
  'Три тарифа с выделенным средним вариантом',
  'Галерея проектов с подписями в две колонки',
  'Команда: фотографии, имена и должности',
  'Этапы работы с нумерацией и краткими описаниями',
];
export default function AIBlocks({
  s,
  go,
  pageId,
}: {
  s: StudioState;
  go: (v: string) => void;
  pageId: string;
}) {
  const p = s.project!,
    [prompt, setPrompt] = useState(''),
    [code, setCode] = useState<Definition | null>(null),
    [generationError, setGenerationError] = useState('');
  async function generate() {
    setGenerationError('');
    s.setLocked(true);
    try {
      await s.flush();
      const d = await api('generate', { prompt, revision: s.revision.current });
      s.acceptServer(d.project, d.revision);
      setPrompt('');
      s.notify(
        d.synced
          ? 'Блок сохранён в проекте и в коде GitHub'
          : d.syncError
            ? 'Блок сохранён. GitHub: ' + d.syncError
            : 'Блок сохранён в проекте и доступен в «+». Подключите GitHub для записи в репозиторий.',
      );
    } catch (e) {
      setGenerationError((e as Error).message);
    } finally {
      s.setLocked(false);
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow-ui">ОТ ОПИСАНИЯ К ГОТОВОМУ БЛОКУ</p>
          <h1>
            Блоки с вашим характером<span className="title-dot">.</span>
          </h1>
          <p>Опишите, что нужно. ИИ создаст код и поля для редактирования.</p>
        </div>
        <Tag>
          <Sparkles size={12} />
          {p.library.length} в библиотеке
        </Tag>
      </div>
      <div className="ai-layout">
        <div>
          <div className="ai-composer">
            <div className="ai-composer-heading">
              <span className="ai-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <h2>Что создадим?</h2>
                <p>Структура, содержимое, особенности — всё имеет значение.</p>
              </div>
            </div>
            <textarea
              aria-label="Описание нового блока"
              value={prompt}
              maxLength={5000}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Например: блок из трёх тарифов с ценами, списком возможностей и кнопкой. Средний тариф выделить. На телефоне карточки идут друг под другом."
              rows={6}
            />
            <div className="ai-composer-footer">
              <span>Использует цвета и шрифты проекта</span>
              <button
                className="btn primary"
                onClick={generate}
                disabled={!s.connections.openai || prompt.trim().length < 10 || s.locked}
              >
                <Sparkles size={14} />
                Создать блок <ArrowUpRight size={14} />
              </button>
            </div>
            {generationError && (
              <div className="inline-error" role="alert">
                {generationError}
              </div>
            )}
            {!s.connections.openai && (
              <div className="connection-banner">
                <Sparkles size={17} />
                <p>Для генерации подключите свой OpenAI API-ключ.</p>
                <button className="text-btn" onClick={() => go('settings')}>
                  Открыть настройки <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="prompt-ideas">
            <span>С чего можно начать</span>
            {ideas.map((i) => (
              <button key={i} onClick={() => setPrompt(i)}>
                <Plus size={12} />
                {i}
              </button>
            ))}
          </div>
          <div className="section-title">
            <h2>Мои блоки</h2>
            <p>Сохраняются в проекте и появляются в меню «+».</p>
          </div>
          {p.library.length ? (
            <div className="my-blocks">
              {p.library.map((d) => (
                <Card
                  key={d.id}
                  title={d.name}
                  description={d.description}
                  extra={
                    <Tag>
                      <Sparkles size={10} />
                      ИИ
                    </Tag>
                  }
                >
                  <div className="block-library-info">
                    <span>{d.fields.length} редактируемых полей</span>
                    <code>{d.id}</code>
                  </div>
                  <div className="button-row">
                    <button
                      className="btn compact"
                      onClick={() => {
                        s.update((x) => {
                          (x.pages.find((pg) => pg.id === pageId) || x.pages[0]).blocks.push(
                            makeBlock(d.id, x.library),
                          );
                        }, false);
                        go('editor');
                        s.notify('Блок добавлен на страницу');
                      }}
                    >
                      <Plus size={13} />
                      На страницу
                    </button>
                    <button className="btn compact" onClick={() => setCode(d)}>
                      <Code2 size={13} />
                      Код
                    </button>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setPrompt(
                          'Создай новый улучшенный вариант блока «' +
                            d.name +
                            '». Сохрани идею: ' +
                            d.description +
                            '. Изменения: ',
                        );
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Новый вариант
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="empty-state library-empty">
              <div className="empty-blocks">
                <i />
                <i />
                <i />
                <Sparkles size={25} />
              </div>
              <h3>Здесь будет ваша библиотека</h3>
              <p>
                Однажды созданный блок можно добавлять на любые страницы,
                <br className="desktop-only" /> менять его содержимое и использовать снова.
              </p>
            </div>
          )}
        </div>
        <aside className="ai-aside">
          <Card title="Как это работает">
            <ol className="steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Вы описываете идею</strong>
                  <p>Для кого блок и что он должен показывать.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>ИИ пишет код</strong>
                  <p>HTML, CSS и поля настроек в стиле вашего сайта.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Блок проходит проверку</strong>
                  <p>Активный код отклоняется. Предпросмотр изолирован от редактора.</p>
                </div>
              </li>
              <li>
                <span>04</span>
                <div>
                  <strong>Сохраняется в библиотеку</strong>
                  <p>
                    Доступен в «+» после перезагрузки. При подключённом GitHub код записывается в
                    репозиторий.
                  </p>
                </div>
              </li>
            </ol>
          </Card>
          <p className="small-note">
            <ShieldCheck size={14} />
            Ключи доступа не передаются в код генерируемого сайта.
          </p>
        </aside>
      </div>
      {code && (
        <Modal wide title={'Код: ' + code.name} close={() => setCode(null)}>
          <div className="modal-body">
            <div className="button-row">
              <button
                className="btn compact"
                onClick={() => {
                  navigator.clipboard
                    .writeText(code.html)
                    .then(() => s.notify('Код скопирован'))
                    .catch(() => s.notify('Используйте кнопку «Скачать HTML»'));
                }}
              >
                <Copy size={14} />
                Копировать
              </button>
              <button
                className="btn compact"
                onClick={() => download(code.id + '.html', code.html, 'text/html')}
              >
                <Download size={14} />
                Скачать HTML
              </button>
            </div>
            <pre className="code-view">{code.html}</pre>
          </div>
        </Modal>
      )}
    </div>
  );
}
