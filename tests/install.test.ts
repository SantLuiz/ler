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
},35000);
test.skipIf(process.platform!=='win32')('installer validation is repeatable without changing the user PATH',()=>{
 const script=path.resolve(import.meta.dir,'../scripts/install.ps1').replaceAll("'","''");const command=`$before = [Environment]::GetEnvironmentVariable('Path','User'); & '${script}' -NoPath -NoContextMenu -SkipDependencies; & '${script}' -NoPath -NoContextMenu -SkipDependencies; if ($before -cne [Environment]::GetEnvironmentVariable('Path','User')) { throw 'PATH changed' }`;
 const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',command],{encoding:'utf8',timeout:15000});expect(result.status).toBe(0);
},35000);

test.skipIf(process.platform!=='win32')('context menu plan covers only supported formats and the Explorer launcher preserves literal file paths',async()=>{
 const repo=path.resolve(import.meta.dir,'..');const root=await fs.mkdtemp(path.join(os.tmpdir(),'LER context menu '));
 try{
  const file=path.join(root,"Livro & $(whoami) ' acentuação.txt");await fs.writeFile(file,'Own text.');
  const helper=path.join(repo,'scripts/context-menu.ps1').replaceAll("'","''");
  const plan=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`. '${helper}'; @(Get-LerContextMenuEntries '${repo.replaceAll("'","''")}') | ConvertTo-Json -Compress`],{encoding:'utf8',timeout:15000});
  if(plan.status!==0||!plan.stdout.trim())throw new Error(plan.stderr);expect(plan.status).toBe(0);const entries=JSON.parse(plan.stdout.trim());expect(entries.length).toBe(3);
  for(const [i,extension] of ['.epub','.pdf','.txt'].entries()){expect(entries[i].Key).toBe(`HKCU:\\Software\\Classes\\SystemFileAssociations\\${extension}\\shell\\LER.open`);expect(entries[i].Command).toContain(`-File "${path.join(repo,'scripts/open-book.ps1')}" "%1"`);expect(entries[i].Owner).toBe(repo);}
  const launched=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(repo,'scripts/open-book.ps1'),file,'-Check'],{cwd:root,encoding:'utf8',timeout:15000});
  if(launched.status!==0)throw new Error(launched.stdout+launched.stderr);expect(JSON.parse(launched.stdout.trim()).file).toBe(file);
 }finally{await fs.rm(root,{recursive:true,force:true});}
},35000);
