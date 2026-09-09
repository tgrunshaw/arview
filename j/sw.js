const CACHE='scheme-j-ar-20260909-v1';
const FILES=['./','index.html','style.css','viewer.js','alignment.mjs','model-info.json','alignment-plan.svg','scheme-j-house.glb','scheme-j-siteworks.glb','vendor/three.module.min.js','vendor/three.core.min.js','vendor/GLTFLoader.js','vendor/OrbitControls.js','vendor/BufferGeometryUtils.js','vendor/THREE-LICENSE.txt'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{
 if(e.data.type!=='CACHE_OFFLINE')return;
 const port=e.ports[0];
 e.waitUntil((async()=>{try{const cache=await caches.open(CACHE);let n=0;for(const f of FILES){const req=new Request(new URL(f,self.registration.scope),{cache:'reload'});const response=await fetch(req);if(!response.ok)throw new Error('Could not download '+f);await cache.put(req,response);port.postMessage({progress:`Saving ${++n} of ${FILES.length} files…`});}port.postMessage({done:true});}catch(err){port.postMessage({error:'Offline save failed: '+err.message});}})());
});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;
 // Read current files online; use the explicitly saved copy when there is no connection.
 e.respondWith(fetch(e.request).catch(async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(e.request,{ignoreSearch:true});return hit||new Response('This file was not saved. Reconnect and choose Save for onsite use.',{status:503,headers:{'Content-Type':'text/plain'}});}));
});
