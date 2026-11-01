import { readProject, replyError } from '@/lib/studio/server';
import { projectFiles } from '@/lib/studio/render';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { project } = await readProject();
    return Response.json({ files: projectFiles(project) });
  } catch (e) {
    return replyError(e);
  }
}
