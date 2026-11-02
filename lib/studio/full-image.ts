import type { Block, FullImageFrame } from './model';

/** Old desktop crops stay put; mobile and fitted images gain an adaptive height. */
export function fullImageFrame(block: Block, device: 'desktop' | 'mobile'): FullImageFrame {
  const legacy = block.images?.image;
  return (
    block.fullImage?.[device] ?? {
      mode:
        device === 'desktop' && legacy?.fit !== 'contain' && legacy?.fit !== 'original'
          ? 'cover'
          : 'natural',
      height: 100,
      x: legacy?.x ?? 50,
      y: legacy?.y ?? 50,
    }
  );
}

export const fullImageCSS = `
.studio-block.full-image-block{padding:0!important;min-height:0}.full-image{position:relative;width:100%;height:auto;margin:0;padding:0;overflow:hidden;background:var(--accent)}.full-image-media{position:relative;display:block;width:100%;height:calc(var(--fi-height)*1vh);height:calc(var(--fi-height)*1svh);margin:0;padding:0}.full-image-photo{position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block;object-fit:var(--fi-fit);object-position:var(--fi-x) var(--fi-y);border-radius:0}.full-image-empty{min-height:200px}.full-image-button-area{position:absolute;inset:20px;pointer-events:none}.full-image .full-image-action{position:absolute;margin:0;max-width:100%;max-height:100%;overflow:auto;overflow-wrap:anywhere;text-align:center;pointer-events:auto;box-shadow:0 4px 24px #0002}
@media(min-width:701px){.full-image[data-image-desktop="natural"] .full-image-media{height:auto}.full-image[data-image-desktop="natural"] .full-image-photo{position:static;height:auto}}
@media(max-width:700px){.full-image-media{height:calc(var(--fi-mobile-height)*1vh);height:calc(var(--fi-mobile-height)*1svh)}.full-image-photo{object-fit:var(--fi-mobile-fit);object-position:var(--fi-mobile-x) var(--fi-mobile-y)}.full-image[data-image-mobile="natural"] .full-image-media{height:auto}.full-image[data-image-mobile="natural"] .full-image-photo{position:static;height:auto}.full-image-button-area{inset:16px}.full-image .full-image-action{padding:13px 20px;font-size:13px}}
`;
