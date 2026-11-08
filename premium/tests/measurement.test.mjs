import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Supply jsdom from an external dev install; it is never shipped to the website.
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_PATH || 'jsdom');
const code=readFileSync(new URL('../dist/measurement.js',import.meta.url),'utf8');
const config={productionHosts:['mithqal.mortada.io'],ga4MeasurementId:'G-TEST123456',metaPixelId:'123456789012345'};
async function page({url='https://mithqal.mortada.io/?email=private@example.test&utm_campaign=launch',fail=false,stored=null}={}) {
 const dom=new JSDOM('<head><title>مثقال</title></head><body><button data-consent-settings>Privacy</button><section id="start"><a id="contact" href="https://wa.me/9647779397740?text=private-user-text">Contact</a><button data-tour="stock">Feature</button></section></body>',{url,runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const w=dom.window;w.fetch=async()=>{if(fail)throw new Error();return {ok:true,json:async()=>config}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 if(stored)w.localStorage.setItem('mithqal-consent-v1',JSON.stringify({...stored,at:Date.now()}));
 w.eval(code);await new Promise(r=>setImmediate(r));return w;
}
let w=await page();assert.equal(w.document.querySelectorAll('script[src]').length,0);assert.ok(w.document.querySelector('#consent-banner'));
w.document.querySelector('[data-reject]').click();assert.equal(w.document.querySelectorAll('script[src]').length,0);assert.equal(w.MithqalMeasurement.status().analytics,false);
w.document.querySelector('[data-consent-settings]').click();assert.ok(w.document.querySelector('#consent-dialog').open);assert.equal(w.document.querySelector('[name=analytics]').checked,false);
w.document.querySelector('[name=analytics]').checked=true;w.document.querySelector('[data-save]').click();assert.equal(w.document.querySelectorAll('script[src]').length,1);assert.ok(w.document.querySelector('script[src*="googletagmanager"]'));assert.ok(!w.fbq);
w.document.querySelector('[data-tour]').click();w.document.querySelector('[data-tour]').click();w.document.querySelector('#contact').click();
let events=w.dataLayer.map(x=>Array.from(x));assert.equal(events.filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);assert.equal(events.filter(x=>x[1]==='feature_view').length,1);assert.equal(events.filter(x=>x[1]==='contact_intent').length,1);assert.ok(!JSON.stringify(events).includes('private'));assert.ok(!JSON.stringify(events).includes('generate_lead'));
w.close();
w=await page();w.document.querySelector('[data-accept]').click();assert.equal(w.document.querySelectorAll('script[src]').length,2);assert.equal(w.fbq.queue.filter(x=>x[0]==='track'&&x[1]==='PageView').length,1);w.document.querySelector('#contact').click();assert.ok(w.fbq.queue.some(x=>x[0]==='track'&&x[1]==='Contact'));assert.ok(!w.fbq.queue.some(x=>x[1]==='Lead'));w.document.querySelector('[data-consent-settings]').click();w.document.querySelector('[data-save]').click();assert.equal(w.document.querySelectorAll('script[src]').length,2);w.document.cookie='_ga=sample; Path=/';w.document.querySelector('[data-consent-settings]').click();w.document.querySelector('[name=analytics]').checked=false;w.document.querySelector('[name=marketing]').checked=false;w.document.querySelector('[data-save]').click();assert.equal(w['ga-disable-G-TEST123456'],true);assert.ok(w.fbq.queue.some(x=>x[0]==='consent'&&x[1]==='revoke'));assert.ok(!w.document.cookie.includes('_ga='));w.close();
w=await page({stored:{analytics:false,marketing:false}});assert.equal(w.document.querySelectorAll('script[src]').length,0);assert.ok(!w.document.querySelector('#consent-banner'));w.close();
w=await page({url:'https://preview.example/'});assert.equal(w.document.querySelectorAll('script[src]').length,0);assert.ok(!w.document.querySelector('#consent-banner'));w.close();
w=await page({fail:true});assert.equal(w.document.querySelectorAll('script[src]').length,0);w.close();
console.log('Measurement: no pre-consent tracking, rejection persistence, category separation, idempotence, safe event payloads and preview/config failure guards passed.');
