import {icon} from './ui.mjs';
const num = (value, maximumFractionDigits=0) => new Intl.NumberFormat('ar-IQ-u-nu-latn', {maximumFractionDigits,minimumFractionDigits:maximumFractionDigits?2:0}).format(value);
const date = value => new Intl.DateTimeFormat('ar-IQ-u-nu-latn', {timeZone:'Asia/Baghdad',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
export function stripMarkup(quote) {
  const item = quote?.karats?.find(k=>k.karat===21);
  if (!quote?.available || !item) return `<div class="ticker-inner" data-quote-state="unavailable"><span>تعذّر تحديث الأسعار</span><a href="/gold-prices/">الأسعار والمصادر ${icon('arrow-left-line')}</a></div>`;
  const oldest = new Date(Math.min(Date.parse(quote.gold.updatedAt), Date.parse(quote.fx.updatedAt))).toISOString();
  return `<div class="ticker-inner"><a class="ticker-value" href="/gold-prices/"><span>مثقال 21 · 5 غرام</span><strong><bdi>${num(item.mithqalIqd)}</bdi> <small>د.ع</small></strong></a><a class="ticker-value" href="/gold-prices/#market-quotes"><span>أونصة 24 · دولار</span><strong><bdi>${num(quote.gold.ounceUsd,2)}</bdi> <small>$</small></strong></a><a class="ticker-value" href="/gold-prices/#fx-calculator-title"><span>100$ · شراء المصدر</span><strong><bdi>${num(quote.fx.buy*100)}</bdi> <small>د.ع</small></strong></a><a class="ticker-value" href="/gold-prices/#fx-calculator-title"><span>100$ · بيع المصدر</span><strong><bdi>${num(quote.fx.sell*100)}</bdi> <small>د.ع</small></strong></a><a class="ticker-source" href="/gold-prices/" title="بدون مصنعية. أقدم تحديث للمصدرين بتوقيت بغداد.">${quote.warning?'آخر سعر متاح':'المصادر والتحديث'}<time datetime="${oldest}">${date(oldest)}</time>${icon('arrow-right-up-line')}</a></div>`;
}
