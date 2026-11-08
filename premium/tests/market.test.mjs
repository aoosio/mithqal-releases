import assert from 'node:assert/strict';
import {parseFx,makeQuote,loadQuote,boundedText,quoteMarkup} from '../dist/market.mjs';
const now=Date.now(), at=new Date(now).toISOString(), fx={buy:1000,sell:1000,updatedAt:at,source:'https://iraqsm.com/fx'}, gold={price:3110.34768,symbol:'XAU',updatedAt:at};
const q=makeQuote(gold,fx,now);
assert.ok(Math.abs(q.karats.find(k=>k.karat===21).mithqalIqd-437500)<0.000001);
assert.equal(q.karats.find(k=>k.karat===24).gramIqd,100000);
for (const patch of [{price:'3110'},{price:NaN},{symbol:'XAG'},{updatedAt:new Date(now-73*3600000).toISOString()},{updatedAt:new Date(now+600000).toISOString()}]) assert.throws(()=>makeQuote({...gold,...patch},fx,now));
function html(data){return '<script>self.__next_f.push('+JSON.stringify([1,JSON.stringify({fx:data})])+')</script>';}
assert.equal(parseFx(html({buy:1680,sell:1685,publishedAt:at}),now).sell,1685);
assert.throws(()=>parseFx(html({buy:1700,sell:1685,publishedAt:at}),now));
assert.throws(()=>parseFx(html({buy:1680,sell:1685,publishedAt:'garbage'}),now));
await assert.rejects(boundedText(new Response('123456'),3));
await assert.rejects(boundedText(new Response('bad',{status:503}),1024));
assert.match(quoteMarkup(q),/٤٣٧٬٥٠٠/); assert.doesNotMatch(quoteMarkup(null),/undefined|NaN/);
const real=process.env.LIVE_MARKET_CHECK === '1' ? await loadQuote() : q; assert.ok(real.available);console.log(JSON.stringify({tests:'passed',mode:process.env.LIVE_MARKET_CHECK === '1' ? 'live_source_check' : 'synthetic_unit_test',quote:{gold:real.gold,fx:real.fx,mithqal21:real.karats.find(k=>k.karat===21).mithqalIqd}},null,2));
