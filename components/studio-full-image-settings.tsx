'use client';
import { Monitor, Smartphone } from 'lucide-react';
import type { Block, FullImageFrame } from '@/lib/studio/model';
import { fullImageFrame } from '@/lib/studio/full-image';
import { Field, ImageField } from './studio-controls';

export default function FullImageSettings({
  block,
  device,
  onDeviceChange,
  editBlock,
  notify,
}: {
  block: Block;
  device: string;
  onDeviceChange: (device: 'desktop' | 'mobile') => void;
  editBlock: (fn: (block: Block) => void) => void;
  notify: (message: string) => void;
}) {
  const target = device === 'mobile' ? 'mobile' : 'desktop';
  const frame = fullImageFrame(block, target);
  const change = (patch: Partial<FullImageFrame>) =>
    editBlock((b) => {
      b.fullImage = { ...b.fullImage, [target]: { ...fullImageFrame(b, target), ...patch } };
    });
  return (
    <div className="full-image-settings">
      <ImageField
        label="Основное изображение"
        value={block.values.image ?? ''}
        onChange={(value) =>
          editBlock((b) => {
            b.values.image = value;
          })
        }
        notify={notify}
      />
      <div
        className="segmented image-device-switch"
        role="group"
        aria-label="Настройки изображения для устройства"
      >
        <button
          type="button"
          className={target === 'desktop' ? 'active' : ''}
          aria-pressed={target === 'desktop'}
          onClick={() => onDeviceChange('desktop')}
        >
          <Monitor size={14} />
          Компьютер
        </button>
        <button
          type="button"
          className={target === 'mobile' ? 'active' : ''}
          aria-pressed={target === 'mobile'}
          onClick={() => onDeviceChange('mobile')}
        >
          <Smartphone size={14} />
          Телефон
        </button>
      </div>
      <p className="small-note">
        {target === 'mobile'
          ? 'Настройки для экранов до 700 px. Компьютерная версия не изменится.'
          : 'Настройки для компьютера и планшета. Для телефона можно выбрать другой кадр.'}
      </p>
      {target === 'mobile' && (
        <>
          <ImageField
            label="Изображение для телефона (необязательно)"
            value={block.values.imageMobile ?? ''}
            onChange={(value) =>
              editBlock((b) => {
                b.values.imageMobile = value;
              })
            }
            notify={notify}
          />
          <p className="small-note">
            {block.values.imageMobile
              ? 'На телефоне показывается эта версия изображения.'
              : 'Пока используется основное изображение. Можно загрузить вертикальную версию.'}
          </p>
        </>
      )}
      <Field
        label={'Отображение: ' + (target === 'mobile' ? 'телефон' : 'компьютер')}
        hint={
          frame.mode === 'natural'
            ? 'Всё изображение по ширине экрана, без обрезки и внешних полей. Высота подстраивается под его пропорции.'
            : frame.mode === 'cover'
              ? 'Изображение заполняет блок. Уменьшите высоту или сдвиньте кадр, чтобы показать больше.'
              : 'Всё изображение в заданной высоте. Если пропорции отличаются, остаются поля. Для показа без полей выберите «По ширине».'
        }
      >
        <select
          value={frame.mode}
          onChange={(e) => change({ mode: e.target.value as FullImageFrame['mode'] })}
        >
          <option value="natural">По ширине — без обрезки и полей</option>
          <option value="cover">Заполнить экран — с обрезкой</option>
          <option value="contain">Целиком в рамке — возможны поля</option>
        </select>
      </Field>
      {frame.mode !== 'natural' && (
        <Field
          label={'Высота блока: ' + frame.height + '% экрана'}
          hint="100% — на всю высоту экрана. Меньшая высота уменьшает обрезку широкого изображения."
        >
          <input
            type="range"
            min="20"
            max="100"
            value={frame.height}
            onChange={(e) => change({ height: +e.target.value })}
          />
        </Field>
      )}
      {frame.mode === 'cover' && (
        <>
          <Field label={'Кадр по горизонтали: ' + frame.x + '%'}>
            <input
              type="range"
              min="0"
              max="100"
              value={frame.x}
              onChange={(e) => change({ x: +e.target.value })}
            />
          </Field>
          <Field label={'Кадр по вертикали: ' + frame.y + '%'}>
            <input
              type="range"
              min="0"
              max="100"
              value={frame.y}
              onChange={(e) => change({ y: +e.target.value })}
            />
          </Field>
          <button type="button" className="btn compact" onClick={() => change({ x: 50, y: 50 })}>
            Кадр по центру
          </button>
        </>
      )}
    </div>
  );
}
