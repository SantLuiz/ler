import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import {store,knownLibraryRoot} from '../src/state/storage';
import {requestBookOpen,consumeBookRequests} from '../src/state/open-requests';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('known libraries preserve an external root when opening books in its subfolders',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-known-library-'));const app=path.join(root,'app');const library=path.join(root,'books');
 try{await fs.mkdir(path.join(library,'category'),{recursive:true});const disk=await store(library,app);await disk.close();expect(await knownLibraryRoot(path.join(library,'category/book.txt'),app)).toBe(library);expect(await knownLibraryRoot(path.join(root,'unrelated.txt'),app)).toBeUndefined();}finally{await fs.rm(root,{recursive:true,force:true});}
});

test('open requests are consumed once and invalid, stale or unsupported requests do not open files',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ler-open-queue-'));const files:string[]=[];
 try{
  const file=path.join(directory,'book.txt');await requestBookOpen(directory,file);
  const queue=path.join(directory,'open-requests');await fs.writeFile(path.join(queue,'dead.json'),JSON.stringify({file,created:Date.now()-180000}));await fs.writeFile(path.join(queue,'bad.json'),'{');await fs.writeFile(path.join(queue,'fade.json'),JSON.stringify({file:path.join(directory,'run.exe'),created:Date.now()}));
  await consumeBookRequests(directory,async f=>{files.push(f);});await consumeBookRequests(directory,async f=>{files.push(f);});expect(files).toEqual([file]);expect(await fs.readdir(queue)).toEqual([]);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('direct file opening restores its position and another launch forwards to the running library',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-open-file-'));const app=path.resolve(import.meta.dir,'..');const opened:Book[]=[];
 let disk:Awaited<ReturnType<typeof store>>|undefined;let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  const first=path.join(root,'First.txt');const second=path.join(root,'Second.txt');await fs.writeFile(first,'First book content.');await fs.writeFile(second,'Opening paragraph.\nSaved position in second book.');
  disk=await store(root,app);const state=disk.state;state.lang='en';const ids:string[]=[];
  for(const [file,block] of [[first,0],[second,1]] as const){const b=await openBook(file);ids.push(b.id);state.books[b.id]={file:path.basename(file),anchor:{chapter:0,block,offset:0},bookmarks:[]};b.close();}state.tabs=[ids[0]];
  setup=await testRender(()=><App root={root} initialFile={second} state={state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&!setup.captureCharFrame().includes('Saved position in second book.');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('Saved position in second book.');expect(setup.captureCharFrame()).not.toContain('Opening paragraph.');expect(state.tabs.length).toBe(2);
  const compiled=import.meta.path.endsWith('.js');
  const child=Bun.spawn([process.execPath,'--preload',path.join(app,`scripts/preload.${compiled?'js':'ts'}`),path.join(app,`src/main.${compiled?'js':'tsx'}`),'--lang','en','--library',root,'--open',first],{cwd:root,stdout:'pipe',stderr:'pipe'});
  const output=await new Response(child.stdout).text();expect(await child.exited).toBe(0);expect(output).toContain('Sent file to the running LER');
  for(let i=0;i<150&&!setup.captureCharFrame().includes('First book content.');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('First book content.');expect(state.tabs.length).toBe(2);
 }finally{await setup?.dispose();opened.forEach(b=>b.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
