import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {digits,presentMarkup} from '../dist/ui.mjs';
import {makeQuote,quoteMarkup} from '../dist/market.mjs';
import {stripMarkup} from '../dist/market-strip.mjs';
import {readArticles,articleHtml} from '../tools/news.mjs';
import {createHash} from 'node:crypto';

assert.equal(digits('١٢٣٤٥٦٧٨٩٠ ۱۲۳۴۵۶۷۸۹۰ ١٫٥'), '1234567890 1234567890 1.5');
const machine='<a href="/v1.0/">٢١ ←</a><script>{"id":"١٢","at":"2026-11-09"}</script>';
assert.match(presentMarkup(machine),/href="\/v1.0\/"/);
assert.match(presentMarkup(machine),/"id":"١٢"/);
assert.match(presentMarkup(machine),/>21 <svg/);
const sprite=new JSDOM(readFileSync(new URL('../dist/assets/remix-icons.svg',import.meta.url),'utf8'),{contentType:'image/svg+xml'}).window.document;
for(const path of readdirSync(new URL('../dist/',import.meta.url),{recursive:true}).filter(f=>f.endsWith('.html'))){
  const doc=new JSDOM(readFileSync(new URL('../dist/'+path,import.meta.url),'utf8')).window.document;
  assert.equal(doc.querySelectorAll('select,.eyebrow,.feature-index,.download-kicker,.product-overline').length,0,path);
  doc.querySelectorAll('script,style').forEach(x=>x.remove());
  assert.doesNotMatch(doc.body?.textContent||'',/[٠-٩۰-۹↗↙←→↑↓＋−✓●]/,path);
  for(const use of doc.querySelectorAll('use'))assert.ok(sprite.getElementById(use.getAttribute('href').split('#')[1]),path+' missing icon');
}
const dom=new JSDOM(readFileSync(new URL('../dist/gold-prices/index.html',import.meta.url),'utf8'),{runScripts:'outside-only'}),w=dom.window;
w.HTMLElement.prototype.scrollIntoView=function(){};
w.eval(readFileSync(new URL('../dist/ui.js',import.meta.url),'utf8'));
const trigger=w.document.querySelector('#gold-karat'),list=w.document.querySelector('#gold-karat-options'),input=w.document.querySelector('input[name=karat]');
const key=key=>trigger.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
trigger.focus();key('ArrowDown');assert.equal(trigger.getAttribute('aria-expanded'),'true');key('End');key('Enter');assert.equal(input.value,'18');assert.equal(list.hidden,true);
key('Enter');key('Home');key('Escape');assert.equal(input.value,'18');assert.equal(list.hidden,true);
trigger.click();w.document.querySelector('#gold-karat-option-1').click();assert.equal(new w.FormData(w.document.querySelector('#gold-calculator')).get('karat'),'24');assert.equal(w.document.activeElement,trigger);
trigger.click();w.document.body.click();assert.equal(list.hidden,true);assert.equal(input.value,'24');
dom.window.close();
const now=new Date().toISOString(),q=makeQuote({price:3110.34768,symbol:'XAU',updatedAt:now},{buy:1000,sell:1000,updatedAt:now});
for(const html of [quoteMarkup(q),stripMarkup(q)]){assert.match(html,/أونصة/);assert.match(html,/3,110\.3/);assert.doesNotMatch(html,/[٠-٩۰-۹]/);}
const a=readArticles()[0];assert.ok(articleHtml(a).includes(createHash('sha256').update(JSON.stringify(a)).digest('hex')));
console.log('UI: ASCII digits, Remix references, custom listbox keyboard/pointer selection, form values, live ounce rendering and unchanged article provenance passed.');
