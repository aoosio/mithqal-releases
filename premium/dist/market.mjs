export const TROY_OUNCE_GRAMS = 31.1034768;
export const MITHQAL_GRAMS = 5;
export const MAX_SOURCE_AGE_MS = 72 * 60 * 60 * 1000;
const FX_URL = 'https://iraqsm.com/fx';
const GOLD_URL = 'https://api.gold-api.com/price/XAU';

export async function boundedText(response, limit) {
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let text = '', bytes = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw new Error('Source response exceeds size limit');
      text += decoder.decode(value, {stream: true});
    }
    return text + decoder.decode();
  } finally { await reader.cancel(); reader.releaseLock(); }
}

function validTime(value, now) {
  const at = Date.parse(value);
  if (!Number.isFinite(at) || at > now + 300000 || now - at > MAX_SOURCE_AGE_MS) throw new Error('Source date is missing or stale');
  return new Date(at).toISOString();
}

export function parseFx(html, now = Date.now()) {
  let payload = '';
  for (const m of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)\s*;?\s*<\/script>/g)) {
    const chunk = JSON.parse(m[1]);
    if (chunk[0] === 1 && typeof chunk[1] === 'string') payload += chunk[1];
  }
  const marker = /"fx"\s*:\s*\{/.exec(payload);
  if (!marker) throw new Error('Exchange data not found');
  const start = payload.indexOf('{', marker.index);
  let depth = 0, quoted = false, escaped = false, fx;
  for (let i = start; i < payload.length; i++) {
    const c = payload[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { fx = JSON.parse(payload.slice(start, i + 1)); break; }
  }
  const inRange = n => typeof n === 'number' && Number.isFinite(n) && n >= 500 && n <= 10000;
  if (!inRange(fx?.sell) || !inRange(fx?.buy) || fx.buy > fx.sell) throw new Error('Invalid market exchange rate');
  return {buy: fx.buy, sell: fx.sell, updatedAt: validTime(fx.publishedAt, now), source: FX_URL};
}

export function makeQuote(gold, fx, now = Date.now()) {
  if (typeof gold.price !== 'number' || !Number.isFinite(gold.price) || gold.price < 500 || gold.price > 50000 || gold.symbol !== 'XAU') throw new Error('Invalid gold quote');
  const updatedAt = validTime(gold.updatedAt, now);
  validTime(fx.updatedAt, now);
  const karats = [24, 22, 21, 18].map(karat => ({
    karat,
    mithqalIqd: gold.price / TROY_OUNCE_GRAMS * MITHQAL_GRAMS * (karat / 24) * fx.sell,
    gramIqd: gold.price / TROY_OUNCE_GRAMS * (karat / 24) * fx.sell,
  }));
  return {available: true, fetchedAt: new Date(now).toISOString(), mithqalGrams: MITHQAL_GRAMS,
    conversionSide: 'sell', gold: {ounceUsd: gold.price, updatedAt, source: 'https://www.gold-api.com/'}, fx, karats,
    warning: now - Math.min(Date.parse(updatedAt), Date.parse(fx.updatedAt)) > 6 * 3600000 ? 'older_source' : null};
}

export async function loadQuote(fetchImpl = fetch, now = Date.now()) {
  const [gold, fx] = await Promise.all([
    fetchImpl(GOLD_URL, {headers: {accept: 'application/json'}, signal: AbortSignal.timeout(10000)}).then(r => boundedText(r, 32768)).then(JSON.parse),
    fetchImpl(FX_URL, {headers: {accept: 'text/html'}, signal: AbortSignal.timeout(12000)}).then(r => boundedText(r, 2 * 1024 * 1024)).then(s => parseFx(s, now)),
  ]);
  return makeQuote(gold, fx, now);
}

const money = n => new Intl.NumberFormat('ar-IQ', {maximumFractionDigits: 0}).format(n);
const stamp = s => new Intl.DateTimeFormat('ar-IQ', {timeZone: 'Asia/Baghdad', dateStyle: 'medium', timeStyle: 'short'}).format(new Date(s));
export function quoteMarkup(quote) {
  if (!quote?.available) return '<p class="market-notice" role="status">تعذّر جلب أسعار موثوقة الآن. حاول لاحقًا، أو راجع المصدر مباشرةً. لا نعرض سعرًا بديلًا غير متحقق.</p>';
  const rows = quote.karats.map(k => `<tr><th scope="row">عيار ${k.karat}</th><td><bdi>${money(k.mithqalIqd)}</bdi> د.ع</td><td><bdi>${money(k.gramIqd)}</bdi> د.ع</td></tr>`).join('');
  return `<div class="market-summary"><article><span>مثقال عيار ٢١ · ٥ غرام</span><strong><bdi>${money(quote.karats.find(k => k.karat === 21).mithqalIqd)}</bdi> <small>د.ع</small></strong><p>تقدير من السعر العالمي، بدون مصنعية</p></article><article><span>١٠٠ دولار · سعر بيع المصدر</span><strong><bdi>${money(quote.fx.sell * 100)}</bdi> <small>د.ع</small></strong><p>سعر شراء المصدر: <bdi>${money(quote.fx.buy * 100)}</bdi> د.ع</p></article></div>
    <div class="market-table-wrap"><table><caption>قيمة الذهب بالدينار العراقي حسب العيار</caption><thead><tr><th>العيار</th><th>المثقال · ٥ غرام</th><th>الغرام</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="market-sources"><p>الذهب: <a href="https://www.gold-api.com/" rel="noopener" target="_blank">Gold API</a> · أونصة ٢٤: <bdi>${quote.gold.ounceUsd.toFixed(2)}</bdi> دولار · تحديث المصدر <time datetime="${quote.gold.updatedAt}">${stamp(quote.gold.updatedAt)}</time></p><p>الصرف: <a href="https://iraqsm.com/fx" rel="noopener" target="_blank">IQWealth</a> · بيع الدولار الواحد: <bdi>${quote.fx.sell.toFixed(2)}</bdi> د.ع · تحديث المصدر <time datetime="${quote.fx.updatedAt}">${stamp(quote.fx.updatedAt)}</time></p><p>التوقيت بتوقيت بغداد. السعر مرجع حسابي، ويختلف عن سعر التنفيذ في المحل أو الصيرفة.${quote.warning ? ' أحد المصدرين لم يتحدث منذ أكثر من ٦ ساعات؛ راجع وقت التحديث أعلاه.' : ''}</p></div>`;
}
