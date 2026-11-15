import { test, expect } from 'bun:test';
import { blocksFromHtml, resolveHref, layout, openBook } from '../src/book';
import { store } from '../src/storage';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('normalizes text, strips scripts and terminal controls, resolves images',()=>{
 const blocks=blocksFromHtml('<body><h1>Olá</h1><p>Texto\x1b com <em>acentos</em></p><script>evil</script><img src="../img/a.png"/></body>','OPS/text/1.xhtml');
 expect(blocks[0]).toEqual({text:'Olá',heading:true});expect(blocks[1].text).toBe('Texto com acentos');expect(blocks[2].image).toBe('OPS/img/a.png');expect(blocks.some(b=>b.text.includes('evil'))).toBe(false);
 expect(()=>resolveHref('OPS/a.xhtml','../../escape')).toThrow();expect(()=>resolveHref('a','https://remote')).toThrow();
});
test('layout anchors retain text offsets and grapheme clusters',()=>{
 const book:any={chapters:[{blocks:[{text:'abcdeé👩‍💻 xyz'}]}]};const lines=layout(book,5,0).filter(l=>l.text);
 expect(lines.map(l=>l.text).join('')).toBe('abcdeé👩‍💻 xyz');expect(lines[1].anchor.offset).toBe(5);expect(lines.some(l=>l.text.includes('👩‍💻'))).toBe(true);
});
test('state survives restart, rejects concurrent writes and recovers backup',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'leitor-test-'));
 try {const a=await store(dir,path.join(dir,'LER'));a.state.lang='pt-BR';await a.save();await expect(store(dir,path.join(dir,'LER'))).rejects.toThrow();await a.save();await a.close();await fs.writeFile(path.join(a.directory,'state.json'),'broken');const b=await store(dir,path.join(dir,'LER'));expect(b.state.lang).toBe('pt-BR');await b.close();} finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('invalid epub fails without leaving an open session',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'leitor-book-'));try{const file=path.join(dir,'bad.epub');await fs.writeFile(file,'not zip');await expect(openBook(file)).rejects.toThrow();}finally{await fs.rm(dir,{recursive:true,force:true});}
});
