import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

test('dynamic chunks and addon share one player bootstrap; renamed entry reproduces double startup',async()=>{
 const source=readFileSync(new URL('../../ui/src/player-extensions/entry.template.mjs',import.meta.url),'utf8');
 const target=source.match(/import \{R as RendererLite\} from '(\.\.\/[^']+)'/)[1].slice(3);
 async function boot(entryName){
  const root=mkdtempSync(join(tmpdir(),'pwa-entry-'));
  try{
   writeFileSync(join(root,'package.json'),'{"type":"module"}');
   writeFileSync(join(root,'state.js'),'export const boots=[];');
   writeFileSync(join(root,'main-C9EoR7Jo.js'),"import {boots} from './state.js'; export class R{}; boots.push(import.meta.url); export const loadCore=()=>import('./core.js');");
   copyFileSync(join(root,'main-C9EoR7Jo.js'),join(root,'main-viewport-v1.js'));
   writeFileSync(join(root,'core.js'),"import {R} from './main-C9EoR7Jo.js'; export const renderer=R;");
   const player=await import(pathToFileURL(join(root,entryName)));await player.loadCore();
   return (await import(pathToFileURL(join(root,'state.js')))).boots.length;
  }finally{rmSync(root,{recursive:true,force:true});}
 }
 assert.equal(await boot('main-viewport-v1.js'),2,'renaming the Vite entry reproduces the production failure');
 assert.equal(await boot(target),1,'addon must share the canonical entry used by dynamic chunks');
});
