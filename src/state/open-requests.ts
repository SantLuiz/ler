import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {bookFormat} from '../readers/formats';

export async function requestBookOpen(directory:string,file:string) {
  const queue=path.join(directory,'open-requests');await fs.mkdir(queue,{recursive:true});
  const name=path.join(queue,randomUUID());
  await fs.writeFile(name+'.tmp',JSON.stringify({file:path.resolve(file),created:Date.now()}));
  await fs.rename(name+'.tmp',name+'.json');
}
export async function consumeBookRequests(directory:string,open:(file:string)=>Promise<unknown>) {
  const queue=path.join(directory,'open-requests');
  let names:string[];try{names=await fs.readdir(queue);}catch(error:any){if(error.code==='ENOENT')return;throw error;}
  for(const name of names.filter(n=>/^[\da-f-]+\.json$/i.test(n)).slice(0,20)) {
    const file=path.join(queue,name);const stat=await fs.lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink())continue;
    let request:{file:string;created:number}|undefined;
    try{if(stat.size<=16*1024){const value=JSON.parse(await fs.readFile(file,'utf8'));if(typeof value.file==='string'&&path.isAbsolute(value.file)&&bookFormat(value.file)&&typeof value.created==='number'&&Math.abs(Date.now()-value.created)<120_000)request=value;}}catch{}
    try{if(request)await open(request.file);}finally{await fs.unlink(file);}
  }
}
