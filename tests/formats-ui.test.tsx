import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {ImageRenderable} from '@opentui/core';
import {App} from '../src/app';
import {openBook,type Book} from '../src/book';
import {store} from '../src/storage';
import {pdfFixture} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('TXT search and PDF images, page navigation, zoom, bookmarks and Esc resume work through the interface',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-formats-ui-'));const opened:Book[]=[];
 let setup:Awaited<ReturnType<typeof testRender>>|undefined;let disk:Awaited<ReturnType<typeof store>>|undefined;
 try {
  await fs.writeFile(path.join(root,'Notas.txt'),'Primeira anotação\nSegunda anotação\nTrecho encontrado para retomar.');await fs.writeFile(path.join(root,'Documento.pdf'),pdfFixture());
  disk=await store(root,path.join(root,'LER'));disk.state.lang='en';disk.state.preferences={background:'#101114',foreground:'#d6d6d6',readingWidth:88,imagePercent:80,lineGap:0,protocol:'blocks'};
  const ids:string[]=[];
  for(const file of ['Notas.txt','Documento.pdf']){const book=await openBook(path.join(root,file));ids.push(book.id);disk.state.books[book.id]={file,anchor:{chapter:0,block:0,offset:0},bookmarks:[]};book.close();}disk.state.tabs=[...ids];
  setup=await testRender(()=><App root={root} state={disk!.state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<200&&opened.length<2;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);
  expect(opened.length).toBe(2);setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Primeira anotação');
  setup.mockInput.pressKey('/');await setup.renderOnce();await setup.mockInput.typeText('Trecho encontrado');
  for(let i=0;i<100&&!setup.captureCharFrame().includes('1 · Trecho encontrado');i++){await Bun.sleep(10);await setup.renderOnce();}
  setup.mockInput.pressEnter();await setup.renderOnce();setup.mockInput.pressKey('b');setup.mockInput.pressEscape();await Bun.sleep(50);await setup.renderOnce();
  expect(disk.state.books[ids[0]].anchor.block).toBe(2);expect(disk.state.books[ids[0]].bookmarks.length).toBe(1);
  setup.mockInput.pressKey('F6');await setup.renderOnce();
  async function imageWithWidth(width:number){
   for(let i=0;i<200;i++){await Bun.sleep(10);await setup!.renderOnce();const image=setup!.renderer.root.findDescendantById('pdf-page-image') as ImageRenderable|undefined;if(image?.image?.width===width)return image;}
   throw new Error('PDF page was not displayed');
  }
  let image=await imageWithWidth(720);expect(image.loadError).toBeNull();expect(setup.captureCharFrame()).toContain('1/2 · PDF · 100%');
  const fittedWidth=image.width;
  setup.mockInput.pressKey('+');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('150%');expect(image.width).toBeGreaterThan(fittedWidth);expect(image.crop?.width).toBe(720);expect(image.crop?.height).toBe(640);
  setup.mockInput.pressArrow('right');await setup.renderOnce();expect(image.crop!.left).toBe(0);
  setup.mockInput.pressKey('\x1b[6~');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('1/2 · PDF · 150% · band 2/2');expect(image.crop!.top).toBe(320);
  setup.mockInput.pressKey('\x1b[5~');await setup.renderOnce();expect(image.crop!.top).toBe(0);
  setup.mockInput.pressKey('\x1b[6~');setup.mockInput.pressKey('\x1b[6~');await setup.renderOnce();image=await imageWithWidth(960);expect(setup.captureCharFrame()).toContain('2/2 · PDF · 150%');
  setup.mockInput.pressKey('\x1b[5~');await setup.renderOnce();image=await imageWithWidth(720);expect(setup.captureCharFrame()).toContain('1/2 · PDF · 150% · band 2/2');expect(image.crop!.top).toBe(320);
  setup.mockInput.pressKey('0');await setup.renderOnce();expect(image.crop).toBeUndefined();
  setup.mockInput.pressKey('\x1b[6~');await setup.renderOnce();image=await imageWithWidth(960);expect(setup.captureCharFrame()).toContain('2/2 · PDF');
  setup.mockInput.pressKey('/');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('text search is unavailable');
  setup.mockInput.pressKey('b');setup.mockInput.pressEscape();await Bun.sleep(50);await setup.renderOnce();expect(disk.state.books[ids[1]].anchor.chapter).toBe(1);expect(disk.state.books[ids[1]].bookmarks.length).toBe(1);
  await setup.mockInput.typeText('/continue');setup.mockInput.pressEnter();await imageWithWidth(960);expect(setup.captureCharFrame()).toContain('2/2 · PDF');
  await disk.save();await setup.dispose();setup=undefined;await disk.close();disk=await store(root,path.join(root,'LER'));expect(disk.state.books[ids[1]].anchor.chapter).toBe(1);expect(disk.state.books[ids[0]].anchor.block).toBe(2);
 } finally {await setup?.dispose();opened.forEach(b=>b.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
