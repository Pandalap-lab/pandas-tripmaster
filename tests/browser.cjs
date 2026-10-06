const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const output=fs.mkdtempSync(path.join(require('os').tmpdir(),'tripmaster-tests-'));
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);if(!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.webmanifest')?'application/manifest+json':'image/png');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let tileMode='success';
 await page.route('https://tile.openstreetmap.org/**',async route=>{
   if(tileMode==='fail')return route.abort();
   if(process.env.REAL_MAP==='1')return route.continue();
   if(tileMode==='slow')await new Promise(r=>setTimeout(r,600));
   return route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(root,'icon-192.png'))});
 });
 await page.goto('http://127.0.0.1:8765');
 await page.waitForTimeout(400);
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(200);
   const tabs=await page.evaluate(()=>{const a=document.querySelector('.total-counter .counter-top').getBoundingClientRect();return ['settingsEdge','routeEdge'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return Math.abs(r.top+r.height/2-a.top-a.height/2)})});assert(tabs.every(d=>d<2),'tabs align');
   await page.click('#settingsEdge');await page.waitForTimeout(300);
   assert(await page.evaluate(()=>{const r=document.querySelector('.auto-badge').getBoundingClientRect(),c=document.querySelector('.settings-card').getBoundingClientRect();return r.left>=c.left&&r.right<=c.right}),'badge fits');
   await page.click('#settingsBack');await page.waitForTimeout(300);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(output,'build24-main.png')});
 await page.click('[data-adjust="100"]');
 await page.click('#resetAll');await page.screenshot({path:path.join(output,'build24-reset.png')});
 await page.click('.reset-cancel');assert.equal(await page.locator('#totalKm').getAttribute('data-value'),'0,10');
 await page.click('#resetAll');await page.keyboard.press('Escape');assert.equal(await page.locator('#totalKm').getAttribute('data-value'),'0,10');
 await page.click('#resetAll');await page.click('.reset-ok');await page.waitForTimeout(250);assert.equal(await page.locator('#totalKm').getAttribute('data-value'),'0,00');assert.equal(await page.locator('#startStop').textContent(),'TRIPMASTER START');
 await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('pandas-tripmaster-gps',2);req.onsuccess=()=>{const db=req.result,tx=db.transaction(['sessions','points'],'readwrite');tx.objectStore('sessions').put({id:'test-route',stageNumber:1,startTime:100000,endTime:160000,distanceM:1234});[[48.2082,16.3738],[48.2102,16.3808],[48.214,16.39]].forEach(([latitude,longitude],i)=>tx.objectStore('points').add({sessionId:'test-route',latitude,longitude,number:i+1,accepted:true,timestamp:100000+i*1000}));tx.oncomplete=resolve;tx.onerror=reject}}));
 await context.setOffline(true);await page.click('#routeEdge');await page.waitForTimeout(350);
 const fallback=await page.locator('#routeSvg').innerHTML();assert(fallback.includes('polyline'));assert.equal(await page.locator('#routeSvg image').count(),0);
 const meta=await page.locator('.route-meta').innerText();
 await page.screenshot({path:path.join(output,'build24-offline.png')});
 await context.setOffline(false);await page.waitForFunction(()=>!document.getElementById('mapCredit').hidden,{},{timeout:12000});
 await page.screenshot({path:path.join(output,'build24-online.png')});
 assert(await page.locator('#routeSvg image').count()>0);assert.equal(await page.locator('.route-meta').innerText(),meta);
 assert.equal(await page.locator('#routeSvg .route-start').count(),1);assert.equal(await page.locator('#routeSvg .route-end').count(),1);
 await context.setOffline(true);await page.waitForTimeout(100);assert.equal(await page.locator('#routeSvg').innerHTML(),fallback);
 // A disconnected tile server must not replace the original route.
 tileMode='fail';await context.setOffline(false);await page.reload();await page.waitForTimeout(250);await page.click('#routeEdge');await page.waitForTimeout(400);assert.equal(await page.locator('#routeSvg image').count(),0);assert.equal(await page.locator('#routeSvg').innerHTML(),fallback);
 assert.deepEqual(errors,[]);await context.close();
 // Verify the real service worker shell can reload offline, including the new JS.
 const offlineContext=await browser.newContext();const p=await offlineContext.newPage();await p.goto('http://127.0.0.1:8765/?app=24');await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(700);await offlineContext.setOffline(true);await p.reload();await p.waitForTimeout(300);assert.equal(await p.title(),'PANDAs Tripmaster');assert.equal(await p.evaluate(()=>typeof RouteMap.show),'function');assert.equal(await p.evaluate(()=>typeof RegularityUI.create),'function');await offlineContext.close();
 console.log('PASS: four viewport layouts, badge, tab alignment, reset cancel/Escape/OK, route map success/failure/offline exact fallback, unchanged statistics and markers, no runtime errors, service worker offline reload.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});


