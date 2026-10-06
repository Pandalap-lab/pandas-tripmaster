const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),output=fs.mkdtempSync(path.join(require('os').tmpdir(),'tripmaster-build24-'));
const server=http.createServer((req,res)=>{const f=path.join(root,new URL(req.url,'http://localhost').pathname==='/'?'index.html':new URL(req.url,'http://localhost').pathname);if(!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'image/png');res.end(fs.readFileSync(f))});
const seed=()=>new Promise((resolve,reject)=>{const q=indexedDB.open('pandas-tripmaster-gps',2);q.onsuccess=()=>{const t=q.result.transaction(['sessions','points'],'readwrite');for(let n=1;n<=12;n++){t.objectStore('sessions').put({id:'s'+n,stageNumber:n,startTime:100000+n*1000,endTime:110000+n*1000,distanceM:500,pointCount:4,acceptedCount:4,rejectedCount:0});for(let i=0;i<4;i++)t.objectStore('points').add({sessionId:'s'+n,number:i+1,latitude:48.2+i*.005+(n%3)*.001,longitude:16.4+i*.004+Math.floor(n/3)*.002,accepted:true})}t.oncomplete=resolve;t.onerror=reject}});
(async()=>{await new Promise(r=>server.listen(8770,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>Object.defineProperty(navigator,'geolocation',{value:{watchPosition(cb){window.testGps=cb;return 1},clearWatch(){}}}));await p.goto('http://127.0.0.1:8770');
 for(const v of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390}]){
  await p.setViewportSize(v);
  for(const glp of [false,true]){
   if(glp)await p.click('#openRegularity');
   const bad=await p.evaluate(()=>['zeroTrip','startStop','resetAll',...(document.getElementById('regularityPanel').hidden?['openRegularity']:['regStart'])].flatMap(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top<0||r.left<0||r.right>innerWidth+.5||r.bottom>innerHeight+.5?[{id,rect:r.toJSON(),screen:[innerWidth,innerHeight]}]:[]}));assert.deepEqual(bad,[],`all controls visible ${v.width}x${v.height} GLP:${glp}`);
   assert.equal(await p.evaluate(()=>document.querySelector('.app').scrollWidth>document.querySelector('.app').clientWidth),false,'no horizontal overflow');
   await p.screenshot({path:path.join(output,`${v.width}x${v.height}-${glp?'glp':'main'}.png`)});
   if(glp)await p.click('#regBack');
  }
 }
 await p.setViewportSize({width:390,height:844});await p.click('#openRegularity');await p.fill('#regDistance','2,50');await p.fill('#regMinutes','03');await p.fill('#regSeconds','45');await p.click('#regBack');await p.click('#openRegularity');assert.equal(await p.inputValue('#regDistance'),'2,50');assert.equal(await p.inputValue('#regMinutes'),'03');assert.equal(await p.inputValue('#regSeconds'),'45');assert.equal(await p.textContent('#regPreview'),'40,0 km/h');
 await p.fill('#regSeconds','60');await p.click('#regStart');assert.equal(await p.evaluate(()=>Regularity.isRunning()),false);assert.equal(await p.locator('#regError').isVisible(),true);await p.fill('#regSeconds','45');
 await p.evaluate(()=>testGps({timestamp:Date.now(),coords:{latitude:48.2,longitude:16.4,speed:0,accuracy:6}}));await p.click('#regStart');assert.equal(await p.evaluate(()=>Regularity.isRunning()),true);assert.equal(await p.textContent('#startStop'),'TRIPMASTER START');
 for(const v of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await p.setViewportSize(v);assert(await p.evaluate(()=>['regAction','startStop','resetAll'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})),`running GLP controls fit ${v.width}`)}
 await p.setViewportSize({width:390,height:844});
 // Simulate the space consumed by iPhone safe-area insets without claiming a Safari test.
 await p.addStyleTag({content:'body{padding-top:50px!important;padding-bottom:44px!important}'});assert(await p.evaluate(()=>document.getElementById('startStop').getBoundingClientRect().bottom<=innerHeight-34),'controls respect simulated home-indicator space');
 await p.evaluate(()=>document.head.lastElementChild.remove());
 await p.click('#regBack');await p.evaluate(seed);await ctx.setOffline(true);await p.click('#routeEdge');await p.waitForTimeout(300);assert.equal(await p.locator('#routeSelection').getAttribute('open'),null,'selection initially collapsed');
 await p.click('#routeSelectionSummary');await p.click('#routeAll');await p.waitForTimeout(150);await p.click('#routeSelectionSummary');assert.equal(await p.locator('#routeSvg .route-line').count(),12);assert.equal(await p.locator('#routeLegend button').count(),12);assert.equal(await p.locator('#routeSvg .route-halo').count(),12);
 const labels=await p.evaluate(()=>{const a=[...document.querySelectorAll('.route-label-bg')].map(n=>n.getBoundingClientRect());return a.some((r,i)=>a.slice(i+1).some(s=>r.left<s.right&&r.right>s.left&&r.top<s.bottom&&r.bottom>s.top))});assert.equal(labels,false,'no overlapping route labels');assert(await p.locator('.route-cluster').count()>0,'nearby endpoints grouped');
 await p.locator('.route-marker').first().tap();assert.equal(await p.locator('#mapDetails').isVisible(),true,'marker tap opens details');
 const line=()=>p.locator('.route-line').first().getAttribute('points');const initial=await line();await p.click('#mapZoomIn');assert.notEqual(await line(),initial,'zoom changes route geometry');await p.click('#mapFit');assert.equal(await line(),initial,'fit restores view');
 const r=await p.locator('#routeSvg').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+70,r.y+r.height/2+20,{steps:8});await p.mouse.up();assert.notEqual(await line(),initial,'drag pans');assert(await p.locator('#routePage').evaluate(n=>n.classList.contains('open')),'map drag does not close panel');
 // Real touch pinch through Chromium's input API.
 await p.click('#mapFit');const session=await ctx.newCDPSession(p),x=r.x+r.width/2,y=r.y+r.height/2;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await line(),initial,'pinch zoom works');assert(await p.locator('#routePage').evaluate(n=>n.classList.contains('open')));await p.click('#mapFit');
 await p.locator('#routeLegend button').nth(5).click();assert.equal(await p.locator('.route-stage.is-focused').count(),1);assert.equal(await p.locator('#routeLegend button[aria-pressed=true]').count(),1);
 await p.screenshot({path:path.join(output,'map-12-stages-offline.png')});
 await p.click('#routeBack');await p.click('#routeEdge');await p.waitForTimeout(250);assert.equal(await p.locator('#routeSvg .route-line').count(),12,'selection preserved across close/open');
 await p.click('#routeSelectionSummary');await p.click('#routeNone');await p.waitForTimeout(100);assert.equal(await p.locator('.route-line').count(),0);assert.equal(await p.locator('#routeEmpty').isVisible(),true);await p.click('#routeAll');await p.click('#routeSelectionSummary');
 assert.deepEqual(errors,[]);console.log('PASS: four viewport controls, GLP draft and numeric time validation, independent start, collapsed selection, high-contrast paths, collision-free labels, marker details, drag/pinch/zoom/fit, highlight, retained selection, empty state.');console.log('Screenshots: '+output);
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
