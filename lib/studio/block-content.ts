import {
  builtin,
  uid,
  type Block,
  type FeatureCard,
  type ImageSettings,
  type Page,
  type Project,
  type Slide,
} from './model';

export const defaultImageSettings: ImageSettings = { fit: 'contain', x: 50, y: 50, ratio: 'auto' };

/** Read legacy cards without changing the saved document until the user edits them. */
export function featureCards(block: Block): FeatureCard[] {
  if (block.cards) return block.cards;
  const definition = builtin.find((d) => d.id === 'features')!;
  const value = (key: string) =>
    block.values[key] ?? definition.fields.find((f) => f.key === key)?.default ?? '';
  return ['one', 'two', 'three'].map((key) => ({
    id: 'legacy-' + key,
    title: value(key + 'Title'),
    text: value(key + 'Text'),
  }));
}

export function newSlide(): Slide {
  return { id: uid(), image: '', title: '', text: '', button: '', href: '' };
}

export function blockSlides(block: Block): Slide[] {
  return (
    block.slides ?? [
      {
        id: 'first',
        image: '',
        title: 'Первый слайд',
        text: 'Добавьте фотографию и расскажите её историю.',
        button: '',
        href: '',
      },
      {
        id: 'second',
        image: '',
        title: 'Второй слайд',
        text: 'Продолжите историю ещё одним кадром.',
        button: '',
        href: '',
      },
    ]
  );
}

export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const next = [...items];
  const target = index + delta;
  if (index >= 0 && index < next.length && target >= 0 && target < next.length)
    [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Keep the original #about and #contacts links working on existing projects. */
export function blockAnchor(block: Block, blocks: Block[]): string {
  const assigned = new Map<string, string>();
  const used = new Set<string>();
  // Explicit names win over the automatic names, even for later sections.
  for (const item of [...blocks.filter((b) => b.anchor), ...blocks.filter((b) => !b.anchor)]) {
    const preferred =
      item.anchor ||
      (item.type === 'text' ? 'about' : item.type === 'contact' ? 'contacts' : 'block-' + item.id);
    let candidate = preferred;
    let suffix = 2;
    while (used.has(candidate)) candidate = preferred + '-' + suffix++;
    used.add(candidate);
    assigned.set(item.id, candidate);
  }
  return assigned.get(block.id) ?? block.anchor ?? 'block-' + block.id;
}

export function pageBlocks(project: Project, page: Page) {
  return [...project.shared.header, ...page.blocks, ...project.shared.footer].filter(
    (b) => !b.hidden,
  );
}
