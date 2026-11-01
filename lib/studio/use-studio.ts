'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { type Project, projectSchema } from './model';
import { api, backup } from './client';
export type Connections = { github: boolean; openai: boolean; vault: boolean };
export function useStudio() {
  const [locked, setLockedState] = useState(false);
  const lockedRef = useRef(false);
  const setLocked = (v: boolean) => {
    lockedRef.current = v;
    setLockedState(v);
  };
  const [project, setProject] = useState<Project | null>(null),
    [connections, setConnections] = useState<Connections>({
      github: false,
      openai: false,
      vault: false,
    }),
    [status, setStatus] = useState('loading'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [recovery, setRecovery] = useState<Project | null>(null),
    [historyTick, tick] = useState(0);
  const doc = useRef<Project | null>(null),
    revision = useRef(1),
    saved = useRef(''),
    inflight = useRef<Promise<void> | null>(null),
    past = useRef<Project[]>([]),
    future = useRef<Project[]>([]),
    lastEdit = useRef(0),
    mounted = useRef(true);
  const notify = useCallback((s: string) => setNotice(s), []);
  const load = useCallback(async () => {
    try {
      const d = await api('studio');
      const p = projectSchema.parse(d.project);
      doc.current = p;
      revision.current = d.revision;
      saved.current = JSON.stringify(p);
      setProject(p);
      setConnections(d.connections);
      setStatus('saved');
      setError('');
      try {
        const raw = localStorage.getItem('studio-recovery');
        if (raw) {
          const b = JSON.parse(raw);
          if (JSON.stringify(b.project) !== saved.current)
            setRecovery(projectSchema.parse(b.project));
          else localStorage.removeItem('studio-recovery');
        }
      } catch {}
    } catch (e) {
      setStatus('error');
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const flush = useCallback(async function save(): Promise<void> {
    if (inflight.current) {
      await inflight.current;
      if (JSON.stringify(doc.current) !== saved.current) return save();
      return;
    }
    if (!doc.current || JSON.stringify(doc.current) === saved.current) return;
    const current = doc.current;
    const serialized = JSON.stringify(current);
    setStatus('saving');
    const job = (async () => {
      try {
        const d = await api('studio', { project: current, revision: revision.current }, 'PUT');
        revision.current = d.revision;
        saved.current = serialized;
        if (JSON.stringify(doc.current) === serialized) {
          localStorage.removeItem('studio-recovery');
          if (mounted.current) setStatus('saved');
        } else if (mounted.current) setStatus('pending');
        setError('');
      } catch (e) {
        if (mounted.current) {
          setStatus('error');
          setError((e as Error).message);
        }
        throw e;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = job;
    await job;
    if (JSON.stringify(doc.current) !== saved.current) return save();
  }, []);
  const update = useCallback(
    (recipe: (p: Project) => void, group = true) => {
      if (!doc.current || lockedRef.current) return;
      const before = doc.current;
      const next = structuredClone(before);
      recipe(next);
      if (JSON.stringify(next) === JSON.stringify(before)) return;
      const now = Date.now();
      if (!group || now - lastEdit.current > 650)
        past.current = [...past.current.slice(-59), before];
      lastEdit.current = now;
      future.current = [];
      doc.current = next;
      setProject(next);
      setStatus('pending');
      tick((t) => t + 1);
      try {
        localStorage.setItem(
          'studio-recovery',
          JSON.stringify({ project: next, revision: revision.current }),
        );
      } catch {
        notify(
          'Не удалось сохранить локальную страховочную копию. Скачайте резервную копию проекта.',
        );
      }
    },
    [notify],
  );
  const replace = useCallback((p: Project) => update((d) => Object.assign(d, p), false), [update]);
  useEffect(() => {
    if (!project || status !== 'pending') return;
    const t = setTimeout(() => flush().catch(() => {}), 700);
    return () => clearTimeout(t);
  }, [project, status, flush]);
  useEffect(() => {
    function onClose(e: BeforeUnloadEvent) {
      if (doc.current && JSON.stringify(doc.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onClose);
    return () => window.removeEventListener('beforeunload', onClose);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function travel(back: boolean) {
    const source = back ? past : future,
      target = back ? future : past;
    const next = source.current.pop();
    if (!next || !doc.current) return;
    target.current.push(doc.current);
    doc.current = next;
    setProject(next);
    setStatus('pending');
    try {
      localStorage.setItem(
        'studio-recovery',
        JSON.stringify({ project: next, revision: revision.current }),
      );
    } catch {}
    tick((t) => t + 1);
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const text = (e.target as HTMLElement).closest(
        'input,textarea,select,[contenteditable=true]',
      );
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        flush()
          .then(() => notify('Проект сохранён'))
          .catch(() => {});
      }
      if (!text && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        travel(!e.shiftKey);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flush, notify, historyTick]);
  function acceptServer(p: Project, rev: number) {
    if (doc.current) past.current.push(doc.current);
    future.current = [];
    doc.current = p;
    revision.current = rev;
    saved.current = JSON.stringify(p);
    setProject(p);
    setStatus('saved');
    setError('');
    localStorage.removeItem('studio-recovery');
    tick((t) => t + 1);
  }
  return {
    locked,
    setLocked,
    acceptServer,
    project,
    connections,
    setConnections,
    status,
    error,
    notice,
    notify,
    recovery,
    setRecovery,
    update,
    replace,
    flush,
    load,
    revision,
    undo: () => travel(true),
    redo: () => travel(false),
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    backup: () => doc.current && backup(doc.current),
  };
}
export type StudioState = ReturnType<typeof useStudio>;
