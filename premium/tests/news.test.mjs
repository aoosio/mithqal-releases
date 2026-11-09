import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readArticles,validateArticle,articleHtml,baghdadDay,build} from '../tools/news.mjs';
import {stripMarkup} from '../dist/market-strip.mjs';
const a=readArticles()[0],now=Date.parse(a.publishedAt)+1000;
assert.ok(validateArticle(a,[],now));
assert.equal(baghdadDay('2026-11-08T21:30:00Z'),'2026-11-09');
assert.throws(()=>validateArticle({...a,id:'../../overwrite'},[],now));
assert.throws(()=>validateArticle({...a,publishedAt:new Date(now+3600000).toISOString()},[],now));
assert.throws(()=>validateArticle({...a,eventKey:'duplicate-event'},[{...a,id:'other-post',eventKey:'duplicate-event'}],now));
assert.throws(()=>validateArticle({...a,sources:[{...a.sources[0],url:'https://127.0.0.1/private'}]},[],now));
assert.ok(validateArticle({...a,sources:a.sources.map((s,i)=>i? s:{...s,url:'https://www.newyorkfed.org/newsevents/news/research/2026/20261109'})},[],now));
assert.throws(()=>validateArticle({...a,sources:a.sources.map((s,i)=>i? s:{...s,url:'https://www.newyorkfed.org.evil.example/release'})},[],now),/Unapproved source URL/);
assert.throws(()=>validateArticle({...a,evidence:[]},[],now));
assert.throws(()=>validateArticle(a,Array.from({length:5},(_,i)=>({...a,id:'prior-post-'+i,eventKey:'prior-event-'+i,slot:['08','12','16','20','23'][i]})),now));
const early=baghdadDay(a.publishedAt)+'T05:00:00Z';
assert.throws(()=>validateArticle({...a,slot:'23',publishedAt:early,sources:a.sources.map(s=>({...s,publishedAt:early,reviewedAt:early}))},[],Date.parse(early)),/before its Baghdad slot/);
const unsafe={...a,title:'اختبار عنوان آمن </script><img src=x onerror=alert(1)>'};
const html=articleHtml(unsafe);assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img src=x'));const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(schema.headline,unsafe.title);assert.equal(schema.datePublished,a.publishedAt);
assert.ok(stripMarkup(null).includes('تعذّر'));assert.ok(!stripMarkup(null).includes('undefined'));
console.log('News: source provenance, duplicate events, five-edition limit, Baghdad dates, publication timing and HTML/JSON-LD escaping passed.');

const fixture=mkdtempSync(join(tmpdir(),'mithqal-news-test-'));
try {
 const contentDir=join(fixture,'content'),distDir=join(fixture,'dist');mkdirSync(contentDir);mkdirSync(distDir);
 writeFileSync(join(distDir,'index.html'),'<main><!--BLOG_LATEST_START--><!--BLOG_LATEST_END--></main>');
 const hours=['08','12','16','20','23'];
 for(let i=0;i<13;i++){
  const day=baghdadDay(Date.now()-(1+Math.floor(i/5))*86400000),slot=hours[i%5],at=new Date(day+'T'+String(Number(slot)-3).padStart(2,'0')+':00:00Z').toISOString();
  const f={...a,id:'synthetic-news-'+i,eventKey:'synthetic-event-'+i,slot,publishedAt:at,sources:a.sources.map(s=>({...s,publishedAt:new Date(Date.parse(at)-3600000).toISOString(),reviewedAt:at}))};
  writeFileSync(join(contentDir,f.id+'.json'),JSON.stringify(f));
 }
 const result=build({contentDir,distDir});assert.equal(result.articles,13);
 const page2=readFileSync(join(distDir,'blog/page/2/index.html'),'utf8');assert.match(page2,/صفحة 2 من 2/);assert.ok(page2.includes('href="https://mithqal.mortada.io/blog/page/2/"'));
 const schema=JSON.parse(page2.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(schema.mainEntity.itemListElement.length,1);assert.ok(schema.mainEntity.itemListElement.every(x=>!x.url.includes('/page/2/')));
 assert.equal(JSON.parse(readFileSync(join(distDir,'blog/index.json'))).length,13);
 assert.ok(readFileSync(join(distDir,'sitemap.xml'),'utf8').includes('/blog/synthetic-news-12/'));
} finally {rmSync(fixture,{recursive:true,force:true});}
console.log('News: a 13-article synthetic archive paginates and exposes only visible article schema.');

const aliasDir=mkdtempSync(join(tmpdir(),'mithqal-news-cli-alias-'));
try {
 const alias=join(aliasDir,'news-alias.mjs');
 symlinkSync(fileURLToPath(new URL('../tools/news.mjs',import.meta.url)),alias);
 const result=spawnSync(process.execPath,[alias,'status'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).timezone,'Asia/Baghdad');
} finally {rmSync(aliasDir,{recursive:true,force:true});}
console.log('News: CLI commands execute through symlinked macOS temporary paths.');
