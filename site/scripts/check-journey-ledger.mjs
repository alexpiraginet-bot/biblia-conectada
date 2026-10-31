import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {JOURNEY_LUA} from '../src/lib/rewards/ledger.ts';
import {localRedis as redis} from './journey-local-redis.mjs';

const output = process.argv[2];
const prefix = `qa-only:journey:${randomUUID()}:`;
const results = [];
let sequence = 0;
const nonce = () => (++sequence).toString(16).padStart(32,'0');
const day = ms => new Date(ms-3*3600000).toISOString().slice(0,10);
const previous = date => new Date(Date.parse(`${date}T12:00:00Z`)-86400000).toISOString().slice(0,10);
function ledger(name) {
 const id=createHash('sha256').update(name).digest('hex');
 const key=`${prefix}${name}:profile:${id}`;
 let now=Date.parse('2026-10-31T12:00:00Z'), state;
 const keys=()=>[key,`${prefix}${name}:profiles`,`${prefix}${name}:eligible`,`${prefix}${name}:rate:${Math.floor(now/60000)}`,`${prefix}${name}:starts:${day(now)}`];
 const command=(op, area='',active=true, token=state?.pulse.nonce||'', newToken=nonce())=>['EVAL',JOURNEY_LUA,5,...keys(),op,id,now,day(now),previous(day(now)),newToken,token,area,active?'1':'0'];
 async function call(op, area='',active=true, token) {
  const result=await redis(command(op,area,active,token));
  if(result[0]==='ok')state=JSON.parse(result[1]);
  else if(result[0]!=='reset')throw new Error(`Unexpected ledger response ${JSON.stringify(result)}`);
  return result;
 }
 return {key,id,keys,command,call, get state(){return state},get now(){return now},set now(v){now=v},advance(ms=15000){now+=ms},async pulse(area,active=true){return call('pulse',area,active)},async beats(area,n){for(let i=0;i<n;i++){now+=15000;await call('pulse',area)}}};
}
async function test(name,fn){const start=performance.now();try{await fn();results.push({name,pass:true,ms:Math.round(performance.now()-start)});}catch(error){results.push({name,pass:false,error:String(error.stack)});}console.log(name,results.at(-1).pass?'PASS':'FAIL');}
async function allTasks(l){await l.pulse('liturgy');await l.beats('liturgy',12);await l.pulse('map');await l.beats('map',3);await l.pulse('arcs');await l.beats('arcs',3);}

assert.equal(await redis(['PING']),'PONG');
const info=await redis(['INFO','server']);
await test('first pulse arms; 120s reading gives one 20-point award',async()=>{const l=ledger('reading');await l.call('start');await l.pulse('reading');assert.equal(l.state.day.readingMs,0);await l.beats('reading',7);assert.equal(l.state.points,0);await l.beats('reading',1);assert.equal(l.state.points,20);assert.equal(l.state.activeDays,1);await l.beats('reading',3);assert.equal(l.state.points,20);});
await test('10 concurrent identical nonces credit exactly one interval',async()=>{const l=ledger('concurrent');await l.call('start');await l.pulse('reading');l.advance();const commands=Array.from({length:10},()=>l.command('pulse','reading'));const responses=await Promise.all(commands.map(c=>redis(c)));assert(responses.every(r=>r[0]==='ok'));const state=JSON.parse(await redis(['GET',l.key]));assert.equal(state.day.readingMs,15000);assert.equal(state.points,0);});
await test('early pulse, stale token, long gaps and pause/resume never credit extra',async()=>{const l=ledger('clock');await l.call('start');await l.pulse('reading');const token=l.state.pulse.nonce;l.advance(14999);await l.pulse('reading');assert.equal(l.state.day.readingMs,0);assert.equal(l.state.pulse.nonce,token);l.advance(1);await l.pulse('reading');assert.equal(l.state.day.readingMs,15000);await l.call('pulse','reading',true,token);assert.equal(l.state.day.readingMs,15000);l.advance(30001);await l.pulse('reading');assert.equal(l.state.day.readingMs,15000);l.advance(20000);await l.pulse('reading');assert.equal(l.state.day.readingMs,30000);l.advance(15000);await l.pulse('reading',false);assert.equal(l.state.day.readingMs,30000);l.advance(15000);await l.pulse('reading');assert.equal(l.state.day.readingMs,30000);l.advance(15000);await l.pulse('reading');assert.equal(l.state.day.readingMs,45000);});
await test('day rollover discards overnight time, resets tasks, preserves balance',async()=>{const l=ledger('rollover');await l.call('start');await l.pulse('reading');await l.beats('reading',8);l.now=Date.parse('2026-11-01T03:00:01Z');await l.pulse('reading');assert.equal(l.state.day.date,'2026-11-01');assert.equal(l.state.day.readingMs,0);assert.equal(l.state.day.points,0);assert.equal(l.state.points,20);await l.beats('reading',8);assert.equal(l.state.points,40);assert.equal(l.state.streak,2);});
await test('all three tasks give 60 points; two eligible areas needed',async()=>{const l=ledger('daily');await l.call('start');await l.pulse('liturgy');await l.beats('liturgy',12);assert.equal(l.state.points,40);assert.equal(l.state.day.exploreMs,0);await l.pulse('map');await l.beats('map',6);assert.equal(l.state.day.exploreMs,90000);assert.equal(l.state.points,40);await l.pulse('arcs');await l.beats('arcs',1);assert.equal(l.state.points,60);assert.equal(l.state.activeDays,1);assert.equal(Object.keys(l.state.day.areas).length,2);});
await test('seven nonconsecutive active days yield one 80-point bonus, streak resets',async()=>{const l=ledger('nonconsecutive');await l.call('start');for(let i=0;i<7;i++){l.now=Date.parse('2026-10-31T12:00:00Z')+i*2*86400000;await l.pulse('reading');await l.beats('reading',8);}assert.equal(l.state.activeDays,7);assert.equal(l.state.points,220);assert.equal(l.state.day.points,100);assert.equal(l.state.streak,1);assert.equal(l.state.longestStreak,1);});
await test('60 best-effort days=4240; milestone first reached on day68 at4800',async()=>{const l=ledger('milestone');await l.call('start');for(let i=0;i<68;i++){l.now=Date.parse('2026-10-31T12:00:00Z')+i*86400000;await allTasks(l);assert(l.state.day.points<=140);if(i===59){assert.equal(l.state.points,4240);assert.equal(await redis(['ZSCORE',l.keys()[2],l.id]),null);}if(i===66)assert.equal(await redis(['ZSCORE',l.keys()[2],l.id]),null);}assert.equal(l.state.points,4800);assert.equal(l.state.activeDays,68);assert.notEqual(await redis(['ZSCORE',l.keys()[2],l.id]),null);assert.equal(l.state.streak,68);const ttl=await redis(['TTL',l.key]);assert(ttl<=31536000&&ttl>31535900);await l.call('reset');assert.equal(await redis(['GET',l.key]),null);assert.equal(await redis(['ZSCORE',l.keys()[1],l.id]),null);assert.equal(await redis(['ZSCORE',l.keys()[2],l.id]),null);});
await test('server clock rollback fails closed',async()=>{const l=ledger('rollback');await l.call('start');l.advance(-1);const response=await redis(l.command('pulse','reading'));assert.equal(response[0],'unavailable');assert.equal(JSON.parse(await redis(['GET',l.key])).points,0);});
await test('per-minute cap enforced before mutation',async()=>{const l=ledger('limit');await l.call('start');for(let i=0;i<23;i++)await l.call('status');const response=await redis(l.command('status'));assert.equal(response[0],'limit');});
await test('interlinear counts exploration only; landing page never earns reading points',async()=>{const l=ledger('interlinear');await l.call('start');await l.pulse('interlinear');await l.beats('interlinear',12);assert.equal(l.state.day.readingMs,0);assert.equal(l.state.day.exploreMs,90000);assert.equal(l.state.points,0);await l.pulse('map');await l.beats('map',1);assert.equal(l.state.points,20);});
await test('both indexes expire and prune profiles older than365days',async()=>{const l=ledger('pruning');await l.call('start');for(const index of [l.keys()[1],l.keys()[2]])await redis(['ZADD',index,l.now-31536000000,'old-profile']);l.advance();await l.call('status');for(const index of [l.keys()[1],l.keys()[2]]){assert.equal(await redis(['ZSCORE',index,'old-profile']),null);const ttl=await redis(['TTL',index]);assert(ttl===-2||(ttl>31535900&&ttl<=31536000));}});
// Clean only exact keys under this test's random prefix; never FLUSHDB/KEYS or cloud data.
let cursor='0',cleaned=0;do{const [next,keys]=await redis(['SCAN',cursor,'MATCH',`${prefix}*`,'COUNT',200]);cursor=next;if(keys.length){cleaned+=await redis(['DEL',...keys]);}}while(cursor!=='0');
const report={at:new Date().toISOString(),scope:'Loopback Redis; actual production Lua with injected server clock. No HTTP auth or browser activity proof. No production data.',redisVersion:/redis_version:([^\r\n]+)/.exec(info)?.[1],luaSha256:createHash('sha256').update(JOURNEY_LUA).digest('hex'),cleaned,results};
if(output)writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({pass:results.filter(r=>r.pass).length,total:results.length,output}));
if(results.some(r=>!r.pass))process.exitCode=1;
