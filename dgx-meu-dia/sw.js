/* DGX Meu Dia PWA v0.5: atualiza a interface sem reinstalar APK. */
const CACHE="dgx-meu-dia-v05";
const STATIC=["/","/index.html","/features.js","/payments.js","/push_client.js","/spotify.js","/podcasts.js","/car_mode.js","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
});
self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(()=>caches.match(event.request))
  );
});

self.addEventListener("push",event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch(e){
    payload={title:"DGX Meu Dia",body:"Você tem um novo aviso."};
  }
  const title=String(payload.title||"DGX Meu Dia").slice(0,120);
  const body=String(payload.body||"Novo aviso").slice(0,220);
  const tag=String(payload.tag||"dgx-alert").slice(0,120);
  const route=String(payload.url||"/");
  const url=(route.startsWith("/")&&!route.startsWith("//"))?route:"/";
  event.waitUntil(self.registration.showNotification(title,{
    body,tag,icon:"/icon.svg",badge:"/icon.svg",
    renotify:false, data:{url},timestamp:Date.now()
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const route=event.notification.data?.url||"/";
  const target=new URL(route,self.location.origin);
  if(target.origin!==self.location.origin)return;
  event.waitUntil((async()=>{
    const tabs=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const tab of tabs){
      if(new URL(tab.url).origin===target.origin){
        await tab.focus();
        if("navigate" in tab)await tab.navigate(target.href);
        return;
      }
    }
    await clients.openWindow(target.href);
  })());
});
self.addEventListener("pushsubscriptionchange",event=>{
  event.waitUntil((async()=>{
    const old=event.oldSubscription;
    if(!old||!old.options?.applicationServerKey)return;
    const next=await self.registration.pushManager.subscribe({
      userVisibleOnly:true,applicationServerKey:old.options.applicationServerKey
    });
    await fetch("/api/push/subscribe",{method:"POST",credentials:"include",
      headers:{"Content-Type":"application/json"},body:JSON.stringify(next.toJSON())});
  })().catch(err=>console.warn("Falha na renovação de assinatura WebPush",err)));
});
