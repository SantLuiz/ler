import {test,expect} from 'bun:test';
import {parseArgs,libraryRoot,VERSION} from '../src/cli';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('CLI chooses cwd, repo parent or explicit library without a remembered-folder override',()=>{
 const root=path.resolve('library');const app=path.join(root,'LER');
 expect(libraryRoot(parseArgs([]),root,app)).toBe(root);
 expect(libraryRoot(parseArgs([]),app,app)).toBe(root);
 expect(libraryRoot(parseArgs([]),path.join(app,'src'),app)).toBe(root);
 expect(libraryRoot(parseArgs(['other folder']),root,app)).toBe(path.join(root,'other folder'));
 expect(parseArgs(['--choose','--lang','pt-BR']).choose).toBe(true);
 expect(()=>parseArgs(['--library'])).toThrow();expect(()=>parseArgs(['--lang','fr'])).toThrow();expect(()=>parseArgs(['--unknown'])).toThrow();expect(()=>parseArgs(['first','second'])).toThrow();
 expect(parseArgs(['--open','a book.epub']).open).toBe('a book.epub');expect(()=>parseArgs(['--open'])).toThrow();expect(()=>parseArgs(['--open','a','--open','b'])).toThrow();
 expect(libraryRoot(parseArgs(['--open',path.join(root,'category/book.txt')]),app,app)).toBe(root);
 const outside=path.resolve('other','book.txt');expect(libraryRoot(parseArgs(['--open',outside]),app,app)).toBe(path.dirname(outside));
});
test('entrypoint runs from a different folder with explicit preload and preserves cwd',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'LER biblioteca com espaços & '));const app=path.resolve(import.meta.dir,'..');
 try{
  async function run(args:string[]){const child=Bun.spawn([process.execPath,'--preload',path.join(app,'scripts/preload.ts'),path.join(app,'src/main.tsx'),...args],{cwd:root,stdout:'pipe',stderr:'pipe'});return {code:await child.exited,out:await new Response(child.stdout).text(),err:await new Response(child.stderr).text()};}
  const checked=await run(['--check']);expect(checked.code).toBe(0);expect(JSON.parse(checked.out).library).toBe(libraryRoot(parseArgs([]),root,app));expect(await fs.readdir(root)).toEqual([]);
  expect((await run(['--help'])).out).toContain('LER --choose');expect((await run(['--version'])).out.trim()).toBe(`LER ${VERSION}`);expect((await run(['--bogus'])).code).toBe(1);expect((await run(['missing','--check'])).code).toBe(1);
  const file=path.join(root,"Leitura & $(whoami) ' teste.txt");await fs.writeFile(file,'Text fixture.');
  const direct=await run(['--open',file,'--check']);expect(direct.code).toBe(0);expect(JSON.parse(direct.out).file).toBe(file);expect((await run(['--open',root,'--check'])).code).toBe(1);expect((await run(['--open',path.join(root,'missing.txt'),'--check'])).code).toBe(1);
  // Existing installed shortcuts using --choose must also start without a prompt.
  const chosen=Bun.spawn([process.execPath,'--preload',path.join(app,'scripts/preload.ts'),path.join(app,'src/main.tsx'),'--choose','--check'],{cwd:root,stdin:'ignore',stdout:'pipe',stderr:'pipe'});const output=await new Response(chosen.stdout).text();expect(await chosen.exited).toBe(0);expect(JSON.parse(output).library).toBe(libraryRoot(parseArgs(['--choose']),root,app));expect(output).not.toContain('Biblioteca / Library');
 }finally{await fs.rm(root,{recursive:true,force:true});}
},15000);
