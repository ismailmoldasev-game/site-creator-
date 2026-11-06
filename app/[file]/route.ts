import { readProject, replyError } from '@/lib/studio/server';
import { requireAccount } from '@/lib/studio/account-server';
import { renderPage } from '@/lib/studio/render';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  try {
    const { file } = await params;
    if (!file.endsWith('.html')) return new Response('Страница не найдена', { status: 404 });
    // These URLs are draft previews. Public HTML is exported separately at publication.
    const account = await requireAccount();
    const { project } = await readProject(account);
    const page = project.pages.find((p) => (p.slug || 'index') + '.html' === file);
    if (!page) return new Response('Страница не найдена', { status: 404 });
    return new Response(renderPage(project, page), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return replyError(e);
  }
}
