import { defaultHeaderNavigation, type Block, type Project } from './model';

/** Undefined is a legacy menu; an empty list deliberately hides all menu items. */
export function headerMenu(block: Block, project: Project) {
  return block.navigation ?? defaultHeaderNavigation(project.pages);
}

export function headerLinks(block: Block, project: Project) {
  return headerMenu(block, project).flatMap((item) => {
    if (item.hidden) return [];
    if (item.kind === 'page') {
      const page = project.pages.find((page) => page.id === item.pageId);
      return page
        ? [
            {
              id: item.id,
              label: item.label.trim() || page.name,
              href: (page.slug || 'index') + '.html',
            },
          ]
        : [];
    }
    return item.label.trim() ? [{ id: item.id, label: item.label.trim(), href: item.href }] : [];
  });
}
