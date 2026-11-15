import {test,expect} from 'bun:test';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {decode} from 'fast-png';
import {openBook,layout} from '../src/book';
import {indexLibrary,type Catalog} from '../src/catalog';
import {decodeText} from '../src/text';
import {pageCrop} from '../src/components/PdfPage';
import {pdfFixture} from './fixtures';

test('TXT decodes accents and BOMs without interpreting markup or terminal controls',async()=>{
 expect(decodeText(Buffer.from('ação\r\n<script>literal</script>\ttexto\x1b[31m'))).toBe('ação\n<script>literal</script>    texto[31m');
 expect(decodeText(Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from('Olá','utf16le')]))).toBe('Olá');
 expect(decodeText(Buffer.from([0xfe,0xff,0,79,0,108,0,225]))).toBe('Olá');
 expect(decodeText(Buffer.from([0x61,0xe7,0xe3,0x6f]))).toBe('ação');
 expect(()=>decodeText(Buffer.from([0,1,2]))).toThrow('binary');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-txt-'));
 try {
  const file=path.join(root,'Notas.TXT');await fs.writeFile(file,'Primeira linha\n\nSegunda linha com acentos: ação.');
  const book=await openBook(file);expect(book.format).toBe('txt');expect(book.title).toBe('Notas');expect(layout(book,25,0).map(l=>l.text).join(' ')).toContain('ação.');book.close();
  await fs.writeFile(file,'');await expect(openBook(file)).rejects.toThrow('Empty TXT');
 } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('PDF renders vector and scanned pages as PNGs, validates page numbers and releases its worker',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-pdf-'));
 try {
  const file=path.join(root,'Páginas.PDF');await fs.writeFile(file,pdfFixture());const book=await openBook(file);
  try {
   expect(book.format).toBe('pdf');expect(book.chapters.length).toBe(2);
   const first=await book.resource('page/0');const png=decode(first);expect(png.width).toBe(720);expect(png.height).toBe(960);
   const pixel=(320*png.width+320)*png.channels;expect(png.data[pixel]).toBe(255);expect(png.data[pixel+1]).toBe(0);
   const second=decode(await book.resource('page/1'));expect(second.width).toBe(960);expect(second.height).toBe(720);expect(second.data[2]).toBe(255);expect(second.data[0]).toBe(0);
   expect(await book.resource('page/0')).toEqual(first);
   await expect(book.resource('page/2')).rejects.toThrow('Invalid PDF page');
   await expect(book.resource('../private')).rejects.toThrow('Invalid PDF page resource');
  } finally {book.close();}
  await expect(book.resource('page/0')).rejects.toThrow('PDF closed');
  await fs.writeFile(file,'not a PDF');const error=await openBook(file).catch(error=>error);expect(error).toBeInstanceOf(Error);expect(error.message).toContain('Cannot open PDF');
 } finally {await fs.rm(root,{recursive:true,force:true});}
},15000);

test('library discovers TXT and PDF by filename alongside EPUB without trying to parse them as ZIPs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-format-catalog-'));
 try {
  await fs.writeFile(path.join(root,'Anotações.TXT'),'Olá');await fs.writeFile(path.join(root,'Páginas.pdf'),pdfFixture());await fs.writeFile(path.join(root,'ignore.doc'),'x');
  const catalog:Catalog={};await indexLibrary(root,'',{},entry=>{catalog[entry.file]=entry;});
  expect(Object.keys(catalog).length).toBe(2);expect(catalog['Anotações.TXT'].title).toBe('Anotações');expect(catalog['Páginas.pdf'].error).toBe(false);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('PDF zoom and panning always crop within the page',()=>{
 expect(pageCrop(720,960,2,0,0)).toEqual({left:0,top:0,width:360,height:480});
 expect(pageCrop(720,960,2,1,1)).toEqual({left:360,top:480,width:360,height:480});
 expect(pageCrop(721,961,4,2,-1)).toEqual({left:541,top:0,width:180,height:240});
});
