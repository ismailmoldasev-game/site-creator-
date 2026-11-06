import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { APIError } from './errors';

export type StudioAccount = {
  id: string;
  projectId: string;
  displayName: string;
  email: string;
};

/** Identity comes exclusively from Sites dispatch, never from request JSON or query parameters. */
export async function resolveAccount(
  db: D1Database,
  user: ChatGPTUser | null,
  ownerEmail: string | undefined,
): Promise<StudioAccount> {
  if (!user)
    throw new APIError('Войдите в свой аккаунт, чтобы открыть редактор.', 401, 'AUTH_REQUIRED');
  let row = await db
    .prepare('SELECT project_id FROM studio_accounts WHERE id=?')
    .bind(user.userId)
    .first<{ project_id: string }>();
  if (!row) {
    if (!ownerEmail?.trim())
      throw new APIError('Владелец существующего проекта ещё не настроен. Данные сохранены.', 503);
    const projectId =
      user.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase()
        ? 'main'
        : 'user:' + user.userId;
    await db
      .prepare('INSERT OR IGNORE INTO studio_accounts (id,project_id,created_at) VALUES (?,?,?)')
      .bind(user.userId, projectId, new Date().toISOString())
      .run();
    row = await db
      .prepare('SELECT project_id FROM studio_accounts WHERE id=?')
      .bind(user.userId)
      .first<{ project_id: string }>();
    if (!row)
      throw new APIError(
        'Этот проект уже закреплён за другим аккаунтом. Войдите в исходный аккаунт владельца.',
        403,
        'ACCOUNT_CHANGED',
      );
  }
  return {
    id: user.userId,
    projectId: row.project_id,
    displayName: user.displayName,
    email: user.email,
  };
}

export function checkAccountRequest(user: ChatGPTUser | null, request: Request) {
  if (!user)
    throw new APIError(
      'Сессия завершилась. Войдите снова. Ваши правки сохранены локально.',
      401,
      'AUTH_REQUIRED',
    );
  if (request.headers.get('X-Studio-Account') !== user.userId) {
    throw new APIError(
      'Аккаунт изменился в другой вкладке. Войдите заново, чтобы открыть свой проект.',
      403,
      'ACCOUNT_CHANGED',
    );
  }
}

export function credentialKey(account: StudioAccount, provider: string) {
  if (!['github', 'openai'].includes(provider)) throw new APIError('Неизвестное подключение');
  return account.projectId === 'main' ? provider : account.projectId + ':' + provider;
}
