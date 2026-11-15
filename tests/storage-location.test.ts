import {test,expect} from 'bun:test';
import {store,storageDirectory,migrateLegacyConfig,type State} from '../src/storage';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const sample=():State=>({version:1,lang:'pt-BR',books:{book:{file:'livro.epub',anchor:{chapter:2,block:4,offset:8},bookmarks:[]}},tabs:[],lastRead:'book'});
test('data is created lazily inside the clone and libraries remain isolated',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-location-'));const app=path.join(root,'LER');const first=path.join(root,'Books A');const second=path.join(root,'Books B');
 try{await fs.mkdir(app);await fs.mkdir(first);await fs.mkdir(second);expect(await fs.readdir(app)).toEqual([]);const a=await store(first,app);const b=await store(second,app);expect(a.directory.startsWith(app+path.sep)).toBe(true);expect(a.directory).not.toBe(b.directory);await expect(store(first,app)).rejects.toThrow('already open');a.state.lang='pt-BR';b.state.lang='en';await a.save();await b.save();await a.close();await b.close();expect(await fs.readdir(first)).toEqual([]);expect(await fs.readdir(second)).toEqual([]);const restored=await store(first,app);expect(restored.state.lang).toBe('pt-BR');await restored.close();
 // Moving clone and libraries together preserves their relative storage identity.
 expect(path.relative(app,storageDirectory(first,app))).toBe(path.relative(path.join(root,'moved/LER'),storageDirectory(path.join(root,'moved/Books A'),path.join(root,'moved/LER'))));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('legacy progress migrates into the clone and the empty legacy directory is removed',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-migration-'));const app=path.join(root,'LER');const legacy=path.join(root,'.leitor');
 try{await fs.mkdir(legacy);await fs.writeFile(path.join(legacy,'state.json'),JSON.stringify(sample()));await fs.writeFile(path.join(legacy,'state.json.bak'),JSON.stringify(sample()));const disk=await store(root,app);expect(disk.state.books.book.anchor).toEqual({chapter:2,block:4,offset:8});expect(disk.state.lastRead).toBe('book');expect(await fs.stat(legacy).then(()=>true,()=>false)).toBe(false);expect(await fs.stat(path.join(disk.directory,'state.json.bak')).then(()=>true)).toBe(true);await disk.save();await disk.close();const restored=await store(root,app);expect(restored.state.lastRead).toBe('book');await restored.close();}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('legacy migration waits for the old reader to close and preserves unknown files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-migration-lock-'));const app=path.join(root,'LER');const legacy=path.join(root,'.leitor');
 try{await fs.mkdir(legacy);await fs.writeFile(path.join(legacy,'state.json'),JSON.stringify(sample()));await fs.writeFile(path.join(legacy,'notes.txt'),'keep');await fs.writeFile(path.join(legacy,'lock'),String(process.pid));await expect(store(root,app)).rejects.toThrow('already open');expect(await fs.readFile(path.join(legacy,'state.json'),'utf8')).toContain('livro.epub');await fs.unlink(path.join(legacy,'lock'));const disk=await store(root,app);expect(disk.state.lastRead).toBe('book');expect(await fs.readdir(legacy)).toEqual(['notes.txt']);await disk.close();}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('a corrupt legacy state recovers its backup without leaving data in the library',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-migration-backup-'));const app=path.join(root,'LER');const legacy=path.join(root,'.leitor');
 try{await fs.mkdir(legacy);await fs.writeFile(path.join(legacy,'state.json'),'bad');await fs.writeFile(path.join(legacy,'state.json.bak'),JSON.stringify(sample()));const disk=await store(root,app);expect(disk.state.lastRead).toBe('book');expect(await fs.readdir(disk.directory).then(files=>files.some(f=>f.includes('.corrupt-')))).toBe(true);await disk.close();expect(await fs.readdir(root)).toEqual(['LER']);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('runtime caches, configuration and temporary files are scoped to the clone',()=>{
 const app=path.resolve(import.meta.dir,'..');for(const variable of ['TEMP','TMP','TMPDIR','BUN_RUNTIME_TRANSPILER_CACHE_PATH','XDG_CACHE_HOME','XDG_CONFIG_HOME','XDG_DATA_HOME'])expect(process.env[variable]!.startsWith(path.join(app,'.ler')+path.sep)).toBe(true);
});
test('the early user-profile config is archived in the clone without creating a new profile config',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ler-config-migration-'));const app=path.join(root,'LER');const old=path.join(root,'old-profile/leitor');
 try{await fs.mkdir(old,{recursive:true});await fs.writeFile(path.join(old,'config.json'),JSON.stringify({library:'D:\\Books'}));await migrateLegacyConfig(old,app);expect(await fs.stat(old).then(()=>true,()=>false)).toBe(false);expect((await fs.readdir(path.join(app,'.ler/legacy'))).length).toBe(1);await migrateLegacyConfig(old,app);expect(await fs.stat(old).then(()=>true,()=>false)).toBe(false);}finally{await fs.rm(root,{recursive:true,force:true});}
});
