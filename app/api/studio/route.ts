import { requireAccount } from '@/lib/studio/account-server';
import {
  readProject,
  writeProject,
  readBody,
  replyError,
  connectionState,
  APIError,
} from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const account = await requireAccount(req);
    return Response.json(
      { account, ...(await readProject(account)), connections: await connectionState(account) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return replyError(e);
  }
}
export async function PUT(req: Request) {
  try {
    const account = await requireAccount(req);
    const b = await readBody(req);
    if (!Number.isSafeInteger(b.revision) || b.revision < 1)
      throw new APIError('Неизвестная версия проекта');
    return Response.json(await writeProject(account, b.project, b.revision));
  } catch (e) {
    return replyError(e);
  }
}
