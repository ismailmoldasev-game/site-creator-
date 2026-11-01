import {
  database,
  readBody,
  readProject,
  getSecret,
  githubFetch,
  commitFiles,
  replyError,
  APIError,
} from '@/lib/studio/server';
import { projectFiles } from '@/lib/studio/render';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    await readBody(req);
    const { project: p } = await readProject();
    if (!p.github.repo) throw new APIError('Укажите репозиторий GitHub в настройках.');
    const token = await getSecret('github');
    if (!token) throw new APIError('Подключите токен GitHub в настройках.');
    const sha = await commitFiles(
      p.github.repo,
      p.github.branch,
      projectFiles(p),
      token,
      'studio: publish website',
      true,
    );
    let pages;
    try {
      pages = await githubFetch(`/repos/${p.github.repo}/pages`, token);
    } catch (e) {
      if (!(e instanceof APIError) || e.status !== 404) throw e;
      pages = await githubFetch(`/repos/${p.github.repo}/pages`, token, 'POST', {
        source: { branch: p.github.branch, path: '/' },
        build_type: 'legacy',
      });
    }
    await githubFetch(`/repos/${p.github.repo}/pages`, token, 'PUT', {
      source: { branch: p.github.branch, path: '/' },
      cname: p.github.domain || null,
    });
    const url = p.github.domain
      ? 'https://' + p.github.domain
      : pages.html_url ||
        `https://${p.github.repo.split('/')[0]}.github.io/${p.github.repo.split('/')[1]}/`;
    await database()
      .prepare(
        'INSERT INTO studio_versions (id,document,created_at,"commit",url,kind) VALUES (?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        JSON.stringify(p),
        new Date().toISOString(),
        sha,
        url,
        'publication',
      )
      .run();
    return Response.json({ sha, url, status: 'building' });
  } catch (e) {
    return replyError(e);
  }
}
export async function GET() {
  try {
    const { project: p } = await readProject();
    const token = await getSecret('github');
    if (!token || !p.github.repo) return Response.json({ status: 'disconnected' });
    const pages = await githubFetch(`/repos/${p.github.repo}/pages`, token);
    const build = await githubFetch(`/repos/${p.github.repo}/pages/builds/latest`, token);
    return Response.json({
      status: build.status,
      url: pages.html_url,
      error: build.error?.message || null,
    });
  } catch (e) {
    return replyError(e);
  }
}
