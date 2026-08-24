import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const app=express();
const port=Number(process.env.PORT||8788);

app.disable('x-powered-by');
app.use((_req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({limit:'1mb'}));
app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next()});

app.get('/api/health',(_req,res)=>res.json({
  status:'ok',
  service:'threadline',
  auth:process.env.VITE_FIREBASE_PROJECT_ID?'firebase':'demo',
  timestamp:new Date().toISOString()
}));

app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found'}));

const here=path.dirname(fileURLToPath(import.meta.url));
const client=path.resolve(here,'../dist');

app.use('/assets',express.static(path.join(client,'assets'),{maxAge:'1y',immutable:true}));
app.use(express.static(client,{maxAge:0,index:false}));
app.get(/.*/,(_req,res)=>res.sendFile(path.join(client,'index.html'),{headers:{'Cache-Control':'no-cache'}}));

const server=app.listen(port,'0.0.0.0',()=>console.log(`Threadline listening on ${port}`));
const shutdown=()=>server.close(()=>process.exit(0));
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
