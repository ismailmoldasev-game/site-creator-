'use client';
import { useEffect, useRef, useState, type Ref } from 'react';
/** Render the actual device viewport, then fit it into the editor without changing its layout. */
export default function SiteFrame({
  html,
  title,
  width,
  frameRef,
  sandbox = '',
  onLoad,
}: {
  html: string;
  title: string;
  width: number;
  frameRef?: Ref<HTMLIFrameElement>;
  sandbox?: string;
  onLoad?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null),
    [available, setAvailable] = useState(width);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      setAvailable(entries[0].contentRect.width || width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);
  const scale = Math.min(1, available / width);
  return (
    <div ref={box} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <iframe
        ref={frameRef}
        title={title}
        sandbox={sandbox}
        srcDoc={html}
        onLoad={onLoad}
        style={{
          display: 'block',
          border: 0,
          width,
          height: 100 / scale + '%',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: 'white',
        }}
      />
    </div>
  );
}
