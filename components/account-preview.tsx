'use client';
import { useEffect, useState } from 'react';
import { renderPage } from '@/lib/studio/render';
import type { StudioAccount } from '@/lib/studio/accounts';
import { api, setAPIAccount } from '@/lib/studio/client';
export default function Preview({ account }: { account: StudioAccount }) {
  const [html, setHTML] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setAPIAccount(account.id);
    api('studio')
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
  }, [account.id]);
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
