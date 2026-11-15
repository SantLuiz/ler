import {shortLibraryPath} from '../src/ui/library-path';
import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import {commands,folderMatches} from '../src/ui/home';
import {searchCatalog} from '../src/library/catalog';
import type {State} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
test('empty searches do not list the catalog and commands stay separate',()=>{
 const entries=[{file:'book.epub',title:'Test book',authors:['An author'],size:0,modified:0}];
 expect(searchCatalog(entries,'')).toEqual([]);expect(searchCatalog(entries,'   ')).toEqual([]);expect(searchCatalog(entries,'/settings')).toEqual([]);expect(folderMatches('Ficção científica','ficcao')).toBe(true);
 expect(commands.map(c=>c.name)).toEqual(['/highlights','/stats','/library','/settings','/continue','/help','/refresh','/quit']);
});

test('home actions stay hidden until Tab and popup supports keyboard, mouse and compact terminals',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-home-actions-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  setup=await testRender(()=><App root={root} state={{version:1,books:{},tabs:[],lang:'pt-BR'}} opened={[]} exit={async()=>{}}/>,{width:100,height:30});
  await Bun.sleep(20);await setup.renderOnce();let rows=setup.captureCharFrame().split('\n');
  expect(rows[0]).not.toMatch(/F7|F8|Destaques|Estatísticas/);
  expect(setup.captureCharFrame()).not.toContain('Biblioteca');expect(setup.captureCharFrame()).not.toContain('Destaques');expect(setup.captureCharFrame()).not.toContain('Estatísticas');
  setup.mockInput.pressTab();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Opções');expect(setup.captureCharFrame()).toContain('› Biblioteca');expect(setup.captureCharFrame()).toContain('Estatísticas');
  setup.mockInput.pressEscape();await Bun.sleep(40);await setup.renderOnce();expect(setup.captureCharFrame()).not.toContain('Estatísticas');
  for(let i=0;i<4;i++)setup.mockInput.pressTab();setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Todos os livros');
  setup.mockInput.pressKey('F5');await setup.renderOnce();for(let i=0;i<5;i++)setup.mockInput.pressTab();setup.mockInput.pressEnter();await Bun.sleep(50);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Estatísticas da biblioteca');
  setup.mockInput.pressKey('F5');setup.resize(60,20);await setup.renderOnce();setup.mockInput.pressTab();await setup.renderOnce();rows=setup.captureCharFrame().split('\n');
  const y=rows.findIndex(r=>r.includes('Destaques'));expect(y).toBeGreaterThan(0);expect(rows.some(r=>r.includes('Estatísticas'))).toBe(true);
  await setup.mockMouse.click(rows[y].indexOf('Destaques'),y);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Todos os livros');
  setup.mockInput.pressKey('F5');await setup.renderOnce();await setup.mockInput.typeText('/');await setup.renderOnce();const frame=setup.captureCharFrame();expect(frame).toContain('/library');expect(frame).not.toContain('/biblioteca');
 }finally{await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});

test('home shows the abbreviated library path inside search and leaves it out of the footer',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-complete-library-path-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try {
  setup=await testRender(()=><App root={root} state={{version:1,books:{},tabs:[],lang:'en'}} opened={[]} exit={async()=>{}}/>,{width:160,height:30});
  await Bun.sleep(20);await setup.renderOnce();expect(setup.captureCharFrame()).toContain(shortLibraryPath(root,52));expect(setup.captureCharFrame()).not.toContain(path.resolve(root));
  setup.resize(60,25);await setup.renderOnce();const rows=setup.captureCharFrame().split('\n');
  expect(rows.some(row=>row.includes(shortLibraryPath(root,24)))).toBe(true);
  expect(rows.slice(-3).join('\n')).not.toContain(shortLibraryPath(root,24));
  const pathNode=setup.renderer.root.findDescendantById('library-path');expect(pathNode).toBeDefined();
 } finally {await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});

test('options popup preserves the search, wraps with Shift+Tab, and resumes a saved book',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-home-options-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;const opened:Book[]=[];
 try{
  await fs.writeFile(path.join(root,'Notes.txt'),'Saved reading passage.');const book=await openBook(path.join(root,'Notes.txt'));const id=book.id;book.close();
  const state:State={version:1,books:{[id]:{file:'Notes.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[]}},lastRead:id,tabs:[],lang:'en'};
  setup=await testRender(()=><App root={root} state={state} opened={opened} exit={async()=>{}}/>,{width:80,height:24});await Bun.sleep(30);await setup.renderOnce();
  await setup.mockInput.typeText('Notes');setup.mockInput.pressTab({shift:true});await setup.renderOnce();expect(setup.captureCharFrame()).toContain('› Statistics');expect(setup.captureCharFrame()).toContain('Resume');
  setup.mockInput.pressTab();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('› Folders');setup.mockInput.pressArrow('up');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('› Statistics');
  setup.mockInput.pressEscape();await Bun.sleep(40);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Notes');expect(setup.captureCharFrame()).not.toContain('Statistics');
  await setup.mockInput.typeText(' test');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Notes test');
  const rows=setup.captureCharFrame().split('\n');const y=rows.findIndex(r=>r.includes('tab options'));expect(y).toBeGreaterThan(0);await setup.mockMouse.click(rows[y].indexOf('tab options'),y);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Options');
  setup.mockInput.pressArrow('down');setup.mockInput.pressEnter();for(let i=0;i<100&&!setup.captureCharFrame().includes('Saved reading passage.');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('Saved reading passage.');expect(state.tabs).toEqual([id]);
 }finally{await setup?.dispose();opened.forEach(b=>b.close());await fs.rm(root,{recursive:true,force:true});}
});
test('LER home, command input, filtered folder popup and compact tabs work at 60×20',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-home-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  await fs.mkdir(path.join(root,'Ficção'));await fs.mkdir(path.join(root,'Tecnologia'));
  const state:State={version:1,books:{},tabs:[],lang:'pt-BR'};
  setup=await testRender(()=><App root={root} state={state} opened={[]} exit={async()=>{}}/>,{width:60,height:20});
  await Bun.sleep(15);await setup.renderOnce();let frame=setup.captureCharFrame();expect(frame).toContain('Leitor Extremamente Reduzido');expect(frame).not.toContain('Tecnologia');expect(frame.split('\n')[0]).toContain('LER');expect(frame.split('\n')[0]).not.toContain('┌');
  await setup.mockInput.typeText('/library');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Explorar pastas');setup.mockInput.pressEnter();await Bun.sleep(15);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Tecnologia');
  await setup.mockInput.typeText('ficcao');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Ficção');expect(setup.captureCharFrame()).not.toContain('Tecnologia');setup.mockInput.pressEnter();await Bun.sleep(15);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('▸ ..');
  setup.mockInput.pressEscape();await Bun.sleep(60);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Leitor Extremamente Reduzido');
  await setup.mockInput.typeText('/settings');setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Cor do fundo');
  setup.resize(100,35);setup.mockInput.pressKey('F5');await setup.renderOnce();frame=setup.captureCharFrame();expect(frame).toContain('██████');expect(frame).not.toContain('Tecnologia');
 }finally{await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
