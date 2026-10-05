/* Each stage remains a distinct polyline in both the offline and online views. */
window.RouteMap = (() => {
  const ns='http://www.w3.org/2000/svg',colors=['#ff8b42','#63cbff','#c69aff','#ffcf55','#5ee0af','#ff8dbb'];
  let generation=0,current=null;const loaded=new Map();
  function element(name,attributes){const node=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);return node}
  function clear(){generation++;if(current){current.svg.innerHTML=current.fallback;current.svg.setAttribute('viewBox','0 0 320 420')}current=null;document.getElementById('mapCredit').hidden=true}
  function tile(url){
    if(loaded.has(url))return loaded.get(url);
    const promise=new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error('Map timeout'))},8000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(new Error('Map unavailable'))};image.src=url});
    loaded.set(url,promise);promise.catch(()=>loaded.delete(url));if(loaded.size>80)loaded.delete(loaded.keys().next().value);return promise;
  }
  function geometry(stages){
    let reference=null;
    return stages.map(stage=>({...stage,projected:stage.points.map(point=>{
      const lat=Math.max(-85.05112878,Math.min(85.05112878,point.latitude))*Math.PI/180;
      let x=(point.longitude+180)/360;if(reference!==null)x+=Math.round(reference-x);reference=x;
      return [x,(1-Math.asinh(Math.tan(lat))/Math.PI)/2];
    })}));
  }
  function bounds(stages){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const s of stages)for(const [x,y] of s.projected){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}return {minX,maxX,minY,maxY}}
  function drawStages(stages,convert,width,height){
    const group=element('g',{});
    for(const stage of stages){const coords=stage.projected.map(convert),color=colors[(Math.max(1,Number(stage.number)||1)-1)%colors.length];
      group.append(element('polyline',{class:'route-line',style:`stroke:${color}`,points:coords.map(p=>p.join(',')).join(' '),'data-stage':stage.number}));
      [[coords[0],'route-start','S',-10],[coords.at(-1),'route-end','E',17]].forEach(([[cx,cy],cls,kind,offset])=>{
        group.append(element('circle',{class:cls,cx,cy,r:5}));
        const label=element('text',{class:'route-label',x:Math.max(7,Math.min(width-54,cx+8)),y:Math.max(16,Math.min(height-8,cy+offset)),fill:kind==='S'?'#35d07f':'#ff5757'});label.textContent=`${kind} ${stage.number}`;group.append(label);
      });
    }return group;
  }
  async function show(svg,input){
    const token=++generation,stages=geometry(input.filter(s=>s.points.length));if(!stages.length)return;
    const {minX,maxX,minY,maxY}=bounds(stages),dx=Math.max(maxX-minX,1e-10),dy=Math.max(maxY-minY,1e-10),centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
    const fitOffline=Math.min(248/dx,348/dy);
    svg.setAttribute('viewBox','0 0 320 420');svg.replaceChildren(drawStages(stages,([x,y])=>[160+(x-centerX)*fitOffline,210+(y-centerY)*fitOffline],320,420));
    current={svg,fallback:svg.innerHTML};
    if(!navigator.onLine)return;
    const width=svg.clientWidth,height=svg.clientHeight;if(!width||!height)return;
    const fit=Math.min((width-80)/dx,(height-80)/dy),zoom=Math.max(0,Math.min(18,Math.floor(Math.log2(fit/256)))),count=2**zoom,world=256*count,left=centerX*world-width/2,top=centerY*world-height/2;
    const layer=element('g',{'aria-hidden':'true'}),requests=[];
    for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++){
      if(y<0||y>=count)continue;
      for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++){
        const url=`https://tile.openstreetmap.org/${zoom}/${((x%count)+count)%count}/${y}.png`;
        layer.append(element('image',{href:url,x:x*256-left,y:y*256-top,width:256,height:256}));requests.push(tile(url));
      }
    }
    try{await Promise.all(requests);if(token!==generation||!navigator.onLine)return;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren(layer,drawStages(stages,([x,y])=>[x*world-left,y*world-top],width,height));document.getElementById('mapCredit').hidden=false}catch{}
  }
  window.addEventListener('offline',clear);return {clear,show};
})();
