import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {storageDirectory} from './storage';

export type LibraryLocation={root:string;favorite:boolean;visits:number;lastUsed:number;available:boolean};
async function json(file:string){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return undefined;}}
async function write(file:string,value:unknown){await fs.mkdir(path.dirname(file),{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,JSON.stringify(value));await fs.rename(temporary,file);}finally{await fs.unlink(temporary).catch(()=>{});}}
export async function recordLibraryVisit(root:string,appDirectory:string){
  const file=path.join(storageDirectory(root,appDirectory),'usage.json');const previous=await json(file);
  await write(file,{visits:Number.isSafeInteger(previous?.visits)&&previous.visits>=0?Math.min(Number.MAX_SAFE_INTEGER,previous.visits+1):1,lastUsed:Date.now()});
}
export async function setLibraryFavorite(root:string,appDirectory:string,favorite:boolean){
  const directory=storageDirectory(root,appDirectory);await fs.mkdir(directory,{recursive:true});
  try{await fs.writeFile(path.join(directory,'library.json'),JSON.stringify({relativeToApp:path.relative(appDirectory,root)||'.'},null,2),{flag:'wx'});}catch(error:any){if(error.code!=='EEXIST')throw error;}
  await write(path.join(directory,'favorite.json'),{favorite});
}
export async function listLibraryLocations(appDirectory:string):Promise<LibraryLocation[]> {
  const directory=path.join(appDirectory,'.ler','libraries');let entries;
  try{entries=await fs.readdir(directory,{withFileTypes:true});}catch(error:any){if(error.code==='ENOENT')return [];throw error;}
  const rows=await Promise.all(entries.filter(e=>e.isDirectory()).map(async entry=>{
    const folder=path.join(directory,entry.name);const info=await json(path.join(folder,'library.json'));
    if(typeof info?.relativeToApp!=='string')return;
    const root=path.resolve(appDirectory,info.relativeToApp);const relative=path.relative(appDirectory,root);
    // Installed code, test fixtures, caches and backups are not personal libraries.
    if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))return;
    const [favorite,usage,stat]=await Promise.all([json(path.join(folder,'favorite.json')),json(path.join(folder,'usage.json')),fs.stat(root).catch(()=>undefined)]);
    const available=!!stat?.isDirectory();if(!available&&favorite?.favorite!==true)return;
    const modified=(await fs.stat(path.join(folder,'library.json'))).mtimeMs;
    return {root,favorite:favorite?.favorite===true,available,visits:Number.isSafeInteger(usage?.visits)&&usage.visits>=0?usage.visits:0,lastUsed:Number.isFinite(usage?.lastUsed)&&usage.lastUsed>=0?usage.lastUsed:modified};
  }));
  const unique=new Map<string,LibraryLocation>();for(const row of rows){if(row)unique.set(process.platform==='win32'?row.root.toLowerCase():row.root,row);}
  return [...unique.values()].sort((a,b)=>Number(b.favorite)-Number(a.favorite)||b.lastUsed-a.lastUsed||b.visits-a.visits||a.root.localeCompare(b.root));
}
