import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import {digits,icon,presentMarkup} from '../dist/ui.mjs';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=join(base,'dist');
const mapping={arrow:'arrow-left-line',down:'download-line',check:'check-line',shield:'shield-check-line',receipt:'bill-line',weight:'scales-3-line',chart:'bar-chart-box-line',phone:'smartphone-line',search:'search-line',expand:'fullscreen-line',menu:'menu-line',close:'close-line',chat:'whatsapp-line',monitor:'computer-line'};
const names=new Set([...Object.values(mapping),'arrow-right-up-line','arrow-left-down-line','arrow-right-line','arrow-up-line','arrow-down-line','add-line','subtract-line','more-line','arrow-down-s-line']);
const icons=join(base,'node_modules/remixicon/icons');
const paths=readdirSync(icons,{recursive:true}).filter(p=>p.endsWith('.svg'));
let sprite='<svg xmlns="http://www.w3.org/2000/svg">';
for(const name of names){const path=paths.find(p=>p.endsWith('/'+name+'.svg'));if(!path)throw new Error('Missing Remix icon '+name);const svg=readFileSync(join(icons,path),'utf8');sprite+=`<symbol id="ri-${name}" viewBox="0 0 24 24">${svg.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>[\s\S]*$/,'')}</symbol>`;}
mkdirSync(join(dist,'assets'),{recursive:true});writeFileSync(join(dist,'assets/remix-icons.svg'),sprite+'</svg>');copyFileSync(join(base,'node_modules/remixicon/License'),join(dist,'assets/remix-icons-LICENSE.txt'));
for(const path of readdirSync(dist,{recursive:true}).filter(p=>p.endsWith('.html'))){
 const file=join(dist,path),raw=readFileSync(file,'utf8');
 if(!raw.includes('<html'))continue;
 const dom=new JSDOM(raw),doc=dom.window.document;
 for(const el of doc.querySelectorAll('.eyebrow,.product-overline,.feature-index,.download-kicker'))el.remove();
 doc.querySelector('.svg-library')?.remove();
 for(const use of doc.querySelectorAll('use')){const id=use.getAttribute('href');if(id?.startsWith('#i-')){use.setAttribute('href','/assets/remix-icons.svg#ri-'+mapping[id.slice(3)]);use.closest('svg').classList.add('ui-icon');use.closest('svg').setAttribute('focusable','false');}}
 for(const el of doc.querySelectorAll('.window-dots'))el.innerHTML=icon('more-line');
 for(const li of doc.querySelectorAll('.check-list li'))if(!li.querySelector('svg'))li.insertAdjacentHTML('afterbegin',icon('check-line'));
 for(const summary of doc.querySelectorAll('.market-faq summary'))if(!summary.querySelector('svg'))summary.insertAdjacentHTML('beforeend',icon('add-line'));
 for(const select of doc.querySelectorAll('select')){
   const label=doc.querySelector(`label[for="${select.id}"]`);if(label){label.id=select.id+'-label';label.htmlFor=select.id;}
   const control=doc.createElement('div');control.className='custom-select';
   const input=doc.createElement('input');input.type='hidden';input.name=select.name;input.value=select.value;control.append(input);
   const button=doc.createElement('button');button.type='button';button.id=select.id;button.className='select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-controls',select.id+'-options');button.setAttribute('aria-labelledby',select.id+'-label '+select.id+'-value');button.innerHTML=`<span class="select-value" id="${select.id}-value"></span>${icon('arrow-down-s-line')}`;button.querySelector('span').textContent=digits(select.selectedOptions[0].textContent);control.append(button);
   const list=doc.createElement('div');list.id=select.id+'-options';list.className='select-options';list.setAttribute('role','listbox');list.setAttribute('aria-labelledby',select.id+'-label');list.hidden=true;
   [...select.options].forEach((o,i)=>{const item=doc.createElement('div');item.id=select.id+'-option-'+i;item.setAttribute('role','option');item.setAttribute('aria-selected',String(o.selected));item.dataset.value=o.value;item.textContent=digits(o.textContent);list.append(item);});control.append(list);select.replaceWith(control);
 }
 if(!doc.querySelector('link[href="/ui.css"]'))doc.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="/ui.css">');
 if(doc.querySelector('.custom-select')&&!doc.querySelector('script[src="/ui.js"]'))doc.head.insertAdjacentHTML('beforeend','<script src="/ui.js" type="module"></script>');
 const app=doc.querySelector('script[src="app.js"],script[src="/app.js"]');if(app)app.type='module';
 for(const el of doc.querySelectorAll('[title],[aria-label],[alt],[placeholder],meta[name=description],meta[property^="og:"]'))for(const key of ['title','aria-label','alt','placeholder','content'])if(el.hasAttribute(key))el.setAttribute(key,digits(el.getAttribute(key)));
 writeFileSync(file,presentMarkup(dom.serialize()).replace(/[ \t]+\n/g,'\n'));
}
console.log('Remix SVG subset and display conventions built.');
