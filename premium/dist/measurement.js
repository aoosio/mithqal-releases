(() => {
  'use strict';
  const KEY = 'mithqal-consent-v1';
  const type = location.pathname.startsWith('/gold-prices') ? 'market' : location.pathname.startsWith('/privacy') ? 'privacy' : 'software';
  const allowed = new Set(['contact_intent', 'download_click', 'store_click', 'feature_view', 'market_calculation']);
  let config = {}, choice = {analytics: false, marketing: false}, gaStarted = false, pixelStarted = false;
  let gaPageSent = false, pixelPageSent = false;
  const once = new Set();
  const production = () => config.productionHosts?.includes(location.hostname);
  const gaId = () => /^G-[A-Z0-9]{5,20}$/.test(config.ga4MeasurementId || '') ? config.ga4MeasurementId : null;
  const pixelId = () => /^\d{8,25}$/.test(config.metaPixelId || '') ? config.metaPixelId : null;
  const cleanPage = () => {
    const u = new URL(location.origin + location.pathname);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = new URL(location.href).searchParams.get(key);
      if (value && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) u.searchParams.set(key, value);
    }
    return u.href;
  };
  function script(src) { const s = document.createElement('script'); s.async = true; s.src = src; document.head.append(s); }
  function start() {
    if (!production()) return;
    if (choice.analytics && gaId()) {
      if (!gaStarted) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
        gtag('consent', 'update', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
        gtag('js', new Date());
        gtag('config', gaId(), {send_page_view: false, cookie_domain: location.hostname, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: cleanPage(), page_referrer: document.referrer ? new URL(document.referrer).origin : ''});
        script('https://www.googletagmanager.com/gtag/js?id=' + gaId()); gaStarted = true;
      }
      if (!gaPageSent) { gtag('event', 'page_view', {page_location: cleanPage(), page_title: document.title, page_type: type}); gaPageSent = true; }
    }
    if (choice.marketing && pixelId()) {
      if (!pixelStarted) {
        const n = window.fbq = window.fbq || function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = n.queue || [];
        window._fbq = window._fbq || n;
        fbq('consent', 'grant'); fbq('set', 'autoConfig', false, pixelId()); fbq('init', pixelId());
        script('https://connect.facebook.net/en_US/fbevents.js'); pixelStarted = true;
      }
      if (!pixelPageSent) { fbq('track', 'PageView', {page_type: type}); pixelPageSent = true; }
    }
  }
  function track(name, params = {}, dedupeKey) {
    if (!allowed.has(name) || !production() || !(choice.analytics && gaStarted || choice.marketing && pixelStarted)) return;
    if (dedupeKey && once.has(dedupeKey)) return;
    if (dedupeKey) once.add(dedupeKey);
    const safe = {page_type: type};
    for (const k of ['channel', 'platform', 'placement', 'feature', 'calculator', 'unit', 'karat']) {
      if (typeof params[k] === 'string' && /^[a-zA-Z0-9_-]{1,50}$/.test(params[k])) safe[k] = params[k];
    }
    if (choice.analytics && gaStarted) gtag('event', name, safe);
    if (choice.marketing && pixelStarted) {
      if (name === 'contact_intent') fbq('track', 'Contact', safe);
      else fbq('trackCustom', name, safe);
    }
  }
  function clearCookies() {
    for (const item of document.cookie.split(';')) {
      const name = item.trim().split('=')[0];
      if (!/^(_ga($|_)|_gid$|_gat($|_)|_fbp$|_fbc$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname, '.mortada.io']) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
      }
    }
  }
  function choose(next) {
    const revoke = (choice.analytics && !next.analytics) || (choice.marketing && !next.marketing);
    choice = {analytics: !!next.analytics, marketing: !!next.marketing};
    try { localStorage.setItem(KEY, JSON.stringify({...choice, at: Date.now()})); } catch { /* Choice still applies in memory. */ }
    document.querySelector('#consent-banner')?.remove();
    document.querySelector('#consent-dialog')?.close();
    if (revoke) {
      if (gaId()) window['ga-disable-' + gaId()] = true;
      if (window.fbq) fbq('consent', 'revoke');
      clearCookies(); location.reload(); return;
    }
    start();
  }
  function showSettings() {
    const d = document.querySelector('#consent-dialog');
    d.querySelector('[name=analytics]').checked = choice.analytics;
    d.querySelector('[name=marketing]').checked = choice.marketing;
    d.showModal();
  }
  function consentUI(hasChoice) {
    const d = document.createElement('dialog'); d.id = 'consent-dialog'; d.className = 'consent-dialog';
    d.innerHTML = '<form method="dialog"><h2>خيارات الخصوصية</h2><p>الضرورية تحفظ اختيارك فقط. التحليل والتسويق اختياريان، وتكدر تغيّر قرارك بأي وقت.</p><label><input type="checkbox" name="analytics"> تحليل استخدام الموقع عبر Google Analytics</label><label><input type="checkbox" name="marketing"> قياس الحملات وإعادة الاستهداف عبر Meta Pixel</label><p>لا نرسل بيانات المحل أو الفواتير أو نصوص تكتبها ضمن هذه الأحداث. <a href="/privacy">التفاصيل بسياسة الخصوصية</a></p><div class="consent-actions"><button type="button" data-save>حفظ اختياراتي</button><button value="cancel">إغلاق</button></div></form>';
    document.body.append(d);
    d.querySelector('[data-save]').addEventListener('click', () => choose({analytics: d.querySelector('[name=analytics]').checked, marketing: d.querySelector('[name=marketing]').checked}));
    document.querySelectorAll('[data-consent-settings]').forEach(b => b.addEventListener('click', showSettings));
    if (!hasChoice && (gaId() || pixelId()) && production()) {
      const b = document.createElement('aside'); b.id = 'consent-banner'; b.className = 'consent-banner'; b.setAttribute('aria-label', 'خيارات ملفات الارتباط');
      b.innerHTML = '<div><strong>خصوصيتك واختيارك.</strong><p>نستخدم أدوات اختيارية لفهم استخدام الموقع وقياس إعلانات مثقال. <a href="/privacy">سياسة الخصوصية</a></p></div><div class="consent-actions"><button data-accept>الموافقة على الكل</button><button data-reject>الضرورية فقط</button><button data-custom>تخصيص</button></div>';
      document.body.append(b);
      b.querySelector('[data-accept]').addEventListener('click', () => choose({analytics: true, marketing: true}));
      b.querySelector('[data-reject]').addEventListener('click', () => choose({analytics: false, marketing: false}));
      b.querySelector('[data-custom]').addEventListener('click', showSettings);
    }
  }
  window.MithqalMeasurement = {track, status: () => ({production: production(), analytics: choice.analytics && gaStarted, marketing: choice.marketing && pixelStarted})};
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a) {
      const url = new URL(a.href, location.href), placement = a.closest('section')?.id || 'navigation';
      if (url.hostname === 'wa.me' || url.protocol === 'tel:') track('contact_intent', {channel: url.protocol === 'tel:' ? 'phone' : 'whatsapp', placement});
      else if (/\.exe($|\?)/.test(url.pathname)) track('download_click', {platform: /ia32/.test(url.pathname) ? 'windows_32' : 'windows_64', placement});
      else if (url.hostname === 'apps.apple.com' || url.hostname === 'play.google.com') track('store_click', {platform: url.hostname === 'apps.apple.com' ? 'ios' : 'android', placement});
    }
    const feature = e.target.closest('[data-tour]')?.dataset.tour;
    if (feature) track('feature_view', {feature}, 'feature_' + feature);
  });
  fetch('/measurement-config.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(c => {
    config = c;
    let hasChoice = false;
    try { const stored = JSON.parse(localStorage.getItem(KEY)); if (stored && Number.isFinite(stored.at) && Date.now() - stored.at < 180 * 86400000) { choice = {analytics: stored.analytics === true, marketing: stored.marketing === true}; hasChoice = true; } } catch { /* No consent yet. */ }
    consentUI(hasChoice); start();
  }).catch(() => { /* A config failure never enables tracking. */ });
})();
