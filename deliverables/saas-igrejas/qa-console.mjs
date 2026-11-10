import { chromium, webkit } from 'file:///C:/Users/R2/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));const out=path.join(root,'qa');await mkdir(out,{recursive:true});
const base='http://127.0.0.1:4318';
const {accounts}=JSON.parse(await readFile(path.join(root,'../../platform/.local/demo-credentials.json'),'utf8'));
const owner=accounts.find(a=>a.role==='owner');const other=accounts.find(a=>a.role==='owner'&&a.churchSlug!==owner.churchSlug);
const report={date:new Date().toISOString(),base,cases:[],screenshots:[],errors:[],limits:['Backend de desenvolvimento PGlite; sem validação de PostgreSQL remoto ou MFA.','Contas e avisos fictícios; nenhum pagamento ou serviço externo.']};
async function run(name,fn){try{await fn();report.cases.push({name,pass:true});console.log('PASS '+name);}catch(e){report.cases.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
async function api(url,token,method='GET',body){const r=await fetch(base+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.status===204?{}:await r.json()};}
async function screenshot(page,name){await page.evaluate(()=>scrollTo(0,0));const file=path.join(out,name+'.png');await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
for(const[engine,driver,options]of [['chromium',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]){
 const browser=await driver.launch({headless:true,...options});
 try{
  for(const width of [375,1440])for(const theme of ['light','dark'])await run(`${engine}-${width}-${theme}-console`,async()=>{
   const ctx=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push({engine,width,message:e.message}));
   const response=await page.goto(base+'/console');assert.equal(response.status(),200);await page.locator('#email').fill(owner.email);await page.locator('#password').fill(owner.password);await page.locator('#login-form button').click();await page.locator('#workspace').waitFor({state:'visible'});await page.locator('#content-list article').first().waitFor();
   assert.equal(await page.locator('#password').inputValue(),'');assert.equal(await page.locator('#church-select option').count(),1);
   const geometry=await page.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));assert.ok(geometry.s<=geometry.w+1);
   if(engine==='chromium')await screenshot(page,`${engine}-${width}-${theme}-console`);
   await page.locator('[data-view="public"]').click();await page.locator('#content-list article').first().waitFor();assert.doesNotMatch(await page.locator('#content-list').textContent(),/Planejamento interno/);
   await page.locator('[data-view="audit"]').click();await page.locator('#list-title').filter({hasText:'Histórico registrado'}).waitFor();
   await page.locator('#logout').click();await page.locator('#login-panel').waitFor({state:'visible'});await ctx.close();
  });
  await run(`${engine}-write-publish-isolate`,async()=>{
   const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(base+'/console');await page.locator('#email').fill(owner.email);await page.locator('#password').fill(owner.password);await page.locator('#login-form button').click();await page.locator('#workspace').waitFor();
   const title=`Aviso QA ${engine} ${Date.now()}`;const body='Teste de publicação local. <img src=x onerror=alert(1)>';
   await page.locator('#post-title').fill(title);await page.locator('#post-body').fill(body);await page.locator('#save-post').click();await page.locator('#status').filter({hasText:'Aviso salvo'}).waitFor();await page.locator('#content-list article').filter({hasText:title}).waitFor();
   assert.equal(await page.locator('#content-list img').count(),0);assert.ok(!(await api(`/v1/churches/${owner.churchSlug}/posts`)).data.items.some(p=>p.title===title));
   await page.locator('#content-list article').filter({hasText:title}).getByRole('button',{name:'Editar'}).click();await page.locator('#post-status').selectOption('published');await page.locator('#save-post').click();await page.locator('#status').filter({hasText:'Aviso salvo'}).waitFor();
   const published=(await api(`/v1/churches/${owner.churchSlug}/posts`)).data.items.find(p=>p.title===title);assert.ok(published);assert.ok(!(await api(`/v1/churches/${other.churchSlug}/posts`)).data.items.some(p=>p.id===published.id));
   await page.locator('[data-view="public"]').click();await page.locator('#content-list article').filter({hasText:title}).waitFor();
   const login=await api('/v1/auth/login',null,'POST',{email:owner.email,password:owner.password});assert.equal(login.status,200);const token=login.data.token;
   assert.equal((await api(`/v1/admin/${other.churchSlug}/posts`,token)).status,403);
   assert.equal((await api(`/v1/admin/${owner.churchSlug}/posts/${published.id}`,token,'DELETE')).status,204);
   await api('/v1/auth/logout',token,'POST');assert.equal((await api('/v1/auth/me',token)).status,401);
   await page.locator('#logout').click();await page.close();
  });
 }finally{await browser.close();}
}
await run('local-security-headers-and-hidden-credentials',async()=>{
 const response=await fetch(base+'/console');assert.match(response.headers.get('content-security-policy'),/sha256-/);assert.equal((await fetch(base+'/.local/demo-credentials.json')).status,404);assert.equal((await fetch(base+'/v1/churches/'+owner.churchSlug+'/posts',{headers:{Origin:'https://foreign.example'}})).status,403);
});
await writeFile(path.join(out,'console-report.json'),JSON.stringify(report,null,2));if(report.errors.length||report.cases.some(c=>!c.pass))process.exitCode=1;
