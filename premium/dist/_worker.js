import {stripMarkup} from './market-strip.mjs';
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

async function htmlQuote(request,ctx) {
  const pending=market(request,ctx).catch(()=>({available:false}));
  ctx.waitUntil(pending.then(()=>{}));
  let timer;
  try {return await Promise.race([pending,new Promise(resolve=>{timer=setTimeout(()=>resolve({available:false}),1500);})]);}
  finally {clearTimeout(timer);}
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405, headers: {allow: 'GET, HEAD'}});
    if (['/gold-prices','/blog'].includes(url.pathname)) return Response.redirect(url.origin+url.pathname+'/'+url.search,301);
    if (url.pathname === '/api/market') {
      let quote;
      try {quote=await market(request,ctx);} catch {quote={available:false};}
      return new Response(request.method==='HEAD'?null:JSON.stringify(quote),{status:quote.available?200:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':quote.available?'public, max-age=60':'no-store','x-content-type-options':'nosniff'}});
    }
    const assetPath = url.pathname === '/gold-prices/' ? '/gold-prices/index.html' : url.pathname;
    const asset = await env.ASSETS.fetch(new Request(new URL(assetPath+url.search,url.origin),{method:'GET'}));
    if (!asset.ok || !asset.headers.get('content-type')?.includes('text/html')) return request.method==='HEAD' ? new Response(null,asset) : asset;
    let html=await asset.text();
    if (!html.includes('<!--MARKET_STRIP-->') && !html.includes('<!--MARKET_QUOTE-->')) return new Response(request.method==='HEAD'?null:html,asset);
    let quote;
    quote=await htmlQuote(request,ctx);
    html=html.replace('<!--MARKET_STRIP-->',stripMarkup(quote)).replace('<!--MARKET_QUOTE-->',quoteMarkup(quote)).replace('/*MARKET_DATA*/null',JSON.stringify(quote).replace(/</g,'\\u003c'));
    const headers=new Headers(asset.headers);
    for (const h of ['content-length','etag','content-encoding']) headers.delete(h);
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','public, max-age=60');
    return new Response(request.method==='HEAD'?null:html,{status:asset.status,headers});
  }
};
