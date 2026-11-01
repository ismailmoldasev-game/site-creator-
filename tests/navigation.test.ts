import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readStudioLocation,
  resolveStudioPage,
  studioLocationURL,
  studioSections,
} from '../lib/studio/navigation';

test('an ordinary first visit still opens settings', () => {
  assert.deepEqual(readStudioLocation(''), { section: 'settings', pageId: '' });
});

test('refreshing the URL restores each section and the selected non-home page', () => {
  for (const section of studioSections) {
    const selected = { section, pageId: 'page-about' };
    const url = studioLocationURL('https://example.test/', selected);
    const restored = readStudioLocation(new URL(url, 'https://example.test').search);
    assert.deepEqual(resolveStudioPage(restored, [{ id: 'home' }, { id: 'page-about' }]), selected);
  }
});

test('a deleted page falls back to an existing page without leaving the editor', () => {
  assert.deepEqual(
    resolveStudioPage(readStudioLocation('?section=editor&page=deleted'), [{ id: 'home' }]),
    {
      section: 'editor',
      pageId: 'home',
    },
  );
  assert.equal(readStudioLocation('?section=unsupported').section, 'settings');
});

test('links preserve unrelated parameters and fragment across navigation', () => {
  const url = studioLocationURL('https://example.test/?utm_source=test&section=brand#notes', {
    section: 'editor',
    pageId: 'a/b?name=about',
  });
  const parsed = new URL(url, 'https://example.test');
  assert.equal(parsed.searchParams.get('utm_source'), 'test');
  assert.equal(parsed.hash, '#notes');
  assert.equal(readStudioLocation(parsed.search).pageId, 'a/b?name=about');
});
