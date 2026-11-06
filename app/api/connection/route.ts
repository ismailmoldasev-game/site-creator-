import { credentialKey } from '@/lib/studio/accounts';
import { requireAccount } from '@/lib/studio/account-server';
import {
  readBody,
  putSecret,
  database,
  connectionState,
  githubFetch,
  replyError,
  APIError,
} from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const account = await requireAccount(req);
    return Response.json(await connectionState(account));
  } catch (e) {
    return replyError(e);
  }
}
export async function POST(req: Request) {
  try {
    const account = await requireAccount(req);
    const b = await readBody(req);
    if (
      !['github', 'openai'].includes(b.provider) ||
      typeof b.key !== 'string' ||
      b.key.length < 10 ||
      b.key.length > 1000
    )
      throw new APIError('Проверьте ключ подключения');
    let login = '';
    if (b.provider === 'github') {
      const p = await githubFetch('/user', b.key);
      login = p.login;
    } else {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: 'Bearer ' + b.key },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new APIError('OpenAI не принял ключ. Проверьте его в кабинете API.');
    }
    await putSecret(account, b.provider, b.key);
    return Response.json({ ...(await connectionState(account)), login });
  } catch (e) {
    return replyError(e);
  }
}
export async function DELETE(req: Request) {
  try {
    const account = await requireAccount(req);
    const b = await readBody(req);
    if (!['github', 'openai'].includes(b.provider)) throw new APIError('Неизвестное подключение');
    await database()
      .prepare('DELETE FROM studio_credentials WHERE provider=?')
      .bind(credentialKey(account, b.provider))
      .run();
    return Response.json(await connectionState(account));
  } catch (e) {
    return replyError(e);
  }
}
