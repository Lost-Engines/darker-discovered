import { Viewer } from './viewer.js';
const $=id=>document.getElementById(id), root=new URL('../data/',import.meta.url);
const cache=new Map();
async function data(file){if(!cache.has(file))cache.set(file,fetch(new URL(file,root)).then(r=>{if(!r.ok)throw Error('Unable to load the selected collection.');return r.json()}).catch(e=>{cache.delete(file);throw e}));return cache.get(file)}
const query=new URLSearchParams(location.search),city=document.body.dataset.page==='cities';
let catalog,viewer,bank,token=0;
function options(select,items){select.replaceChildren(...items.map(([value,label])=>new Option(label,value)))}
function status(text){$('viewer-status').textContent=text}
async function main(){
  catalog=await data('catalog.json');
  viewer=new Viewer($('viewport'),{city,onPick:type=>{$('type').value=String(type);selectType()}});
  $('flat').onchange=()=>viewer.setFlat($('flat').checked);
  $('reset').onclick=()=>city?viewer.overview():viewer.controls.reset();
  $('zoom-in').onclick=()=>{viewer.controls.dollyIn(1.35);viewer.controls.update()};
  $('zoom-out').onclick=()=>{viewer.controls.dollyOut(1.35);viewer.controls.update()};
  if(city){
    options($('era'),[['retail','1995 retail'],['1993','1993 demo'],['1995','1995 demo']]);
    const initial=catalog.maps.find(m=>String(m.id)===query.get('map'));
    $('era').value=initial?.era||'retail';
    function mapOptions(){options($('map'),catalog.maps.filter(m=>m.era===$('era').value).map(m=>[m.id,m.name]))}
    mapOptions();if(initial)$('map').value=initial.id;
    $('era').onchange=()=>{mapOptions();loadCity()};$('map').onchange=loadCity;
    $('type').onchange=selectType;$('isolate').onchange=selectType;
    $('focus').onclick=()=>{if(+$('type').value)viewer.focusType(+$('type').value)};
    $('street').onclick=()=>{const type=+$('type').value||1;viewer.focusType(viewer.cells.includes(type)?type:viewer.cells.find(x=>x))};
    await loadCity();
  }else{
    options($('bank'),catalog.banks.map(b=>[b.id,b.name]));$('bank').value=query.get('bank')||'30';
    if(!$('bank').value)$('bank').value='30';
    $('bank').onchange=()=>loadGallery();$('category').onchange=()=>modelOptions();
    $('search').oninput=()=>modelOptions();$('model').onchange=loadModel;$('state').onchange=()=>loadModel(false);
    $('animate').onchange=()=>{viewer.playing=$('animate').checked};
    $('gate').oninput=()=>{viewer.gate=+$('gate').value;viewer.updateAnimation()};
    await loadGallery(query.get('model'));
  }
  window.darkerViewer=viewer; // Useful for local screenshots and browser verification.
}
async function loadCity(){
  const request=++token;status('Assembling the city…');$('viewport').setAttribute('aria-busy','true');
  try{
    const map=catalog.maps.find(m=>m.id===+$('map').value),meta=catalog.banks.find(b=>b.id===map.bank);
    const [loaded,cells]=await Promise.all([data(meta.file),data(map.file)]);if(request!==token)return;
    bank=loaded;viewer.setBank(bank,catalog.animation);viewer.cityScene(cells);
    options($('type'),[['0','All buildings'],...[...new Set(cells)].filter(x=>x&&bank.models[`city-${x}`]).sort((a,b)=>a-b).map(n=>[n,`${bank.models[`city-${n}`].name} · ${n}`])]);
    $('isolate').checked=false;selectType();$('collection-name').textContent=map.name;
    $('era-label').textContent=map.era==='retail'?'1995 · Retail':`${map.era} · Demo`;
    const count=cells.filter(x=>x).length;status(`${count.toLocaleString()} occupied cells · Drag to orbit, right-drag to pan, scroll to zoom`);
    history.replaceState(null,'',`?map=${map.id}`);
  }catch(e){status(e.message)}finally{if(request===token)$('viewport').setAttribute('aria-busy','false')}
}
function selectType(){
  const type=+$('type').value;viewer.select(type,$('isolate').checked);
  $('focus').disabled=!type;
  $('selection').textContent=type?`${bank.models[`city-${type}`].name} — ${viewer.cells.filter(n=>n===type).length} placements`:'Click a building to find its relatives across the city.';
  $('model-link').hidden=!type;if(type)$('model-link').href=`../models/?bank=${catalog.maps.find(m=>m.id===+$('map').value).bank}&model=city-${type}`;
}
async function loadGallery(initial){
  const request=++token;status('Opening the collection…');
  try{
    const meta=catalog.banks.find(b=>b.id===+$('bank').value);const loaded=await data(meta.file);if(request!==token)return;bank=loaded;
    $('collection-name').textContent=meta.region;$('era-label').textContent=meta.era==='retail'?'1995 · Retail':`${meta.era} · Demo`;
    if(initial)$('category').value=initial.startsWith('special-')?'special':'city';
    modelOptions(initial);
  }catch(e){status(e.message)}
}
function modelOptions(initial){
  const search=$('search').value.toLowerCase(),items=Object.entries(bank.models).filter(([,m])=>m.category===$('category').value&&m.visible&&`${m.name} ${m.id}`.toLowerCase().includes(search));
  options($('model'),items.map(([key,m])=>[key,`${m.name} · ${m.id}`]));
  if(initial&&items.some(([key])=>key===initial))$('model').value=initial;
  if(items.length){$('model').disabled=false;loadModel()}else{$('model').disabled=true;status('No matching models. Try a different name or number.');}
}
function loadModel(resetState=true){
  const key=$('model').value,m=bank.models[key];if(!m)return;
  if(resetState){options($('state'),Object.entries(m.states).map(([k,s])=>[k,s.label]));$('gate').value='0';viewer.gate=0;}
  $('states-control').hidden=Object.keys(m.states).length<2;
  $('gate-control').hidden=!m.gate;$('animation-control').hidden=!m.animated;
  viewer.setBank(bank,catalog.animation);viewer.modelScene(m,$('state').value);viewer.playing=m.animated&&$('animate').checked;
  $('model-title').textContent=m.name;
  const tags=[m.animated?'Animated':null,m.gate?'Moving gate':null,Object.keys(m.states).length>1?'Alternate states':null,m.placements===0&&m.category==='city'?'Not placed on maps':null].filter(Boolean);
  $('tags').replaceChildren(...tags.map(t=>{const s=document.createElement('span');s.textContent=t;return s}));
  status('Drag to rotate · Scroll or use + / − to zoom');
  history.replaceState(null,'',`?bank=${$('bank').value}&model=${key}`);
}
main().catch(e=>{status(`The interactive view could not start: ${e.message}`);$('fallback').hidden=false});
