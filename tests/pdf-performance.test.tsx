import {test,expect} from 'bun:test';
import {decode} from 'fast-png';
import {NativeImage} from '@opentui/core';
import {openBook} from '../src/readers/book';
import {PdfBitmapCache} from '../src/readers/pdf-cache';
import {pdfFixture} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createSignal} from 'solid-js';
import {testRender} from '@opentui/solid';
import {ImageRenderable} from '@opentui/core';
import {PdfPage} from '../src/ui/components/PdfPage';

test('PDF display bypasses PNG, prefetches the next page and reuses the image during zoom',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ler-pdf-ui-perf-'));let setup:Awaited<ReturnType<typeof testRender>>|undefined;let close:(()=>void)|undefined;
 try{
  const file=path.join(dir,'Book.pdf');await fs.writeFile(file,pdfFixture());const book=await openBook(file);close=book.close;
  let pngCalls=0;const requests:number[]=[],raw=book.pdfPage!;book.pdfPage=page=>{requests.push(page);return raw(page);};book.resource=async()=>{pngCalls++;throw new Error('Display should use pixels');};
  const [page,setPage]=createSignal(0),[zoom,setZoom]=createSignal(1);
  setup=await testRender(()=><PdfPage book={book} page={page()} width={90} height={30} zoom={zoom()} x={0} y={0} protocol="blocks" lang="en"/>,{width:100,height:35});
  async function image(width:number){for(let i=0;i<100;i++){await Bun.sleep(10);await setup!.renderOnce();const value=setup!.renderer.root.findDescendantById('pdf-page-image') as ImageRenderable|undefined;if(value?.image?.width===width)return value;}throw new Error('Missing PDF image');}
  const first=await image(720),native=first.image;setZoom(1.5);await setup.renderOnce();expect(first.image).toBe(native);expect(requests.filter(p=>p===0).length).toBe(1);
  for(let i=0;i<80&&!requests.includes(1);i++)await Bun.sleep(10);expect(requests).toContain(1);setPage(1);await image(960);expect(pngCalls).toBe(0);
  await setup.dispose();setup=undefined;expect(()=>native!.raw()).toThrow();
 }finally{await setup?.dispose();close?.();await fs.rm(dir,{recursive:true,force:true});}
});

test('raw PDF pages preserve every rendered pixel, coalesce requests and reuse cached pages',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ler-pdf-raw-'));
 try{
  const file=path.join(dir,'Book.pdf');await fs.writeFile(file,pdfFixture());const book=await openBook(file);
  try{
   const [raw,same]=await Promise.all([book.pdfPage!(0),book.pdfPage!(0)]);expect(raw).toBe(same);
   const png=decode(await book.resource('page/0'));expect(raw.width).toBe(png.width);expect(raw.height).toBe(png.height);expect(raw.pixels).toEqual(new Uint8Array(png.data));
   const image=NativeImage.fromRgba(raw.pixels,raw.width,raw.height);try{expect(image.width).toBe(720);expect(image.height).toBe(960);}finally{image.dispose();}
   await book.pdfPage!(1);expect(await book.pdfPage!(0)).toBe(raw);
   await expect(book.pdfPage!(-1)).rejects.toThrow('Invalid PDF page');await expect(book.pdfPage!(2)).rejects.toThrow('Invalid PDF page');
  }finally{book.close();}
  await expect(book.pdfPage!(0)).rejects.toThrow('PDF closed');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('PDF bitmap cache evicts least recently used pages by bytes and count and clears only the closed book',()=>{
 const cache=new PdfBitmapCache(24,3),bitmap=()=>({pixels:new Uint8Array(8),width:1,height:2});
 const first=bitmap();cache.set('a:0',first);cache.set('a:1',bitmap());cache.set('b:0',bitmap());expect(cache.get('a:0')).toBe(first);cache.set('b:1',bitmap());expect(cache.get('a:1')).toBeUndefined();
 cache.set('huge',{pixels:new Uint8Array(25),width:1,height:1});expect(cache.get('huge')).toBeUndefined();expect(cache.get('a:0')).toBe(first);
 cache.clear('a:');expect(cache.get('a:0')).toBeUndefined();expect(cache.get('b:0')).toBeDefined();
 const entries=new PdfBitmapCache(1024,1);entries.set('one',bitmap());entries.set('two',bitmap());expect(entries.get('one')).toBeUndefined();expect(entries.get('two')).toBeDefined();
});
