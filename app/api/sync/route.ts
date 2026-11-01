import {
  readBody,
  readProject,
  getSecret,
  commitFiles,
  replyError,
  APIError,
} from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    await readBody(req);
    const { project: p } = await readProject();
    const token = await getSecret('github');
    if (!token || !p.github.repo)
      throw new APIError('Подключите GitHub и укажите репозиторий в настройках.');
    const files = [
      { path: 'studio-content/project.json', content: JSON.stringify(p, null, 2) },
      ...p.library.flatMap((d) => [
        { path: `studio-content/blocks/${d.id}/block.html`, content: d.html },
        { path: `studio-content/blocks/${d.id}/schema.json`, content: JSON.stringify(d, null, 2) },
      ]),
    ];
    const sha = await commitFiles(
      p.github.repo,
      'studio-content',
      files,
      token,
      'studio: save project and reusable blocks',
    );
    return Response.json({
      sha,
      url: `https://github.com/${p.github.repo}/tree/studio-content/studio-content`,
    });
  } catch (e) {
    return replyError(e);
  }
}
