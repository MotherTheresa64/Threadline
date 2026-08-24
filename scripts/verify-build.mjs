import {access,stat} from 'node:fs/promises';
import {constants} from 'node:fs';

const required=['dist/index.html','dist-server/index.js'];
let failed=false;

for(const file of required){
  try{
    await access(file,constants.R_OK);
    const info=await stat(file);
    if(!info.isFile()||info.size===0)throw new Error('missing or empty');
    console.log(`✓ ${file} (${info.size} bytes)`);
  }catch{
    failed=true;
    console.error(`✗ required build artifact missing or empty: ${file}`);
  }
}

if(failed)process.exit(1);
console.log('Threadline build artifacts verified.');
