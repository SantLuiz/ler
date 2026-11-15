import {test,expect,spyOn} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import type {State} from '../src/state/storage';
import * as highlights from '../src/reading/highlights';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('search coalesces typing, Enter flushes pending input and leaving the book cancels pending searches',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-search-ui-')),opened:Book[]=[];
 const OriginalWorker=globalThis.Worker;const workers:Worker[]=[];let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 globalThis.Worker=class extends OriginalWorker{
  constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(String(url).includes('search.worker'))workers.push(this);}
 };
 try{
  const state:State={version:1,books:{},tabs:[],lang:'en'};
  for(const [file,text] of [['A.txt','First alpha.\nFind target ALPHA.'],['B.txt','First beta.\nFind target BETA.']]){
   await fs.writeFile(path.join(root,file),text);const book=await openBook(path.join(root,file));state.tabs.push(book.id);state.books[book.id]={file,anchor:{chapter:0,block:0,offset:0},bookmarks:[]};book.close();
  }
  setup=await testRender(()=><App root={root} state={state} opened={opened} exit={async()=>{}}/>,{width:110,height:28});
  for(let i=0;i<100&&opened.length<2;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);setup.mockInput.pressKey('F6');await setup.renderOnce();
  const openSearch=async()=>{setup!.mockInput.pressKey('F2');await setup!.renderOnce();await setup!.mockInput.typeText('search');setup!.mockInput.pressEnter();await setup!.renderOnce();};
  const until=async(check:()=>boolean)=>{for(let i=0;i<100&&!check();i++){await Bun.sleep(10);await setup!.renderOnce();}expect(check()).toBe(true);};
  await openSearch();await setup.mockInput.typeText('target');expect(workers.length).toBe(0);
  await until(()=>setup!.captureCharFrame().includes('1 · Find target ALPHA'));expect(workers.length).toBe(1);
  setup.mockInput.pressEscape();await setup.renderOnce();await openSearch();await setup.mockInput.typeText('ALPHA');setup.mockInput.pressEnter();
  await until(()=>!setup!.renderer.root.findDescendantById('command-box'));expect(workers.length).toBe(2);
  await openSearch();await setup.mockInput.typeText('alpha');setup.mockInput.pressKey('F5');await setup.renderOnce();await Bun.sleep(200);await setup.renderOnce();expect(workers.length).toBe(2);expect(setup.captureCharFrame()).toContain('Leitor Extremamente Reduzido');
  setup.mockInput.pressKey('F6');setup.mockInput.pressKey('F6');await setup.renderOnce();await openSearch();await setup.mockInput.typeText('beta');
  await until(()=>setup!.captureCharFrame().includes('1 · Find target BETA'));expect(setup.captureCharFrame()).not.toContain('Find target ALPHA');
  setup.mockInput.pressEscape();await setup.renderOnce();await openSearch();await setup.mockInput.typeText('target');const count=workers.length;await setup.dispose();setup=undefined;await Bun.sleep(200);expect(workers.length).toBe(count);
 }finally{await setup?.dispose();globalThis.Worker=OriginalWorker;opened.forEach(book=>book.close());await fs.rm(root,{recursive:true,force:true});}
},15000);

test('reading clock keeps accumulating time without recalculating highlighted lines each second',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-clock-render-')),opened:Book[]=[];
 let setup:Awaited<ReturnType<typeof testRender>>|undefined;const parts=spyOn(highlights,'lineParts');
 try{
  const file='Notes.txt';await fs.writeFile(path.join(root,file),'Visible highlighted passage.\nAnother paragraph.');const metadata=await openBook(path.join(root,file)),id=metadata.id;metadata.close();
  const state:State={version:1,lang:'en',tabs:[id],books:{[id]:{file,anchor:{chapter:0,block:0,offset:0},bookmarks:[],highlights:[{id:'mark',text:'Visible',start:{chapter:0,block:0,offset:0},end:{chapter:0,block:0,offset:7},date:new Date().toISOString()}]}}};
  setup=await testRender(()=><App root={root} state={state} opened={opened} exit={async()=>{}}/>,{width:100,height:28});
  for(let i=0;i<100&&!opened.length;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);setup.mockInput.pressKey('F6');await setup.renderOnce();await Bun.sleep(30);
  const before=parts.mock.calls.length;expect(before).toBeGreaterThan(0);await Bun.sleep(1150);await setup.renderOnce();
  expect(state.books[id].reading!.seconds).toBeGreaterThan(0.5);expect(parts.mock.calls.length).toBe(before);
  setup.mockInput.pressKey('F8');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Library statistics');
  for(let i=0;i<100&&!setup.captureCharFrame().includes('Highlights: 1');i++){await Bun.sleep(10);await setup.renderOnce();}expect(setup.captureCharFrame()).toContain('Highlights: 1');
 }finally{await setup?.dispose();parts.mockRestore();opened.forEach(book=>book.close());await fs.rm(root,{recursive:true,force:true});}
},15000);
