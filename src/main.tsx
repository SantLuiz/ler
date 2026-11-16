import type {CliRenderer} from '@opentui/core';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {Book} from './readers/book';
import {store,storageDirectory,knownLibraryRoot,migrateLegacyConfig,type State} from './state/storage';
import {parseArgs,libraryRoot,helpText,interfaceLanguage,VERSION} from './cli';
import {bookFormat} from './readers/formats';
import {requestBookOpen} from './state/open-requests';

async function main() {
  const options=parseArgs(process.argv.slice(2));
  const language=interfaceLanguage(process.argv.slice(2));
  const label=(pt:string,en:string)=>language==='pt-BR'?pt:en;
  if(options.help){console.log(helpText(language));return;}
  if(options.version){console.log(`LER ${VERSION}`);return;}
  const appDirectory=path.resolve(import.meta.dir,'..');
  const initialFile=options.open?path.resolve(options.open):undefined;
  if(initialFile&&(!bookFormat(initialFile)||!(await fs.stat(initialFile)).isFile()))throw new Error(label('Arquivo inválido: use EPUB, TXT ou PDF','Invalid book file: use EPUB, TXT or PDF'));
  let root=libraryRoot(options,process.cwd(),appDirectory);
  if(initialFile&&!options.library&&!options.choose)root=await knownLibraryRoot(initialFile,appDirectory)??root;
  if(!(await fs.stat(root)).isDirectory())throw new Error(`${label('Não é uma pasta','Not a directory')}: ${root}`);
  if(options.check){console.log(JSON.stringify({name:'LER',version:VERSION,library:root,runtime:Bun.version,...(initialFile?{file:initialFile}:{})}));return;}
  let persistence:Awaited<ReturnType<typeof store>>|undefined;let warning='';
  try{persistence=await store(root,appDirectory);}catch(e:any){if(e.message.includes('already open')){if(initialFile){await requestBookOpen(storageDirectory(root,appDirectory),initialFile);console.log(label('Arquivo enviado ao LER aberto','Sent file to the running LER'));return;}throw e;}warning=`${label('Não foi possível salvar em LER/.ler','Cannot save to LER/.ler')}: ${e.message}`;}
  try{await migrateLegacyConfig(path.join(process.env.APPDATA??path.join(os.homedir(),'.config'),'leitor'),appDirectory);}catch(e:any){warning+=` ${label('Configuração antiga não migrada','Legacy configuration not migrated')}: ${e.message}`;}
  const state:State=persistence?.state??{version:1,books:{},tabs:[],lang:language};
  if(options.lang)state.lang=options.lang;
  let opened:Book[]=[];let renderer:CliRenderer|undefined;let exiting=false;
  async function exit(){if(exiting)return;exiting=true;try{await persistence?.save();}finally{opened.forEach(book=>book.close());try{await persistence?.close();}finally{renderer?.destroy();}}}
  const interrupt=()=>void exit();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
  try{const {startInterface}=await import('./ui/start');await startInterface({onSessionChange:session=>{persistence=session.persistence;opened=session.opened;},root,appDirectory,state,initialFile,warning,persistence,opened,exit},value=>{renderer=value;});}
  catch(e){await exit();throw e;}
}
await main().catch(e=>{const hint=interfaceLanguage(process.argv.slice(2))==='pt-BR'?'Use LER --help para ver as opções.':'Use LER --help to see available options.';console.error(`LER: ${e.message}\n${hint}`);process.exitCode=1;});
