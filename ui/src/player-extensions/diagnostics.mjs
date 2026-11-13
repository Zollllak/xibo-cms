// GNU AGPL-3.0-or-later. Read-only diagnosis of the current PWA profile.
import {diagnosticRedactor,diagnosticEnvelope} from './diagnosticSafety.mjs';
const output=document.querySelector('#report'),status=document.querySelector('#status'),frame=document.querySelector('iframe');
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return {};}};
const legacy=read('xibo_config'),active=localStorage.getItem('xibo_active_cms'),current=active?read('xibo_cms:'+active):{};
const config={...legacy,...current};config.cmsAddress ||= config.cmsUrl;
const redact=diagnosticRedactor([legacy,current,config]),events=[];
const report={version:1,display:config.displayName||'(sem nome)',configured:!!(config.cmsAddress&&config.cmsKey&&config.hardwareKey),browser:navigator.userAgent,controlled:!!navigator.serviceWorker?.controller,events};
const render=()=>{output.textContent=JSON.stringify(report,null,2);};
window.addEventListener('message',event=>{
 if(event.source!==frame.contentWindow||event.data?.kind!=='xibo-diagnostic')return;
 if(events.length<15)events.push(redact(event.data.message).slice(0,400));render();
});
render();
try{
 const html=await(await fetch('./index.html?diagnostic=1',{cache:'no-store'})).text();
 // Install error listeners before the unmodified production entry executes.
 const hook=`<base href="${new URL('./',location.href).href}"><script>const diag=m=>parent.postMessage({kind:'xibo-diagnostic',message:m},${JSON.stringify(location.origin)});window.addEventListener('error',e=>diag(e.message||'Resource failed: '+(e.target?.src||e.target?.href||e.target?.tagName)),true);window.addEventListener('unhandledrejection',e=>diag(String(e.reason)));const original=console.error;console.error=(...a)=>{diag(a.map(x=>x?.message||String(x)).join(' '));original.apply(console,a)};<\/script>`;
 frame.srcdoc=html.replace(/<head[^>]*>/i,match=>match+hook);
}catch(error){events.push(redact(error.message));}
await new Promise(resolve=>setTimeout(resolve,18000));
try{
 const doc=frame.contentDocument;
 report.dom={regions:doc.querySelectorAll('.renderer-lite-region').length,images:[...doc.images].slice(0,4).map(image=>({loaded:image.complete&&image.naturalWidth>0,opacity:getComputedStyle(image).opacity,visibility:getComputedStyle(image).visibility,src:new URL(image.src).pathname})),frames:doc.querySelectorAll('iframe').length,bodyText:redact(doc.body.innerText).slice(0,250)};
 const cache=await caches.open('xibo-media-v1');const keys=await cache.keys();
 report.cache={layouts:keys.filter(r=>r.url.includes('/cache/layout/')).length,media:keys.filter(r=>r.url.includes('/cache/media/')).length,widgets:keys.filter(r=>r.url.includes('/cache/widget/')).length};
}catch(error){events.push(redact(error.message));}
render();
if(report.configured&&new URL(config.cmsAddress).origin===location.origin){
 try{
  const response=await fetch(new URL('/xmds.php?v=5&method=SubmitLog',location.origin),{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8'},body:diagnosticEnvelope(config,redact(JSON.stringify(report)))});
  status.textContent=response.ok?'Diagnóstico enviado ao CMS. Pode avisar que terminou.':'Diagnóstico pronto; envio ao CMS falhou (HTTP '+response.status+'). Informe a mensagem abaixo.';
 }catch{status.textContent='Sem conexão com o CMS. Informe a mensagem abaixo.';}
}else status.textContent='Este navegador não tem cadastro válido para este CMS. Não foi criado outro cadastro.';
