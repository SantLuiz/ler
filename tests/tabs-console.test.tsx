import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import type {State} from '../src/state/storage';
import {zip} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('restoring, switching and closing books with different chapter counts preserves each position',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-tabs-'));const opened:Book[]=[];let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try {
  const state:State={version:1,books:{},tabs:[],lang:'en'};
  for(const [name,count] of [['Long',3],['Short',1]] as const){
   const files:Record<string,string>={'META-INF/container.xml':'<container><rootfile full-path="book.opf"/></container>'};
   files['book.opf']=`<package><metadata><dc:title>${name}</dc:title></metadata><manifest>${Array.from({length:count},(_,i)=>`<item id="c${i}" href="c${i}.xhtml"/>`).join('')}</manifest><spine>${Array.from({length:count},(_,i)=>`<itemref idref="c${i}"/>`).join('')}</spine></package>`;
   for(let i=0;i<count;i++)files[`c${i}.xhtml`]=`<body><p>${name} chapter ${i+1}</p></body>`;
   const filename=path.join(root,`${name}.epub`);await fs.writeFile(filename,zip(files));const book=await openBook(filename);
   state.books[book.id]={file:path.basename(filename),anchor:{chapter:count-1,block:0,offset:0},bookmarks:[]};state.tabs.push(book.id);book.close();
  }
  setup=await testRender(()=><App root={root} state={state} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&opened.length<2;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);await setup.renderOnce();
  expect(opened.length).toBe(2);
  const longId=opened[0].id;
  setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Long chapter 3');
  setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Short chapter 1');
  setup.mockInput.pressKey('F5');setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Long chapter 3');
  setup.mockInput.pressKey('s');await setup.renderOnce();
  setup.mockInput.pressEscape();await Bun.sleep(50);await setup.renderOnce();expect(state.tabs.length).toBe(2);expect(setup.captureCharFrame()).toContain('Long chapter 3');
  setup.mockInput.pressEscape();await Bun.sleep(50);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Leitor Extremamente Reduzido');
  expect(state.tabs.length).toBe(1);expect(opened.length).toBe(1);expect(opened.some(b=>b.id===longId)).toBe(false);expect(state.books[longId].anchor.chapter).toBe(2);expect(state.lastRead).toBe(longId);
  setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Short chapter 1');
 } finally {await setup?.dispose();opened.forEach(b=>b.close());await fs.rm(root,{recursive:true,force:true});}
});

test('Esc dismisses the console and F12 toggles it without typing into the home search or exiting',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-console-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;let exits=0;
 try {
  setup=await testRender(()=><App root={root} state={{version:1,books:{},tabs:[],lang:'en'}} opened={[]} exit={async()=>{exits++;}}/>,{width:100,height:30});
  await Bun.sleep(20);await setup.renderOnce();await setup.mockInput.typeText('/he');
  setup.renderer.console.show();setup.mockInput.pressKey('x');setup.mockInput.pressEscape();await Bun.sleep(50);await setup.renderOnce();
  expect(setup.renderer.console.visible).toBe(false);expect(setup.captureCharFrame()).toContain('/he');expect(setup.captureCharFrame()).not.toContain('/hex');
  setup.mockInput.pressKey('F12');expect(setup.renderer.console.visible).toBe(true);
  setup.mockInput.pressKey('F12');expect(setup.renderer.console.visible).toBe(false);expect(exits).toBe(0);
 } finally {await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
