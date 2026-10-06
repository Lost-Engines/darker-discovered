#!/usr/bin/env python3
"""Maintainer-only snapshot import; normal website builds never need the analysis."""
import argparse,hashlib,json,re,sys
from pathlib import Path

args=argparse.ArgumentParser();args.add_argument('analysis_root',type=Path);root=args.parse_args().analysis_root.resolve()
sys.path.insert(0,str(root/'tools'))
from city_scene import scene_data
site=Path(__file__).resolve().parents[1];out=site/'public/data'
city,_=scene_data()
html=(root/'analysis/models/index.html').read_text()
match=re.search(r'const data=(.*?),palettes=(.*?),GEOMETRIES=(.*?),ANIMATION=(.*?);\n',html)
entries,palettes,geos,animation=map(json.loads,match.groups())

def compact(v):
    if isinstance(v,float):return round(v,7)
    if isinstance(v,list):return [compact(x) for x in v]
    if isinstance(v,dict):return {k:compact(x) for k,x in v.items()}
    return v

def geometry(g,scale=False):
    # Model-gallery coordinates -> the city viewer's local basis.
    def coord(v):return [v[2]/2048,v[1]/2048,v[0]/2048] if scale else v
    result={}
    for kind in ('faces','lines','discs'):
        result[kind]=[{k:(coord(v) if kind=='discs' else [coord(p) for p in v]) if k=='v' else v for k,v in f.items() if k in ('v','c','s','numerator')} for f in g.get(kind,[])]
    result['motion']=[]
    for m in g.get('motion',[]):
        result['motion'].append({**{k:m[k] for k in ('parameter','base','half_word') if k in m},'delta':{kind:[coord(v) if kind=='discs' else [coord(p) for p in v] for v in m['delta'][kind]] for kind in ('faces','lines','discs')}})
    return result

catalog={'maps':[],'banks':[],'animation':animation}
for key,b in city['banks'].items():
    n=int(key);era='retail' if n<100 else str(n//100);source=n if n<100 else n%100
    region='Delphi' if n==30 else 'Halon' if n==31 else 'Tunnels' if n==32 else 'Surface A' if source==(8 if era=='1993' else 10) else 'Surface B' if source==(9 if era=='1993' else 11) else 'Tunnels'
    name=f'{"Retail" if era=="retail" else era+" demo"} · {region}'
    dest={'palette':b['palette'],'first':b.get('animation_first',9),'beacon':n==30 or bool(b.get('beacon_types')),'models':{},'geometry':{k:geometry(g) for k,g in b['geometries'].items() if not g.get('error')}}
    for e in entries:
        if e['bank']!=n or e['category'] not in ('city','special'):continue
        category=e['category'];identifier=f'{category}-{e["type"]}';states={}
        if category=='city':
            model=b['models'].get(str(e['type']),b['models'].get(e['type']))
            if not model:continue
            visited=set()
            for state,v in model['states'].items():
                identity=(v['geometry'],tuple(v['offset']))
                if identity in visited or v['geometry'] not in dest['geometry']:continue
                visited.add(identity)
                label=e.get('state_labels',{}).get(state,'Original' if state=='0' else 'Alternate' if state=='128' else 'Damaged' if state=='32' else 'Further state')
                states[state]={'geometry':v['geometry'],'offset':v['offset'],'label':label}
        else:
            g=geos[e['geometry_key']]
            if g.get('error'):continue
            gid=f's-{e["type"]}';dest['geometry'][gid]=geometry(g,True);states={'0':{'geometry':gid,'offset':[0,0,0],'label':'Original'}}
        if not states:continue
        label=e.get('label','')
        if not label or 'demo' in label or 'configuration' in label.lower():label=f'{"Structure" if category=="city" else "Craft or effect"} {e["type"]}'
        if n==30 and category=='special' and e['type']==25:label='Caero fighter'
        if n==199308 and category=='city' and e['type']==13:label='Unused satellite dish'
        if n==30 and category=='city' and e['type']==105:label='Bell tower'
        if n==30 and category=='city' and e['type'] in range(101,105):label='Fountain pool'
        if n==30 and category=='city' and e['type'] in range(120,124):label='Fountain ornament'
        faces=sum(len(dest['geometry'][s['geometry']]['faces']) for s in states.values())
        if not faces and category=='special':continue
        motions=[m for s in states.values() for m in dest['geometry'][s['geometry']]['motion']]
        dest['models'][identifier]={'id':e['type'],'name':label,'category':category,'states':states,'gate':any(m['parameter']==0 for m in motions),'animated':any(m['parameter']>0 for m in motions),'visible':bool(faces),'placements':e.get('map_usage',{}).get('count')}
    path=out/f'bank-{n}.json';path.write_text(json.dumps(compact(dest),separators=(',',':'))+'\n')
    catalog['banks'].append({'id':n,'name':name,'era':era,'region':region,'file':path.name})
for m in city['maps']:
    name='Delphi' if m['resource']==68 else 'Halon' if m['resource']==69 else m['name'].split(' — ')[-1].replace(' (Delphi)','').replace(' (Halon palette)','')
    identifier=m['resource'];path=out/f'map-{identifier}.json';path.write_text(json.dumps(m['cells'],separators=(',',':'))+'\n')
    catalog['maps'].append({'id':identifier,'bank':m['bank'],'name':name,'file':path.name,'era':'retail' if identifier<100 else str(identifier//100)})
(out/'catalog.json').write_text(json.dumps(catalog,separators=(',',':'))+'\n')
locations=json.loads((root/'analysis/city/named-locations.json').read_text())
(out/'named-locations.json').write_text(json.dumps({'map':68,'approximate':True,'locations':[{k:r[k] for k in ('id','name','cell')} for r in locations['locations'] if r['resource']==68]},separators=(',',':'))+'\n')
provenance={'scope':'Derived display geometry, palettes and map layouts only. No executable, original pack, save or raw resource export. Visibility branches are flattened; presentation is not the original renderer.','sources':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['analysis/models/index.html','analysis/demos/viewer-data.json','tools/city_scene.py','tools/model_motion.js','analysis/city/named-locations.json']},'maps':len(catalog['maps']),'banks':len(catalog['banks'])}
(site/'content/data-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(provenance['maps'],'maps;',provenance['banks'],'banks')
