import {App} from './app';
import {createCliRenderer} from '@opentui/core';
import {render} from '@opentui/solid';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createInterface} from 'node:readline/promises';
import type {Book} from './book';
import {store,migrateLegacyConfig,type State} from './storage';
import {parseArgs,libraryRoot,HELP,VERSION} from './cli';

async function main() {
  const options=parseArgs(process.argv.slice(2));
  if(options.help){console.log(HELP);return;}
  if(options.version){console.log(`LER ${VERSION}`);return;}
  const appDirectory=path.resolve(import.meta.dir,'..');
  let root=libraryRoot(options,process.cwd(),appDirectory);
  if(options.choose){const rl=createInterface({input:process.stdin,output:process.stdout});try{const answer=(await rl.question(`Biblioteca / Library [${root}]: `)).trim();if(answer)root=path.resolve(answer.replace(/^"(.*)"$/,'$1'));}finally{rl.close();}}
  if(!(await fs.stat(root)).isDirectory())throw new Error(`Not a directory / Não é uma pasta: ${root}`);
  if(options.check){console.log(JSON.stringify({name:'LER',version:VERSION,library:root,runtime:Bun.version}));return;}
  let persistence:Awaited<ReturnType<typeof store>>|undefined;let warning='';
  try{persistence=await store(root,appDirectory);}catch(e:any){if(e.message.includes('already open'))throw e;warning=`Não foi possível salvar em LER/.ler / Cannot save to LER/.ler: ${e.message}`;}
  try{await migrateLegacyConfig(path.join(process.env.APPDATA??path.join(os.homedir(),'.config'),'leitor'),appDirectory);}catch(e:any){warning+=` Configuração antiga não migrada / Legacy configuration not migrated: ${e.message}`;}
  const state:State=persistence?.state??{version:1,books:{},tabs:[],lang:Intl.DateTimeFormat().resolvedOptions().locale.startsWith('pt')?'pt-BR':'en'};
  if(options.lang)state.lang=options.lang;
  const opened:Book[]=[];let renderer:Awaited<ReturnType<typeof createCliRenderer>>|undefined;let exiting=false;
  async function exit(){if(exiting)return;exiting=true;try{await persistence?.save();}finally{opened.forEach(book=>book.close());try{await persistence?.close();}finally{renderer?.destroy();}}}
  const interrupt=()=>void exit();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
  try{renderer=await createCliRenderer({exitOnCtrlC:false,consoleOptions:{title:'Console · Esc/F12: fechar / close'}});renderer.setTerminalTitle('LER — Leitor Extremamente Reduzido');await render(()=><App root={root} appDirectory={appDirectory} state={state} warning={warning} persistence={persistence} opened={opened} exit={exit}/>,renderer);}
  catch(e){await exit();throw e;}
}
await main().catch(e=>{console.error(`LER: ${e.message}\nUse LER --help para ver as opções.`);process.exitCode=1;});
