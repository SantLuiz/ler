import {test,expect} from 'bun:test';
import {testRender} from '@opentui/solid';
import {RGBA} from '@opentui/core';
import {App} from '../src/ui/App';
import {palettes,paletteById,themeFor} from '../src/state/palettes';
import {preferences} from '../src/state/preferences';
import {store} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('palettes preserve the blue default and custom colors while validating saved selections',()=>{
 expect(preferences().palette).toBe('blue');expect(paletteById('unknown').id).toBe('blue');
 expect(preferences({background:'#123456',foreground:'#abcdef'})).toMatchObject({palette:'blue',background:'#123456',foreground:'#abcdef'});
 const luminance=(hex:string)=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;};
 for(const palette of palettes){const theme=themeFor(preferences({palette:palette.id}));expect(theme.accent).toBe(palette.accent);expect((luminance(theme.selected)+0.05)/(luminance(theme.selectedText)+0.05)).toBeGreaterThan(4.5);}
});

test('appearance previews palettes, themes command selection and persists the choice across restart',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-palettes-'));let disk:Awaited<ReturnType<typeof store>>|undefined;let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 try{
  disk=await store(root,path.join(root,'LER'));const state=disk.state;state.lang='en';
  setup=await testRender(()=><App root={root} state={state} persistence={disk} opened={[]} exit={async()=>{}}/>,{width:100,height:30});await Bun.sleep(20);await setup.renderOnce();
  setup.mockInput.pressKey('/');await setup.renderOnce();
  expect(setup.captureSpans().lines.flatMap(l=>l.spans).some(s=>s.text.includes('/highlights')&&s.bg.equals(RGBA.fromHex(palettes[0].accent)))).toBe(true);
  setup.mockInput.pressKey('F3');for(let i=0;i<10;i++)setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('right');await setup.renderOnce();
  expect(state.preferences?.palette).toBe('mint');expect(setup.captureCharFrame()).toContain('Color palette: Mint & cream');expect(state.preferences?.readingWidth).toBe(88);
  setup.mockInput.pressKey('F5');setup.mockInput.pressKey('/');await setup.renderOnce();
  expect(setup.captureSpans().lines.flatMap(l=>l.spans).some(s=>s.text.includes('/highlights')&&s.bg.equals(RGBA.fromHex(palettes[1].accent)))).toBe(true);
  setup.mockInput.pressKey('F3');setup.resize(60,20);await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Mint & cream');expect(setup.captureCharFrame()).toContain('#8DD9B5');
  async function command(value:string){setup!.mockInput.pressKey('F2');await setup!.renderOnce();await setup!.mockInput.typeText(value);setup!.mockInput.pressEnter();await setup!.renderOnce();}
  await command('palette coral');expect(state.preferences?.palette).toBe('coral');
  await command('palette invalid');expect(setup.captureCharFrame()).toContain('Usage: /palette');expect(state.preferences?.palette).toBe('coral');
  await command('palette mint');expect(state.preferences?.palette).toBe('mint');
  await disk.save();await setup.dispose();setup=undefined;await disk.close();disk=undefined;disk=await store(root,path.join(root,'LER'));expect(disk.state.preferences?.palette).toBe('mint');expect(disk.state.preferences?.background).toBe(palettes[1].background);
 }finally{await setup?.dispose();await disk?.close();await fs.rm(root,{recursive:true,force:true});}
});
