export const studioSections = ['settings', 'editor', 'brand', 'ai', 'publish'] as const;
export type StudioSection = (typeof studioSections)[number];
export type StudioLocation = { section: StudioSection; pageId: string };

export function readStudioLocation(search: string): StudioLocation {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  return {
    section: studioSections.includes(section as StudioSection)
      ? (section as StudioSection)
      : 'settings',
    pageId: params.get('page') || '',
  };
}

export function resolveStudioPage(
  location: StudioLocation,
  pages: { id: string }[],
): StudioLocation {
  return {
    ...location,
    pageId: pages.some((p) => p.id === location.pageId) ? location.pageId : pages[0]?.id || '',
  };
}

/** Preserve unrelated query parameters and hashes; never trigger a document navigation. */
export function studioLocationURL(href: string, location: StudioLocation): string {
  const url = new URL(href);
  if (location.section === 'settings') url.searchParams.delete('section');
  else url.searchParams.set('section', location.section);
  if (location.pageId) url.searchParams.set('page', location.pageId);
  else url.searchParams.delete('page');
  return url.pathname + url.search + url.hash;
}
