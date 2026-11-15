import { test, expect } from 'bun:test';
import { openBook } from '../src/readers/book';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
// Minimal stored ZIP fixture, authored here; no third-party books are redistributed.
import { zip } from './fixtures';
test('EPUB spine order, metadata, nav and content identity survive rename',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'leitor-valid-'));
 try {const file=path.join(dir,'fixture.epub');await fs.writeFile(file,zip({
 'META-INF/container.xml':'<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
 'OPS/book.opf':'<package><metadata><dc:title>Livro de teste</dc:title></metadata><manifest><item id="b" href="b.xhtml"/><item id="a" href="a.xhtml"/><item id="nav" href="nav.xhtml" properties="nav"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>',
 'OPS/b.xhtml':'<body><h1>Segundo</h1><p>Outro capítulo</p></body>',
 'OPS/a.xhtml':'<body><h1>Primeiro</h1><p>Olá mundo</p></body>',
 'OPS/nav.xhtml':'<nav epub:type="toc"><a href="a.xhtml">Início</a><a href="b.xhtml">Final</a></nav>'
 }));const b=await openBook(file);expect(b.title).toBe('Livro de teste');expect(b.chapters.map(c=>c.title)).toEqual(['Primeiro','Segundo']);expect(b.toc[0].label).toBe('Início');const id=b.id;b.close();const renamed=path.join(dir,'renamed.epub');await fs.rename(file,renamed);const c=await openBook(renamed);expect(c.id).toBe(id);c.close();}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('encrypted unused fonts do not block readable text, while encrypted chapters remain unsupported',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ler-encryption-'));
 try {
  const file=path.join(dir,'fixture.epub');
  const files={
   'META-INF/container.xml':'<container><rootfile full-path="OPS/book.opf"/></container>',
   'OPS/book.opf':'<package><manifest><item id="a" href="a.xhtml"/><item id="font" href="fonts/font.otf" media-type="application/vnd.ms-opentype"/></manifest><spine><itemref idref="a"/></spine></package>',
   'OPS/a.xhtml':'<body><p>Readable test text</p></body>',
   'OPS/fonts/font.otf':'encrypted font bytes',
   'META-INF/encryption.xml':'<encryption xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="http://ns.adobe.com/pdf/enc#RC"/><enc:CipherData><enc:CipherReference URI="OPS/fonts/font.otf"/></enc:CipherData></enc:EncryptedData></encryption>'
  };
  await fs.writeFile(file,zip(files));const book=await openBook(file);
  try {expect(book.chapters[0].blocks[0].text).toBe('Readable test text');await expect(book.resource('OPS/fonts/font.otf')).rejects.toThrow('Encrypted resource is unsupported');} finally {book.close();}
  files['META-INF/encryption.xml']=files['META-INF/encryption.xml'].replace('OPS/fonts/font.otf','OPS/a.xhtml');
  await fs.writeFile(file,zip(files));await expect(openBook(file)).rejects.toThrow('Encrypted resource is unsupported');
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
