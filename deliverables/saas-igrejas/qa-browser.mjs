import { chromium, webkit } from 'file:///C:/Users/R2/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'qa');await mkdir(out,{recursive:true});
const url=process.env.SAAS_PREVIEW_URL||pathToFileURL(path.join(root,'projeto.html')).href;
const report={date:new Date().toISOString(),url,cases:[],screenshots:[],errors:[],limits:['Emulação de navegador Windows; não teste em aparelhos físicos.','Proposta usa dados fictícios e estado separado da API.']};
async function run(name,fn){try{await fn();report.cases.push({name,pass:true});console.log('PASS '+name);}catch(e){report.cases.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
async function snap(page,name){const file=path.join(out,name+'.png');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
async function geometry(page){const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width+1,JSON.stringify(size));}
for(const [engine,driver,options]of [['chromium',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]){
 const browser=await driver.launch({headless:true,...options});
 try{
  for(const width of [375,1440])for(const theme of ['light','dark']){
   await run(`${engine}-${width}-${theme}-layout`,async()=>{
    const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',colorScheme:theme});const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push({engine,width,message:e.message}));
    await page.goto(url);await page.waitForSelector('#app-phone .phone-content',{state:'attached'});
    if(await page.evaluate(()=>document.documentElement.dataset.theme!=='dark')&&theme==='dark')await page.locator('#theme-btn').click();
    if(await page.evaluate(()=>document.documentElement.dataset.theme==='dark')&&theme==='light')await page.locator('#theme-btn').click();
    for(const view of ['vision','app','admin','platform','architecture','plan']){
     await page.locator('.nav-btn[data-view="'+view+'"]').click();await page.locator('#view-'+view).waitFor({state:'visible'});await geometry(page);
     if(engine==='chromium'&&['vision','app','admin'].includes(view))await snap(page,`${engine}-${width}-${theme}-${view}`);
    }
    await ctx.close();
   });
  }
  await run(`${engine}-interactive-publish-isolation`,async()=>{
   const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.goto(url);await page.locator('.nav-btn[data-view="admin"]').click();
   const old=await page.locator('#admin-phone [data-published-news] strong').textContent();
   await page.locator('#news-title').fill('Aviso de teste <img src=x onerror=alert(1)>');await page.locator('#news-body').fill('Encontro para estudar as conexões. Conteúdo fictício.');
   assert.equal(await page.locator('#admin-phone [data-published-news] strong').textContent(),old);
   await page.locator('#news-form button[type="submit"]').click();assert.match(await page.locator('#publish-status').textContent(),/Publicado somente/);
   assert.equal(await page.locator('#admin-phone [data-published-news] img').count(),0);
   assert.match(await page.locator('#admin-phone [data-published-news] strong').textContent(),/Aviso de teste/);
   await page.locator('#church-select').selectOption('horizonte');assert.doesNotMatch(await page.locator('#admin-phone [data-published-news] strong').textContent(),/Aviso de teste/);
   await page.locator('#church-select').selectOption('aurora');assert.match(await page.locator('#admin-phone [data-published-news] strong').textContent(),/Aviso de teste/);
   await page.locator('#module-campaigns').uncheck();assert.equal(await page.locator('#admin-phone [data-phone-action="campaign"]').count(),0);
   await page.locator('#module-campaigns').check();assert.equal(await page.locator('#admin-phone [data-phone-action="campaign"]').count(),1);
   await page.locator('.nav-btn[data-view="app"]').click();
   for(const tab of ['bible','agenda','community','more','home']){await page.locator('#app-phone .phone-nav [data-phone-tab="'+tab+'"]').click();assert.equal(await page.locator('#app-phone .phone-nav [aria-current="page"]').getAttribute('data-phone-tab'),tab);}
   await page.locator('.nav-btn[data-view="plan"]').click();const count=await page.locator('[data-phase]').count();assert.ok(count>=4);for(let i=0;i<count;i++){await page.locator('[data-phase="'+i+'"]').click();assert.equal(await page.locator('[data-phase="'+i+'"]').getAttribute('aria-current'),'step');}
   await page.locator('#reset-btn').click();assert.ok(await page.locator('#reset-dialog').isVisible());await page.keyboard.press('Escape');assert.ok(!await page.locator('#reset-dialog').isVisible());
   await page.locator('#reset-btn').click();await page.locator('#confirm-reset').click();await page.locator('.nav-btn[data-view="admin"]').click();assert.equal(await page.locator('#admin-phone [data-published-news] strong').textContent(),old);await page.close();
  });
 }finally{await browser.close();}
}
await writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
if(report.errors.length||report.cases.some(c=>!c.pass))process.exitCode=1;
