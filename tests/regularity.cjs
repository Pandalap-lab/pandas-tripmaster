const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=html.split('<script>')[1].split('</script>')[0],engineCode=inline.slice(0,inline.indexOf('(() => {'));
function setup(saved){
 const dom=new JSDOM(html,{url:'https://tripmaster.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let now=100000;w.Date.now=()=>now;w.confirm=()=>true;if(saved)w.localStorage.setItem('tripmasterRegularityV1',saved);
 w.localStorage.setItem('tripmasterLedgerV2',JSON.stringify({distanceUm:150000000,offsets:{trip:1,total:2,road:3}}));
 w.eval(engineCode+fs.readFileSync(path.join(root,'regularity.js'),'utf8')+';window.reg=RegularityUI.create(DistanceEngine,()=>{});');
 const click=id=>w.document.getElementById(id).click();
 const gps=(time,meters,speed=10,accuracy=3)=>{now=time;w.reg.position({timestamp:time,coords:{latitude:48+meters/111194.9266,longitude:16,accuracy,speed}},time)};
 return {dom,w,click,gps,time:t=>now=t};
}
{
 const {dom,w,click,gps,time}=setup(),before=w.localStorage.tripmasterLedgerV2;
 click('openRegularity');w.document.getElementById('regDistance').value='0,05';w.document.getElementById('regMinutes').value='00';w.document.getElementById('regSeconds').value='05';
 click('regStart');assert.equal(w.reg.isRunning(),false,'GPS required');
 gps(100000,0);click('regStart');assert.equal(w.reg.isRunning(),true);
 for(let i=0;i<=6;i++)gps(100000+i*1000,i*10);
 const result=JSON.parse(w.localStorage.tripmasterRegularityV1);assert.equal(result.status,'finished');assert.equal(result.distanceM,50);assert.ok(Math.abs(result.endedAt-105000)<1,'interpolated finish');
 assert.equal(w.localStorage.tripmasterLedgerV2,before,'main counters untouched');assert.equal(w.document.getElementById('regAverage').textContent,'36,0');
 time(120000);gps(120000,200);assert.equal(JSON.parse(w.localStorage.tripmasterRegularityV1).endedAt,result.endedAt,'result frozen');
 click('regAction');assert.equal(w.localStorage.tripmasterRegularityV1,undefined);dom.window.close();
}
{
 const {dom,w,click,gps}=setup();click('openRegularity');gps(100000,0);click('regStart');
 gps(101000,0);gps(102000,10);gps(103000,20);gps(104000,30);
 const booked=JSON.parse(w.localStorage.tripmasterRegularityV1).distanceM;
 w.reg.interrupt();gps(110000,1000);assert.equal(JSON.parse(w.localStorage.tripmasterRegularityV1).distanceM,booked,'no invented gap distance');
 assert.equal(JSON.parse(w.localStorage.tripmasterRegularityV1).interrupted,true);
 click('regBack');assert.equal(w.reg.isRunning(),true,'hidden roadbook mode keeps measuring');
 const saved=w.localStorage.tripmasterRegularityV1;dom.window.close();
 const resumed=setup(saved);assert.equal(resumed.w.reg.isRunning(),true);assert.equal(resumed.w.document.getElementById('regularityPanel').hidden,false);resumed.dom.window.close();
}
{
 const {dom,w,click,gps}=setup();click('openRegularity');gps(100000,0);w.document.getElementById('regMinutes').value='00';w.document.getElementById('regSeconds').value='01';click('regStart');
 gps(102000,0,0);assert.ok(w.document.getElementById('regClock').textContent.startsWith('−'),'overdue displayed');assert.equal(w.reg.isRunning(),true,'time expiry does not finish distance run');
 click('regAction');assert.equal(JSON.parse(w.localStorage.tripmasterRegularityV1).status,'stopped');dom.window.close();
}
// Multiple distinct polylines and numbered endpoints, online success/failure and stale requests.
(async()=>{
 const {dom,w}=setup();Object.defineProperty(w.navigator,'onLine',{value:false,configurable:true});w.eval(fs.readFileSync(path.join(root,'route-map.js'),'utf8'));
 const svg=w.document.getElementById('routeSvg'),stages=[{number:2,points:[{latitude:48,longitude:16},{latitude:48.01,longitude:16.01}]},{number:5,points:[{latitude:48.1,longitude:16.1},{latitude:48.11,longitude:16.11}]}];
 await w.RouteMap.show(svg,stages);const fallback=svg.innerHTML;
 assert.equal(svg.querySelectorAll('.route-line').length,2);const names=[...svg.querySelectorAll('.route-marker')].map(n=>n.getAttribute('aria-label')).join(' ');for(const text of ['Start Etappe 2','Ende Etappe 2','Start Etappe 5','Ende Etappe 5'])assert.ok(names.includes(text),'all endpoints available, also when grouped');
 Object.defineProperty(svg,'clientWidth',{value:360});Object.defineProperty(svg,'clientHeight',{value:480});Object.defineProperty(w.navigator,'onLine',{value:true,configurable:true});
 w.Image=class{set src(value){queueMicrotask(()=>this.onload?.())}};
 await w.RouteMap.show(svg,stages);assert.ok(svg.querySelectorAll('image').length>0);w.dispatchEvent(new w.Event('offline'));assert.equal(svg.querySelectorAll('image').length,0);assert.equal(svg.querySelectorAll('.route-line').length,2);
 w.Image=class{set src(value){queueMicrotask(()=>this.onerror?.())}};
 await w.RouteMap.show(svg,[{number:3,points:[{latitude:2,longitude:3},{latitude:2.01,longitude:3.01}]}]);assert.equal(svg.querySelectorAll('image').length,0);
 dom.window.close();console.log('PASS: independent regularity, validation, finish interpolation, frozen result, GPS gaps, reload, overdue timer, map stage separation, numbered markers, online success/failure and offline fallback');
})().catch(e=>{console.error(e);process.exitCode=1});

