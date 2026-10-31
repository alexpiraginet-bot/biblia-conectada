import {createConnection} from 'node:net';
/** QA-only RESP2 connection to an isolated loopback Redis, never a cloud credential or project dependency. */
export function localRedis(command) {
 const port = Number(process.env.JOURNEY_QA_REDIS_PORT || 6389);
 if (!Number.isInteger(port) || port < 1024 || port > 65535) return Promise.reject(new Error('JOURNEY_QA_REDIS_PORT must be an integer between 1024 and 65535'));
 return new Promise((resolve,reject)=>{
  const socket=createConnection({host:'127.0.0.1',port});let accumulated=Buffer.alloc(0);let finished=false;
  const done=(error,result)=>{if(finished)return;finished=true;socket.destroy();if(error)reject(error);else resolve(result);};
  socket.setTimeout(6000,()=>done(new Error('Local QA Redis timeout')));socket.on('error',done);
  socket.on('connect',()=>{const parts=[Buffer.from(`*${command.length}\r\n`)];for(const item of command){const b=Buffer.from(String(item));parts.push(Buffer.from(`$${b.length}\r\n`),b,Buffer.from('\r\n'));}socket.write(Buffer.concat(parts));});
  socket.on('data',buffer=>{accumulated=Buffer.concat([accumulated,buffer]);try{const parsed=parse(accumulated,0);if(parsed)done(null,parsed.value);}catch(e){done(e);}});
 });
}
function parse(buffer,offset) {
 if(offset>=buffer.length)return null;const marker=String.fromCharCode(buffer[offset]);const lineEnd=buffer.indexOf('\r\n',offset+1);if(lineEnd<0)return null;
 const value=buffer.toString('utf8',offset+1,lineEnd);let next=lineEnd+2;
 if(marker==='+')return{value,next};if(marker==='-')throw new Error(`Local Redis: ${value}`);if(marker===':')return{value:Number(value),next};
 if(marker==='$'){const length=Number(value);if(length===-1)return{value:null,next};if(buffer.length<next+length+2)return null;return{value:buffer.toString('utf8',next,next+length),next:next+length+2};}
 if(marker==='*'){const length=Number(value);if(length===-1)return{value:null,next};const array=[];for(let i=0;i<length;i++){const result=parse(buffer,next);if(!result)return null;array.push(result.value);next=result.next;}return{value:array,next};}
 throw new Error(`Unknown RESP marker ${marker}`);
}
