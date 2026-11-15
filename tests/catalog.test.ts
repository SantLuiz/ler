import {test,expect} from 'bun:test';
import {indexLibrary,epubMetadata,searchCatalog,type Catalog,type CatalogEntry} from '../src/library/catalog';
import {zip} from './fixtures';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
function metadata(title:string){return zip({'META-INF/container.xml':'<container><rootfile full-path="OPS/book.opf"/></container>','OPS/book.opf':`<package><metadata><dc:title>${title}</dc:title><dc:creator>José Saramago</dc:creator><dc:creator>Outro autor</dc:creator></metadata></package>`});}
test('catalog recursively indexes metadata, names and authors, updates cache and removes deleted files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leitor-catalog-'));
 try{const nested=path.join(root,'Ficção','Autor');await fs.mkdir(nested,{recursive:true});const file=path.join(nested,'nome-diferente.EPUB');await fs.writeFile(file,metadata('Ensaio sobre a Cegueira'));
 await fs.mkdir(path.join(root,'.leitor'));await fs.writeFile(path.join(root,'.leitor','ignore.epub'),'bad');await fs.writeFile(path.join(root,'broken.epub'),'bad');
 const first:Catalog={};await indexLibrary(root,'',{},entry=>{first[entry.file]=entry;});expect(Object.values(first).length).toBe(2);expect(searchCatalog(Object.values(first),'JOSE SARAMAGO')[0].title).toBe('Ensaio sobre a Cegueira');expect(searchCatalog(Object.values(first),'nome-diferente').length).toBe(1);expect(searchCatalog(Object.values(first),'outro cegueira').length).toBe(1);expect(searchCatalog(Object.values(first),'missing')).toHaveLength(0);expect(first['broken.epub'].error).toBe(true);
 const key=path.relative(root,file);const second:Catalog={};await indexLibrary(root,'',first,entry=>{second[entry.file]=entry;});expect(second[key]).toBe(first[key]);
 await fs.writeFile(file,metadata('Livro alterado'));const third:Catalog={};await indexLibrary(root,'',second,entry=>{third[entry.file]=entry;});expect(third[key].title).toBe('Livro alterado');await fs.unlink(file);const fourth:Catalog={};await indexLibrary(root,'',third,entry=>{fourth[entry.file]=entry;});expect(fourth[key]).toBeUndefined();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('metadata extraction does not require or read chapter content',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'leitor-meta-'));try{const file=path.join(root,'book.epub');await fs.writeFile(file,metadata('Só metadados'));expect(await epubMetadata(file)).toEqual({title:'Só metadados',authors:['José Saramago','Outro autor']});}finally{await fs.rm(root,{recursive:true,force:true});}});

test('catalog worker streams bounded batches and flushes its final partial batch before completion',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-catalog-batches-'));let worker:Worker|undefined;
 try{
  for(let i=0;i<205;i++)await fs.writeFile(path.join(root,`${i}.txt`),'Own text.');
  worker=new Worker(new URL('../src/library/catalog.worker.ts',import.meta.url).href);
  const batches:CatalogEntry[][]=[];
  const rows=await new Promise<any[]>((resolve,reject)=>{
   const entries:any[]=[];worker!.onerror=e=>reject(new Error(e.message));
   worker!.onmessage=e=>{if(e.data.type==='entries'){batches.push(e.data.entries);entries.push(...e.data.entries);}else if(e.data.type==='done')resolve(entries);else reject(new Error(e.data.message));};
   worker!.postMessage({root,ignored:'',cached:{}});
  });
  expect(rows.length).toBe(205);expect(new Set(rows.map(row=>row.file)).size).toBe(205);
  expect(batches.every(batch=>batch.length>0&&batch.length<=100)).toBe(true);expect(batches.length).toBeGreaterThanOrEqual(3);
  expect(rows.every(row=>row.title===path.basename(row.file,'.txt'))).toBe(true);
 }finally{worker?.terminate();await fs.rm(root,{recursive:true,force:true});}
});
