import {stripMarkup} from './market-strip.mjs';
const bar=document.querySelector('#market-ticker');
let pending=false;
async function refresh() {
 if (!bar || pending || document.visibilityState==='hidden') return;
 pending=true;
 try {const r=await fetch('/api/market'); if(!r.ok)throw new Error(); const q=await r.json();bar.innerHTML=stripMarkup(q);}
 catch {bar.innerHTML=stripMarkup(null);}
 finally {pending=false;}
}
// The initial values are rendered by the server; this also covers static previews.
if (bar?.querySelector('[data-quote-state=unavailable]') || bar?.textContent.includes('جلب')) refresh();
setInterval(refresh,300000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
