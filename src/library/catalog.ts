import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as yauzl from 'yauzl';
import { parseDocument } from 'htmlparser2';
import {bookFormat, bookTitle} from '../readers/formats';
export type CatalogEntry = { file: string; title: string; authors: string[]; size: number; modified: number; error?: boolean };
export type Catalog = Record<string, CatalogEntry>;
const nodes = (n:any, tag:string):any[] => [...(n.name?.split(':').pop()===tag?[n]:[]),...(n.children??[]).flatMap((child:any)=>nodes(child,tag))];
const value = (n:any):string => n.type==='text'?n.data:(n.children??[]).map(value).join('');
const clean = (s:string) => s.replace(/[\x00-\x1f\x7f-\x9f]/g,'').replace(/\s+/g,' ').trim();
export async function epubMetadata(filename:string) {
 const zip=await new Promise<yauzl.ZipFile>((resolve,reject)=>yauzl.open(filename,{lazyEntries:true,autoClose:false},(e,z)=>e?reject(e):resolve(z!)));
 try {
  const entries=new Map<string,yauzl.Entry>();
  await new Promise<void>((resolve,reject)=>{zip.on('error',reject);zip.on('entry',entry=>{entries.set(entry.fileName,entry);if(entries.size>20000){reject(new Error('Too many entries'));return;}zip.readEntry();});zip.on('end',resolve);zip.readEntry();});
  async function xml(file:string) {const entry=entries.get(file);if(!entry||entry.uncompressedSize>2*1024*1024)throw new Error('Invalid metadata');const stream=await new Promise<NodeJS.ReadableStream>((resolve,reject)=>zip.openReadStream(entry,(e,s)=>e?reject(e):resolve(s!)));const chunks:Buffer[]=[];let count=0;for await(const bytes of stream as any){count+=bytes.length;if(count>2*1024*1024)throw new Error('Metadata too large');chunks.push(Buffer.from(bytes));}return parseDocument(Buffer.concat(chunks).toString('utf8'),{xmlMode:true});}
  const container=await xml('META-INF/container.xml');const opf=nodes(container,'rootfile')[0]?.attribs?.['full-path'];if(!opf)throw new Error('No package');const doc=await xml(opf);
  return {title:clean(value(nodes(doc,'title')[0]??{})),authors:nodes(doc,'creator').map(n=>clean(value(n))).filter(Boolean)};
 }finally{zip.close();}
}
export async function indexLibrary(root:string, ignored:string, cached:Catalog, onEntry:(entry:CatalogEntry)=>void, onError:()=>void=()=>{}) {
 async function visit(dir:string){let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{onError();return;}
  for(const entry of entries){if(['.git','.leitor','.ler','node_modules','.cache'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(full===ignored)continue;if(entry.isDirectory())await visit(full);else if(entry.isFile()&&bookFormat(entry.name)){try{const stat=await fs.stat(full);const file=path.relative(root,full);let result=cached[file];if(!result||result.size!==stat.size||result.modified!==stat.mtimeMs){let meta={title:bookTitle(file),authors:[] as string[]};let error=false;try{const parsed=bookFormat(full)==='epub'?await epubMetadata(full):meta;meta={...parsed,title:parsed.title||meta.title};}catch{error=true;}result={file,...meta,size:stat.size,modified:stat.mtimeMs,error};}onEntry(result);}catch{onError();}}}
 }await visit(root);
}
const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
export function searchCatalog(entries:CatalogEntry[],query:string) {const words=normalize(query).trim().split(/\s+/).filter(Boolean);if(!words.length||query.trim().startsWith('/'))return [];return entries.filter(e=>{const haystack=normalize([e.file,e.title,...e.authors].join(' '));return words.every(word=>haystack.includes(word));}).sort((a,b)=>a.title.localeCompare(b.title)||a.file.localeCompare(b.file));}
