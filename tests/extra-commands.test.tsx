import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import {store} from '../src/state/storage';
import {paletteCommands,integerArgument} from '../src/ui/commands';
import {zip,pdfFixture} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('command availability follows the current book format and numeric arguments reject malformed values',()=>{
 const home=paletteCommands(false,false,false).map(c=>c.name);expect(home).toContain('/save');expect(home).not.toContain('/tabs');expect(home).not.toContain('/chapter');
 const text=paletteCommands(true,false,true).map(c=>c.name);expect(text).toContain('/chapter');expect(text).toContain('/tabs');expect(text).not.toContain('/zoom');
 const pdf=paletteCommands(true,true,true).map(c=>c.name);expect(pdf).toContain('/page');expect(pdf).toContain('/fit');expect(pdf).not.toContain('/chapter');expect(pdf).not.toContain('/highlight');
 for(const value of ['','-1','0','3.5','1e2','2abc','2 3','Infinity','99999999999999999999'])expect(integerArgument(value,1,10)).toBeUndefined();
 expect(integerArgument('10',1,10)).toBe(10);expect(integerArgument('0',0,2)).toBe(0);
});

test('commands validate parameters, navigate without completing chapters, switch books, toggle marks and save preferences',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-extra-commands-'));const opened:Book[]=[];
 let disk:Awaited<ReturnType<typeof store>>|undefined;let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  const files:Record<string,string>={'META-INF/container.xml':'<container><rootfile full-path="book.opf"/></container>','book.opf':'<package><metadata><dc:title>Story</dc:title></metadata><manifest>'+[0,1,2].map(i=>`<item id="c${i}" href="c${i}.xhtml"/>`).join('')+'</manifest><spine>'+[0,1,2].map(i=>`<itemref idref="c${i}"/>`).join('')+'</spine></package>'};
  for(const i of [0,1,2])files[`c${i}.xhtml`]=`<body><h1>Chapter ${i+1}</h1><p>Chapter content ${i+1}.</p></body>`;
  await fs.writeFile(path.join(root,'Story.epub'),zip(files));await fs.writeFile(path.join(root,'Notes.txt'),'Other book text.');
  disk=await store(root,path.join(root,'LER'));const state=disk.state;state.lang='en';const ids:string[]=[];
  for(const file of ['Story.epub','Notes.txt']){const b=await openBook(path.join(root,file));ids.push(b.id);state.books[b.id]={file,anchor:{chapter:0,block:0,offset:0},bookmarks:[]};b.close();}state.tabs=[...ids];
  setup=await testRender(()=><App root={root} state={state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&opened.length<2;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);setup.mockInput.pressKey('F6');await setup.renderOnce();
  async function command(value:string){setup!.mockInput.pressKey('F2');await setup!.renderOnce();await setup!.mockInput.typeText(value);setup!.mockInput.pressEnter();await Bun.sleep(10);await setup!.renderOnce();}
  await command('chapter 2');expect(state.books[ids[0]].anchor.chapter).toBe(1);expect(setup.captureCharFrame()).toContain('Chapter 2');
  await command('back');expect(state.books[ids[0]].anchor.chapter).toBe(0);
  await command('next');expect(state.books[ids[0]].anchor.chapter).toBe(1);await command('previous');expect(state.books[ids[0]].anchor.chapter).toBe(0);
  await command('end');expect(state.books[ids[0]].anchor.chapter).toBe(2);expect(state.books[ids[0]].reading?.completed).not.toBe(true);
  await command('start');expect(state.books[ids[0]].anchor.chapter).toBe(0);
  await command('chapter 99');expect(setup.captureCharFrame()).toContain('1–3');expect(state.books[ids[0]].anchor.chapter).toBe(0);
  await command('width 41.5');expect(setup.captureCharFrame()).toContain('40–140');expect(state.preferences?.readingWidth).not.toBe(42);
  await command('bookmark');expect(state.books[ids[0]].bookmarks.length).toBe(1);await command('bookmark');expect(state.books[ids[0]].bookmarks.length).toBe(0);
  await command('width 60');expect(state.preferences?.readingWidth).toBe(60);await command('spacing 2');expect(state.preferences?.lineGap).toBe(2);
  await command('protocol blocks');expect(state.preferences?.protocol).toBe('blocks');await command('animation off');expect(state.preferences?.logoAnimation).toBe(false);
  await command('switch 2');expect(setup.captureCharFrame()).toContain('Other book text.');await command('previous-tab');expect(setup.captureCharFrame()).toContain('Chapter 1');await command('next-tab');expect(setup.captureCharFrame()).toContain('Other book text.');
  await command('tabs');await setup.mockInput.typeText('Story');await setup.renderOnce();expect(setup.captureCharFrame()).not.toMatch(/│ 2\s+Notes/);setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Chapter 1');
  await command('info');expect(setup.captureCharFrame()).toContain('Book information');expect(setup.captureCharFrame()).toContain('Story.epub');
  await command('language pt-BR');expect(String(state.lang)).toBe('pt-BR');await command('language nonsense');expect(setup.captureCharFrame()).toContain('Uso: /language');expect(String(state.lang)).toBe('pt-BR');
  await command('chapter 3');await command('save');expect(setup.captureCharFrame()).toContain('Progresso e dados salvos.');
  await setup.dispose();setup=undefined;await disk.close();disk=undefined;disk=await store(root,path.join(root,'LER'));expect(disk.state.books[ids[0]].anchor.chapter).toBe(2);expect(disk.state.preferences?.lineGap).toBe(2);expect(disk.state.lang).toBe('pt-BR');
 }finally{await setup?.dispose();opened.forEach(b=>b.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);

test('PDF commands support page jumps, zoom percentages, fit and navigation back',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-pdf-commands-'));const opened:Book[]=[];let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  await fs.writeFile(path.join(root,'Document.pdf'),pdfFixture());const b=await openBook(path.join(root,'Document.pdf'));const id=b.id;b.close();
  const state={version:1 as const,lang:'en' as const,tabs:[id],books:{[id]:{file:'Document.pdf',anchor:{chapter:0,block:0,offset:0},bookmarks:[]}}};
  setup=await testRender(()=><App root={root} state={state} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&!opened.length;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);setup.mockInput.pressKey('F6');await setup.renderOnce();
  async function command(value:string){setup!.mockInput.pressKey('F2');await setup!.renderOnce();await setup!.mockInput.typeText(value);setup!.mockInput.pressEnter();await setup!.renderOnce();}
  await command('zoom 150%');expect(setup.captureCharFrame()).toContain('150%');await command('zoom 401');expect(setup.captureCharFrame()).toContain('100–400');
  await command('page 2');expect(state.books[id].anchor.chapter).toBe(1);await command('back');expect(state.books[id].anchor.chapter).toBe(0);
  await command('fit');expect(setup.captureCharFrame()).toContain('100%');await command('page 0');expect(state.books[id].anchor.chapter).toBe(0);expect(setup.captureCharFrame()).toContain('1–2');
  await command('save');expect(setup.captureCharFrame()).toContain('Storage unavailable');
 }finally{await setup?.dispose();opened.forEach(b=>b.close());await fs.rm(root,{recursive:true,force:true});}
},15000);
