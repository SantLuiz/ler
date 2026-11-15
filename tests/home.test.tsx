import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/app';
import {matchingCommands,folderMatches} from '../src/home';
import {searchCatalog} from '../src/catalog';
import type {State} from '../src/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
test('empty searches do not list the catalog and commands stay separate',()=>{
 const entries=[{file:'book.epub',title:'Test book',authors:['An author'],size:0,modified:0}];
 expect(searchCatalog(entries,'')).toEqual([]);expect(searchCatalog(entries,'   ')).toEqual([]);expect(searchCatalog(entries,'/config')).toEqual([]);expect(matchingCommands('/config')[0].action).toBe('settings');expect(matchingCommands('/library')[0].action).toBe('folders');expect(folderMatches('Ficção científica','ficcao')).toBe(true);
});

test('home footer displays the complete absolute library path even in a narrow terminal',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-complete-library-path-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try {
  setup=await testRender(()=><App root={root} state={{version:1,books:{},tabs:[],lang:'en'}} opened={[]} exit={async()=>{}}/>,{width:160,height:30});
  await Bun.sleep(20);await setup.renderOnce();expect(setup.captureCharFrame()).toContain(path.resolve(root));
  setup.resize(60,25);await setup.renderOnce();
  const rows=setup.captureCharFrame().split('\n');
  const first=rows.findIndex(row=>row.trimStart().startsWith(path.resolve(root).slice(0,20)));
  expect(first).toBeGreaterThanOrEqual(0);
  const visible=rows.slice(first).map(row=>row.replace('LER 0.1.0','').trim()).join('');
  expect(visible).toContain(path.resolve(root));
 } finally {await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
test('LER home, command input, filtered folder popup and compact tabs work at 60×20',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-home-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  await fs.mkdir(path.join(root,'Ficção'));await fs.mkdir(path.join(root,'Tecnologia'));
  const state:State={version:1,books:{},tabs:[],lang:'pt-BR'};
  setup=await testRender(()=><App root={root} state={state} opened={[]} exit={async()=>{}}/>,{width:60,height:20});
  await Bun.sleep(15);await setup.renderOnce();let frame=setup.captureCharFrame();expect(frame).toContain('Leitor Extremamente Reduzido');expect(frame).not.toContain('Tecnologia');expect(frame.split('\n')[0]).toContain('LER');expect(frame.split('\n')[0]).not.toContain('┌');
  await setup.mockInput.typeText('/biblioteca');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Explorar pastas');setup.mockInput.pressEnter();await Bun.sleep(15);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Tecnologia');
  await setup.mockInput.typeText('ficcao');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Ficção');expect(setup.captureCharFrame()).not.toContain('Tecnologia');setup.mockInput.pressEnter();await Bun.sleep(15);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('▸ ..');
  setup.mockInput.pressEscape();await Bun.sleep(60);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Leitor Extremamente Reduzido');
  await setup.mockInput.typeText('/config');setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Cor do fundo');
  setup.resize(100,35);setup.mockInput.pressKey('F5');await setup.renderOnce();frame=setup.captureCharFrame();expect(frame).toContain('██████');expect(frame).not.toContain('Tecnologia');
 }finally{await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
