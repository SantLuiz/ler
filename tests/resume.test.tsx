import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/app';
import {openBook,type Book} from '../src/book';
import {store} from '../src/storage';
import {zip} from './fixtures';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('continue reopens the last book at its saved position after closing the tab and restarting',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-resume-'));const opened:Book[]=[];let setup:Awaited<ReturnType<typeof testRender>>|undefined;let disk:Awaited<ReturnType<typeof store>>|undefined;
 try{
  await fs.writeFile(path.join(root,'resume.epub'),zip({'META-INF/container.xml':'<container><rootfile full-path="book.opf"/></container>','book.opf':'<package><metadata><dc:title>Resume test</dc:title></metadata><manifest><item id="a" href="a.xhtml"/></manifest><spine><itemref idref="a"/></spine></package>','a.xhtml':'<body><h1>Opening heading</h1><p>Opening text</p><h2 id="resume">Saved passage</h2><p>Continue from here.</p></body>'}));
  const book=await openBook(path.join(root,'resume.epub'));const id=book.id;book.close();disk=await store(root,path.join(root,'LER'));disk.state.lang='en';disk.state.books[id]={file:'resume.epub',anchor:{chapter:0,block:2,offset:0},bookmarks:[]};disk.state.lastRead=id;disk.state.tabs=[];
  async function start(){setup=await testRender(()=><App root={root} state={disk!.state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:100,height:30});await Bun.sleep(25);await setup.renderOnce();}
  async function resume(command:string){await setup!.mockInput.typeText(command);setup!.mockInput.pressEnter();for(let i=0;i<100&&!setup!.captureCharFrame().includes('Saved passage');i++){await Bun.sleep(10);await setup!.renderOnce();}expect(setup!.captureCharFrame()).toContain('Saved passage');expect(setup!.captureCharFrame()).not.toContain('Opening heading');}
  await start();await resume('/continuar');expect(disk.state.tabs).toEqual([id]);
  setup!.mockInput.pressEscape();await Bun.sleep(50);await setup!.renderOnce();expect(disk.state.tabs).toEqual([]);expect(disk.state.books[id].anchor.block).toBe(2);await resume('/continue');expect(disk.state.tabs).toEqual([id]);
  setup!.mockInput.pressKey('F4');await setup!.renderOnce();await disk.save();await setup!.dispose();setup=undefined;await disk.close();disk=await store(root,path.join(root,'LER'));await start();await resume('/continuar');expect(disk.state.tabs).toEqual([id]);
  setup!.mockInput.pressKey('F5');await setup!.renderOnce();await resume('/continue');expect(disk.state.tabs).toEqual([id]);
 }finally{await setup?.dispose();opened.forEach(book=>book.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);

test('continue explains when the library has no saved reading',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-no-resume-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{setup=await testRender(()=><App root={root} state={{version:1,books:{},tabs:[],lang:'pt-BR'}} opened={[]} exit={async()=>{}}/>,{width:80,height:25});await Bun.sleep(20);await setup.renderOnce();await setup.mockInput.typeText('/continuar');setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Nenhuma leitura salva nesta biblioteca.');}finally{await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
