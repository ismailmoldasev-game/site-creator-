'use client';
import { useEffect, useState } from 'react';
import { renderPage } from '@/lib/studio/render';
export default function Preview() {
  const [html, setHTML] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/studio')
      .then((r) => r.json())
      .then((d: any) => {
        if (d.error) throw new Error(d.error);
        const id = new URLSearchParams(location.search).get('page');
        setHTML(
          renderPage(
            d.project,
            d.project.pages.find((p: { id: string }) => p.id === id) || d.project.pages[0],
          ),
        );
      })
      .catch((e) => setError(e.message));
  }, []);
  return error ? (
    <p>{error}</p>
  ) : (
    <iframe
      title="Предпросмотр сайта"
      sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation"
      srcDoc={html}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: 'white',
      }}
    />
  );
}
