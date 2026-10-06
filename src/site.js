const menu=document.querySelector('[data-menu]');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.querySelector('.nav-links').classList.toggle('open',open)});
if('IntersectionObserver' in window){
  const sections=[...document.querySelectorAll('article h2[id]')],links=[...document.querySelectorAll('.contents a')];
  const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.hash===`#${e.target.id}`))}},{rootMargin:'-15% 0px -65% 0px'});
  sections.forEach(s=>observer.observe(s));
}
