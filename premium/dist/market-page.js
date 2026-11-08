import {quoteMarkup} from './market.mjs';
let quote;
try {quote = JSON.parse(document.querySelector('#market-data').textContent);} catch {quote = null;}
const money = n => new Intl.NumberFormat('ar-IQ', {maximumFractionDigits: 0}).format(n);
const formGold = document.querySelector('#gold-calculator'), formFx = document.querySelector('#fx-calculator');
function ready() { return quote?.available && Date.now() - Math.min(Date.parse(quote.gold.updatedAt), Date.parse(quote.fx.updatedAt)) <= 72 * 3600000; }
function enable() { for (const b of document.querySelectorAll('.market-calculator button')) b.disabled = !ready(); }
enable();
if (!ready()) {
  document.querySelector('#market-quotes').innerHTML = '<p class="market-notice" role="status">نحاول جلب آخر الأسعار المتاحة من المصدر…</p>';
  fetch('/api/market').then(async r => { if (!r.ok) throw new Error(); quote = await r.json(); document.querySelector('#market-quotes').innerHTML = quoteMarkup(quote); enable(); }).catch(() => { document.querySelector('#market-quotes').innerHTML = quoteMarkup(null); });
}
formGold.addEventListener('submit', e => {
  e.preventDefault(); if (!ready() || !formGold.reportValidity()) return;
  const data = new FormData(formGold), weight = Number(data.get('weight')), unit = data.get('unit'), karat = Number(data.get('karat'));
  const rate = quote.karats.find(k => k.karat === karat);
  if (!rate || !Number.isFinite(weight) || weight <= 0 || !['gram', 'mithqal'].includes(unit)) return;
  document.querySelector('#gold-result').textContent = money(weight * (unit === 'gram' ? rate.gramIqd : rate.mithqalIqd)) + ' د.ع · تقدير بدون مصنعية';
  window.MithqalMeasurement?.track('market_calculation', {calculator: 'gold', unit, karat: String(karat)});
});
formFx.addEventListener('submit', e => {
  e.preventDefault(); if (!ready() || !formFx.reportValidity()) return;
  const data = new FormData(formFx), amount = Number(data.get('amount')), direction = data.get('direction');
  if (!Number.isFinite(amount) || amount <= 0 || !['usd_to_iqd', 'iqd_to_usd'].includes(direction)) return;
  document.querySelector('#fx-result').textContent = direction === 'usd_to_iqd' ? money(amount * quote.fx.buy) + ' د.ع · بسعر شراء المصدر' : new Intl.NumberFormat('ar-IQ', {maximumFractionDigits: 2}).format(amount / quote.fx.sell) + ' دولار · بسعر بيع المصدر';
  window.MithqalMeasurement?.track('market_calculation', {calculator: 'fx', unit: direction});
});

async function refreshQuote() {
  if (document.visibilityState !== 'visible') return;
  try {
    const r = await fetch('/api/market');
    if (!r.ok) throw new Error();
    quote = await r.json();
    document.querySelector('#market-quotes').innerHTML = quoteMarkup(quote);
  } catch {
    // Do not leave an old snapshot looking current after refresh fails.
    quote = null;
    document.querySelector('#market-quotes').innerHTML = quoteMarkup(null);
  }
  enable();
}
setInterval(refreshQuote, 300000);
document.addEventListener('visibilitychange', () => {if (document.visibilityState === 'visible') refreshQuote();});
