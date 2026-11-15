import { test, expect } from 'bun:test';
import { openBook } from '../src/book';
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
