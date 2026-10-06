// Validate the standalone publishing boundary and every generated local link.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
async function files(dir){const all=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);all.push(...(e.isDirectory()?await files(p):[p]))}return all}
const list=await files(root),errors=[];
for(const file of list){
 if(/\.(exe|sav|obj|mtl|bin|mid|ogg|wav)$/i.test(file)||/DARKER\.0\d$/i.test(file))errors.push(`Raw resource in site: ${file}`);
 if(!file.endsWith('.html'))continue;
 const html=await readFile(file,'utf8');
 for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const link=match[1].replaceAll('&amp;','&');if(/^(https?:|data:|mailto:)/.test(link))continue;
  const url=new URL(link,`https://local/${path.relative(root,file)}`);
  let target=path.join(root,decodeURIComponent(url.pathname));
  try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');await stat(target);
   if(url.hash&&target.endsWith('.html')){const content=await readFile(target,'utf8');if(!content.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))errors.push(`Missing fragment ${link} in ${file}`)}
  }catch{errors.push(`Missing local link ${link} in ${file}`)}
 }
}
const catalog=JSON.parse(await readFile(path.join(root,'data/catalog.json'),'utf8'));
for(const m of catalog.maps){const cells=JSON.parse(await readFile(path.join(root,'data',m.file),'utf8'));if(cells.length!==16384)errors.push(`Map ${m.id} is not 128 × 128`);const bank=catalog.banks.find(b=>b.id===m.bank);const data=JSON.parse(await readFile(path.join(root,'data',bank.file),'utf8'));for(const type of new Set(cells))if(type&&!data.models[`city-${type}`])errors.push(`Map ${m.id} missing type ${type}`)}
if(errors.length)throw Error(errors.join('\n'));
console.log(`Checked ${list.length} publishing files, all local links and ${catalog.maps.length} map inventories.`);
