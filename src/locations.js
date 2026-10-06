// Approximate named areas transcribed from the printed Delphi reference map.
export class Locations {
  constructor(viewer, host, select, toggle, note) {
    this.viewer=viewer;this.select=select;this.toggle=toggle;this.note=note;
    this.items=[];this.selected=null;
    this.layer=document.createElement('div');
    this.layer.className='location-labels';
    this.layer.setAttribute('role','group');
    this.layer.setAttribute('aria-label','Named areas from the printed map');
    host.append(this.layer);
    select.addEventListener('change',()=>this.choose(Number(select.value)));
    toggle.addEventListener('change',()=>{viewer.dirty=true;});
  }
  setLocations(locations) {
    this.layer.replaceChildren();this.selected=null;this.items=[];
    this.layer.hidden=false;
    this.select.replaceChildren(new Option('Find a named location…',''));
    this.note.textContent='Approximate areas from the printed Delphi map.';
    for(const location of locations){
      this.select.add(new Option(`${location.id}. ${location.name}`,location.id));
      const button=document.createElement('button');
      button.type='button';button.textContent=`${location.id}. ${location.name}`;
      button.title=`${location.name} (approximate position)`;
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click',()=>this.choose(location.id));
      this.layer.append(button);
      this.items.push({...location,button,width:button.offsetWidth,height:button.offsetHeight});
      button.hidden=true;
    }
    this.viewer.dirty=true;
  }
  choose(id) {
    const location=this.items.find(item=>item.id===id);
    this.selected=location?.id??null;this.select.value=location?String(id):'';
    if(location){
      this.toggle.checked=true;
      this.note.textContent=`${location.name} — approximate position from the printed map.`;
      this.viewer.focusLocation(location.cell);
    }else this.note.textContent='Approximate areas from the printed Delphi map.';
    this.viewer.dirty=true;
  }
  update() {
    this.layer.hidden=!this.toggle.checked||!this.items.length;
    if(this.layer.hidden)return;
    const width=this.layer.clientWidth,height=this.layer.clientHeight;
    // Keep the title and zoom controls clear. Give the selected name priority.
    const occupied=[[0,0,250,85],[width-225,height-65,width,height]];
    const ordered=[...this.items].sort((a,b)=>(b.id===this.selected)-(a.id===this.selected));
    for(const item of ordered){
      const {button}=item;button.hidden=true;
      const selected=item.id===this.selected;
      button.setAttribute('aria-pressed',String(selected));
      const [px,py,pz]=this.viewer.projectLocation(item.cell);
      if(pz < -1||pz>1||Math.abs(px)>1||Math.abs(py)>1)continue;
      const x=(px+1)*width/2,y=(1-py)*height/2;
      const box=[x-item.width/2,y-item.height,x+item.width/2,y];
      if(box[0]<0||box[2]>width||box[1]<0||box[3]>height)continue;
      if(!selected&&occupied.some(b=>box[0]<b[2]+4&&box[2]>b[0]-4&&box[1]<b[3]+4&&box[3]>b[1]-4))continue;
      occupied.push(box);button.style.left=`${x}px`;button.style.top=`${y}px`;button.hidden=false;
    }
  }
}
