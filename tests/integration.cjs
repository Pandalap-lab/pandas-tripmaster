const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://tripmaster.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
const wait=()=>new Promise(r=>setTimeout(r,30));
const rows={sessions:[2,5].map(n=>({id:'s'+n,stageNumber:n,startTime:1000*n,endTime:1000*n+10000,distanceM:100,pointCount:3,acceptedCount:3,rejectedCount:0})),points:[2,5].flatMap(n=>[0,1,2].map(i=>({sessionId:'s'+n,number:i+1,latitude:48+n/100+i/1000,longitude:16+n/100,accepted:true}))),events:[]};
function request(result){const r={result:structuredClone(result)};queueMicrotask(()=>r.onsuccess?.());return r}
const db={transaction(){const tx={objectStore(name){return {get:id=>request(rows[name].find(r=>r.id===id)),getAll:()=>request(rows[name]),index:()=>({getAll:id=>request(rows[name].filter(r=>r.sessionId===id))}),put:r=>{const i=rows[name].findIndex(v=>v.id===r.id);if(i<0)rows[name].push(structuredClone(r));else rows[name][i]=structuredClone(r)},add:r=>rows[name].push(structuredClone(r))}}};setTimeout(()=>tx.oncomplete?.(),5);return tx}};
w.indexedDB={open:()=>request(db)};
// The fake open request cannot clone a database with methods.
w.indexedDB.open=()=>{const r={result:db};queueMicrotask(()=>r.onsuccess?.());return r};
w.ResizeObserver=class{observe(){}};w.confirm=()=>true;let gpsCallback,now=100000;w.Date.now=()=>now;
Object.defineProperty(w.navigator,'onLine',{value:false});Object.defineProperty(w.navigator,'geolocation',{value:{watchPosition:cb=>{gpsCallback=cb;return 1},clearWatch(){}}});
const gps=(time,meters)=>{now=time;gpsCallback({timestamp:time,coords:{latitude:48+meters/111194.9266,longitude:16,accuracy:3,speed:10}})};
for(const name of ['route-map.js','regularity.js'])w.eval(fs.readFileSync(path.join(root,name),'utf8'));
w.eval(html.split('<script>')[1].split('</script>')[0]);const click=id=>w.document.getElementById(id).click();
(async()=>{
 await wait();click('routeEdge');await wait();assert.equal(w.document.querySelectorAll('#routeSvg polyline').length,1);
 click('routeAll');await wait();assert.equal(w.document.querySelectorAll('#routeSvg polyline').length,2);assert.equal(w.document.getElementById('routeDistance').textContent,'0,200 km');
 const check=w.document.querySelector('#routeStageChoices input');check.click();await wait();assert.equal(w.document.querySelectorAll('#routeSvg polyline').length,1);
 click('routeNone');await wait();assert.equal(w.document.querySelectorAll('#routeSvg polyline').length,0);assert.equal(w.document.getElementById('routeEmpty').hidden,false);
 click('routeBack');click('startStop');await wait();gps(100000,0);gps(101000,10);gps(102000,20);gps(103000,30);
 assert.equal(w.document.getElementById('startStop').textContent,'PAUSE');click('openRegularity');click('regStart');assert.equal(w.Regularity.isRunning(),true);
 for(let i=4;i<=7;i++)gps(100000+i*1000,i*10);
 const read=()=>JSON.parse(w.localStorage.tripmasterRegularityV1);const d=read().distanceM;assert.ok(d>0);
 click('zeroTrip');assert.equal(read().distanceM,d,'stage reset independent');
 w.document.querySelector('[data-adjust="100"]').click();assert.equal(read().distanceM,d,'correction independent');
 click('startStop');gps(108000,80);gps(109000,90);assert.ok(read().distanceM>d,'main pause does not pause regularity');
 const mainDistance=JSON.parse(w.localStorage.tripmasterLedgerV2).distanceUm;gps(110000,100);assert.equal(JSON.parse(w.localStorage.tripmasterLedgerV2).distanceUm,mainDistance,'main stays paused');
 const beforeReset=read().distanceM;const resetEvent=new w.Event('submit');resetEvent.submitter={value:'reset'};w.document.getElementById('resetForm').dispatchEvent(resetEvent);await wait();gps(111000,110);assert.ok(read().distanceM>beforeReset,'reset all does not stop regularity');
 click('regAction');assert.equal(read().status,'stopped');assert.equal(w.document.getElementById('startStop').textContent,'START');
 console.log('PASS: full app startup, multi/single/empty selection, combined statistics, parallel GPS consumers, stage reset, correction, main pause, GLP stop');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
