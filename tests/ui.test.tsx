import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import {store} from '../src/state/storage';
import {zip} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('contents selection, fragment navigation, mouse and persistent settings',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leitor-ui-'));const opened:Book[]=[];
 let setup:Awaited<ReturnType<typeof testRender>>|undefined;let persistence:Awaited<ReturnType<typeof store>>|undefined;
 try{
  const file=path.join(root,'book.epub');await fs.writeFile(file,zip({
   'META-INF/container.xml':'<container><rootfile full-path="book.opf"/></container>',
   'book.opf':'<package><metadata><dc:title>Test book</dc:title><dc:creator>José Saramago</dc:creator></metadata><manifest><item id="one" href="one.xhtml"/><item id="nav" href="nav.xhtml" properties="nav"/></manifest><spine><itemref idref="one"/></spine></package>',
   'one.xhtml':'<body><h1 id="start">First heading</h1><p>First text.</p><h2 id="second">Second heading</h2><p>Second text.</p></body>',
   'nav.xhtml':'<nav epub:type="toc"><a href="one.xhtml#start">First entry</a><a href="one.xhtml#second">Second entry</a></nav>'
  }));
  const book=await openBook(file);const id=book.id;book.close();
  persistence=await store(root,path.join(root,'LER'));const state=persistence.state;state.lang='en';state.books[id]={file:'book.epub',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};state.tabs=[id];state.active=id;
  setup=await testRender(()=><App root={root} state={state} persistence={persistence} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&!setup.captureCharFrame().includes('Resume · Test book');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('Leitor Extremamente Reduzido');setup.mockInput.pressKey('F6');await setup.renderOnce();
  expect(setup.captureCharFrame()).toContain('First heading');
  setup.mockInput.pressKey('s');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('› First entry');
  setup.mockInput.pressArrow('down');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('› Second entry');
  setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).not.toContain('First heading');expect(setup.captureCharFrame()).toContain('Second heading');
  setup.mockInput.pressKey('s');await setup.renderOnce();const rows=setup.captureCharFrame().split('\n');const y=rows.findIndex(row=>row.includes('First entry'));const x=rows[y].indexOf('First entry');await setup.mockMouse.click(x,y);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('First heading');
  setup.mockInput.pressKey('F3');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Font size: controlled by your terminal');
  // Background uses a real input, so the setting is immediately previewed and saved.
  setup.mockInput.pressEnter();await setup.renderOnce();setup.mockInput.pressKey('END');for(let i=0;i<7;i++)setup.mockInput.pressBackspace();await setup.mockInput.typeText('#202020');setup.mockInput.pressEnter();await setup.renderOnce();
  expect(state.preferences?.background).toBe('#202020');
  setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('right');await setup.renderOnce();
  expect(state.preferences?.imagePercent).toBe(90);
  setup.mockInput.pressKey('F5');await setup.renderOnce();
  expect(setup.captureCharFrame()).not.toContain('José Saramago');await setup.mockInput.typeText('JOSE SARAMAGO');
  for(let i=0;i<100&&!setup.captureCharFrame().includes('José Saramago');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('José Saramago');expect(setup.captureCharFrame()).toContain('Test book');setup.mockInput.pressEnter();
  for(let i=0;i<100&&!setup.captureCharFrame().includes('First heading');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('First heading');expect(state.tabs.length).toBe(1);
  await persistence.save();await setup.dispose();setup=undefined;await persistence.close();persistence=undefined;
  const again=await store(root,path.join(root,'LER'));expect(again.state.preferences?.imagePercent).toBe(90);expect(again.state.preferences?.background).toBe('#202020');await again.close();
 }finally{if(setup)await setup.dispose();for(const book of opened)book.close();await persistence?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
