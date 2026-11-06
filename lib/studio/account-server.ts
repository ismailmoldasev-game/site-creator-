import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { checkAccountRequest, resolveAccount } from './accounts';
import { APIError } from './errors';

export async function requireAccount(request?: Request) {
  const user = await getChatGPTUser();
  if (!user)
    throw new APIError('Войдите в свой аккаунт, чтобы открыть редактор.', 401, 'AUTH_REQUIRED');
  if (request) checkAccountRequest(user, request);
  if (!env.DB) throw new APIError('Хранилище проекта не подключено', 503);
  return resolveAccount(
    env.DB,
    user,
    (env as unknown as Record<string, string>).STUDIO_LEGACY_OWNER_EMAIL,
  );
}
