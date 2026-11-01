import {
  readProject,
  writeProject,
  readBody,
  replyError,
  connectionState,
  APIError,
} from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(
      { ...(await readProject()), connections: await connectionState() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return replyError(e);
  }
}
export async function PUT(req: Request) {
  try {
    const b = await readBody(req);
    if (!Number.isSafeInteger(b.revision) || b.revision < 1)
      throw new APIError('Неизвестная версия проекта');
    return Response.json(await writeProject(b.project, b.revision));
  } catch (e) {
    return replyError(e);
  }
}
