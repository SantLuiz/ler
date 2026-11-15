import {indexLibrary,type Catalog} from './catalog';
self.onmessage=async(event:MessageEvent<{root:string;ignored:string;cached:Catalog}>)=>{
 let errors=0;
 try{await indexLibrary(event.data.root,event.data.ignored,event.data.cached,entry=>self.postMessage({type:'entry',entry}),()=>errors++);self.postMessage({type:'done',errors});}catch(e){self.postMessage({type:'error',message:String(e)});}
};
