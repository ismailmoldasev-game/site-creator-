import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { requireAccount } from '@/lib/studio/account-server';
import Preview from '@/components/account-preview';
export const dynamic = 'force-dynamic';
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  await requireChatGPTUser('/preview' + (page ? '?page=' + encodeURIComponent(page) : ''));
  return <Preview account={await requireAccount()} />;
}
