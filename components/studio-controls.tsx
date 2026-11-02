'use client';
import { useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { imageData } from '@/lib/studio/client';
import type { ImageSettings } from '@/lib/studio/model';
import { defaultImageSettings } from '@/lib/studio/block-content';
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}
export function ImageField({
  label,
  value,
  onChange,
  notify,
  settings,
  onSettingsChange,
  fixedFrame = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  notify: (s: string) => void;
  settings?: ImageSettings;
  onSettingsChange?: (settings: ImageSettings) => void;
  fixedFrame?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const options = settings ?? defaultImageSettings;
  return (
    <div className="field">
      <span>{label}</span>
      <div className="image-upload">
        {value ? <img src={value} alt={label} /> : <ImageIcon size={22} />}
        <div>
          <button type="button" className="btn compact" onClick={() => ref.current?.click()}>
            <Upload size={13} />
            Загрузить
          </button>
          <small>PNG, JPEG, WebP · до 15 МБ</small>
        </div>
        {value && (
          <button className="icon-btn" aria-label="Убрать изображение" onClick={() => onChange('')}>
            <X size={15} />
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f)
            try {
              onChange(await imageData(f));
            } catch (x) {
              notify((x as Error).message);
            }
          e.target.value = '';
        }}
      />
      {!value.startsWith('data:') && (
        <input
          aria-label={label + ' — ссылка'}
          placeholder="Или ссылка https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {value && onSettingsChange && (
        <details className="image-options" open>
          <summary>Отображение изображения</summary>
          <Field label="Размещение изображения">
            <select
              value={options.fit}
              onChange={(e) =>
                onSettingsChange({ ...options, fit: e.target.value as ImageSettings['fit'] })
              }
            >
              <option value="contain">Целиком — без обрезки</option>
              <option value="cover">Заполнить рамку</option>
              {!fixedFrame && <option value="original">Исходные пропорции</option>}
            </select>
          </Field>
          {!fixedFrame && options.fit !== 'original' && (
            <Field label="Пропорции рамки">
              <select
                value={options.ratio}
                onChange={(e) =>
                  onSettingsChange({ ...options, ratio: e.target.value as ImageSettings['ratio'] })
                }
              >
                <option value="auto">Из шаблона</option>
                <option value="16/9">16:9 — широкий</option>
                <option value="4/3">4:3 — альбомный</option>
                <option value="1/1">1:1 — квадрат</option>
                <option value="3/4">3:4 — портретный</option>
              </select>
            </Field>
          )}
          {options.fit === 'cover' && (
            <>
              <Field label={'Положение по горизонтали: ' + options.x + '%'}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={options.x}
                  onChange={(e) => onSettingsChange({ ...options, x: +e.target.value })}
                />
              </Field>
              <Field label={'Положение по вертикали: ' + options.y + '%'}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={options.y}
                  onChange={(e) => onSettingsChange({ ...options, y: +e.target.value })}
                />
              </Field>
            </>
          )}
          <small>
            {options.fit === 'cover'
              ? 'Выберите, какую часть фотографии оставить в кадре.'
              : fixedFrame
                ? 'Изображение целиком в рамке размером с экран.'
                : 'Фотография сохраняется целиком. Рамку можно изменить в любой момент.'}
          </small>
        </details>
      )}
    </div>
  );
}
export function Tag({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'amber';
}) {
  return <span className={'tag ' + tone}>{children}</span>;
}
export function Card({
  title,
  description,
  children,
  extra,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {extra}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}
