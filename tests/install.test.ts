import {test,expect} from 'bun:test';
import {spawnSync} from 'node:child_process';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {libraryRoot,parseArgs} from '../src/cli';
test.skipIf(process.platform!=='win32')('CMD launcher works through PATH in folders with spaces, accents and ampersands',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'LER livros & ficção '));const repo=path.resolve(import.meta.dir,'..');
 try{const env={...process.env,PATH:path.join(repo,'bin')+';'+process.env.PATH};const result=spawnSync('cmd.exe',['/d','/s','/c','LER --check'],{cwd:root,env,encoding:'utf8',timeout:15000});expect(result.status).toBe(0);expect(JSON.parse(result.stdout.trim()).library).toBe(libraryRoot(parseArgs([]),root,repo));
  const explicit=spawnSync('cmd.exe',['/d','/s','/c',`LER "${root}" --check`],{cwd:repo,env,encoding:'utf8',timeout:15000,windowsVerbatimArguments:true});if(explicit.status!==0)throw new Error(explicit.stderr);expect(explicit.status).toBe(0);expect(JSON.parse(explicit.stdout.trim()).library).toBe(root);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test.skipIf(process.platform!=='win32')('installer validation is repeatable without changing the user PATH',()=>{
 const script=path.resolve(import.meta.dir,'../scripts/install.ps1').replaceAll("'","''");const command=`$before = [Environment]::GetEnvironmentVariable('Path','User'); & '${script}' -NoPath -SkipDependencies; & '${script}' -NoPath -SkipDependencies; if ($before -cne [Environment]::GetEnvironmentVariable('Path','User')) { throw 'PATH changed' }`;
 const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',command],{encoding:'utf8',timeout:15000});expect(result.status).toBe(0);
});
