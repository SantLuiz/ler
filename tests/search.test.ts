import {test,expect} from 'bun:test';
test('worker searches all chapters and preserves anchors',async()=>{
 const worker=new Worker(new URL('../src/search.worker.ts',import.meta.url).href);
 try {const response=new Promise<any[]>( (resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=e=>reject(new Error(e.message));});worker.postMessage({query:'OLÁ',chapters:[{blocks:[{text:'Nada'}]},{blocks:[{text:'Olá, olá!'}]}]});const results=await response;expect(results.length).toBe(2);expect(results[1].anchor).toEqual({chapter:1,block:0,offset:5});}finally{worker.terminate();}
});
