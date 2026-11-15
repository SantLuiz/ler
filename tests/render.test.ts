import { test, expect } from 'bun:test';
import { createTestRenderer } from '@opentui/core/testing';
import { TextRenderable, ImageRenderable } from '@opentui/core';
test('native renderer draws text and accepts block images',async()=>{
 const setup=await createTestRenderer({width:60,height:20});
 try {setup.renderer.root.add(new TextRenderable(setup.renderer,{content:'Leitor · Biblioteca'}));const image=new ImageRenderable(setup.renderer,{source:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),width:8,height:4,protocol:'blocks'});setup.renderer.root.add(image);await image.loadPromise;await setup.renderOnce();expect(setup.captureCharFrame()).toContain('Leitor');}finally{setup.renderer.destroy();}
});
