/* A separate GPS consumer: no writes to tripmaster counters or their storage. */
window.RegularityUI = (() => {
  const KEY='tripmasterRegularityV1';
  const $=id=>document.getElementById(id);
  const decimal=(n,d=1)=>n.toFixed(d).replace('.',',');
  const clock=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  const delta=ms=>`${ms>=0?'+':'−'}${decimal(Math.abs(ms)/1000)} s`;
  function create(Engine,onStart){
    const engine=new Engine();
    let run=null,mode=false,lastFix=null,storageError=false;
    try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      if(saved&&['running','finished','stopped'].includes(saved.status)&&Number.isFinite(saved.targetM)&&saved.targetM>0&&Number.isFinite(saved.targetMs)&&saved.targetMs>0&&Number.isFinite(saved.startedAt)&&Number.isFinite(saved.distanceM)&&saved.distanceM>=0){run=saved;if(run.status==='running')run.interrupted=true;}
    }catch{}
    function persist(){try{if(run)localStorage.setItem(KEY,JSON.stringify(run));else localStorage.removeItem(KEY);storageError=false}catch{storageError=true}}
    function isRunning(){return run?.status==='running'}
    function elapsed(now=Date.now()){return run?Math.max(0,(run.endedAt??now)-run.startedAt):0}
    function setMode(value){mode=value;$('roadbookPanel').classList.toggle('regularity-mode',value);$('regularityPanel').hidden=!value;if(value)render();updateBadge()}
    function updateBadge(){$('openRegularity').textContent=isRunning()?'GLP LÄUFT ›':'GLEICHMÄSSIGKEIT'}
    function parse(){const km=Number($('regDistance').value.trim().replace(',','.')),match=/^(\d{1,4}):([0-5]\d)$/.exec($('regTime').value.trim());const seconds=match?Number(match[1])*60+Number(match[2]):0;return km>0&&km<=1000&&seconds>0?{targetM:km*1000,targetMs:seconds*1000}:null}
    function head(title){return `<div class="reg-head"><strong>${title}</strong><button class="reg-back" id="regBack">ROADBOOK ›</button></div>`}
    function render(){
      const panel=$('regularityPanel');
      if(!run){panel.innerHTML=head('GLEICHMÄSSIGKEIT')+`<div class="reg-fields"><label>Strecke (km)<input id="regDistance" inputmode="decimal" value="5,00" autocomplete="off"></label><label>Sollzeit (mm:ss)<input id="regTime" inputmode="numeric" value="07:30" autocomplete="off"></label></div><p class="reg-note">Soll-Ø <strong id="regPreview">40,0 km/h</strong> · eigener Start</p><p class="reg-error" id="regError" hidden></p><button class="iconbtn" id="regStart">GLEICHMÄSSIGKEIT STARTEN</button>`;
        const preview=()=>{const p=parse();$('regPreview').textContent=p?decimal(p.targetM/p.targetMs*3600)+' km/h':'—'};
        $('regDistance').oninput=preview;$('regTime').oninput=preview;
        $('regStart').onclick=()=>{
          const p=parse();if(!p){$('regError').hidden=false;$('regError').textContent='Strecke > 0 bis 1000 km und Zeit als mm:ss eingeben.';return}
          const now=Date.now();
          if(!lastFix||now-lastFix.receivedAt>5000||now-lastFix.timestamp>5000||lastFix.timestamp>now+2000||!Number.isFinite(lastFix.coords.accuracy)||lastFix.coords.accuracy>25||lastFix.coords.accuracy<0){$('regError').hidden=false;$('regError').textContent='Bitte auf einen aktuellen GPS-Fix (±25 m oder besser) warten.';return}
          run={...p,status:'running',startedAt:now,endedAt:null,distanceM:0,interrupted:false};engine.reset();engine.seenTime=now-1;persist();render();updateBadge();onStart();
        };
      }else{
        const running=isRunning();panel.innerHTML=head(running?'GLEICHMÄSSIGKEIT LÄUFT':run.status==='finished'?'GLEICHMÄSSIGKEIT BEENDET':'GLEICHMÄSSIGKEIT GESTOPPT')+`<div class="reg-large"><label>${running?'Reststrecke':'Strecke'}<strong id="regMeters"></strong></label><label>${running?'Restzeit':'Istzeit'}<strong id="regClock"></strong></label></div><div class="reg-small"><span>Soll-Ø <strong id="regTarget"></strong></span><span>Ø seit Start <strong id="regAverage"></strong></span><span>Abweichung <strong id="regDelta"></strong></span></div><p class="reg-note" id="regNote"></p><div class="reg-actions"><button class="iconbtn" id="regAction">${running?'MESSUNG STOPPEN':'NEU'}</button></div>`;
        $('regAction').onclick=()=>{if(isRunning()){if(!confirm('Nur die Gleichmäßigkeitsmessung stoppen?'))return;run.status='stopped';run.endedAt=Date.now();persist()}else{run=null;engine.reset();persist()}render();updateBadge()};tick();
      }
      $('regBack').onclick=()=>setMode(false);
    }
    function tick(){
      if(!run||!mode||!$('regMeters'))return;
      const ms=elapsed(),remaining=run.targetMs-ms,expected=run.distanceM/run.targetM*run.targetMs,deviation=ms-expected;
      $('regMeters').textContent=decimal((isRunning()?Math.max(0,run.targetM-run.distanceM):run.distanceM)/1000,3)+' km';
      $('regClock').textContent=isRunning()?(remaining<0?'−':'')+clock(Math.abs(remaining)):clock(ms);
      $('regTarget').textContent=decimal(run.targetM/run.targetMs*3600);
      $('regAverage').textContent=ms?decimal(run.distanceM/ms*3600):'0,0';
      $('regDelta').textContent=delta(deviation);$('regDelta').className=deviation>500?'reg-late':deviation< -500?'reg-early':'';
      const stale=isRunning()&&(!lastFix||Date.now()-lastFix.receivedAt>5000);
      $('regNote').textContent=storageError?'Speichern nicht möglich.':stale?'GPS fehlt · Zeit läuft weiter.':run.interrupted?'GPS-Unterbrechung · Strecke möglicherweise unvollständig.':`Sollzeit ${clock(run.targetMs)} · Ø in km/h · + zu spät / − zu früh`;
      $('regNote').className='reg-note'+(stale||run.interrupted||storageError?' reg-warning':'');
    }
    function position(p,receivedAt){
      lastFix={timestamp:p.timestamp,coords:{...p.coords,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,speed:p.coords.speed},receivedAt};
      if(!isRunning())return;
      const c=p.coords,result=engine.push({latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,speed:c.speed,time:p.timestamp},true,{},receivedAt);
      if(result.reason==='Zeitlücke: neue Referenz')run.interrupted=true;
      for(const segment of result.segments){
        const start=Math.max(segment.fromTime,run.startedAt),end=segment.toTime;if(end<=start)continue;
        const meters=segment.m*(end-start)/(segment.toTime-segment.fromTime),left=run.targetM-run.distanceM;
        if(meters>=left&&meters>0){run.distanceM=run.targetM;run.endedAt=start+(end-start)*left/meters;run.status='finished';persist();if(mode)render();updateBadge();return}
        run.distanceM+=meters;
      }
      persist();tick();
    }
    function interrupt(){if(isRunning()){run.interrupted=true;engine.reset();persist();tick()}}
    $('openRegularity').onclick=()=>setMode(true);
    window.addEventListener('pagehide',interrupt);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();else tick()});
    setInterval(tick,200);updateBadge();if(run)setMode(true);
    return {position,interrupt,isRunning};
  }
  return {create};
})();
