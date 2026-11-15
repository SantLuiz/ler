import {test,expect,spyOn} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import {store} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {zip} from './fixtures';

test('time pauses outside reading; End and contents jumps do not complete chapters; natural traversal persists',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-stats-ui-'));const opened:Book[]=[];
 let disk:Awaited<ReturnType<typeof store>>|undefined;let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 let now=Date.now();const date=spyOn(Date,'now').mockImplementation(()=>now);
 try{
  await fs.writeFile(path.join(root,'book.epub'),zip({
   'META-INF/container.xml':'<container><rootfile full-path="book.opf"/></container>',
   'book.opf':'<package><metadata><dc:title>Clock test</dc:title></metadata><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>',
   'a.xhtml':'<body><h1>First</h1>'+Array.from({length:30},(_,i)=>`<p>Paragraph ${i}</p>`).join('')+'</body>',
   'b.xhtml':'<body><h1>Second</h1><p>Final text.</p></body>'
  }));
  const metadata=await openBook(path.join(root,'book.epub'));const id=metadata.id;metadata.close();
  disk=await store(root,path.join(root,'LER'));const state=disk.state;state.lang='en';state.tabs=[id];state.books[id]={file:'book.epub',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};
  setup=await testRender(()=><App root={root} state={state} persistence={disk} opened={opened} exit={async()=>{}}/>,{width:80,height:24});
  for(let i=0;i<100&&!state.books[id].title;i++){await Bun.sleep(10);await setup.renderOnce();}
  const key=async(name:string,modifiers?:{ctrl?:boolean})=>{now+=1000;setup!.mockInput.pressKey(name,modifiers);await setup!.renderOnce();};
  await key('F6');await key('ARROW_DOWN');expect(state.books[id].reading?.seconds).toBe(1);
  await key('t',{ctrl:true});const paused=state.books[id].reading!.seconds;
  await key('ARROW_DOWN');await key('t',{ctrl:true});expect(state.books[id].reading?.seconds).toBe(paused);
  await key('s');const inPanel=state.books[id].reading!.seconds;await key('ARROW_DOWN');await key('RETURN');expect(state.books[id].reading?.seconds).toBe(inPanel);
  expect(state.books[id].reading?.chapters['0'].completed).toBeUndefined();
  await key('s');await key('HOME');await key('RETURN');await key('END');await key('\x1b[6~');expect(state.books[id].reading?.chapters['0'].completed).toBeUndefined();
  await key('s');await key('HOME');await key('RETURN');
  for(let i=0;i<10&&!setup.captureCharFrame().includes('Second');i++)await key('\x1b[6~');
  expect(state.books[id].reading?.chapters['0'].completed).toBe(true);
  for(let i=0;i<3;i++)await key('\x1b[6~');expect(state.books[id].reading?.completed).toBe(true);
  await key('F7');const outside=state.books[id].reading!.seconds;await key('F8');await key('F5');expect(state.books[id].reading?.seconds).toBe(outside);
  await disk.save();await setup.dispose();setup=undefined;await disk.close();disk=undefined;
  disk=await store(root,path.join(root,'LER'));expect(disk.state.books[id].reading?.seconds).toBe(outside);expect(disk.state.books[id].reading?.completed).toBe(true);
 }finally{date.mockRestore();await setup?.dispose();opened.forEach(b=>b.close());await disk?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
