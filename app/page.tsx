import Studio from '@/components/studio';
import { getChatGPTUser } from './chatgpt-auth';
import { requireAccount } from '@/lib/studio/account-server';
import AccountWelcome from '@/components/account-welcome';
export const dynamic = 'force-dynamic';
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['section', 'page'])
    if (typeof params[key] === 'string') query.set(key, params[key]);
  const returnTo = '/' + (query.size ? '?' + query : '');
  if (!(await getChatGPTUser())) return <AccountWelcome returnTo={returnTo} />;
  try {
    const account = await requireAccount();
    return <Studio account={account} />;
  } catch {
    return (
      <AccountWelcome
        returnTo={returnTo}
        error="Не удалось открыть личное пространство. Ваш проект сохранён. Попробуйте снова или войдите в исходный аккаунт."
      />
    );
  }
}
