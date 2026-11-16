import {requestBookOpen} from '../src/state/open-requests';
import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {LibrarySession,type LibrarySessionState} from '../src/ui/LibrarySession';
import {ReadingWorkspace} from '../src/state/workspace';
import {openBook} from '../src/readers/book';
import {store} from '../src/state/storage';
import {pdfFixture} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('global tab manifest restores absolute files while routing reading data and statistics to each origin',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ler-workspace-'))),app=path.join(root,'app'),a=path.join(root,'A'),b=path.join(root,'B');let workspace:ReadingWorkspace|undefined;
 try{
  for(const dir of [a,b])await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(a,'Same.txt'),'Alpha');await fs.writeFile(path.join(b,'Same.txt'),'Beta');
  const ids:string[]=[];
  for(const dir of [a,b]){const disk=await store(dir,app),book=await openBook(path.join(dir,'Same.txt'));ids.push(book.id);disk.state.books[book.id]={file:'Same.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};disk.state.tabs=[book.id];await disk.save();book.close();await disk.close();}
  const first=await store(a,app);workspace=new ReadingWorkspace({root:a,state:first.state,persistence:first},app,[]);
  await workspace.select(b);workspace.bindBook(ids[1],path.join(b,'Same.txt'));workspace.state.tabs=[...ids];
  workspace.state.books[ids[0]].bookmarks.push({anchor:{chapter:0,block:0,offset:0},excerpt:'Alpha',date:new Date().toISOString()});
  workspace.state.books[ids[0]].reading={seconds:42,days:{},chapters:{}};await workspace.save();
  const aState=JSON.parse(await fs.readFile(path.join(first.directory,'state.json'),'utf8'));
  expect(aState.books[ids[0]].file).toBe('Same.txt');expect(aState.books[ids[0]].reading.seconds).toBe(42);expect(aState.books[ids[1]]).toBeUndefined();
  expect(workspace.libraryState.books[ids[0]]).toBeUndefined();expect(workspace.state.books[ids[0]].file).toBe(path.join(a,'Same.txt'));
  await workspace.close();workspace=undefined;
  const second=await store(b,app);workspace=new ReadingWorkspace({root:b,state:second.state,persistence:second},app,[]);await workspace.restore();expect(workspace.state.tabs).toEqual(ids);expect(workspace.state.books[ids[0]].file).toBe(path.join(a,'Same.txt'));expect(workspace.root).toBe(b);
  await workspace.close();await expect(workspace.select(a)).rejects.toThrow('closed');workspace=undefined;
 }finally{await workspace?.close();await fs.rm(root,{recursive:true,force:true});}
});

test('tabs survive library switching, same names remain distinct and edits go to the original book',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ler-global-tabs-'))),app=path.join(root,'app'),a=path.join(root,'A'),b=path.join(root,'B');let setup:Awaited<ReturnType<typeof testRender>>|undefined;let current:LibrarySessionState|undefined;
 try{
  for(const dir of [a,b])await fs.mkdir(dir,{recursive:true});const alphaFile=path.join(a,'Same.txt'),betaFile=path.join(b,'Same.txt');await fs.writeFile(alphaFile,'Alpha first.\nAlpha second.');await fs.writeFile(betaFile,'Beta first.\nBeta second.');await fs.writeFile(path.join(b,'Copy.txt'),await fs.readFile(alphaFile));
  const ids:string[]=[];
  for(const dir of [a,b]){const disk=await store(dir,app),book=await openBook(path.join(dir,'Same.txt'));ids.push(book.id);disk.state.lang='en';disk.state.books[book.id]={file:'Same.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};disk.state.tabs=[book.id];await disk.save();book.close();await disk.close();}
  const disk=await store(a,app);current={root:a,state:disk.state,persistence:disk,opened:[]};setup=await testRender(()=><LibrarySession {...current!} appDirectory={app} exit={async()=>{}} onSessionChange={value=>{current=value;}}/>,{width:160,height:30});
  for(let i=0;i<100&&!current.opened.length;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);setup.mockInput.pressKey('F6');await setup.renderOnce();setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('down');setup.mockInput.pressKey('b');
  const original=current.opened[0];
  async function command(value:string){setup!.mockInput.pressKey('F2');await setup!.renderOnce();await setup!.mockInput.typeText(value);setup!.mockInput.pressEnter();await Bun.sleep(30);await setup!.renderOnce();}
  await command('change-library '+b);for(let i=0;i<100&&current.opened.length<2;i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(current.opened[0]).toBe(original);expect(current.state.tabs).toEqual(ids);expect(setup.captureCharFrame()).toContain('A · Same');expect(setup.captureCharFrame()).toContain('B · Same');
  await command('switch 1');expect(setup.captureCharFrame()).toContain('Alpha second.');setup.mockInput.pressKey('v');setup.mockInput.pressArrow('right',{shift:true});setup.mockInput.pressKey('s',{ctrl:true});await command('info');expect(setup.captureCharFrame()).toContain(alphaFile);
  await command('save');const aState=JSON.parse(await fs.readFile(path.join(disk.directory,'state.json'),'utf8'));expect(aState.books[ids[0]].highlights.length).toBe(1);expect(aState.books[ids[0]].bookmarks.length).toBe(1);expect(aState.books[ids[0]].anchor.block).toBe(1);
  setup.mockInput.pressKey('F5');await setup.renderOnce();await requestBookOpen(disk.directory,alphaFile);for(let i=0;i<100&&!setup.captureCharFrame().includes('Alpha second.');i++){await Bun.sleep(10);await setup.renderOnce();}expect(setup.captureCharFrame()).toContain('Alpha second.');
  await command('switch 2');expect(setup.captureCharFrame()).toContain('Beta first.');await command('info');expect(setup.captureCharFrame()).toContain(betaFile);
  setup.mockInput.pressKey('F5');await setup.renderOnce();await setup.mockInput.typeText('Copy');for(let i=0;i<100&&!setup.captureCharFrame().includes('Copy.txt');i++){await Bun.sleep(10);await setup.renderOnce();}setup.mockInput.pressEnter();await Bun.sleep(30);await setup.renderOnce();expect(current.state.tabs.length).toBe(2);await command('info');expect(setup.captureCharFrame()).toContain(alphaFile);
  await command('close');expect(current.state.tabs).toEqual([ids[1]]);await command('save');
  const manifest=JSON.parse(await fs.readFile(path.join(app,'.ler/workspace.json'),'utf8'));expect(manifest.tabs.map((row:{id:string})=>row.id)).toEqual([ids[1]]);
 }finally{await setup?.dispose();current?.opened.forEach(book=>book.close());await current?.persistence?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);

test('a missing restored file reports an error without deleting its saved reading data or closing other books',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ler-global-missing-'))),app=path.join(root,'app'),a=path.join(root,'A'),b=path.join(root,'B');let setup:Awaited<ReturnType<typeof testRender>>|undefined;let current:LibrarySessionState|undefined;let workspace:ReadingWorkspace|undefined;
 try{
  for(const dir of [a,b])await fs.mkdir(dir,{recursive:true});const ids:string[]=[];
  for(const [dir,text] of [[a,'Missing book.'],[b,'Surviving book.']]){await fs.writeFile(path.join(dir,'Book.txt'),text);const disk=await store(dir,app),book=await openBook(path.join(dir,'Book.txt'));ids.push(book.id);disk.state.lang='en';disk.state.books[book.id]={file:'Book.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[{anchor:{chapter:0,block:0,offset:0},excerpt:text,date:new Date().toISOString()}]};disk.state.tabs=[book.id];await disk.save();await disk.close();book.close();}
  const first=await store(a,app);workspace=new ReadingWorkspace({root:a,state:first.state,persistence:first},app,[]);await workspace.select(b);workspace.state.tabs=[...ids];await workspace.save();await workspace.close();workspace=undefined;await fs.unlink(path.join(a,'Book.txt'));
  const second=await store(b,app);current={root:b,state:second.state,persistence:second,opened:[]};setup=await testRender(()=><LibrarySession {...current!} appDirectory={app} exit={async()=>{}} onSessionChange={value=>{current=value;}}/>,{width:140,height:30});
  for(let i=0;i<100&&!current.opened.length;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(30);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('ENOENT');expect(current.opened.map(book=>book.id)).toEqual([ids[1]]);await current.persistence?.save();
  const saved=JSON.parse(await fs.readFile(path.join(first.directory,'state.json'),'utf8'));expect(saved.books[ids[0]].bookmarks.length).toBe(1);
 }finally{await workspace?.close();await setup?.dispose();current?.opened.forEach(book=>book.close());await current?.persistence?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);

test('an open PDF remains usable after switching the library and its worker closes with the tab',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ler-global-pdf-'))),app=path.join(root,'app'),a=path.join(root,'A'),b=path.join(root,'B');let setup:Awaited<ReturnType<typeof testRender>>|undefined;let current:LibrarySessionState|undefined;
 try{
  for(const dir of [a,b])await fs.mkdir(dir,{recursive:true});const file=path.join(a,'Document.pdf');await fs.writeFile(file,pdfFixture());const metadata=await openBook(file),id=metadata.id;metadata.close();const disk=await store(a,app);disk.state.lang='en';disk.state.books[id]={file:'Document.pdf',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};disk.state.tabs=[id];current={root:a,state:disk.state,persistence:disk,opened:[]};
  setup=await testRender(()=><LibrarySession {...current!} appDirectory={app} exit={async()=>{}} onSessionChange={value=>{current=value;}}/>,{width:100,height:30});for(let i=0;i<100&&!current.opened.length;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);const pdf=current.opened[0];
  setup.mockInput.pressKey('F2');await setup.renderOnce();await setup.mockInput.typeText('change-library '+b);setup.mockInput.pressEnter();await Bun.sleep(50);await setup.renderOnce();expect(current.root).toBe(b);expect((await pdf.resource('page/1')).length).toBeGreaterThan(0);
  setup.mockInput.pressKey('F6');await setup.renderOnce();setup.mockInput.pressKey('F4');await setup.renderOnce();await expect(pdf.resource('page/0')).rejects.toThrow('closed');
 }finally{await setup?.dispose();current?.opened.forEach(book=>book.close());await current?.persistence?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
