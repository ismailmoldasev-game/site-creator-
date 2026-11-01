import { readProject } from '@/lib/studio/server';
import { renderPage } from '@/lib/studio/render';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const { project } = await readProject();
  const page = project.pages.find((p) => (p.slug || 'index') + '.html' === file);
  if (!page) return new Response('Страница не найдена', { status: 404 });
  return new Response(renderPage(project, page), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
