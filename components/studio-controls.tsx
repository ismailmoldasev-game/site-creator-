'use client';
import { useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { imageData } from '@/lib/studio/client';
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  notify: (s: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
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
