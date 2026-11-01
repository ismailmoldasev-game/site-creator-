'use client';
import { useState } from 'react';
import { Monitor, Smartphone, RotateCcw, Check } from 'lucide-react';
import { type StudioState } from '@/lib/studio/use-studio';
import { renderPage } from '@/lib/studio/render';
import { freshProject } from '@/lib/studio/model';
import SiteFrame from './studio-preview';
import { Field, ImageField, Card } from './studio-controls';
const palettes = [
  { name: 'Шалфей', primary: '#365548', background: '#fafaf7', text: '#24372d', accent: '#d6e3cb' },
  {
    name: 'Терракота',
    primary: '#914a36',
    background: '#fcf6ef',
    text: '#432e27',
    accent: '#eed3bf',
  },
  { name: 'Океан', primary: '#28526d', background: '#f6f9fc', text: '#1a3548', accent: '#d0e3ed' },
  { name: 'Графит', primary: '#242628', background: '#fafafa', text: '#242628', accent: '#e0e2e3' },
];
export default function Brand({ s }: { s: StudioState }) {
  const p = s.project!,
    [mobile, setMobile] = useState(false);
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow-ui">ХАРАКТЕР ВАШЕГО ПРОЕКТА</p>
          <h1>
            Общий брендинг<span className="title-dot">.</span>
          </h1>
          <p>Один раз настройте стиль — он появится на всех страницах.</p>
        </div>
        <button
          className="btn"
          onClick={() =>
            s.update((d) => {
              d.brand = { ...freshProject().brand, logo: d.brand.logo, favicon: d.brand.favicon };
            }, false)
          }
        >
          <RotateCcw size={14} />
          Сбросить стиль
        </button>
      </div>
      <div className="brand-layout">
        <div>
          <Card title="Палитра" description="Начните с готового сочетания или выберите свои цвета.">
            <div className="palette-presets">
              {palettes.map((v) => (
                <button
                  key={v.name}
                  aria-label={'Палитра ' + v.name}
                  className={v.primary === p.brand.primary ? 'selected' : ''}
                  onClick={() =>
                    s.update((d) => {
                      Object.assign(d.brand, {
                        primary: v.primary,
                        background: v.background,
                        text: v.text,
                        accent: v.accent,
                      });
                    }, false)
                  }
                >
                  <div>
                    {[v.primary, v.accent, v.background].map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </div>
                  <span>
                    {v.name}
                    {v.primary === p.brand.primary && <Check size={12} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="color-grid">
              {(
                [
                  ['primary', 'Основной'],
                  ['background', 'Фон сайта'],
                  ['text', 'Текст'],
                  ['accent', 'Дополнительный'],
                ] as const
              ).map(([k, label]) => (
                <Field label={label} key={k}>
                  <div className="color-field">
                    <input
                      type="color"
                      aria-label={label}
                      value={p.brand[k]}
                      onChange={(e) =>
                        s.update((d) => {
                          d.brand[k] = e.target.value;
                        })
                      }
                    />
                    <span>{p.brand[k].toUpperCase()}</span>
                  </div>
                </Field>
              ))}
            </div>
          </Card>
          <Card title="Типографика" description="Шрифты заголовков и основного текста.">
            {(['headingFont', 'font'] as const).map((k, i) => (
              <Field label={i ? 'Основной текст' : 'Заголовки'} key={k}>
                <select
                  value={p.brand[k]}
                  onChange={(e) =>
                    s.update((d) => {
                      d.brand[k] = e.target.value as typeof d.brand.font;
                    })
                  }
                >
                  <option value="system">Системный — простой и современный</option>
                  <option value="serif">Georgia — выразительный с засечками</option>
                  <option value="mono">Моноширинный — технический</option>
                </select>
              </Field>
            ))}
          </Card>
          <Card title="Форма и пространство">
            <Field label={'Скругление: ' + p.brand.radius + ' px'}>
              <input
                type="range"
                min="0"
                max="40"
                value={p.brand.radius}
                onChange={(e) =>
                  s.update((d) => {
                    d.brand.radius = +e.target.value;
                  })
                }
              />
            </Field>
            <Field label={'Ширина содержимого: ' + p.brand.width + ' px'}>
              <input
                type="range"
                min="800"
                max="1600"
                step="20"
                value={p.brand.width}
                onChange={(e) =>
                  s.update((d) => {
                    d.brand.width = +e.target.value;
                  })
                }
              />
            </Field>
            <ImageField
              label="Логотип"
              value={p.brand.logo}
              onChange={(v) =>
                s.update((d) => {
                  d.brand.logo = v;
                })
              }
              notify={s.notify}
            />
          </Card>
        </div>
        <div className="brand-preview">
          <div className="preview-toolbar">
            <span>
              <span className="dot" />
              Живой предпросмотр
            </span>
            <div className="segmented">
              <button
                aria-label="Компьютер"
                className={!mobile ? 'active' : ''}
                onClick={() => setMobile(false)}
              >
                <Monitor size={15} />
              </button>
              <button
                aria-label="Телефон"
                className={mobile ? 'active' : ''}
                onClick={() => setMobile(true)}
              >
                <Smartphone size={15} />
              </button>
            </div>
          </div>
          <div className={'brand-frame ' + (mobile ? 'mobile' : '')}>
            <SiteFrame
              title="Предпросмотр брендинга"
              sandbox="allow-scripts"
              width={mobile ? 390 : Math.max(1000, p.brand.width + 80)}
              html={renderPage(p, p.pages[0])}
            />
          </div>
          <p className="preview-caption">Изменения применяются ко всем стандартным и ИИ-блокам.</p>
        </div>
      </div>
    </div>
  );
}
