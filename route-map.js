/* GPS geometry is kept separate from optional online background tiles. */
window.RouteMap = (() => {
  const ns='http://www.w3.org/2000/svg';
  const colors=['#ff7417','#00d8ff','#ffdd00','#f650fa','#00ef94','#ff4564','#8fa4ff','#baff00','#ffadf0','#ffffff','#20a8ff','#ffa600'];
  const $=id=>document.getElementById(id),loaded=new Map(),bound=new WeakSet();
  let current=null,generation=0,tileTimer=null;
  const color=number=>colors[(Math.max(1,Number(number)||1)-1)%colors.length];
  function element(name,attrs={},text){const node=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);if(text!=null)node.textContent=text;return node}
  function geometry(stages){
    let reference=null;
    return stages.filter(s=>s.points.length).map(s=>({...s,id:s.id??String(s.number),projected:s.points.map(p=>{
      const lat=Math.max(-85.05112878,Math.min(85.05112878,p.latitude))*Math.PI/180;
      let x=(p.longitude+180)/360;if(reference!==null)x+=Math.round(reference-x);reference=x;
      return [x,(1-Math.asinh(Math.tan(lat))/Math.PI)/2];
    })}));
  }
  function dimensions(){if(!current)return;current.width=current.svg.clientWidth||320;current.height=current.svg.clientHeight||420;current.svg.setAttribute('viewBox',`0 0 ${current.width} ${current.height}`)}
  function fit(){
    if(!current)return;dimensions();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const s of current.stages)for(const [x,y] of s.projected){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
    current.x=(minX+maxX)/2;current.y=(minY+maxY)/2;
    current.scale=Math.max(256,Math.min(256*2**19,(current.width-100)/Math.max(1e-9,maxX-minX),(current.height-150)/Math.max(1e-9,maxY-minY)));
    paint();
  }
  const convert=([x,y])=>[(x-current.x)*current.scale+current.width/2,(y-current.y)*current.scale+current.height/2];
  function tile(url){
    if(loaded.has(url))return loaded.get(url);
    const promise=new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error('Map timeout'))},8000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(new Error('Map unavailable'))};image.src=url});
    loaded.set(url,promise);promise.catch(()=>loaded.delete(url));if(loaded.size>100)loaded.delete(loaded.keys().next().value);return promise;
  }
  async function tiles(token){
    if(!current||!navigator.onLine)return;const state=current,{svg,width,height,scale}=state;
    const zoom=Math.max(0,Math.min(19,Math.floor(Math.log2(scale/256)))),count=2**zoom,size=scale/count,left=state.x*scale-width/2,top=state.y*scale-height/2;
    const layer=element('g',{class:'route-tiles','aria-hidden':'true'}),requests=[];
    for(let y=Math.floor(top/size);y<=Math.floor((top+height)/size);y++){
      if(y<0||y>=count)continue;
      for(let x=Math.floor(left/size);x<=Math.floor((left+width)/size);x++){
        const url=`https://tile.openstreetmap.org/${zoom}/${((x%count)+count)%count}/${y}.png`;
        layer.append(element('image',{href:url,x:x*size-left,y:y*size-top,width:size+.5,height:size+.5}));requests.push(tile(url));
      }
    }
    try{await Promise.all(requests);if(token!==generation||current!==state||!navigator.onLine||!requests.length)return;svg.prepend(layer);$('mapCredit').hidden=false}catch{/* Routes stay visible when tiles fail. */}
  }
  function details(members){
    const panel=$('mapDetails');if(!panel)return;panel.hidden=false;
    panel.textContent=members.map(p=>`${p.kind==='S'?'Start':'Ende'} Etappe ${p.number}`).join(' · ');
  }
  function markers(group){
    const {width,height}=current,points=[];
    for(const stage of current.stages){
      [[stage.projected[0],'S'],[stage.projected.at(-1),'E']].forEach(([p,kind])=>{const [x,y]=convert(p);if(x>12&&x<width-12&&y>12&&y<height-12)points.push({x,y,kind,number:stage.number})});
    }
    // Merge close endpoints, including transitive neighbours, before placing labels.
    const clusters=points.map(p=>({x:p.x,y:p.y,members:[p]}));
    let changed=true;
    while(changed){changed=false;outer:for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++){
      if(clusters[i].members.some(a=>clusters[j].members.some(b=>Math.hypot(a.x-b.x,a.y-b.y)<28))){
        const a=clusters[i];a.members.push(...clusters[j].members);a.x=a.members.reduce((n,p)=>n+p.x,0)/a.members.length;a.y=a.members.reduce((n,p)=>n+p.y,0)/a.members.length;clusters.splice(j,1);changed=true;break outer;
      }
    }}
    const occupied=[{x:width-210,y:0,w:210,h:60},{x:0,y:height-25,w:width,h:25},...clusters.map(c=>({x:c.x-15,y:c.y-15,w:30,h:30}))];
    const overlaps=(a,b)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
    for(const c of clusters){
      const single=c.members.length===1,member=c.members[0],kind=member.kind,allStart=c.members.every(p=>p.kind==='S'),allEnd=c.members.every(p=>p.kind==='E');
      const marker=element('g',{class:'route-marker',role:'button',tabindex:'0','aria-label':c.members.map(p=>`${p.kind==='S'?'Start':'Ende'} Etappe ${p.number}`).join(', ')});
      marker.append(element('circle',{cx:c.x,cy:c.y,r:single?7:13,class:single?(kind==='S'?'route-start':'route-end'):'route-cluster',fill:allStart?'#35ef95':allEnd?'#ff5656':'#ffffff'}));
      if(!single)marker.append(element('text',{x:c.x,y:c.y+4,'text-anchor':'middle'},c.members.length));
      const show=()=>{if(Date.now()<(current?.suppressClickUntil||0))return;details(c.members)};
      marker.onclick=show;marker.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}};
      const label=single?`${kind} ${member.number}`:`${c.members.length} ${allStart?'Starts':allEnd?'Ziele':'Punkte'}`,w=label.length*7.7+12,h=23;
      const candidates=[[c.x+19,c.y-11],[c.x-w-19,c.y-11],[c.x-w/2,c.y-40],[c.x-w/2,c.y+20],[c.x+22,c.y-42],[c.x-w-22,c.y+20]];
      const rect=candidates.map(([x,y])=>({x,y,w,h})).find(r=>r.x>=5&&r.y>=5&&r.x+r.w<=width-5&&r.y+r.h<=height-26&&!occupied.some(o=>overlaps(r,o)));
      if(rect){occupied.push(rect);marker.prepend(element('line',{class:'route-leader',x1:c.x,y1:c.y,x2:Math.max(rect.x,Math.min(c.x,rect.x+w)),y2:Math.max(rect.y,Math.min(c.y,rect.y+h))}));marker.append(element('rect',{class:'route-label-bg',x:rect.x,y:rect.y,width:w,height:h,rx:5}),element('text',{class:'route-label',x:rect.x+6,y:rect.y+16},label));}
      if(!single)for(const p of c.members)group.append(element('line',{class:'route-leader',x1:c.x,y1:c.y,x2:p.x,y2:p.y,opacity:.6}),element('circle',{cx:p.x,cy:p.y,r:3,fill:p.kind==='S'?'#35ef95':'#ff5656',stroke:'#071015','stroke-width':1}));
      marker.append(element('title',{},marker.getAttribute('aria-label')));group.append(marker);
    }
  }
  function paint(){
    if(!current)return;const token=++generation;clearTimeout(tileTimer);$('mapCredit').hidden=true;
    const group=element('g',{class:'route-geometry'}),stages=[...current.stages].sort((a,b)=>(a.id===current.focus?1:0)-(b.id===current.focus?1:0));
    for(const stage of stages){const coordinates=stage.projected.map(convert).map(p=>p.join(',')).join(' '),focused=stage.id===current.focus;
      const lineGroup=element('g',{class:'route-stage'+(focused?' is-focused':''),'data-stage':stage.number,opacity:current.focus && !focused ? .65 : 1});
      for(const cls of ['route-halo','route-casing','route-line'])lineGroup.append(element('polyline',{class:cls,points:coordinates,...(cls==='route-line'?{style:`stroke:${color(stage.number)}`}:{})}));
      group.append(lineGroup);
    }
    markers(group);current.svg.replaceChildren(group);tileTimer=setTimeout(()=>tiles(token),100);
  }
  function legend(){
    const el=$('routeLegend');if(!el)return;el.replaceChildren();
    for(const s of current.stages){const b=document.createElement('button'),swatch=document.createElement('span');swatch.className='route-swatch';swatch.style.setProperty('--route-color',color(s.number));b.append(swatch,document.createTextNode(`Etappe ${s.number}`));b.setAttribute('aria-pressed',String(current.focus===s.id));b.onclick=()=>{current.focus=current.focus===s.id?null:s.id;legend();paint()};el.append(b)}
  }
  function zoom(factor,at){
    if(!current)return;at??=[current.width/2,current.height/2];const old=current.scale,next=Math.max(256,Math.min(256*2**19,old*factor));
    current.x+=(at[0]-current.width/2)*(1/old-1/next);current.y+=(at[1]-current.height/2)*(1/old-1/next);current.scale=next;paint();
  }
  function bind(svg){
    if(bound.has(svg))return;bound.add(svg);const pointers=new Map();let last=null;
    const coords=e=>{const r=svg.getBoundingClientRect();return [(e.clientX-r.left)*current.width/r.width,(e.clientY-r.top)*current.height/r.height]};
    function gesture(){const p=[...pointers.values()];return p.length>1?{x:(p[0][0]+p[1][0])/2,y:(p[0][1]+p[1][1])/2,d:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])}:{x:p[0][0],y:p[0][1],d:0}}
    svg.addEventListener('pointerdown',e=>{if(!current||(e.pointerType==='mouse'&&e.button!==0))return;pointers.set(e.pointerId,coords(e));last=gesture();svg.setPointerCapture?.(e.pointerId)});
    svg.addEventListener('pointermove',e=>{if(!current||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,coords(e));const next=gesture();if(last){const dx=next.x-last.x,dy=next.y-last.y;if(Math.abs(dx)+Math.abs(dy)>1||next.d!==last.d)current.suppressClickUntil=Date.now()+300;current.x-=dx/current.scale;current.y-=dy/current.scale;if(next.d&&last.d)zoom(next.d/last.d,[next.x,next.y]);else paint()}last=next});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,e=>{pointers.delete(e.pointerId);last=pointers.size?gesture():null});
    svg.addEventListener('wheel',e=>{if(!current)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.002),coords(e))},{passive:false});
    svg.addEventListener('keydown',e=>{if(e.target!==svg||!current)return;const moves={ArrowLeft:[-45,0],ArrowRight:[45,0],ArrowUp:[0,-45],ArrowDown:[0,45]};if(moves[e.key]){e.preventDefault();current.x+=moves[e.key][0]/current.scale;current.y+=moves[e.key][1]/current.scale;paint()}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')fit();else zoom(e.key==='-'?1/1.5:1.5)}});
    if($('mapZoomIn'))$('mapZoomIn').onclick=()=>zoom(1.5);if($('mapZoomOut'))$('mapZoomOut').onclick=()=>zoom(1/1.5);if($('mapFit'))$('mapFit').onclick=fit;
  }
  function clear(){generation++;clearTimeout(tileTimer);if(current)current.svg.replaceChildren();current=null;$('mapCredit').hidden=true;$('routeLegend')?.replaceChildren();if($('mapDetails'))$('mapDetails').hidden=true}
  async function show(svg,input){
    const stages=geometry(input);if(!stages.length){clear();return}
    const key=stages.map(s=>s.id).sort().join('|'),same=current?.svg===svg&&current.key===key;
    if(same){current.stages=stages;dimensions()}else{current={svg,stages,key,focus:null};dimensions();if($('mapDetails'))$('mapDetails').hidden=true}
    bind(svg);legend();if(same)paint();else fit();
    // Await immediate tile rendering for callers and deterministic failure checks.
    clearTimeout(tileTimer);await tiles(generation);
  }
  window.addEventListener('offline',()=>{generation++;clearTimeout(tileTimer);current?.svg.querySelectorAll('.route-tiles').forEach(n=>n.remove());$('mapCredit').hidden=true});
  return {show,clear,fit,zoom};
})();
