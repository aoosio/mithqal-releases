const num = value => new Intl.NumberFormat('ar-IQ', {maximumFractionDigits: 0}).format(value);
const date = value => new Intl.DateTimeFormat('ar-IQ', {timeZone:'Asia/Baghdad',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
export function stripMarkup(quote) {
  const item = quote?.karats?.find(k=>k.karat===21);
  if (!quote?.available || !item) return '<div class="ticker-inner" data-quote-state="unavailable"><span class="ticker-label">أسعار السوق</span><span>تعذّر تحديث الأسعار الآن</span><a href="/gold-prices/">الأسعار والمصادر ←</a></div>';
  const oldest = new Date(Math.min(Date.parse(quote.gold.updatedAt), Date.parse(quote.fx.updatedAt))).toISOString();
  const label = quote.warning ? 'آخر أسعار متاحة' : 'مرجع السوق';
  return `<div class="ticker-inner"><span class="ticker-label">${label}</span><a class="ticker-value" href="/gold-prices/"><span>ذهب ٢١ · المثقال ٥ غرام</span><strong><bdi>${num(item.mithqalIqd)}</bdi> <small>د.ع</small></strong></a><a class="ticker-value" href="/gold-prices/#fx-calculator-title"><span>١٠٠ دولار · شراء المصدر</span><strong><bdi>${num(quote.fx.buy*100)}</bdi> <small>د.ع</small></strong></a><a class="ticker-value" href="/gold-prices/#fx-calculator-title"><span>١٠٠ دولار · بيع المصدر</span><strong><bdi>${num(quote.fx.sell*100)}</bdi> <small>د.ع</small></strong></a><a class="ticker-source" href="/gold-prices/" title="الذهب بدون مصنعية. الوقت هو أقدم تحديث بين مصدري الذهب والصرف، بتوقيت بغداد.">المصادر والتحديث <time datetime="${oldest}">${date(oldest)}</time> ↗</a></div>`;
}
