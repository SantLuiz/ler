import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {LibraryPicker} from '../src/ui/components/LibraryPicker';
import {listLibraryLocations,recordLibraryVisit,setLibraryFavorite} from '../src/state/library-locations';
import {store,storageDirectory} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('library history discovers earlier libraries and persists usage and favorites without changing reading state',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-locations-')),app=path.join(root,'app'),a=path.join(root,'Alpha'),b=path.join(root,'Beta'),c=path.join(root,'Offline favorite');
 try{
  for(const dir of [a,b,c])await fs.mkdir(dir,{recursive:true});
  for(const dir of [a,b]){const disk=await store(dir,app);await disk.save();await disk.close();}
  const stateFile=path.join(storageDirectory(a,app),'state.json');const before=await fs.readFile(stateFile);
  await recordLibraryVisit(a,app);await recordLibraryVisit(a,app);await recordLibraryVisit(b,app);await setLibraryFavorite(c,app,true);
  let rows=await listLibraryLocations(app);expect(rows[0].root).toBe(c);expect(rows.find(row=>row.root===a)?.visits).toBe(2);expect(rows.find(row=>row.root===b)?.visits).toBe(1);
  expect((await fs.readFile(stateFile)).equals(before)).toBe(true);
  await fs.rmdir(c);rows=await listLibraryLocations(app);expect(rows[0]).toMatchObject({root:c,favorite:true,available:false});
  await setLibraryFavorite(c,app,false);expect((await listLibraryLocations(app)).some(row=>row.root===c)).toBe(false);
  await fs.writeFile(path.join(storageDirectory(a,app),'usage.json'),'invalid');expect((await listLibraryLocations(app)).find(row=>row.root===a)?.visits).toBe(0);
  const internal=path.join(app,'.ler/tmp/fixture');await fs.mkdir(internal,{recursive:true});const fixture=await store(internal,app);await fixture.close();expect((await listLibraryLocations(app)).some(row=>row.root===internal)).toBe(false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('picker tabs filter saved libraries, pin with keyboard or mouse, and select an earlier path',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-locations-ui-')),app=path.join(root,'app'),a=path.join(root,'Alpha'),b=path.join(root,'Beta');
 let setup:Awaited<ReturnType<typeof testRender>>|undefined;const chosen:string[]=[];
 try{
  for(const dir of [a,b]){await fs.mkdir(dir,{recursive:true});const disk=await store(dir,app);await disk.close();}
  for(let i=0;i<3;i++)await recordLibraryVisit(b,app);
  setup=await testRender(()=><LibraryPicker root={a} appDirectory={app} lang="en" onChoose={async value=>{chosen.push(value);}}/>,{width:100,height:30});
  await Bun.sleep(30);await setup.renderOnce();setup.mockInput.pressTab();await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Favorites & recent');
  await setup.mockInput.typeText('Beta');setup.mockInput.pressKey('f',{ctrl:true});await Bun.sleep(30);await setup.renderOnce();expect((await listLibraryLocations(app)).find(row=>row.root===b)?.favorite).toBe(true);expect(chosen).toEqual([]);
  setup.mockInput.pressTab();setup.resize(60,20);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Most used');expect(setup.captureCharFrame()).toContain('3×');
  const rows=setup.captureCharFrame().split('\n');const y=rows.findIndex(row=>row.includes('3×'));expect(y).toBeGreaterThan(0);await setup.mockMouse.click(rows[y].indexOf('★'),y);await Bun.sleep(30);await setup.renderOnce();expect((await listLibraryLocations(app)).find(row=>row.root===b)?.favorite).toBe(false);expect(chosen).toEqual([]);
  setup.mockInput.pressEnter();await Bun.sleep(20);expect(chosen).toEqual([b]);
 }finally{await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
