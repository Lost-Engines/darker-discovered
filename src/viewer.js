import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const baseIndex = c => (c & 224) + ((c & 31) >= 28 ? 16 : c & 31);
export function parameters(animation, clock, gate, first = 9) {
  const p = Array(256).fill(0); p[0] = gate & 65535;
  for (let i = first; i < first + 6; i++) p[i] = -384;
  const phase = ((clock << 5) & 65535) * 6, slot = phase >>> 16;
  const sine = animation.sine[(phase & 65535) >>> 7];
  p[first + slot] += Math.floor(animation.amplitudes[slot] * sine / 65536);
  p[first + (slot + 1) % 6] -= Math.floor(2 * animation.amplitudes[slot + 1] * sine / 65536);
  return p;
}
function pose(g, p) {
  if (!g.motion.length) return g;
  const result = { ...g };
  for (const kind of ['faces', 'lines', 'discs']) result[kind] = g[kind].map((f, i) => {
    const vertices = kind === 'discs' ? [f.v] : f.v;
    const moved = vertices.map((v, j) => v.map((value, axis) => {
      for (const m of g.motion) {
        const delta = m.delta[kind][i];
        const weight = m.half_word ? ((p[m.parameter] & 65535) >>> 1) - (m.base >>> 1) : p[m.parameter] - m.base;
        value += weight * (kind === 'discs' ? delta[axis] : delta[j][axis]);
      }
      return value;
    }));
    return { ...f, v: kind === 'discs' ? moved[0] : moved };
  });
  return result;
}
const vertexShader = `precision highp float;
uniform mat4 modelViewMatrix,projectionMatrix;
attribute vec3 position; attribute float shade,band,flatIndex,type;
varying float vShade,vBand,vFlat,vType;
void main(){vShade=shade;vBand=band;vFlat=flatIndex;vType=type;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader = `precision highp float;
uniform sampler2D palette; uniform float flatMode,selection,isolate;
varying float vShade,vBand,vFlat,vType;
void main(){if(isolate>.5&&selection>0.&&abs(vType-selection)>.1)discard;
float i=flatMode>.5?vFlat:vBand+floor(clamp(vShade,0.,27.)+.5);
vec3 c=texture2D(palette,vec2((i+.5)/256.,.5)).rgb;
if(selection>0.&&abs(vType-selection)>.1)c*=.28;
gl_FragColor=vec4(c,1.);}`;

export class Viewer {
  constructor(host, { city = false, onPick = () => {} } = {}) {
    this.host = host; this.city = city; this.onPick = onPick; this.dirty = true;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x080e16);
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', city ? 'Interactive reconstructed city. Drag to orbit; right-drag to pan.' : 'Interactive reconstructed model. Drag to rotate.');
    this.renderer.domElement.tabIndex = 0;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(48, 1, .01, 1600);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.listenToKeyEvents(this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.screenSpacePanning = !city;
    this.controls.minDistance = city ? 1 : .1; this.controls.maxDistance = city ? 350 : 100;
    this.controls.maxPolarAngle = city ? Math.PI * .49 : Math.PI;
    this.controls.addEventListener('change', () => { this.dirty = true; });
    this.renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
    this.renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.lost = true; host.dataset.error = 'Graphics context lost. Reload the page to restore the view.';
    });
    let down;
    this.renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', e => {
      if (!city || e.button !== 0 || !down || Math.hypot(e.clientX-down[0], e.clientY-down[1]) > 5) return;
      const box = this.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1, -(e.clientY-box.top)/box.height*2+1), this.camera);
      const hits = ray.intersectObjects(this.meshes || [], false);
      const hit = hits.find(h => !this.isolate || !this.selected || h.object.geometry.getAttribute('type').getX(h.faceIndex*3) === this.selected);
      if (hit) onPick(hit.object.geometry.getAttribute('type').getX(hit.faceIndex*3), hit.point);
    });
    this.resize = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h); this.camera.aspect = w/h; this.camera.updateProjectionMatrix(); this.dirty = true;
    }); this.resize.observe(host);
    this.clock = 0; this.gate = 0; this.playing = false; this.last = 0;
    const tick = time => {
      requestAnimationFrame(tick);
      if (document.hidden || this.lost) { this.last = time; return; }
      const elapsed = Math.min((time-(this.last || time))/1000, .1); this.last = time;
      this.controls.update(elapsed);
      if (this.playing && time-(this.lastPose || 0) > 80) {
        this.clock = Math.floor(time*.5)%2048; this.lastPose = time; this.updateAnimation();
      }
      if (this.dirty) { this.renderer.render(this.scene, this.camera); this.dirty = false; }
    }; requestAnimationFrame(tick);
  }
  clear() {
    for (const child of [...this.scene.children]) {
      child.traverse(o => { o.geometry?.dispose(); if (o.material && o.material !== this.material) o.material.dispose(); });
      this.scene.remove(child);
    }
    this.material?.dispose(); this.palette?.dispose();
    this.meshes = []; this.animated = []; this.linesMesh = this.discsMesh = null; this.decorationInstances = [];
  }
  setBank(bank, animation) {
    this.clear(); this.bank = bank; this.animation = animation;
    const colors = new Uint8Array(bank.palette.flatMap(c => [...(c || [255,0,255]),255]));
    this.palette = new THREE.DataTexture(colors,256,1,THREE.RGBAFormat); this.palette.needsUpdate = true;
    this.palette.magFilter = this.palette.minFilter = THREE.NearestFilter;
    this.material = new THREE.RawShaderMaterial({ vertexShader, fragmentShader, side: THREE.DoubleSide,
      uniforms: { palette: { value: this.palette }, flatMode: { value: this.flat ? 1 : 0 }, selection: { value: 0 }, isolate: { value: 0 } } });
  }
  arrays(instances) {
    const values = { position: [], shade: [], band: [], flatIndex: [], type: [] };
    const p = parameters(this.animation, this.clock, this.gate, this.bank.first);
    for (const instance of instances) {
      const g = pose(instance.g, p);
      for (const f of g.faces) for (let j=1;j<f.v.length-1;j++) for (const k of [0,j,j+1]) {
        values.position.push(...instance.transform(f.v[k]));
        values.shade.push(f.s ? f.s[k] : baseIndex(f.c)&31);
        values.band.push(f.c&224); values.flatIndex.push(baseIndex(f.c)); values.type.push(instance.type);
      }
    }
    return values;
  }
  mesh(instances, animated = false) {
    if (!instances.length) return;
    const geometry = new THREE.BufferGeometry();
    for (const [name, values] of Object.entries(this.arrays(instances))) geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='position'?3:1));
    geometry.computeBoundingSphere(); const mesh = new THREE.Mesh(geometry,this.material);
    this.scene.add(mesh); this.meshes.push(mesh);
    if (animated) this.animated.push({ mesh, instances });
  }
  decorationData() {
    const p=parameters(this.animation,this.clock,this.gate,this.bank.first);
    const lines={position:[],color:[],type:[]},discs={position:[],corner:[],radius:[],index:[],type:[]};
    for(const i of this.decorationInstances){
      const g=pose(i.g,p);
      for(const l of g.lines)for(const v of l.v){
        lines.position.push(...i.transform(v));lines.color.push(...(this.bank.palette[baseIndex(l.c)]||[255,0,255]).map(c=>c/255));lines.type.push(i.type);
      }
      for(const d of g.discs)for(const corner of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){
        discs.position.push(...i.transform(d.v));discs.corner.push(...corner);discs.radius.push(d.numerator/128/2048);
        discs.index.push(i.lit&&(d.c&31)>=28?(d.c&224)+27:baseIndex(d.c));discs.type.push(i.type);
      }
    }
    return {lines,discs};
  }
  decorations(instances) {
    this.decorationInstances=instances.filter(i=>i.g.lines.length||i.g.discs.length);
    const {lines,discs}=this.decorationData();
    const makeGeometry=(data,sizes)=>{const g=new THREE.BufferGeometry();for(const [k,v] of Object.entries(data))g.setAttribute(k,new THREE.Float32BufferAttribute(v,sizes[k]||1));return g};
    const selection='if(isolate>.5&&selection>0.&&abs(vType-selection)>.1)discard;';
    const dim='if(selection>0.&&abs(vType-selection)>.1)c*=.28;';
    if(lines.position.length){
      const material=new THREE.RawShaderMaterial({uniforms:this.material.uniforms,vertexShader:'precision highp float;uniform mat4 modelViewMatrix,projectionMatrix;attribute vec3 position,color;attribute float type;varying vec3 c0;varying float vType;void main(){c0=color;vType=type;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision highp float;uniform float selection,isolate;varying vec3 c0;varying float vType;void main(){${selection}vec3 c=c0;${dim}gl_FragColor=vec4(c,1.);}`});
      this.linesMesh=new THREE.LineSegments(makeGeometry(lines,{position:3,color:3}),material);this.scene.add(this.linesMesh);
    }
    if(discs.position.length){
      const material=new THREE.RawShaderMaterial({uniforms:this.material.uniforms,side:THREE.DoubleSide,vertexShader:'precision highp float;uniform mat4 modelViewMatrix,projectionMatrix;attribute vec3 position;attribute vec2 corner;attribute float radius,index,type;varying vec2 uv;varying float vIndex,vType;void main(){uv=corner;vIndex=index;vType=type;vec4 center=modelViewMatrix*vec4(position,1.);center.xy+=corner*radius;gl_Position=projectionMatrix*center;}',fragmentShader:`precision highp float;uniform sampler2D palette;uniform float selection,isolate;varying vec2 uv;varying float vIndex,vType;void main(){if(dot(uv,uv)>1.)discard;${selection}vec3 c=texture2D(palette,vec2((vIndex+.5)/256.,.5)).rgb;${dim}gl_FragColor=vec4(c,1.);}`});
      this.discsMesh=new THREE.Mesh(makeGeometry(discs,{position:3,corner:2}),material);this.discsMesh.frustumCulled=false;this.scene.add(this.discsMesh);
    }
  }
  cityScene(cells) {
    const fixed=[],moving=[];this.cells=cells;
    cells.forEach((type,index)=>{
      if(!type)return;const m=this.bank.models[`city-${type}`];if(!m)return;
      const lit=type===1&&this.bank.beacon;const s=m.states[lit&&m.states['128']?'128':'0']||Object.values(m.states)[0];
      const g=this.bank.geometry[s.geometry],o=s.offset,x=index%128,y=Math.floor(index/128);
      const instance={g,type,lit,transform:v=>[128-(x+o[0]+v[0]),o[1]+v[1],-y+o[2]+v[2]]};
      (g.motion.length?moving:fixed).push(instance);
    });
    this.mesh(fixed);this.mesh(moving,true);this.decorations([...fixed,...moving]);this.overview();
  }
  modelScene(model,state='0') {
    const s=model.states[state]||Object.values(model.states)[0],g=this.bank.geometry[s.geometry];
    const instance={g,type:0,lit:model.id===1&&state==='128',transform:v=>v};
    this.mesh([instance],g.motion.length>0);this.decorations([instance]);
    const box=new THREE.Box3();for(const mesh of this.meshes)box.expandByObject(mesh);
    if(box.isEmpty()){box.min.set(-1,-1,-1);box.max.set(1,1,1);}
    const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const radius=Math.max(size.x,size.y,size.z,.1);this.camera.position.copy(center).add(new THREE.Vector3(radius*.9,radius*.6,radius*1.3).multiplyScalar(Math.max(1,1/this.camera.aspect)));
    this.controls.target.copy(center);this.controls.minDistance=radius*.3;this.controls.maxDistance=radius*8;this.controls.update();this.controls.saveState();this.dirty=true;
  }
  updateAnimation() {
    for (const {mesh,instances} of this.animated) {
      mesh.geometry.getAttribute('position').array.set(this.arrays(instances).position);mesh.geometry.getAttribute('position').needsUpdate=true;mesh.geometry.computeBoundingSphere();
    }
    if(this.decorationInstances.some(i=>i.g.motion.length)){
      const values=this.decorationData();
      for(const [mesh,data] of [[this.linesMesh,values.lines],[this.discsMesh,values.discs]])if(mesh){mesh.geometry.getAttribute('position').array.set(data.position);mesh.geometry.getAttribute('position').needsUpdate=true;mesh.geometry.computeBoundingSphere();}
    }
    this.dirty=true;
  }
  select(type,isolate=false) {
    this.selected=type;this.isolate=isolate;this.material.uniforms.selection.value=type;this.material.uniforms.isolate.value=isolate?1:0;
    this.dirty=true;
  }
  overview(){this.camera.position.set(64,90,54);this.controls.target.set(64,0,-64);this.controls.update();this.controls.saveState();this.dirty=true;}
  focusType(type){const at=this.cells.indexOf(type);if(at<0)return;const p=new THREE.Vector3(128-at%128,0,-Math.floor(at/128));this.controls.target.copy(p);this.camera.position.copy(p).add(new THREE.Vector3(5,3,7));this.controls.update();this.dirty=true;}
  setFlat(value){this.flat=value;if(this.material)this.material.uniforms.flatMode.value=value?1:0;this.dirty=true;}
}