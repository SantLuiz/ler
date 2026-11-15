import {createSignal,onCleanup,onMount,Show} from 'solid-js';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {App} from './App';
import {ReadingWorkspace} from '../state/workspace';
import {recordLibraryVisit} from '../state/library-locations';

export type LibrarySessionState=Pick<Parameters<typeof App>[0],'root'|'state'|'persistence'|'opened'>;
export function LibrarySession(props:Parameters<typeof App>[0]&{onSessionChange:(session:LibrarySessionState)=>void}) {
  const appDirectory=props.appDirectory??path.resolve(import.meta.dir,'../..');
  const workspace=new ReadingWorkspace({root:props.root,state:props.state,persistence:props.persistence},appDirectory,props.opened);
  const [root,setRoot]=createSignal(props.root),[ready,setReady]=createSignal(false);
  let changing=false,disposed=false;
  const publish=()=>props.onSessionChange({root:workspace.root,state:workspace.state,persistence:workspace.persistence,opened:workspace.opened});
  onCleanup(()=>{disposed=true;});
  onMount(()=>{void (async()=>{publish();await workspace.restore();if(disposed)return;setReady(true);if(props.persistence)await recordLibraryVisit(root(),appDirectory);})().catch(()=>{if(!disposed){publish();setReady(true);}});});
  async function changeLibrary(value:string){
    const next=await fs.realpath(path.resolve(value));
    if((process.platform==='win32'?next.toLowerCase():next)===(process.platform==='win32'?root().toLowerCase():root()))return;
    if(changing)throw new Error('Aguarde a troca de biblioteca / Please wait for library switch');
    if(!(await fs.stat(next)).isDirectory())throw new Error('Selecione uma pasta / Select a directory');
    changing=true;
    try {const result=await workspace.select(next);if(disposed)return;setRoot(result.root);publish();void recordLibraryVisit(next,appDirectory).catch(()=>{});return result;}finally{changing=false;}
  }
  return <Show when={ready()}><App root={root()} state={workspace.state} persistence={workspace.persistence} opened={workspace.opened} appDirectory={appDirectory} warning={props.warning} initialFile={props.initialFile} exit={props.exit} onLibraryChange={changeLibrary} globalTabs onBookOpen={(id,file)=>workspace.bindBook(id,file)} libraryState={()=>workspace.libraryState} openRequestDirectories={()=>workspace.directories}/></Show>;
}
