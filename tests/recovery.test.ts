import {test,expect} from 'bun:test';
import {store,storageDirectory} from '../src/state/storage';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('recovering a corrupt primary never overwrites the healthy backup with corrupt bytes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-recovery-'));
 try{let disk=await store(root,path.join(root,'LER'));disk.state.lang='pt-BR';await disk.save();await disk.save();await disk.close();const primary=path.join(storageDirectory(root,path.join(root,'LER')),'state.json');await fs.writeFile(primary,'broken');disk=await store(root,path.join(root,'LER'));expect(disk.state.lang).toBe('pt-BR');await disk.save();await disk.close();await fs.writeFile(primary,'broken again');disk=await store(root,path.join(root,'LER'));expect(disk.state.lang).toBe('pt-BR');await disk.close();expect((await fs.readdir(path.dirname(primary))).filter(n=>n.includes('.corrupt-')).length).toBe(2);}finally{await fs.rm(root,{recursive:true,force:true});}
});
