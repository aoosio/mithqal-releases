import {digits,presentMarkup} from '../dist/ui.mjs';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const BASE='https://mithqal.mortada.io';
export const HOURS=['08','12','16','20','23'];
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const content=join(root,'premium/content/news'),dist=join(root,'premium/dist');
const hosts=new Set(['bls.gov','www.bls.gov','federalreserve.gov','www.federalreserve.gov','newyorkfed.org','www.newyorkfed.org','gold.org','www.gold.org','cbi.iq','www.cbi.iq','imf.org','www.imf.org','ecb.europa.eu','www.ecb.europa.eu','treasury.gov','home.treasury.gov','www.treasury.gov','reuters.com','www.reuters.com','apnews.com','www.apnews.com','iraqsm.com','www.iraqsm.com','www.gold-api.com','api.gold-api.com','fred.stlouisfed.org','www.bea.gov','bea.gov','www.dol.gov','dol.gov']);
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const baghdadDay=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
const stamp=at=>new Intl.DateTimeFormat('ar-IQ-u-nu-latn',{timeZone:'Asia/Baghdad',dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
const sourceDate=at=>new Intl.DateTimeFormat('ar-IQ-u-nu-latn',{timeZone:'Asia/Baghdad',dateStyle:'medium'}).format(new Date(at));
const digest=a=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
function text(value,min,max,name){if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008]/.test(value))throw new Error('Invalid '+name);}
function instant(value,now,name){const n=Date.parse(value);if(!Number.isFinite(n)||n>now+300000)throw new Error('Invalid/future '+name);return n;}
export function validateArticle(a,existing=[],now=Date.now()) {
 if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('Article object required');
 for(const k of ['id','eventKey'])if(typeof a[k]!=='string'||! /^[a-z0-9][a-z0-9-]{5,100}$/.test(a[k]))throw new Error('Invalid '+k);
 if(!['launch',...HOURS].includes(a.slot))throw new Error('Invalid edition slot');
 if(!['jobs','inflation','rates','dollar','demand','geopolitics','market'].includes(a.topic))throw new Error('Invalid topic');
 text(a.title,15,150,'title');text(a.summary,30,350,'summary');
 const published=instant(a.publishedAt,now,'publication date');
 const localHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',hour:'2-digit',hourCycle:'h23'}).format(new Date(published)));
 if(a.slot!=='launch'&&localHour<Number(a.slot))throw new Error('Edition cannot be published before its Baghdad slot');
 if(a.updatedAt)instant(a.updatedAt,now,'update date');
 if(!Array.isArray(a.sources)||a.sources.length<1||a.sources.length>4)throw new Error('One to four reviewed sources required');
 const ids=new Set();
 for(const s of a.sources){
  if(!/^[a-z0-9-]{2,30}$/.test(s.id)||ids.has(s.id))throw new Error('Source ids must be unique');ids.add(s.id);
  let u;try{u=new URL(s.url);}catch{throw new Error('Invalid source URL');}
  if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password||u.port||u.hash)throw new Error('Unapproved source URL');
  text(s.publisher,2,100,'source publisher');text(s.title,5,200,'source title');
  const sourceAt=instant(s.publishedAt,now,'source date');
  if(sourceAt>published+300000)throw new Error('A source cannot postdate the article');
  const reviewed=instant(s.reviewedAt,now,'review date');
  if(published-reviewed>2*3600000)throw new Error('Source review must be recent at publication');
  if(!['web','official-document'].includes(s.reviewedVia))throw new Error('Record actual source reading method');
 }
 if(published-Date.parse(a.sources[0].publishedAt)>7*86400000)throw new Error('Main news source is older than seven days');
 if(!Array.isArray(a.evidence)||!a.evidence.length)throw new Error('Reviewed evidence required');
 const quoted=new Map();
 for(const e of a.evidence){if(!ids.has(e.sourceId))throw new Error('Unknown evidence source');text(e.text,5,220,'evidence');quoted.set(e.sourceId,(quoted.get(e.sourceId)||0)+e.text.trim().split(/\s+/).length);}
 if([...quoted.values()].some(n=>n>25))throw new Error('Keep evidence excerpts under 25 words per source');
 if(!Array.isArray(a.sections)||a.sections.length<2||a.sections.length>5)throw new Error('Two to five sections required');
 for(const s of a.sections){text(s.heading,4,100,'section heading');if(!['facts','context'].includes(s.kind))throw new Error('Separate facts and context');if(!Array.isArray(s.paragraphs)||!s.paragraphs.length)throw new Error('Section paragraphs required');for(const p of s.paragraphs)text(p,15,1000,'paragraph');if(!s.sourceIds?.length||s.sourceIds.some(id=>!ids.has(id)))throw new Error('Every section needs an existing source');}
 const total=[a.summary,...a.sections.flatMap(s=>s.paragraphs)].join(' ').split(/\s+/).length;
 if(total>240)throw new Error('Keep news concise; maximum 240 words');
 for(const source of a.sources){const derived=(source===a.sources[0]?a.title+' '+a.summary+' ':'')+a.sections.filter(s=>s.sourceIds.includes(source.id)).flatMap(s=>s.paragraphs).join(' ');if(derived.trim().split(/\s+/).length+(quoted.get(source.id)||0)+source.title.split(/\s+/).length+source.publisher.split(/\s+/).length>195)throw new Error('Too much material derived from one source; shorten the summary');}
 const others=existing.filter(x=>x.id!==a.id);
 if(others.some(x=>x.eventKey===a.eventKey))throw new Error('This news event already has an article; update the existing article instead');
 const day=baghdadDay(a.publishedAt),today=others.filter(x=>baghdadDay(x.publishedAt)===day);
 if(today.length>=5)throw new Error('Maximum five new editions per Baghdad day');
 if(today.some(x=>x.slot===a.slot))throw new Error('This Baghdad-day edition slot is already published');
 return a;
}
export function readArticles(dir=content){if(!existsSync(dir))return [];return readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(join(dir,f),'utf8'))).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));}
const topicLabel={jobs:'الوظائف والاقتصاد',inflation:'التضخم',rates:'الفائدة والسياسة النقدية',dollar:'الدولار والصرف',demand:'الطلب على الذهب',geopolitics:'أحداث عالمية',market:'متابعة السوق'};
const ticker='<aside class="market-ticker" id="market-ticker" aria-label="أسعار الذهب والدولار"><!--MARKET_STRIP--></aside>';
const header=`<header class="news-header container"><a class="brand" href="/"><img src="/assets/mark-340.png" width="45" height="37" alt=""><span>مثقال<small>كل غرام يُحسب.</small></span></a><nav aria-label="التنقل"><a href="/">البرنامج</a><a href="/gold-prices/">الذهب والدولار</a><a href="/blog/" aria-current="page">المدوّنة</a><a href="/#download">تحميل مثقال</a></nav></header>`;
const footer='<footer class="news-footer container"><a href="/">مثقال · لإدارة محلات الذهب في العراق</a><a href="/gold-prices/">أسعار الذهب والدولار</a><a href="/blog/feed.xml" class="news-rss">RSS</a><a href="/privacy">سياسة الخصوصية</a><button class="privacy-button" type="button" data-consent-settings>خيارات الخصوصية</button><span>بغداد، العراق</span></footer>';
function shell({title,description,path,schema,body}){return presentMarkup(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(digits(title))}</title><meta name="description" content="${escape(digits(description))}"><link rel="canonical" href="${BASE+path}"><link rel="icon" href="/assets/icon-64.png"><meta name="theme-color" content="#142822"><meta property="og:type" content="${schema['@type']==='NewsArticle'?'article':'website'}"><meta property="og:locale" content="ar_IQ"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${BASE+path}"><meta property="og:image" content="${BASE}/assets/app-dashboard.webp"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/growth.css"><link rel="stylesheet" href="/news.css"><link rel="stylesheet" href="/ui.css"><link rel="alternate" type="application/rss+xml" title="أخبار مثقال" href="/blog/feed.xml"><script defer src="/measurement.js"></script><script type="module" src="/market-strip.js"></script><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org',...schema}).replace(/</g,'\\u003c')}</script></head><body class="news-page"><a class="skip" href="#main">انتقل إلى المحتوى</a>${ticker}${header}${body}${footer}</body></html>`);}
export function card(a,heading='h2'){return presentMarkup(`<article class="news-card"><${heading}><a href="/blog/${a.id}/">${escape(digits(a.title))}</a></${heading}><p>${escape(digits(a.summary))}</p><div class="news-card-meta"><time datetime="${a.publishedAt}">${stamp(a.publishedAt)}</time><a href="/blog/${a.id}/">اقرأ الخبر ←</a></div><div class="news-card-source">المصدر: ${escape(a.sources[0].publisher)} · ${sourceDate(a.sources[0].publishedAt)}</div></article>`);}
export function articleHtml(a){
 const url=BASE+'/blog/'+a.id+'/';
 const schema={'@type':'NewsArticle',headline:a.title,description:a.summary,datePublished:a.publishedAt,dateModified:a.updatedAt||a.publishedAt,inLanguage:'ar-IQ',mainEntityOfPage:{'@type':'WebPage','@id':url},author:{'@type':'Organization',name:'تحرير مثقال',url:BASE+'/blog/'},publisher:{'@type':'Organization',name:'مثقال',url:BASE+'/',logo:{'@type':'ImageObject',url:BASE+'/assets/mark-340.png'}},citation:a.sources.map(s=>s.url),isAccessibleForFree:true,articleSection:topicLabel[a.topic]};
 const sections=a.sections.map(s=>`<section${s.kind==='context'?' class="article-context"':''}><h2>${escape(digits(s.heading))}</h2>${s.paragraphs.map(p=>'<p>'+escape(digits(p))+'</p>').join('')}<p>${s.sourceIds.map(id=>`<a class="source-ref" href="#source-${id}">${escape(a.sources.find(x=>x.id===id).publisher)} ↗</a>`).join(' · ')}</p></section>`).join('');
 const sources=a.sources.map(s=>`<li id="source-${s.id}"><a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(digits(s.title))}</a><small>${escape(digits(s.publisher))} · تاريخ المصدر: ${sourceDate(s.publishedAt)}</small></li>`).join('');
 return shell({title:a.title+' | أخبار مثقال',description:a.summary,path:'/blog/'+a.id+'/',schema,body:`<main id="main" class="container news-main"><article class="news-article" data-article-id="${a.id}" data-content-hash="${digest(a)}"><nav class="article-breadcrumb" aria-label="مسار الصفحة"><a href="/">مثقال</a><span>←</span><a href="/blog/">أخبار الذهب</a><span>←</span><span>${topicLabel[a.topic]}</span></nav><header class="article-head"><h1>${escape(digits(a.title))}</h1><p class="article-summary">${escape(digits(a.summary))}</p><div class="article-meta"><span>تحرير مثقال</span><span>نُشر <time datetime="${a.publishedAt}">${stamp(a.publishedAt)}</time></span>${a.updatedAt?'<span>حُدّث '+stamp(a.updatedAt)+'</span>':''}<span>بتوقيت بغداد</span></div></header><div class="article-body">${sections}</div><section class="article-sources"><h2>المصادر الأصلية</h2><ol>${sources}</ol></section><aside class="article-action"><p>تابع الذهب والدولار بمصادرهما.</p><a class="button gold" href="/gold-prices/">الأسعار والحاسبة ←</a></aside></article></main>`});
}
export function build({contentDir=content,distDir=dist}={}){
 const dist=distDir;
 const articles=readArticles(contentDir);mkdirSync(join(dist,'blog'),{recursive:true});
 for(const a of articles){validateArticle(a,articles,Date.now());const d=join(dist,'blog',a.id);mkdirSync(d,{recursive:true});writeFileSync(join(d,'index.html'),articleHtml(a));}
 const totalPages=Math.max(1,Math.ceil(articles.length/12));
 for(let page=1;page<=totalPages;page++){
 const selected=articles.slice((page-1)*12,page*12);
 const pagePath=page===1?'/blog/':'/blog/page/'+page+'/';
 const schema={'@type':'CollectionPage',name:'أخبار الذهب والدولار | مثقال',url:BASE+pagePath,inLanguage:'ar-IQ',mainEntity:{'@type':'ItemList',itemListElement:selected.map((a,i)=>({'@type':'ListItem',position:i+1,url:BASE+'/blog/'+a.id+'/'}))}};
 const method='<section class="news-method"><h2>كيف نغطي الخبر؟</h2><p>أخبار من مصادرها الأصلية، مع توضيح ما حدث وما قد يعنيه للذهب.</p><p>الأسعار مرجعية بلا مصنعية. المثقال 5 غرام، والتحديث حسب المصدر.</p></section>';
 const pagination=totalPages>1?'<nav class="news-pagination" aria-label="صفحات الأخبار">'+(page>1?'<a href="'+(page===2?'/blog/':'/blog/page/'+(page-1)+'/')+'">الأحدث ←</a>':'<span></span>')+'<span>صفحة '+page+' من '+totalPages+'</span>'+(page<totalPages?'<a href="/blog/page/'+(page+1)+'/">الأقدم →</a>':'<span></span>')+'</nav>':'';
 const body=`<main id="main" class="container news-main"><section class="news-hero"><div><p class="eyebrow">مدوّنة مثقال · من الخبر إلى سياقه</p><h1>أخبار الذهب.</h1></div><p>أهم أخبار الفائدة والدولار والاقتصاد، وتأثيرها المحتمل على الذهب.</p></section><div class="news-schedule"><strong>5 متابعات يومية</strong><span>٨ صباحًا · ١٢ ظهرًا · ٤ عصرًا · ٨ مساءً · ١١ مساءً</span><span>بتوقيت بغداد · عند وجود خبر موثّق</span></div><section class="news-grid" aria-label="آخر الأخبار">${selected.length?selected.map(a=>card(a)).join(''):'<p class="news-empty">تصل الأخبار الموثّقة هنا بعد مراجعة مصادرها.</p>'}</section>${pagination}${method}</main>`;
 const folder=page===1?join(dist,'blog'):join(dist,'blog/page',String(page));mkdirSync(folder,{recursive:true});
 writeFileSync(join(folder,'index.html'),shell({title:'أخبار الذهب والدولار المؤثرة في السوق | مدوّنة مثقال',description:'أخبار موثّقة عن الذهب والفائدة والتضخم والدولار، مع مصادر أصلية وسياق واضح لأهل الذهب في العراق.',path:pagePath,schema,body}));
 }
 writeFileSync(join(dist,'blog/index.json'),JSON.stringify(articles.slice(0,100).map(a=>({id:a.id,eventKey:a.eventKey,slot:a.slot,title:a.title,summary:a.summary,publishedAt:a.publishedAt,updatedAt:a.updatedAt||null,url:BASE+'/blog/'+a.id+'/',sources:a.sources.map(s=>({url:s.url,publisher:s.publisher,publishedAt:s.publishedAt}))})),null,2)+'\n');
 const rss='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>أخبار مثقال</title><link>'+BASE+'/blog/</link><description>أخبار الذهب والدولار بمصادرها</description><language>ar-iq</language>'+articles.slice(0,60).map(a=>`<item><title>${escape(digits(a.title))}</title><link>${BASE}/blog/${a.id}/</link><guid isPermaLink="true">${BASE}/blog/${a.id}/</guid><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate><description>${escape(digits(a.summary))}</description></item>`).join('')+'</channel></rss>';
 writeFileSync(join(dist,'blog/feed.xml'),rss);
 const latest=articles.length?`<section class="news-latest container" id="gold-news"><div class="news-latest-heading"><div><p class="eyebrow">من مدوّنة مثقال</p><h2>أخبار الذهب.</h2></div><a class="inline-link" href="/blog/">كل الأخبار ←</a></div><div class="news-grid">${articles.slice(0,3).map(a=>card(a,'h3')).join('')}</div></section>`:'';
 const home=join(dist,'index.html');let html=readFileSync(home,'utf8');if(!html.includes('<!--BLOG_LATEST_START-->'))throw new Error('Homepage blog anchors are missing');html=html.replace(/<!--BLOG_LATEST_START-->[\s\S]*?<!--BLOG_LATEST_END-->/,'<!--BLOG_LATEST_START-->'+presentMarkup(latest)+'<!--BLOG_LATEST_END-->');writeFileSync(home,html);
 const paths=['/','/gold-prices/','/privacy','/blog/',...articles.map(a=>'/blog/'+a.id+'/')];
 writeFileSync(join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>{const a=articles.find(a=>path==='/blog/'+a.id+'/');return '<url><loc>'+BASE+path+'</loc>'+(a?'<lastmod>'+(a.updatedAt||a.publishedAt)+'</lastmod>':'')+'</url>';}).join('')+'</urlset>\n');
 return {articles:articles.length,latest:articles[0]?.id||null};
}
function add(file){const a=JSON.parse(readFileSync(file,'utf8')),existing=readArticles();validateArticle(a,existing);const old=existing.find(x=>x.id===a.id);if(old&&digest(old)!==digest(a))throw new Error('Article id exists with different content; do not overwrite published history');mkdirSync(content,{recursive:true});writeFileSync(join(content,a.id+'.json'),JSON.stringify(a,null,2)+'\n');return build();}
function run(command,args,cwd=root){const r=spawnSync(command,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0)throw new Error((r.stderr||r.stdout||command+' failed').slice(-2500));return r.stdout.trim();}
async function verifyLive(a){try{const r=await fetch(BASE+'/blog/'+a.id+'/',{signal:AbortSignal.timeout(20000),cache:'no-store'});if(!r.ok)return false;const html=await r.text();return html.includes('data-content-hash="'+digest(a)+'"');}catch{return false;}}
function wrangler(){const cli=join(root,'premium/node_modules/wrangler/bin/wrangler.js');if(existsSync(cli))return cli;throw new Error('Run npm ci --prefix premium to install the pinned deployment tool.');}
async function publish(file){
 const a=JSON.parse(readFileSync(file,'utf8'));validateArticle(a,[]);const cli=wrangler();run('git',['fetch','origin','cloudflare-premium']);
 const temp=mkdtempSync(join(tmpdir(),'mithqal-news-'));const checkout=join(temp,'checkout');let linked=false;
 try{
  run('git',['worktree','add','--detach',checkout,'origin/cloudflare-premium']);linked=true;
  const existing=readArticles(join(checkout,'premium/content/news'));validateArticle(a,existing);const old=existing.find(x=>x.id===a.id);
  if(old&&digest(old)!==digest(a))throw new Error('Existing article differs. Keep its published id and review corrections separately.');
  if(old&&await verifyLive(a))return {published:false,duplicate:true,url:BASE+'/blog/'+a.id+'/'};
  if(!old){run(process.execPath,[join(checkout,'premium/tools/news.mjs'),'add',resolve(file)],checkout);const saved=join(checkout,'premium/content/news',a.id+'.json');if(!existsSync(saved)||digest(JSON.parse(readFileSync(saved,'utf8')))!==digest(a))throw new Error('The isolated news build did not save this packet; retry the same id after repairing the CLI.');run('git',['add','premium/content/news','premium/dist/blog','premium/dist/index.html','premium/dist/sitemap.xml'],checkout);run('git',['commit','-m','Publish verified gold news: '+a.id],checkout);run('git',['push','origin','HEAD:cloudflare-premium'],checkout);}
  // Reconcile again after deployment if another website commit arrived in flight.
  let settled=false;
  for(let attempt=0;attempt<3;attempt++){
    run('git',['fetch','origin','cloudflare-premium'],checkout);run('git',['checkout','--detach','origin/cloudflare-premium'],checkout);
    const deploying=run('git',['rev-parse','HEAD'],checkout);
    const deploy=run(process.execPath,[cli,'pages','deploy','dist','--project-name','mithqal-premium','--branch','cloudflare-premium'],join(checkout,'premium'));console.log(deploy);
    run('git',['fetch','origin','cloudflare-premium'],checkout);
    if(deploying===run('git',['rev-parse','origin/cloudflare-premium'],checkout)){settled=true;break;}
  }
  if(!settled)throw new Error('Website branch is changing during deployment. Retry this same packet/id.');
  let verified=false;
  for(let attempt=0;attempt<3;attempt++){if(await verifyLive(a)){verified=true;break;}await new Promise(r=>setTimeout(r,2000));}
  if(!verified)throw new Error('Git publication succeeded but live verification is pending. Retry the SAME packet/id; do not create a new edition.');
  return {published:true,url:BASE+'/blog/'+a.id+'/',commit:run('git',['rev-parse','HEAD'],checkout)};
 }finally{if(linked)run('git',['worktree','remove','--force',checkout]);rmSync(temp,{recursive:true,force:true});}
}
function status(){const a=readArticles(),day=baghdadDay(Date.now()),h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',hour:'2-digit',hourCycle:'h23'}).format(new Date()));return {day,timezone:'Asia/Baghdad',schedule:HOURS,today:a.filter(x=>baghdadDay(x.publishedAt)===day).map(x=>({id:x.id,slot:x.slot,eventKey:x.eventKey})),eligibleSlot:[...HOURS].reverse().find(x=>Number(x)<=h)||null,recent:a.slice(0,20).map(x=>({id:x.id,eventKey:x.eventKey,publishedAt:x.publishedAt,title:x.title,sources:x.sources.map(s=>s.url)}))};}
// macOS resolves /var to /private/var when loading modules from a temp worktree.
// Compare canonical paths so the child CLI runs instead of silently importing.
if(process.argv[1]&&realpathSync(fileURLToPath(import.meta.url))===realpathSync(resolve(process.argv[1]))){try{const [cmd,file]=process.argv.slice(2);if(cmd==='build')console.log(JSON.stringify(build()));else if(cmd==='add')console.log(JSON.stringify(add(resolve(file))));else if(cmd==='validate'){validateArticle(JSON.parse(readFileSync(resolve(file),'utf8')),readArticles());console.log('Valid reviewed news packet');}else if(cmd==='publish')console.log(JSON.stringify(await publish(resolve(file))));else if(cmd==='status')console.log(JSON.stringify(status(),null,2));else throw new Error('Use: news.mjs status | build | validate <packet.json> | add <packet.json> | publish <packet.json>');}catch(e){console.error(e.message);process.exitCode=1;}}
