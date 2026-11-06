import handler from 'vinext/server/fetch-handler';
import { runWithConnectorBinding } from '../lib/connector-context';
import type { ConnectorBinding } from '../lib/connector-contract.mjs';

const worker = {
  async fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>,
  ) {
    const pathname = new URL(request.url).pathname;
    // Sites dispatch owns and sanitizes these identity headers at the hosting boundary.
    // Service tokens deliberately do not create a personal-account identity.
    if (pathname.startsWith('/api/')) {
      const id = request.headers.get('oai-authenticated-user-id');
      const email = request.headers.get('oai-authenticated-user-email');
      if (!id || !email)
        return Response.json(
          { error: 'Войдите в свой аккаунт.', code: 'AUTH_REQUIRED' },
          { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
        );
      if (request.headers.get('X-Studio-Account') !== id)
        return Response.json(
          { error: 'Аккаунт изменился. Откройте редактор заново.', code: 'ACCOUNT_CHANGED' },
          { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: 'request_context_expired' };
          return preview.getContext?.() ?? { status: 'binding_unavailable' };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return {
              status: 'request_context_expired',
              message: 'This request has expired. Please try again.',
            };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    if (
      pathname === '/' ||
      pathname === '/preview' ||
      pathname.endsWith('.html') ||
      pathname.startsWith('/api/')
    ) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'private, no-store');
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  },
};

export default worker;
