import {promises as fs} from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]??path.join(import.meta.dir,'..'));
const seen=new Set<string>();let logical=0,unique=0,files=0;
for(const directory of ['node_modules','.ler/runtime']){
 const base=path.join(root,directory);let bytes=0,count=0;
 try{await fs.access(base);}catch{continue;}
 for await(const file of new Bun.Glob('**/*').scan({cwd:base,onlyFiles:true,dot:true})){
  const stat=await fs.stat(path.join(base,file),{bigint:true});if(!stat.isFile())continue;
  logical+=Number(stat.size);const key=`${stat.dev}:${stat.ino}`;
  if(!seen.has(key)){seen.add(key);bytes+=Number(stat.size);unique+=Number(stat.size);}
  count++;files++;
 }
 console.log(`${directory}: ${(bytes/1048576).toFixed(2)} MiB, ${count} files`);
}
console.log(JSON.stringify({files,logicalMiB:Number((logical/1048576).toFixed(2)),uniqueFileMiB:Number((unique/1048576).toFixed(2)),scope:'dependency files and local runtime; hard links counted once, excludes caches, backups and filesystem block overhead'},null,2));
