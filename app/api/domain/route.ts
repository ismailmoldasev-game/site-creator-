import { requireAccount } from '@/lib/studio/account-server';
import { readProject, replyError, APIError } from '@/lib/studio/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const account = await requireAccount(req);
    const { project: p } = await readProject(account);
    if (!p.github.domain || !p.github.repo)
      throw new APIError('Сначала укажите домен и репозиторий.');
    const expected = p.github.repo.split('/')[0].toLowerCase() + '.github.io';
    const results = await Promise.all(
      ['CNAME', 'A'].map(async (type) => {
        const r = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(p.github.domain)}&type=${type}`,
          { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(10000) },
        );
        if (!r.ok) throw new APIError('Не удалось проверить DNS. Повторите позже.');
        return (await r.json()) as { Answer?: { type: number; data: string }[] };
      }),
    );
    const answers = results.flatMap((r) => r.Answer || []);
    const matches =
      answers.some((a) => a.type === 5 && a.data.toLowerCase().replace(/\.$/, '') === expected) ||
      answers.some(
        (a) =>
          a.type === 1 &&
          ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'].includes(
            a.data,
          ),
      );
    return Response.json({ matches, expected, answers: answers.map((a) => a.data) });
  } catch (e) {
    return replyError(e);
  }
}
