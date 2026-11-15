import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,layout,type Book} from '../src/readers/book';
import {store} from '../src/state/storage';
import {rangeText,stepCursor,anchorAtCell,lineParts} from '../src/reading/highlights';
import {RGBA} from '@opentui/core';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('ranges preserve reverse selection, paragraph boundaries and Unicode graphemes',()=>{
 const book:Book={id:'x',title:'Test',chapters:[{href:'a',title:'A',blocks:[{text:'A👩🏽‍💻é中'},{text:'Segundo'}]},{href:'b',title:'B',blocks:[{text:'Final'}]}],toc:[],resource:async()=>new Uint8Array(),close(){}};
 const start={chapter:0,block:0,offset:1};const after=stepCursor(book,start,1);
 expect(after.offset).toBe(8);expect(stepCursor(book,after,-1)).toEqual(start);
 expect(rangeText(book,{chapter:1,block:0,offset:3},start)).toBe('👩🏽‍💻é中\nSegundo\nFin');
 const line=layout(book,20,0)[0];expect(anchorAtCell(line,2).offset).toBe(1);
 expect(lineParts(line,[{start,end:after}]).filter(p=>p.selected).map(p=>p.text).join('')).toBe('👩🏽‍💻');
});

test('keyboard and mouse highlights survive resize and restart; global tab filters, opens and deletes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-highlights-'));const opened:Book[]=[];
 let disk:Awaited<ReturnType<typeof store>>|undefined;let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  await fs.writeFile(path.join(root,'book.txt'),'Primeiro trecho de teste.\nSegundo parágrafo.');
  const metadata=await openBook(path.join(root,'book.txt'));const id=metadata.id;metadata.close();
  disk=await store(root,path.join(root,'LER'));const state=disk.state;state.lang='pt-BR';state.tabs=[id];state.books[id]={file:'book.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};
  setup=await testRender(()=><App root={root} state={state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&!state.books[id].title;i++){await Bun.sleep(10);await setup.renderOnce();}
  setup.mockInput.pressKey('F6');await setup.renderOnce();
  setup.mockInput.pressKey('v');setup.mockInput.pressArrow('right');
  for(let i=0;i<7;i++)setup.mockInput.pressArrow('right',{shift:true});
  setup.mockInput.pressKey('s',{ctrl:true});await setup.renderOnce();
  expect(state.books[id].highlights?.[0].text).toBe('rimeiro');
  expect(state.books[id].highlights?.[0].start.offset).toBe(1);
  expect(setup.captureCharFrame()).toContain('Destaque salvo');
  expect(setup.captureSpans().lines.flatMap(l=>l.spans).some(s=>s.text==='rimeiro'&&s.bg.equals(RGBA.fromHex('#594717')))).toBe(true);
  setup.resize(60,20);await setup.renderOnce();
  setup.mockInput.pressKey('v');setup.mockInput.pressArrow('right',{shift:true});setup.mockInput.pressEscape();await Bun.sleep(40);await setup.renderOnce();
  expect(state.tabs).toContain(id);expect(state.books[id].highlights?.length).toBe(1);
  setup.resize(100,30);await setup.renderOnce();
  const rows=setup.captureCharFrame().split('\n');const y=rows.findIndex(r=>r.includes('Primeiro trecho'));const x=rows[y].indexOf('Primeiro trecho');
  await setup.mockMouse.drag(x+9,y,x+15,y);await setup.renderOnce();setup.mockInput.pressKey('s',{ctrl:true});await setup.renderOnce();
  expect(state.books[id].highlights?.map(m=>m.text)).toContain('trecho');
  setup.mockInput.pressKey('F7');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Todos os livros');
  await setup.mockInput.typeText('rimeiro');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('rimeiro');
  setup.mockInput.pressEnter();await Bun.sleep(30);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Primeiro trecho');
  setup.mockInput.pressKey('F8');await Bun.sleep(100);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Estatísticas da biblioteca');expect(setup.captureCharFrame()).toContain('Livros: 1');expect(setup.captureCharFrame()).toContain('Destaques: 2');
  await disk.save();await setup.dispose();setup=undefined;await disk.close();disk=undefined;
  disk=await store(root,path.join(root,'LER'));expect(disk.state.books[id].highlights?.length).toBe(2);expect(disk.state.books[id].highlights?.[0].text).toBe('rimeiro');
  setup=await testRender(()=><App root={root} state={disk!.state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:80,height:24});await Bun.sleep(80);await setup.renderOnce();setup.mockInput.pressKey('F7');await setup.renderOnce();
  setup.mockInput.pressKey('d',{ctrl:true});await setup.renderOnce();expect(disk.state.books[id].highlights?.length).toBe(1);
  setup.resize(60,20);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('ctrl+d');setup.mockInput.pressKey('F8');await Bun.sleep(100);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Coleta a partir desta versão');
 }finally{await setup?.dispose();opened.forEach(b=>b.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
