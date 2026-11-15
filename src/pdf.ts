import {promises as fs} from 'node:fs';
import type {Book} from './book';
import {bookTitle} from './formats';

type Response = {id:number; pages?:number; bytes?:Uint8Array; error?:string};
export async function openPdf(filename: string, id: string): Promise<Book> {
  if ((await fs.stat(filename)).size > 256 * 1024 * 1024) throw new Error('PDF excede 256 MiB / PDF exceeds 256 MiB');
  const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url).href);
  const pending = new Map<number, {resolve:(value:Response)=>void; reject:(error:Error)=>void; timer:ReturnType<typeof setTimeout>}>();
  let sequence = 0;let closed = false;
  function close(error = new Error('PDF fechado / PDF closed')) {
    if (closed) return;closed=true;worker.terminate();
    for(const item of pending.values()){clearTimeout(item.timer);item.reject(error);}pending.clear();
  }
  worker.onmessage = (event:MessageEvent<Response>)=>{
    const item=pending.get(event.data.id);if(!item)return;
    pending.delete(event.data.id);clearTimeout(item.timer);
    if(event.data.error)item.reject(new Error(event.data.error));else item.resolve(event.data);
  };
  worker.onerror = event=>close(new Error(event.message || 'Falha no renderizador PDF / PDF renderer failed'));
  function request(data:{filename?:string;page?:number}):Promise<Response> {
    if(closed)return Promise.reject(new Error('PDF fechado / PDF closed'));
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timer=setTimeout(()=>close(new Error('Tempo limite ao processar PDF / PDF processing timed out')),30000);
      pending.set(id,{resolve,reject,timer});worker.postMessage({id,...data});
    });
  }
  try {
    const {pages} = await request({filename});
    const chapters = Array.from({length:pages!},(_,page)=>({href:`page/${page}`,title:`${page+1}`,blocks:[{text:`${page+1}`,image:`page/${page}`}]}));
    return {id, title:bookTitle(filename), format:'pdf', chapters, toc:[], close:()=>close(),
      resource:async href=>{
        const match=/^page\/(\d+)$/.exec(href);if(!match)throw new Error('Invalid PDF page resource');
        const page=Number(match[1]);if(!Number.isInteger(page)||page>=pages!)throw new Error('Invalid PDF page');
        return (await request({page})).bytes!;
      }};
  } catch(error) {close();throw new Error(`Não foi possível abrir PDF (arquivo inválido ou protegido por senha) / Cannot open PDF (invalid or password-protected file): ${String(error)}`);}
}
