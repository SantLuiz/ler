import {test,expect} from 'bun:test';
import {createSignal} from 'solid-js';
import {testRender} from '@opentui/solid';
import {ManualClock} from '@opentui/core/testing';
import {HomeLogo} from '../src/components/HomeLogo';
import {App} from '../src/app';
import {preferences} from '../src/preferences';
import {logoPixels,pixelColor,logoColors} from '../src/logo';
import type {State} from '../src/storage';
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

test('only the tiny stars between letters twinkle; letters and baseline keep their colors',()=>{
 for(const size of ['large','medium'] as const){
  const pixels=logoPixels(size).flat();const stars=pixels.filter(pixel=>pixel.kind==='spark');
  expect(stars).toHaveLength(4);expect(stars.every(pixel=>pixel.glyph==='· ')).toBe(true);
  const phases=Array.from({length:72},(_,phase)=>phase);
  expect(phases.every(phase=>pixels.filter(p=>p.kind==='letter').every(p=>pixelColor(p,phase)===logoColors.text))).toBe(true);
  expect(phases.every(phase=>pixels.filter(p=>p.kind==='baseline').every(p=>pixelColor(p,phase)===logoColors.baseline))).toBe(true);
  expect(pixelColor(stars[0],4)).toBe(logoColors.accent.toLowerCase());expect(pixelColor(stars[0],20,'#202020')).toBe('#202020');
 }
});

test('logo animation preference defaults on and can be disabled through Appearance',async()=>{
 expect(preferences().logoAnimation).toBe(true);expect(preferences({logoAnimation:false}).logoAnimation).toBe(false);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-logo-setting-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;
 const state:State={version:1,books:{},tabs:[],lang:'en'};
 try {
  setup=await testRender(()=><App root={root} state={state} opened={[]} exit={async()=>{}}/>,{width:100,height:40});await Bun.sleep(20);await setup.renderOnce();
  setup.mockInput.pressKey('F3');await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Logo animation: On');
  for(let i=0;i<7;i++)setup.mockInput.pressArrow('down');setup.mockInput.pressEnter();await setup.renderOnce();
  expect(state.preferences?.logoAnimation).toBe(false);expect(setup.captureCharFrame()).toContain('Logo animation: Off');
  setup.mockInput.pressKey('F5');await setup.renderOnce();expect(setup.renderer.root.findDescendantById('home-logo')).toBeDefined();
 } finally {await setup?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
