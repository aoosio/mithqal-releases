import {loadQuote, quoteMarkup, MAX_SOURCE_AGE_MS} from './market.mjs';

async function market(request, ctx) {
  const key = new Request(new URL('/api/market', request.url).origin + '/api/market-v1');
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) {
    const data = await hit.json();
    const oldest = Math.min(Date.parse(data.gold?.updatedAt), Date.parse(data.fx?.updatedAt));
    if (Number.isFinite(oldest) && Date.now() - oldest <= MAX_SOURCE_AGE_MS) return data;
  }
  const data = await loadQuote();
  ctx.waitUntil(cache.put(key, new Response(JSON.stringify(data), {headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'}})));
  return data;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405, headers: {allow: 'GET, HEAD'}});
    if (url.pathname === '/api/market' || url.pathname === '/gold-prices/' || url.pathname === '/gold-prices') {
      if (url.pathname === '/gold-prices') return Response.redirect(url.origin + '/gold-prices/' + url.search, 301);
      let quote;
      try { quote = await market(request, ctx); }
      catch { console.warn(JSON.stringify({event: 'market_source_unavailable'})); quote = {available: false}; }
      if (url.pathname === '/api/market') return new Response(request.method === 'HEAD' ? null : JSON.stringify(quote), {status: quote.available ? 200 : 503, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': quote.available ? 'public, max-age=60' : 'no-store', 'x-content-type-options': 'nosniff'}});
      const asset = await env.ASSETS.fetch(new Request(url.origin + '/gold-prices/index.html'));
      if (!asset.ok) return asset;
      const html = (await asset.text()).replace('<!--MARKET_QUOTE-->', quoteMarkup(quote)).replace('/*MARKET_DATA*/null', JSON.stringify(quote).replace(/</g, '\\u003c'));
      const headers = new Headers(asset.headers);
      headers.delete('content-length');
      headers.delete('etag');
      headers.set('content-type', 'text/html; charset=utf-8');
      headers.set('cache-control', 'public, max-age=60');
      return new Response(request.method === 'HEAD' ? null : html, {status: 200, headers});
    }
    return env.ASSETS.fetch(request);
  }
};
