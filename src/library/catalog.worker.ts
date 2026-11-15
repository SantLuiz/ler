import {indexLibrary,type Catalog,type CatalogEntry} from './catalog';
self.onmessage=async(event:MessageEvent<{root:string;ignored:string;cached:Catalog}>)=>{
 let errors=0,pending:CatalogEntry[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
 const flush=()=>{if(timer)clearTimeout(timer);timer=undefined;if(pending.length){self.postMessage({type:'entries',entries:pending});pending=[];}};
 try{
  await indexLibrary(event.data.root,event.data.ignored,event.data.cached,entry=>{
   pending.push(entry);if(pending.length>=100)flush();else timer??=setTimeout(flush,50);
  },()=>errors++);
  flush();self.postMessage({type:'done',errors});
 }catch(e){flush();self.postMessage({type:'error',message:String(e)});}
 finally{if(timer)clearTimeout(timer);}
};
