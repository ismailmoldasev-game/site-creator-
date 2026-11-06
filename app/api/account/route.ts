import { requireAccount } from '@/lib/studio/account-server';
import { replyError } from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    return Response.json(
      { account: await requireAccount(req) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return replyError(error);
  }
}
