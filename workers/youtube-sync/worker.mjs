// Cloudflare Worker: hourly YouTube -> Supabase sync + manual HTTP trigger.
//   scheduled  -> runs every hour (see wrangler.toml cron)
//   fetch      -> GET /?dry=1 with header  x-sync-secret: <SYNC_SECRET>   (401 otherwise)
import { syncShorts } from './syncShorts.mjs';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(syncShorts(env));
  },
  async fetch(request, env) {
    if (!env.SYNC_SECRET || !safeEqual(request.headers.get('x-sync-secret') || '', env.SYNC_SECRET)) {
      return new Response('Unauthorized', { status: 401 });
    }
    const dry = new URL(request.url).searchParams.get('dry') === '1';
    const summary = await syncShorts(env, { dry });
    return new Response(JSON.stringify(summary, null, 2), { headers: { 'Content-Type': 'application/json' } });
  },
};
