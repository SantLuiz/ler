import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/app';
import {openBook,type Book} from '../src/book';
import {store} from '../src/storage';
import {zip} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
test('screen paging visits every paragraph, chapter boundaries work, resize and restart retain bookmarks',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-reading-'));const opened:Book[]=[];let setup:Awaited<ReturnType<typeof testRender>>|undefined;let disk:Awaited<ReturnType<typeof store>>|undefined;
 try{
  await fs.writeFile(path.join(root,'book.epub'),zip({'META-INF/container.xml':'<container><rootfile full-path="book.opf"/></container>','book.opf':'<package><metadata><dc:title>Reading test</dc:title></metadata><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>','a.xhtml':'<body><h1>First chapter</h1>'+Array.from({length:35},(_,i)=>`<p>P${String(i+1).padStart(2,'0')} — texto do parágrafo de teste.</p>`).join('')+'</body>','b.xhtml':'<body><h1>Second chapter</h1><p>End of book</p></body>'}));
  const metadata=await openBook(path.join(root,'book.epub'));const id=metadata.id;metadata.close();disk=await store(root,path.join(root,'LER'));const state=disk.state;state.lang='en';state.books[id]={file:'book.epub',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};state.tabs=[id];
  setup=await testRender(()=><App root={root} state={state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&!setup.captureCharFrame().includes('Resume · Reading test');i++){await Bun.sleep(10);await setup.renderOnce();}
  setup.mockInput.pressKey('F6');await setup.renderOnce();setup.mockInput.pressKey('b');expect(state.books[id].bookmarks.length).toBe(1);
  const seen=new Set<string>();for(let i=0;i<8;i++){for(const match of setup.captureCharFrame().matchAll(/P\d\d/g))seen.add(match[0]);if(setup.captureCharFrame().includes('Second chapter'))break;setup.mockInput.pressKey('\x1b[6~');await setup.renderOnce();}
  expect(seen.size).toBe(35);expect(setup.captureCharFrame()).toContain('Second chapter');setup.mockInput.pressArrow('up');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('1/2');
  setup.mockInput.pressKey('F5');await setup.renderOnce();const before=state.books[id].anchor;setup.resize(70,24);setup.mockInput.pressKey('F6');await setup.renderOnce();setup.mockInput.pressKey('F5');await setup.renderOnce();expect(state.books[id].anchor.block).toBe(before.block);
  await disk.save();await setup.dispose();setup=undefined;await disk.close();disk=undefined;const restored=await store(root,path.join(root,'LER'));expect(restored.state.books[id].bookmarks.length).toBe(1);expect(restored.state.books[id].anchor.block).toBe(before.block);await restored.close();
 }finally{await setup?.dispose();opened.forEach(book=>book.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
