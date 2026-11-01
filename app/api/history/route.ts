import { database, readProject, readBody, replyError, APIError } from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const row = await database()
        .prepare('SELECT document FROM studio_versions WHERE id=?')
        .bind(id)
        .first<{ document: string }>();
      if (!row) throw new APIError('Версия не найдена', 404);
      return Response.json({ project: JSON.parse(row.document) });
    }
    const rows = await database()
      .prepare(
        'SELECT id,created_at,commit_sha,url,kind FROM (SELECT id,created_at,"commit" AS commit_sha,url,kind FROM studio_versions) ORDER BY created_at DESC LIMIT 30',
      )
      .all();
    return Response.json(rows.results);
  } catch (e) {
    return replyError(e);
  }
}
export async function POST(req: Request) {
  try {
    await readBody(req);
    const { project } = await readProject();
    const id = crypto.randomUUID();
    await database()
      .prepare('INSERT INTO studio_versions (id,document,created_at,kind) VALUES (?,?,?,?)')
      .bind(id, JSON.stringify(project), new Date().toISOString(), 'snapshot')
      .run();
    return Response.json({ id });
  } catch (e) {
    return replyError(e);
  }
}
