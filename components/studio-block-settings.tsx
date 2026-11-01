'use client';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Block, Definition, Page, Project } from '@/lib/studio/model';
import { builtin, uid } from '@/lib/studio/model';
import {
  blockAnchor,
  blockSlides,
  featureCards,
  moveItem,
  newSlide,
  pageBlocks,
} from '@/lib/studio/block-content';
import { Field, ImageField, TextField } from './studio-controls';

function LinkField({
  value,
  onChange,
  project,
  page,
  label = 'Ссылка кнопки',
}: {
  value: string;
  onChange: (value: string) => void;
  project: Project;
  page: Page;
  label?: string;
}) {
  const blocks = pageBlocks(project, page);
  return (
    <div className="link-settings">
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        placeholder="#about или https://…"
        hint="#about — раздел на этой странице. Для другого сайта вставьте полный адрес https://…"
      />
      <Field label="Выбрать страницу или раздел">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        >
          <option value="">Выбрать из сайта…</option>
          <optgroup label="Страницы сайта">
            {project.pages.map((pg) => (
              <option key={pg.id} value={(pg.slug || 'index') + '.html'}>
                {pg.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Разделы этой страницы">
            {blocks.map((b, i) => (
              <option key={b.id} value={'#' + blockAnchor(b, blocks)}>
                {b.values.title ||
                  builtin.find((d) => d.id === b.type)?.name ||
                  'Раздел ' + (i + 1)}
              </option>
            ))}
          </optgroup>
          {project.pages
            .filter((pg) => pg.id !== page.id)
            .map((pg) => {
              const other = pageBlocks(project, pg);
              return (
                <optgroup key={pg.id} label={'Разделы: ' + pg.name}>
                  {other
                    .filter((b) => pg.blocks.some((pb) => pb.id === b.id))
                    .map((b) => (
                      <option
                        key={b.id}
                        value={(pg.slug || 'index') + '.html#' + blockAnchor(b, other)}
                      >
                        {b.values.title || builtin.find((d) => d.id === b.type)?.name || 'Раздел'}
                      </option>
                    ))}
                </optgroup>
              );
            })}
        </select>
      </Field>
    </div>
  );
}

function ItemTools({
  index,
  total,
  label,
  move,
  remove,
}: {
  index: number;
  total: number;
  label: string;
  move: (delta: number) => void;
  remove: () => void;
}) {
  return (
    <div className="repeat-tools">
      <button
        type="button"
        className="icon-btn"
        aria-label={label + ' — выше'}
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={label + ' — ниже'}
        disabled={index === total - 1}
        onClick={() => move(1)}
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        className="icon-btn danger"
        aria-label={'Удалить ' + label.toLowerCase()}
        disabled={total === 1}
        onClick={remove}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function BlockContentSettings({
  block,
  definition,
  project,
  page,
  editBlock,
  notify,
}: {
  block: Block;
  definition: Definition;
  project: Project;
  page: Page;
  editBlock: (fn: (block: Block) => void) => void;
  notify: (message: string) => void;
}) {
  const value = (key: string) =>
    block.values[key] ?? definition.fields.find((f) => f.key === key)?.default ?? '';
  const setValue = (key: string, value: string) =>
    editBlock((b) => {
      b.values[key] = value;
    });
  const cards = block.type === 'features' ? featureCards(block) : [];
  const slides = block.type === 'slideshow' ? blockSlides(block) : [];
  return (
    <>
      {['hero', 'image-text'].includes(block.type) && (
        <Field label="Порядок текста и изображения">
          <select
            value={block.layout ?? (block.type === 'hero' ? 'text-first' : 'image-first')}
            onChange={(e) =>
              editBlock((b) => {
                b.layout = e.target.value as Block['layout'];
              })
            }
          >
            <option value="text-first">Сначала текст, затем изображение</option>
            <option value="image-first">Сначала изображение, затем текст</option>
          </select>
        </Field>
      )}
      {definition.fields
        .filter(
          (f) =>
            !(block.type === 'hero' && ['button', 'href'].includes(f.key)) &&
            !(block.type === 'features' && !['eyebrow', 'title'].includes(f.key)),
        )
        .map((f) =>
          f.type === 'image' ? (
            <ImageField
              key={f.key}
              label={f.label}
              value={value(f.key)}
              onChange={(v) => setValue(f.key, v)}
              settings={block.images?.[f.key]}
              onSettingsChange={(settings) =>
                editBlock((b) => {
                  b.images = { ...b.images, [f.key]: settings };
                })
              }
              notify={notify}
            />
          ) : f.type === 'url' ? (
            <LinkField
              key={f.key}
              label={f.label}
              value={value(f.key)}
              onChange={(v) => setValue(f.key, v)}
              project={project}
              page={page}
            />
          ) : (
            <TextField
              key={f.key}
              label={f.label}
              value={value(f.key)}
              multiline={f.type === 'textarea'}
              hint={
                ['eyebrow', 'note', 'artLabel'].includes(f.key)
                  ? 'Оставьте пустым, чтобы скрыть эту надпись.'
                  : undefined
              }
              onChange={(v) => setValue(f.key, v)}
            />
          ),
        )}
      {block.type === 'hero' && (
        <div className="content-settings-group">
          <label className="check-setting">
            <input
              type="checkbox"
              checked={block.buttonVisible !== false}
              onChange={(e) =>
                editBlock((b) => {
                  b.buttonVisible = e.target.checked;
                })
              }
            />
            Показывать кнопку
          </label>
          {block.buttonVisible !== false && (
            <>
              <TextField
                label="Текст кнопки"
                value={value('button')}
                onChange={(v) => setValue('button', v)}
                hint="Пустой текст также скрывает кнопку."
              />
              <LinkField
                value={value('href')}
                onChange={(v) => setValue('href', v)}
                project={project}
                page={page}
              />
            </>
          )}
        </div>
      )}
      {block.type === 'features' && (
        <div className="content-settings-group">
          <h4>Карточки · {cards.length}</h4>
          {cards.map((card, index) => (
            <details className="repeat-item" key={card.id} open>
              <summary>
                Карточка {index + 1}
                {card.title ? ' · ' + card.title : ''}
              </summary>
              <div className="repeat-item-body">
                <ItemTools
                  index={index}
                  total={cards.length}
                  label={'Карточка ' + (index + 1)}
                  move={(delta) =>
                    editBlock((b) => {
                      b.cards = moveItem(featureCards(b), index, delta);
                    })
                  }
                  remove={() =>
                    editBlock((b) => {
                      b.cards = featureCards(b).filter((c) => c.id !== card.id);
                    })
                  }
                />
                <TextField
                  label={'Карточка ' + (index + 1) + ' — заголовок'}
                  value={card.title}
                  onChange={(v) =>
                    editBlock((b) => {
                      b.cards = featureCards(b).map((c) =>
                        c.id === card.id ? { ...c, title: v } : c,
                      );
                    })
                  }
                />
                <TextField
                  multiline
                  label={'Карточка ' + (index + 1) + ' — описание'}
                  value={card.text}
                  onChange={(v) =>
                    editBlock((b) => {
                      b.cards = featureCards(b).map((c) =>
                        c.id === card.id ? { ...c, text: v } : c,
                      );
                    })
                  }
                />
              </div>
            </details>
          ))}
          <button
            type="button"
            className="btn compact repeat-add"
            disabled={cards.length >= 24}
            onClick={() =>
              editBlock((b) => {
                b.cards = [
                  ...featureCards(b),
                  { id: uid(), title: 'Новое преимущество', text: 'Расскажите о нём подробнее.' },
                ];
              })
            }
          >
            <Plus size={14} />
            Добавить карточку
          </button>
          <small>От 1 до 24 карточек. Порядок меняется стрелками.</small>
        </div>
      )}
      {block.type === 'slideshow' && (
        <div className="content-settings-group">
          <label className="check-setting">
            <input
              type="checkbox"
              checked={block.slideshow?.autoplay ?? false}
              onChange={(e) =>
                editBlock((b) => {
                  b.slideshow = {
                    interval: b.slideshow?.interval ?? 5,
                    autoplay: e.target.checked,
                  };
                })
              }
            />
            Автоматическое переключение
          </label>
          {block.slideshow?.autoplay && (
            <Field
              label={'Интервал: ' + block.slideshow.interval + ' сек.'}
              hint="При наведении, фокусе и переключении вручную показ приостанавливается."
            >
              <input
                type="range"
                min="3"
                max="20"
                value={block.slideshow.interval}
                onChange={(e) =>
                  editBlock((b) => {
                    b.slideshow = { autoplay: true, interval: +e.target.value };
                  })
                }
              />
            </Field>
          )}
          <h4>Слайды · {slides.length}</h4>
          {slides.map((slide, index) => (
            <details className="repeat-item" key={slide.id} open>
              <summary>
                Слайд {index + 1}
                {slide.title ? ' · ' + slide.title : ''}
              </summary>
              <div className="repeat-item-body">
                <ItemTools
                  index={index}
                  total={slides.length}
                  label={'Слайд ' + (index + 1)}
                  move={(delta) =>
                    editBlock((b) => {
                      b.slides = moveItem(blockSlides(b), index, delta);
                    })
                  }
                  remove={() =>
                    editBlock((b) => {
                      b.slides = blockSlides(b).filter((s) => s.id !== slide.id);
                    })
                  }
                />
                <ImageField
                  label={'Изображение слайда ' + (index + 1)}
                  value={slide.image}
                  onChange={(v) =>
                    editBlock((b) => {
                      b.slides = blockSlides(b).map((s) =>
                        s.id === slide.id ? { ...s, image: v } : s,
                      );
                    })
                  }
                  settings={slide.imageSettings}
                  onSettingsChange={(settings) =>
                    editBlock((b) => {
                      b.slides = blockSlides(b).map((s) =>
                        s.id === slide.id ? { ...s, imageSettings: settings } : s,
                      );
                    })
                  }
                  notify={notify}
                />
                <TextField
                  label={'Слайд ' + (index + 1) + ' — заголовок'}
                  value={slide.title}
                  onChange={(v) =>
                    editBlock((b) => {
                      b.slides = blockSlides(b).map((s) =>
                        s.id === slide.id ? { ...s, title: v } : s,
                      );
                    })
                  }
                />
                <TextField
                  multiline
                  label={'Слайд ' + (index + 1) + ' — описание'}
                  value={slide.text}
                  onChange={(v) =>
                    editBlock((b) => {
                      b.slides = blockSlides(b).map((s) =>
                        s.id === slide.id ? { ...s, text: v } : s,
                      );
                    })
                  }
                />
                <TextField
                  label={'Слайд ' + (index + 1) + ' — текст кнопки'}
                  value={slide.button}
                  hint="Оставьте пустым, если кнопка не нужна."
                  onChange={(v) =>
                    editBlock((b) => {
                      b.slides = blockSlides(b).map((s) =>
                        s.id === slide.id ? { ...s, button: v } : s,
                      );
                    })
                  }
                />
                {slide.button.trim() && (
                  <LinkField
                    value={slide.href}
                    onChange={(v) =>
                      editBlock((b) => {
                        b.slides = blockSlides(b).map((s) =>
                          s.id === slide.id ? { ...s, href: v } : s,
                        );
                      })
                    }
                    project={project}
                    page={page}
                  />
                )}
              </div>
            </details>
          ))}
          <button
            type="button"
            className="btn compact repeat-add"
            disabled={slides.length >= 20}
            onClick={() =>
              editBlock((b) => {
                b.slides = [...blockSlides(b), newSlide()];
              })
            }
          >
            <Plus size={14} />
            Добавить слайд
          </button>
          <small>От 1 до 20 слайдов. На телефоне фотографии можно листать свайпом.</small>
        </div>
      )}
    </>
  );
}
