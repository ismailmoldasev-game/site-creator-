import { requireAccount } from '@/lib/studio/account-server';
import { readProject, replyError } from '@/lib/studio/server';
import { projectFiles } from '@/lib/studio/render';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const account = await requireAccount(req);
    const { project } = await readProject(account);
    return Response.json({ files: projectFiles(project) });
  } catch (e) {
    return replyError(e);
  }
}
