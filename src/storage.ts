import { promises as fs } from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import type { Anchor } from './book';
import type { Preferences } from './preferences';
import type { Catalog } from './catalog';
export type Saved = { file: string; anchor: Anchor; bookmarks: { anchor: Anchor; excerpt: string; date: string }[] };
export type State = { version: 1; books: Record<string, Saved>; tabs: string[]; active?: string; lastRead?: string; lang: 'en' | 'pt-BR'; preferences?: Preferences; catalog?: Catalog };
export function storageDirectory(root:string,appDirectory=path.resolve(import.meta.dir,'..')) {
  const relative=path.relative(path.resolve(appDirectory),path.resolve(root))||'.';
  const identity=process.platform==='win32'?relative.toLowerCase():relative;
  return path.join(appDirectory,'.ler','libraries',createHash('sha256').update(identity).digest('hex'));
}
async function exists(file:string){try{await fs.access(file);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
export async function migrateLegacyConfig(sourceDirectory:string,appDirectory:string) {
  const source=path.join(sourceDirectory,'config.json');if(!await exists(source))return;
  const stat=await fs.lstat(source);if(!stat.isFile()||stat.isSymbolicLink())return;
  const bytes=await fs.readFile(source);let config;try{config=JSON.parse(bytes.toString('utf8'));}catch{return;}
  if(typeof config.library!=='string')return;
  const destinationDirectory=path.join(appDirectory,'.ler','legacy');await fs.mkdir(destinationDirectory,{recursive:true});
  const destination=path.join(destinationDirectory,`config-${createHash('sha256').update(bytes).digest('hex')}.json`);
  await fs.writeFile(destination,bytes);if(!(await fs.readFile(destination)).equals(bytes))throw new Error('Legacy configuration copy failed');
  await fs.unlink(source);try{await fs.rmdir(sourceDirectory);}catch(e:any){if(e.code!=='ENOTEMPTY'&&e.code!=='EEXIST')throw e;}
}
async function migrateLegacy(root:string,dir:string) {
  const source=path.join(root,'.leitor');const pending=path.join(dir,'migration-pending.json');
  if(await exists(path.join(dir,'state.json'))&&!await exists(pending))return;
  let info;try{info=await fs.lstat(source);}catch(e:any){if(e.code==='ENOENT')return;throw e;}
  if(!info.isDirectory()||info.isSymbolicLink())return;
  const oldLock=path.join(source,'lock');
  if(await exists(oldLock)){const pid=Number(await fs.readFile(oldLock,'utf8'));if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0);throw new Error('Library already open / Feche a versão anterior do LER antes de migrar.');}catch(e:any){if(e.code!=='ESRCH')throw e;}}}
  const files=(await fs.readdir(source,{withFileTypes:true})).filter(e=>e.isFile()&&/^state\.json(?:\.bak|\.tmp|\.corrupt-\d+|\.bak\.corrupt-\d+)?$/.test(e.name)).map(e=>e.name);
  if(!files.length)return;
  await fs.writeFile(pending,JSON.stringify({source}));
  // Copy everything first. Never remove a source whose copy could not be verified.
  for(const name of files){const from=path.join(source,name);const to=path.join(dir,name);try{await fs.copyFile(from,to,constants.COPYFILE_EXCL);}catch(e:any){if(e.code!=='EEXIST')throw e;const [a,b]=await Promise.all([fs.readFile(from),fs.readFile(to)]);if(!a.equals(b))throw new Error(`Migration conflict: ${name}`);}}
  for(const name of files)await fs.unlink(path.join(source,name));
  if(await exists(oldLock))await fs.unlink(oldLock);
  try{await fs.rmdir(source);}catch(e:any){if(e.code!=='ENOTEMPTY'&&e.code!=='EEXIST')throw e;}
  await fs.unlink(pending);
}
export async function store(root: string,appDirectory=path.resolve(import.meta.dir,'..')) {
  const dir = storageDirectory(root,appDirectory); await fs.mkdir(dir, { recursive: true });
  const lock = path.join(dir, 'lock');
  try { const handle = await fs.open(lock, 'wx'); await handle.writeFile(String(process.pid)); await handle.close(); }
  catch { const pid = Number(await fs.readFile(lock, 'utf8')); try { process.kill(pid, 0); throw new Error('Library already open / Biblioteca já aberta'); } catch (e: any) { if (e.code !== 'ESRCH') throw e; } await fs.unlink(lock); return store(root,appDirectory); }
  try {
  await migrateLegacy(root,dir);
  await fs.writeFile(path.join(dir,'library.json'),JSON.stringify({relativeToApp:path.relative(path.resolve(appDirectory),path.resolve(root))||'.'},null,2));
  const filename = path.join(dir, 'state.json'); let state: State = { version: 1, books: {}, tabs: [], lang: Intl.DateTimeFormat().resolvedOptions().locale.startsWith('pt') ? 'pt-BR' : 'en' };
  for (const file of [filename, filename + '.bak']) { try { const parsed = JSON.parse(await fs.readFile(file, 'utf8')); if (parsed.version !== 1 || !parsed.books || !Array.isArray(parsed.tabs)) throw new Error('Invalid state'); state = parsed; break; } catch(e: any) { if(e.code!=='ENOENT') await fs.rename(file,file+'.corrupt-'+Date.now()).catch(()=>{}); } }
  let queue = Promise.resolve();
  const save = () => { const json = JSON.stringify(state, null, 2); queue = queue.catch(()=>{}).then(async () => { await fs.writeFile(filename + '.tmp', json); await fs.copyFile(filename, filename + '.bak').catch(() => {}); await fs.rename(filename + '.tmp', filename); }); return queue; };
  return { directory:dir, state, save, close: async () => { await queue.catch(() => {}); await fs.unlink(lock); } };
  }catch(e){await fs.unlink(lock).catch(()=>{});throw e;}
}
