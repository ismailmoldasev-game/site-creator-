import { requireAccount } from '@/lib/studio/account-server';
import { database, readProject, readBody, replyError, APIError } from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const account = await requireAccount(req);
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const row = await database()
        .prepare('SELECT document FROM studio_versions WHERE id=? AND project_id=?')
        .bind(id, account.projectId)
        .first<{ document: string }>();
      if (!row) throw new APIError('Версия не найдена', 404);
      return Response.json({ project: JSON.parse(row.document) });
    }
    const rows = await database()
      .prepare(
        'SELECT id,created_at,"commit" AS commit_sha,url,kind FROM studio_versions WHERE project_id=? ORDER BY created_at DESC LIMIT 30',
      )
      .bind(account.projectId)
      .all();
    return Response.json(rows.results);
  } catch (e) {
    return replyError(e);
  }
}
export async function POST(req: Request) {
  try {
    const account = await requireAccount(req);
    await readBody(req);
    const { project } = await readProject(account);
    const id = crypto.randomUUID();
    await database()
      .prepare(
        'INSERT INTO studio_versions (id,document,created_at,kind,project_id) VALUES (?,?,?,?,?)',
      )
      .bind(id, JSON.stringify(project), new Date().toISOString(), 'snapshot', account.projectId)
      .run();
    return Response.json({ id });
  } catch (e) {
    return replyError(e);
  }
}
