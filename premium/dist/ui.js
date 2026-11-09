// Custom listboxes keep the same appearance and keyboard behavior on every device.
document.querySelectorAll('.custom-select').forEach(control => {
  const trigger = control.querySelector('[role=combobox]');
  const list = control.querySelector('[role=listbox]');
  const options = [...list.querySelectorAll('[role=option]')];
  const input = control.querySelector('input');
  let active = options.findIndex(o => o.dataset.value === input.value);
  let typed = '', typedAt = 0;
  function highlight(index) {
    active = (index + options.length) % options.length;
    options.forEach((o, i) => o.classList.toggle('is-active', i === active));
    trigger.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({block:'nearest'});
  }
  function close() {list.hidden = true; trigger.setAttribute('aria-expanded','false'); trigger.removeAttribute('aria-activedescendant');}
  function open() {list.hidden = false; trigger.setAttribute('aria-expanded','true'); highlight(options.findIndex(o => o.dataset.value === input.value));}
  function choose(index) {
    input.value = options[index].dataset.value;
    trigger.querySelector('.select-value').textContent = options[index].textContent;
    options.forEach((o,i) => o.setAttribute('aria-selected',String(i===index)));
    input.dispatchEvent(new Event('change',{bubbles:true})); close(); trigger.focus();
  }
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  trigger.addEventListener('keydown', e => {
    if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
      e.preventDefault(); if(list.hidden) {open(); if(e.key.startsWith('Arrow'))return;}
      highlight(e.key==='Home'?0:e.key==='End'?options.length-1:active+(e.key==='ArrowDown'?1:-1));
    } else if (e.key==='Enter'||e.key===' ') {e.preventDefault(); list.hidden?open():choose(active);}
    else if (e.key==='Escape') {e.preventDefault(); close();}
    else if (e.key==='Tab') close();
    else if(e.key.length===1) {
      typed=Date.now()-typedAt>700?e.key:typed+e.key; typedAt=Date.now();
      const match=options.findIndex(o=>o.textContent.trim().startsWith(typed));
      if(match>=0){if(list.hidden)open();highlight(match);}
    }
  });
  options.forEach((option,i) => option.addEventListener('click', () => choose(i)));
  document.addEventListener('click', e => {if(!control.contains(e.target))close();});
  trigger.addEventListener('blur', () => {if(!control.contains(document.activeElement))close();});
  // Keep focus on the combobox until a pointer selection completes.
  list.addEventListener('mousedown', e => e.preventDefault());
  control.closest('form')?.addEventListener('reset', () => {queueMicrotask(()=>choose(options.findIndex(o=>o.dataset.value===input.defaultValue)));});
});
