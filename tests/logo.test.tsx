import {test,expect} from 'bun:test';
import {createSignal} from 'solid-js';
import {testRender} from '@opentui/solid';
import {ManualClock} from '@opentui/core/testing';
import {HomeLogo} from '../src/ui/components/HomeLogo';
import {App} from '../src/ui/App';
import {VERSION} from '../src/cli';
import {preferences} from '../src/state/preferences';
import {logoPixels,pixelColor,logoColors,homeStars} from '../src/ui/logo';
import {store,type State} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('pixel logo animates only its colors, pauses cleanly and resizes without clipping',async()=>{
 const clock=new ManualClock();const [animate,setAnimate]=createSignal(true);const [size,setSize]=createSignal<'large'|'medium'|'small'>('large');
 const setup=await testRender(()=><HomeLogo size={size()} animate={animate()}/>,{width:80,height:15,clock});
 try {
  await setup.renderOnce();const text=setup.captureCharFrame();const initial=JSON.stringify(setup.captureSpans());
  clock.advance(700);await setup.renderOnce();expect(setup.captureCharFrame()).toBe(text);expect(JSON.stringify(setup.captureSpans())).not.toBe(initial);
  setAnimate(false);await setup.renderOnce();const paused=JSON.stringify(setup.captureSpans());clock.advance(1800);await setup.renderOnce();expect(JSON.stringify(setup.captureSpans())).toBe(paused);
  setAnimate(true);clock.advance(350);await setup.renderOnce();expect(JSON.stringify(setup.captureSpans())).not.toBe(paused);
  setSize('small');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('L E R');
  const compact=JSON.stringify(setup.captureSpans());clock.advance(1800);await setup.renderOnce();expect(JSON.stringify(setup.captureSpans())).toBe(compact);
 } finally {await setup.dispose();}
 clock.advance(2000);expect(clock.pendingTimerCount).toBe(0);
});

test('many square pixels twinkle independently while letters stay still and the LED strip travels right',()=>{
 for(const size of ['large','medium'] as const){
  const pixels=logoPixels(size).flat();const stars=pixels.filter(pixel=>pixel.kind==='spark');
  expect(stars.length).toBeGreaterThanOrEqual(28);expect(stars.every(pixel=>pixel.glyph==='▪ ')).toBe(true);
  const phases=Array.from({length:72},(_,phase)=>phase);
  expect(phases.every(phase=>pixels.filter(p=>p.kind==='letter').every(p=>pixelColor(p,phase)===logoColors.text))).toBe(true);
  const leds=pixels.filter(p=>p.kind==='baseline'&&p.glyph.trim());
  expect(pixelColor(leds[0],0)).toBe(logoColors.accent.toLowerCase());expect(pixelColor(leds[1],0)).toBe(logoColors.baseline.toLowerCase());
  expect(pixelColor(leds[1],1)).toBe(logoColors.accent.toLowerCase());expect(pixelColor(leds.at(-1)!,leds.length-1)).toBe(logoColors.accent.toLowerCase());
  expect(pixelColor(leds[0],leds[0].period)).toBe(logoColors.accent.toLowerCase());
  expect(leds.every(p=>pixelColor(p,undefined)===logoColors.baseline)).toBe(true);
  expect(pixelColor(stars[0],(55-stars[0].offset!)%48)).toBe(logoColors.accent.toLowerCase());expect(pixelColor(stars[0],undefined,'#202020')).toBe('#202020');
  expect(phases.some(phase=>stars.filter(p=>pixelColor(p,phase)!=='#101114').length>=8)).toBe(true);
  const inside=pixels.filter(p=>p.kind==='inset');expect(inside.length).toBeGreaterThan(5);
  expect(inside.every(p=>pixelColor(p,undefined)===logoColors.text.toLowerCase())).toBe(true);
 }
});

test('home starfield fills free space with bounded, stable and unique positions',()=>{
 const stars=homeStars(160,50);expect(stars.length).toBeGreaterThan(100);expect(stars.length).toBeLessThanOrEqual(240);
 expect(stars.every(star=>star.x>0&&star.x<159&&star.y>0&&star.y<49)).toBe(true);
 expect(new Set(stars.map(star=>`${star.x},${star.y}`)).size).toBe(stars.length);
 expect(homeStars(160,50)).toEqual(stars);expect(homeStars(500,200)).toHaveLength(240);expect(homeStars(1,1)).toEqual([]);
 expect(stars.some(star=>star.x<20)&&stars.some(star=>star.x>140)).toBe(true);
});

test('home search preserves logo size and animated colors while results fit the terminal',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-home-search-effects-'));
 try {
  for(let i=0;i<10;i++)await fs.writeFile(path.join(root,`Book ${i}.txt`),`Reading passage ${i}.`);
  for(const [width,height] of [[100,40],[100,30],[72,28],[60,20]]){
   const clock=new ManualClock();
   const setup=await testRender(()=><App root={root} state={{version:1,books:{},tabs:[],lang:'en'}} opened={[]} exit={async()=>{}}/>,{width,height,clock});
   try {
    await setup.renderOnce();const logo=setup.renderer.root.findDescendantById('home-logo')!;
    const logoHeight=logo.height;
    await setup.mockInput.typeText('Book');await setup.renderOnce();
    expect(setup.renderer.root.findDescendantById('home-logo')!.height).toBe(logoHeight);
    expect(setup.captureCharFrame()).toContain('Leitor Extremamente Reduzido');
    clock.advance(700);await setup.renderOnce();const colors=JSON.stringify(setup.captureSpans());
    clock.advance(700);await setup.renderOnce();expect(JSON.stringify(setup.captureSpans())).not.toBe(colors);
    for(let i=0;i<100;i++){await Bun.sleep(10);await setup.renderOnce();if(setup.captureCharFrame().includes('10 books found'))break;}
    const frame=setup.captureCharFrame();expect(frame).toContain('10 books found');expect(frame).toContain('Book 0');
    expect(frame).toContain('tab options');expect(frame).toContain(`LER ${VERSION}`);
    expect(setup.renderer.root.findDescendantById('home-logo')!.height).toBe(logoHeight);
    await setup.mockInput.typeText(' unmatched');await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain('No matching books.');
    expect(setup.renderer.root.findDescendantById('home-logo')!.height).toBe(logoHeight);
   }finally{await setup.dispose();}
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('pixel size and quantity change both the logo and home while preferences enforce limits',()=>{
 expect(preferences()).toMatchObject({animationPixelSize:2,animationDensity:100});
 expect(preferences({animationPixelSize:99,animationDensity:-20})).toMatchObject({animationPixelSize:3,animationDensity:25});
 const count=(quantity:number)=>logoPixels('large',quantity).flat().filter(p=>p.kind==='spark'||p.kind==='inset').length;
 expect(count(25)).toBeLessThan(count(100));expect(count(200)).toBeGreaterThan(count(100));
 expect(logoPixels('large',100,3).flat().filter(p=>p.kind==='spark').every(p=>p.glyph==='■ ')).toBe(true);
 expect(homeStars(160,50,25).length).toBeLessThan(homeStars(160,50).length);expect(homeStars(500,200,200)).toHaveLength(480);
});

test('logo animation preference defaults on and can be disabled through Appearance',async()=>{
 expect(preferences().logoAnimation).toBe(true);expect(preferences({logoAnimation:false}).logoAnimation).toBe(false);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-logo-setting-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;let disk:Awaited<ReturnType<typeof store>>|undefined;
 let state:State;
 try {
  disk=await store(root,path.join(root,'LER'));state=disk.state;state.lang='en';
  setup=await testRender(()=><App root={root} state={state} persistence={disk} opened={[]} exit={async()=>{}}/>,{width:100,height:40});await Bun.sleep(20);await setup.renderOnce();
  expect(setup.renderer.root.findDescendantById('home-stars')).toBeDefined();
  setup.mockInput.pressKey('F3');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Home effects: On');
  expect(setup.renderer.root.findDescendantById('home-stars')).toBeUndefined();
  for(let i=0;i<7;i++)setup.mockInput.pressArrow('down');setup.mockInput.pressEnter();await setup.renderOnce();
  expect(state.preferences?.logoAnimation).toBe(false);expect(setup.captureCharFrame()).toContain('Home effects: Off');
  setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('right');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Animation pixel size: Large');
  setup.mockInput.pressArrow('down');setup.mockInput.pressArrow('right');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Pixel quantity: 125%');
  expect(state.preferences).toMatchObject({animationPixelSize:3,animationDensity:125});
  setup.mockInput.pressKey('F5');await setup.renderOnce();expect(setup.renderer.root.findDescendantById('home-logo')).toBeDefined();
  expect(setup.renderer.root.findDescendantById('home-stars')).toBeUndefined();
  await disk.save();await setup.dispose();setup=undefined;await disk.close();disk=await store(root,path.join(root,'LER'));
  expect(disk.state.preferences).toMatchObject({logoAnimation:false,animationPixelSize:3,animationDensity:125});
 } finally {await setup?.dispose();await disk?.close();await fs.rm(root,{recursive:true,force:true});}
});
