import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const app=express();
const port=Number(process.env.PORT||8788);

app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));

app.get('/api/health',(_req,res)=>res.json({
  status:'ok',
  service:'threadline',
  auth:process.env.VITE_FIREBASE_PROJECT_ID?'firebase':'demo',
  timestamp:new Date().toISOString()
}));

const here=path.dirname(fileURLToPath(import.meta.url));
const client=path.resolve(here,'../dist');
app.use(express.static(client,{maxAge:'1h',etag:true}));
app.get(/.*/,(_req,res)=>res.sendFile(path.join(client,'index.html')));

app.listen(port,'0.0.0.0',()=>console.log(`Threadline listening on ${port}`));
