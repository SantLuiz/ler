import {listLibraryLocations} from '../src/state/library-locations';
import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {LibrarySession,type LibrarySessionState} from '../src/ui/LibrarySession';
import {shortLibraryPath} from '../src/ui/library-path';
import {openBook} from '../src/readers/book';
import {store} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('abbreviated paths keep the library and nearest parents while respecting terminal cell width',()=>{
 expect(shortLibraryPath('C:\\Users\\Luiz\\Desktop\\Mídia\\Livros\\Fantasia',70)).toBe('…\\Desktop\\Mídia\\Livros\\Fantasia');
 expect(shortLibraryPath('C:\\Users\\Luiz\\Desktop\\Mídia\\Livros\\Fantasia',26)).toBe('…\\Mídia\\Livros\\Fantasia');
 expect(shortLibraryPath('C:\\',24)).toBe('C:\\');
 expect(Bun.stringWidth(shortLibraryPath('/home/library/中文👩🏽‍💻'.repeat(5),15))).toBeLessThanOrEqual(15);
});

test('clicking the path switches libraries in the same renderer, preserving sessions and rejecting invalid or locked roots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-switch-'));const appDirectory=path.join(root,'app'),a=path.join(root,'First library'),b=path.join(root,'Second library'),locked=path.join(root,'Locked');
 let setup:Awaited<ReturnType<typeof testRender>>|undefined;let current:LibrarySessionState|undefined;let lockedStore:Awaited<ReturnType<typeof store>>|undefined;
 try{
  for(const dir of [a,b,locked])await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(a,'Alpha.txt'),'First line.\nSaved alpha passage.');await fs.writeFile(path.join(b,'Beta.txt'),'Beta library content.');
  const first=await store(a,appDirectory);first.state.lang='en';const alpha=await openBook(path.join(a,'Alpha.txt'));const alphaId=alpha.id;alpha.close();first.state.books[alphaId]={file:'Alpha.txt',anchor:{chapter:0,block:1,offset:0},bookmarks:[]};first.state.tabs=[alphaId];first.state.lastRead=alphaId;
  const second=await store(b,appDirectory);second.state.lang='en';const beta=await openBook(path.join(b,'Beta.txt'));const betaId=beta.id;beta.close();second.state.books[betaId]={file:'Beta.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[]};second.state.tabs=[betaId];second.state.lastRead=betaId;await second.save();await second.close();
  current={root:a,state:first.state,persistence:first,opened:[]};
  setup=await testRender(()=><LibrarySession {...current!} appDirectory={appDirectory} exit={async()=>{}} onSessionChange={value=>{current=value;}}/>,{width:100,height:30});
  for(let i=0;i<100&&!current.opened.length;i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);
  setup.mockInput.pressKey('F6');await setup.renderOnce();setup.mockInput.pressKey('b');setup.mockInput.pressKey('F5');await setup.renderOnce();
  const rows=setup.captureCharFrame().split('\n');const y=rows.findIndex(r=>r.includes(shortLibraryPath(a,52)));expect(y).toBeGreaterThan(0);await setup.mockMouse.click(rows[y].indexOf(shortLibraryPath(a,52)),y);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Choose library');
  setup.mockInput.pressKey('END');for(let i=0;i<a.length;i++)setup.mockInput.pressBackspace();await setup.mockInput.typeText(b);setup.mockInput.pressEnter();await Bun.sleep(30);await setup.renderOnce();setup.mockInput.pressEnter();
  for(let i=0;i<100&&(current.root!==b||!current.opened.length);i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);await setup.renderOnce();
  expect(current.root).toBe(b);expect(setup.captureCharFrame()).toContain(shortLibraryPath(b,52));await setup.mockInput.typeText('Beta');for(let i=0;i<100&&!setup.captureCharFrame().includes('Beta.txt');i++){await Bun.sleep(10);await setup.renderOnce();}setup.mockInput.pressEnter();await Bun.sleep(20);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Beta library content.');
  const saved=JSON.parse(await fs.readFile(path.join(first.directory,'state.json'),'utf8'));expect(saved.books[alphaId].anchor.block).toBe(1);expect(saved.books[alphaId].bookmarks.length).toBe(1);
  async function change(value:string){setup!.mockInput.pressKey('F2');await setup!.renderOnce();await setup!.mockInput.typeText('change-library '+value);setup!.mockInput.pressEnter();await Bun.sleep(40);await setup!.renderOnce();}
  lockedStore=await store(locked,appDirectory);await change(locked);expect(current.root).toBe(b);expect(setup.captureCharFrame()).toContain('already open');
  await change(path.join(root,'missing'));expect(current.root).toBe(b);
  setup.mockInput.pressKey('l',{ctrl:true});await setup.renderOnce();setup.mockInput.pressTab();await Bun.sleep(30);await setup.renderOnce();await setup.mockInput.typeText('First library');setup.mockInput.pressEnter();for(let i=0;i<100&&(current.root!==a||!current.opened.length);i++){await Bun.sleep(10);await setup.renderOnce();}await Bun.sleep(20);setup.mockInput.pressKey('F6');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Saved alpha passage.');expect(current.state.books[alphaId].bookmarks.length).toBe(1);const locations=await listLibraryLocations(appDirectory);expect(locations.find(row=>row.root===a)?.visits).toBe(2);expect(locations.find(row=>row.root===b)?.visits).toBe(1);
  setup.mockInput.pressKey('l',{ctrl:true});await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Choose library');setup.mockInput.pressEscape();await Bun.sleep(40);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Saved alpha passage.');
 }finally{await setup?.dispose();current?.opened.forEach(book=>book.close());await current?.persistence?.close();await lockedStore?.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
