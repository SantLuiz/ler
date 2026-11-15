import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {App} from '../src/ui/App';
import {openBook,type Book} from '../src/readers/book';
import type {State} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('reader command input filters upward suggestions, completes, executes and preserves the book on cancellation',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-command-input-'));const opened:Book[]=[];let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  await fs.writeFile(path.join(root,'Notes.txt'),'First paragraph.\nFind this target passage.\nLast paragraph.');
  const metadata=await openBook(path.join(root,'Notes.txt'));const id=metadata.id;metadata.close();
  const state:State={version:1,books:{[id]:{file:'Notes.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[]}},tabs:[id],lang:'en'};
  setup=await testRender(()=><App root={root} state={state} opened={opened} exit={async()=>{}}/>,{width:100,height:30});
  for(let i=0;i<100&&!state.books[id].title;i++){await Bun.sleep(10);await setup.renderOnce();}
  setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('First paragraph.');
  setup.mockInput.pressKey('/');await setup.renderOnce();
  const frame=setup.captureCharFrame();const rows=frame.split('\n');
  expect(frame).toContain('/search');expect(frame).toContain('/contents');expect(frame).not.toContain('┌');
  const suggestionRow=rows.findIndex(r=>r.includes('/search'));
  const inputRow=rows.findIndex((r,i)=>i>suggestionRow&&r.replace('│','').trim()==='/' );
  expect(inputRow).toBeGreaterThan(suggestionRow);expect(inputRow).toBeGreaterThan(15);
  await setup.mockInput.typeText('high');await setup.renderOnce();expect(setup.captureCharFrame()).not.toContain('/search');
  setup.mockInput.pressArrow('down');setup.mockInput.pressTab();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('/highlights');
  setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('All books');
  setup.mockInput.pressKey('F6');await setup.renderOnce(); // Return to home; resume the still-open book.
  setup.mockInput.pressKey('F5');setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('First paragraph.');
  setup.mockInput.pressKey('/');await setup.renderOnce();await setup.mockInput.typeText('no-such-command');setup.mockInput.pressEnter();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Unknown command');
  setup.mockInput.pressEscape();await Bun.sleep(40);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('First paragraph.');expect(state.tabs).toEqual([id]);
  setup.mockInput.pressKey('/');await setup.renderOnce();await setup.mockInput.typeText('search target');setup.mockInput.pressEnter();
  for(let i=0;i<100&&!setup.captureCharFrame().includes('1 · Find this target');i++){await Bun.sleep(10);await setup.renderOnce();}
  expect(setup.captureCharFrame()).toContain('1 · Find this target');setup.mockInput.pressEnter();await setup.renderOnce();
  setup.mockInput.pressKey('F5');expect(state.books[id].anchor.block).toBe(1);setup.mockInput.pressKey('F6');await setup.renderOnce();
  setup.mockInput.pressKey('F2');await setup.renderOnce();await setup.mockInput.typeText('stat');setup.mockInput.pressTab();await setup.renderOnce();
  setup.resize(60,20);await setup.renderOnce();const compact=setup.captureCharFrame();expect(compact).toContain('/stats');
  const statRows=compact.split('\n');const y=statRows.findIndex(r=>r.includes('/stats')&&r.includes('Library statistics'));expect(y).toBeGreaterThan(0);
  await setup.mockMouse.click(statRows[y].indexOf('/stats'),y);await Bun.sleep(50);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Library statistics');
 }finally{await setup?.dispose();opened.forEach(b=>b.close());await fs.rm(root,{recursive:true,force:true});}
});
