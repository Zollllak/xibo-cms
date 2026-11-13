// Installed as assets/light-leak-v2/entry.mjs. Import the canonical Vite entry
// once: dynamic chunks already import this module. A renamed copy boots twice.
import {R as RendererLite} from '../main-C9EoR7Jo.js';
import {installViewportFix} from './player-extensions/viewportPwa.mjs';
import {installLightLeakPwa} from './player-extensions/lightLeakPwa.mjs';
installViewportFix(RendererLite);
installLightLeakPwa(RendererLite);
// Keep the SOAP fault actionable without logging request bodies/credentials.
const request=window.fetch.bind(window);
window.fetch=async (...args)=>{
 const response=await request(...args);
 const url=String(args[0]?.url||args[0]);
 if(!response.ok&&url.includes('xmds.php')&&url.includes('RegisterDisplay')){
  try{
   const xml=new DOMParser().parseFromString(await response.clone().text(),'text/xml');
   const fault=[...xml.getElementsByTagName('*')].find(node=>node.localName==='faultstring');
   if(fault)console.error('[PWA] CMS registration rejected: '+fault.textContent.slice(0,300));
  }catch{}
 }
 return response;
};
