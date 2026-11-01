'use client';
import { useEffect, useRef, useState } from 'react';
import type { Project } from './model';
import {
  readStudioLocation,
  resolveStudioPage,
  studioLocationURL,
  studioSections,
  type StudioLocation,
  type StudioSection,
} from './navigation';

export function useStudioNavigation(project: Project | null) {
  // Match server rendering initially. Read the actual URL once the browser mounts.
  const [location, setLocation] = useState<StudioLocation>({ section: 'settings', pageId: '' });
  const current = useRef(location);
  const [ready, setReady] = useState(false);

  function write(next: StudioLocation, mode: 'push' | 'replace') {
    const url = studioLocationURL(window.location.href, next);
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      if (mode === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    }
  }

  useEffect(() => {
    function restore() {
      const next = readStudioLocation(window.location.search);
      current.current = next;
      setLocation(next);
      setReady(true);
    }
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    if (!ready || !project) return;
    const next = resolveStudioPage(current.current, project.pages);
    if (next.pageId !== current.current.pageId) {
      current.current = next;
      setLocation(next);
      // Keep an ordinary first visit at the clean root URL. Repair stale page links.
      if (new URLSearchParams(window.location.search).has('page')) write(next, 'replace');
    }
  }, [ready, project, location.pageId]);

  function commit(next: StudioLocation) {
    // Update synchronously so create-page + open-editor in the same event keeps the new page.
    current.current = next;
    setLocation(next);
    write(next, 'push');
  }

  return {
    view: location.section,
    pageId: location.pageId,
    go(section: string) {
      if (studioSections.includes(section as StudioSection)) {
        commit({ ...current.current, section: section as StudioSection });
      }
    },
    setPageId(pageId: string) {
      commit({ ...current.current, pageId });
    },
  };
}
