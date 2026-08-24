import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';

const port=20000+Math.floor(Math.random()*1000);
const origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['dist-server/index.js'],{
  env:{...process.env,PORT:String(port)},
  stdio:['ignore','pipe','pipe']
});

let stderr='';
child.stderr.on('data',chunk=>{stderr+=String(chunk)});

async function waitForHealth(){
  for(let attempt=0;attempt<40;attempt++){
    if(child.exitCode!==null)throw new Error(`server exited early (${child.exitCode})\n${stderr}`);
    try{
      const response=await fetch(`${origin}/api/health`);
      if(response.ok)return response;
    }catch{}
    await sleep(150);
  }
  throw new Error(`server did not become healthy\n${stderr}`);
}

try{
  const health=await waitForHealth();
  const payload=await health.json();
  if(payload.status!=='ok'||payload.service!=='threadline')throw new Error(`unexpected health payload: ${JSON.stringify(payload)}`);

  const missing=await fetch(`${origin}/api/__smoke_missing__`);
  if(missing.status!==404)throw new Error(`expected API 404, received ${missing.status}`);
  const contentType=missing.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))throw new Error(`expected JSON API 404, received ${contentType}`);

  console.log('✓ Threadline production server smoke test passed');
}finally{
  if(child.exitCode===null)child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve=>child.once('exit',resolve)),
    sleep(2000)
  ]);
}
