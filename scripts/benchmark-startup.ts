import path from 'node:path';

// Import/startup cost only: no personal libraries are opened or modified.
const app=path.resolve(process.argv[2]??path.join(import.meta.dir,'..'));
const compiled=await Bun.file(path.join(app,'src/main.js')).exists();
const bun=await Bun.file(path.join(app,'.ler/runtime/bun.exe')).exists()?path.join(app,'.ler/runtime/bun.exe'):process.execPath;
const preload=path.join(app,`scripts/preload.${compiled?'js':'ts'}`);
const results:{checkMs:number;uiImportMs:number;rssMiB:number}[]=[];
async function run(args:string[]){
  const start=performance.now();
  const child=Bun.spawn([bun,'--preload',preload,...args],{cwd:path.dirname(app),stdout:'pipe',stderr:'pipe'});
  const [out,err,code]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
  if(code!==0)throw new Error(err||out);
  return {ms:performance.now()-start,out};
}
for(let i=0;i<6;i++){
  const checked=await run([path.join(app,`src/main.${compiled?'js':'tsx'}`),'--check']);
  const imported=await run(['--eval',`await import(${JSON.stringify(path.join(app,`src/ui/LibrarySession.${compiled?'js':'tsx'}`))}); Bun.gc(true); console.log(JSON.stringify(process.memoryUsage()));`]);
  if(i)results.push({checkMs:checked.ms,uiImportMs:imported.ms,rssMiB:JSON.parse(imported.out).rss/1048576});
}
function median(values:number[]){return Number(values.sort((a,b)=>a-b)[Math.floor(values.length/2)].toFixed(2));}
console.log(JSON.stringify({app,compiled,samples:results.length,median:{checkMs:median(results.map(r=>r.checkMs)),uiImportMs:median(results.map(r=>r.uiImportMs)),rssMiB:median(results.map(r=>r.rssMiB))},scope:'Process startup plus CLI check or UI module import; excludes terminal drawing, book restoration and terminal host startup.'},null,2));
