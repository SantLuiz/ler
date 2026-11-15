import {test,expect} from 'bun:test';
test('worker searches all chapters and preserves anchors',async()=>{
 const worker=new Worker(new URL('../src/reading/search.worker.ts',import.meta.url).href);
 try {const response=new Promise<any[]>( (resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=e=>reject(new Error(e.message));});worker.postMessage({query:'OLÁ',chapters:[{blocks:[{text:'Nada'}]},{blocks:[{text:'Olá, olá!'}]}]});const results=await response;expect(results.length).toBe(2);expect(results[1].anchor).toEqual({chapter:1,block:0,offset:5});}finally{worker.terminate();}
});

test('search caps dense matches in chapter order and resets cleanly for a new or empty query',async()=>{
 const worker=new Worker(new URL('../src/reading/search.worker.ts',import.meta.url).href);
 const run=(query:string,chapters:any[])=>new Promise<any[]>((resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=e=>reject(new Error(e.message));worker.postMessage({query,chapters});});
 try{
  const found=await run('OLÁ',[{blocks:[{text:'Olá '.repeat(1200)}]},{blocks:[{text:'Olá after limit'}]}]);
  expect(found.length).toBe(1000);expect(found[999].anchor).toEqual({chapter:0,block:0,offset:3996});
  expect(await run(' ',[{blocks:[{text:'anything'}]}])).toEqual([]);
  const next=await run('👩🏽‍💻',[{blocks:[{text:'ação 👩🏽‍💻 final 👩🏽‍💻'}]}]);
  expect(next.map(row=>row.anchor.offset)).toEqual([5,19]);
  const expanded=await run('target',[{blocks:[{text:'İ target İ target'}]}]);expect(expanded.map(row=>row.anchor.offset)).toEqual([2,11]);
 }finally{worker.terminate();}
});
