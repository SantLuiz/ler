import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {store,storageDirectory,type State} from './storage';
import type {Book} from '../readers/book';
import {bookFormat} from '../readers/formats';

export type LibraryContext={root:string;state:State;persistence?:Awaited<ReturnType<typeof store>>};
const identity=(file:string)=>process.platform==='win32'?path.resolve(file).toLowerCase():path.resolve(file);
export class ReadingWorkspace {
  readonly state:State;
  readonly opened:Book[];
  private libraries=new Map<string,LibraryContext>();
  private owners=new Map<string,LibraryContext>();
  private active:LibraryContext;
  private queue=Promise.resolve();
  private closed=false;
  private shutdown?:Promise<void>;
  private lastManifest?:string;
  readonly persistence:Awaited<ReturnType<typeof store>>;
  constructor(initial:LibraryContext,readonly appDirectory:string,opened:Book[]){
    this.active=initial;this.opened=opened;
    this.state={...initial.state,books:{},tabs:[...initial.state.tabs]};this.attach(initial);
    const workspace=this;
    this.persistence={get directory(){return workspace.active.persistence?.directory??storageDirectory(workspace.root,workspace.appDirectory);},state:this.state,save:()=>this.save(),close:()=>this.close()};
  }
  get root(){return this.active.root;}
  get libraryState(){this.sync();return this.active.state;}
  get directories(){return [...this.libraries.values()].flatMap(c=>c.persistence?[c.persistence.directory]:[]);}
  private attach(context:LibraryContext){
    this.libraries.set(identity(context.root),context);
    for(const [id,saved] of Object.entries(context.state.books))if(!this.state.books[id]){this.state.books[id]={...saved,file:path.resolve(context.root,saved.file)};this.owners.set(id,context);}
  }
  bindBook(id:string,file:string){
    const absolute=path.resolve(file);
    const owner=[...this.libraries.values()].find(c=>Object.values(c.state.books).some(saved=>identity(path.resolve(c.root,saved.file))===identity(absolute)))??this.active;
    const existing=this.state.books[id];
    if(!existing||this.owners.get(id)!==owner||identity(existing.file)!==identity(absolute)){
      const saved=owner.state.books[id];this.state.books[id]=saved?{...saved,file:absolute}:{file:absolute,anchor:{chapter:0,block:0,offset:0},bookmarks:[]};
    }
    this.owners.set(id,owner);
  }
  private sync(){
    this.active.state.lang=this.state.lang;this.active.state.preferences=this.state.preferences;this.active.state.catalog=this.state.catalog;
    for(const context of this.libraries.values()){
      for(const [id,owner] of this.owners)if(owner===context&&this.state.books[id])context.state.books[id]={...this.state.books[id],file:path.relative(context.root,this.state.books[id].file)};
      context.state.tabs=this.state.tabs.filter(id=>this.owners.get(id)===context);
      context.state.active=this.state.active&&this.owners.get(this.state.active)===context?this.state.active:undefined;
      if(this.state.lastRead&&this.owners.get(this.state.lastRead)===context)context.state.lastRead=this.state.lastRead;
    }
  }
  async select(root:string){
    if(this.closed)throw new Error('LER closed');
    let next=this.libraries.get(identity(root));let created=false;
    if(!next){const persistence=await store(root,this.appDirectory);next={root,state:persistence.state,persistence};created=true;}
    if(this.closed){if(created)await next.persistence?.close();throw new Error('LER closed');}
    const tabs=[...next.state.tabs];
    try{await this.save();}catch(error){if(created)await next.persistence?.close();throw error;}
    if(this.closed){if(created)await next.persistence?.close();throw new Error('LER closed');}
    if(created)this.attach(next);
    this.active=next;this.state.lang=next.state.lang;this.state.preferences=next.state.preferences;this.state.catalog=next.state.catalog;this.state.lastRead=next.state.lastRead;
    return {root:next.root,tabs};
  }
  async restore(){
    const initialTabs=[...this.state.tabs];const restored:string[]=[];
    let data;try{data=JSON.parse(await fs.readFile(path.join(this.appDirectory,'.ler','workspace.json'),'utf8'));}catch{return;}
    if(data?.version!==1||!Array.isArray(data.tabs))return;
    for(const row of data.tabs.slice(0,200)){
      if(this.closed)break;
      if(typeof row?.id!=='string'||typeof row.file!=='string'||typeof row.library!=='string')continue;
      const file=path.resolve(this.appDirectory,row.file),root=path.resolve(this.appDirectory,row.library);if(!bookFormat(file))continue;
      let context=this.libraries.get(identity(root));
      if(!context){try{if(!(await fs.stat(root)).isDirectory())continue;const persistence=await store(root,this.appDirectory);if(this.closed){await persistence.close();break;}context={root,state:persistence.state,persistence};this.attach(context);}catch{continue;}}
      if(!context.state.books[row.id])continue;
      this.bindBook(row.id,file);if(!restored.includes(row.id))restored.push(row.id);
    }
    this.state.tabs=[...restored,...initialTabs.filter(id=>!restored.includes(id))];
  }
  save(){
    if(this.closed)return this.queue;
    this.sync();const pending=[...this.libraries.values()].map(c=>c.persistence?.save());
    const tabs=this.state.tabs.flatMap(id=>{const owner=this.owners.get(id),book=this.state.books[id];return owner&&book?[{id,file:path.relative(this.appDirectory,book.file),library:path.relative(this.appDirectory,owner.root)||'.'}]:[];});
    const manifest=JSON.stringify({version:1,tabs});
    this.queue=this.queue.catch(()=>{}).then(async()=>{
      await Promise.all(pending);
      if(manifest===this.lastManifest)return;
      const file=path.join(this.appDirectory,'.ler','workspace.json'),temporary=file+'.'+randomUUID()+'.tmp';
      await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(temporary,manifest);await fs.rename(temporary,file);this.lastManifest=manifest;}finally{await fs.unlink(temporary).catch(()=>{});}
    });return this.queue;
  }
  close(){return this.shutdown??=(async()=>{this.closed=true;await this.queue.catch(()=>{});await Promise.all([...this.libraries.values()].map(c=>c.persistence?.close()));})();}
}
