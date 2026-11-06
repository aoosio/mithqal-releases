'use strict';
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const tours={
 sales:{n:'01',title:'من الوزن إلى الفاتورة.\nكل شيء محسوب.',description:'سجّل العيار والوزن وسعر الغرام والأجرة، ثم احفظ واطبع. نقدًا أو بالآجل، مع رصيد الزبون أمامك.',items:['كتابة مباشرة على الفاتورة','أعيرة متعددة في الفاتورة نفسها','طباعة A5 أو إيصال حراري 80 ملم','سجل فواتير مع البحث والتصفية'],image:'app-editor.webp',label:'فاتورة جديدة'},
 stock:{n:'02',title:'من القطعة إلى المخزون.\nتعرف ما عندك.',description:'تابع وارد الذهب وحركة كل قطعة، وقارن الموجود بالمسجّل. يبقى كل عيار بوزنه ورصيده المستقل.',items:['قطعة برمز وصنف ووزن وتكلفة','باركود وليبلات للطباعة','جرد فعلي ومراجعة الفروقات','شراء كسر ومرتجعات وحركة المخزون'],image:'app-pieces.webp',label:'القطع والليبلات'},
 customers:{n:'03',title:'حساب الزبون.\nواضح من أول حركة.',description:'الفواتير والتسديدات والديون في ملف واحد. اعرف اتجاه الرصيد، وراجع الذهب والنقد دون خلط.',items:['ذهب بالغرام لكل عيار على حدة','قبض وتسديد وربط بالصندوق','تحويل بين الذهب والنقد','كشف حساب للطباعة والمشاركة'],image:'app-customers.webp',label:'الزبائن والديون'},
 suppliers:{n:'04',title:'استلام وتسديد.\nبتفاصيلها كاملة.',description:'حساب المورد يجمع الذهب والأجور والنقد. راجع أثر العملية وثبّت سعر التسكير قبل تسجيل التسديد.',items:['أرصدة ذهب ونقد لكل مورد','أجور شراء محفوظة بعملتها','تسديد من الصندوق المناسب','خشالة وتسليم مباشر وتسويات'],image:'app-suppliers.webp',label:'حسابات الموردين'},
 cash:{n:'05',title:'كل عملة بصندوقها.\nوكل حركة بسببها.',description:'دينار، دولار ودرهم. تابع المقبوض والمصروف والتحويلات، مع حفظ سعر الصرف لكل عملية.',items:['صناديق مستقلة بعملاتها','إيصالات قبض وصرف','تحويل موثّق بين الصناديق','مطابقة النقد عند إغلاق اليوم'],image:'app-cash.webp',label:'الصناديق وحركة النقد'},
 reports:{n:'06',title:'من تفاصيل اليوم.\nإلى الصورة الكاملة.',description:'راجع المبيعات والديون والأرباح والمخزون. اختر معاييرك، واحفظ التقرير الذي تحتاج الرجوع إليه.',items:['تقارير حسب الفترة والعيار والبائع','منشئ تقارير مع حفظ بالاسم','تصدير إلى Excel وPDF','إغلاق يومي مع مراجعة الفروقات'],image:'app-reports.webp',label:'التقارير'}
};
function selectTour(key,focus=false){
 const t=tours[key]; if(!t)return;
 $$('.tour-tabs [role=tab]').forEach(b=>{const on=b.dataset.tour===key;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;if(on&&focus)b.focus();});
 $('#tour-panel').setAttribute('aria-labelledby',`tab-${key}`);
 $('#tour-number').textContent=`${t.n} — 06`;
 $('#tour-title').replaceChildren(...t.title.split('\n').flatMap((s,i)=>i?[document.createElement('br'),document.createTextNode(s)]:[document.createTextNode(s)]));
 $('#tour-description').textContent=t.description;
 $('#tour-list').replaceChildren(...t.items.map(text=>{const li=document.createElement('li');li.textContent=text;return li}));
 $('#tour-image').src=`assets/${t.image}`;$('#tour-image').alt=`مثقال — ${t.label}، بيانات تجريبية`;
 $('#tour-window-title').textContent=`مثقال / ${t.label}`;
 $('#tour-zoom').dataset.image=`assets/${t.image}`;$('#tour-zoom').dataset.caption=`${t.label} — بيانات محل تجريبي`;
}
$$('[data-tour]').forEach(b=>b.addEventListener('click',()=>selectTour(b.dataset.tour)));
$$('[data-tour-link]').forEach(a=>a.addEventListener('click',()=>selectTour(a.dataset.tourLink)));
$('.tour-tabs').addEventListener('keydown',e=>{
 const tabs=$$('[role=tab]',$('.tour-tabs'));let i=tabs.indexOf(document.activeElement);if(i<0)return;
 if(e.key==='ArrowLeft')i=(i+1)%tabs.length;else if(e.key==='ArrowRight')i=(i-1+tabs.length)%tabs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;
 e.preventDefault();selectTour(tabs[i].dataset.tour,true);
});
const menu=$('#mobile-nav'),menuToggle=$('#menu-toggle');
function setMenu(open){menu.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');$('use',menuToggle).setAttribute('href',open?'#i-close':'#i-menu')}
menuToggle.addEventListener('click',()=>setMenu(menu.hidden));
$$('a',menu).forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){setMenu(false);menuToggle.focus()}});
matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)setMenu(false)});
const groups=$$('.feature-group'),search=$('#feature-search'),expand=$('#expand-features');
const normalize=s=>s.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim();
let priorOpen=null;
function updateExpand(){const visible=groups.filter(g=>!g.hidden);const all=visible.length>0&&visible.every(g=>g.open);expand.setAttribute('aria-expanded',String(all));expand.innerHTML=all?'إغلاق التفاصيل <span>−</span>':'عرض كل التفاصيل <span>＋</span>'}
function filterFeatures(){
 const query=normalize(search.value),words=query.split(/\s+/).filter(Boolean);let count=0;
 if(query&&!priorOpen)priorOpen=groups.map(g=>g.open);
 groups.forEach((g,i)=>{let visible=0;const heading=normalize($('.group-heading',g).textContent);$$('.feature-item',g).forEach(item=>{const hay=normalize(item.textContent)+' '+heading;item.hidden=words.length>0&&!words.every(w=>hay.includes(w));if(!item.hidden)visible++});g.hidden=visible===0;if(query)g.open=visible>0;else if(priorOpen)g.open=priorOpen[i];$('.group-count',g).textContent=`${visible} ميزات`;count+=visible});
 if(!query)priorOpen=null;
 $('#empty-features').hidden=count>0;$('#search-status').textContent=query?`نتائج البحث: ${count}`:'عرض جميع الميزات';expand.hidden=count===0;updateExpand();
}
search.addEventListener('input',filterFeatures);
expand.addEventListener('click',()=>{const visible=groups.filter(g=>!g.hidden);const all=visible.every(g=>g.open);visible.forEach(g=>g.open=!all);updateExpand()});
groups.forEach(g=>g.addEventListener('toggle',updateExpand));
$('#clear-search').addEventListener('click',()=>{search.value='';filterFeatures();search.focus()});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('#image-dialog').open){e.preventDefault();search.focus();search.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}});
const dialog=$('#image-dialog');
$$('.zoom-image').forEach(b=>b.addEventListener('click',()=>{$('#dialog-image').src=b.dataset.image;$('#dialog-image').alt=b.dataset.caption;$('#dialog-caption').textContent=b.dataset.caption;dialog.showModal();document.body.classList.add('modal-open')}));
$('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
fetch('releases.json').then(r=>r.ok?r.json():Promise.reject()).then(feed=>{
 const release=feed.releases.filter(r=>r.files?.x64).sort((a,b)=>a.version.localeCompare(b.version,undefined,{numeric:true})).at(-1);if(!release)return;
 const base=`https://github.com/aoosio/mithqal-releases/releases/download/v${encodeURIComponent(release.version)}/`;
 for(const [arch,id]of[['x64','download-x64'],['ia32','download-x86']])if(release.files[arch])$(`#${id}`).href=base+encodeURIComponent(release.files[arch].name);
 $('#release-version').textContent=release.version;$('#release-size').textContent=`${(release.files.x64.size/1048576).toFixed(1)} MB`;$('#release-note').textContent=release.notes;
}).catch(()=>{/* The verified release links remain available offline. */});
