import {createMemo,createSignal,For,Show} from 'solid-js';
import {useKeyboard,useTerminalDimensions} from '@opentui/solid';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {useTheme} from '../theme';
import {shortLibraryPath} from '../library-path';
import {folderMatches} from '../home';
import {listLibraryLocations,setLibraryFavorite,type LibraryLocation} from '../../state/library-locations';
import {KeyHints} from './KeyHints';

export function LibraryPicker(props:{root:string;appDirectory:string;lang:'en'|'pt-BR';onChoose:(root:string)=>Promise<void>}) {
  const colors=useTheme(),size=useTerminalDimensions();const label=(pt:string,en:string)=>props.lang==='pt-BR'?pt:en;
  const [tab,setTab]=createSignal<'folders'|'recent'|'frequent'>('folders');
  const [directory,setDirectory]=createSignal(props.root),[value,setValue]=createSignal(props.root);
  const [folders,setFolders]=createSignal<{name:string;file:string}[]>([]),[selected,setSelected]=createSignal(0);
  const [history,setHistory]=createSignal<LibraryLocation[]>([]),[filter,setFilter]=createSignal('');
  const [error,setError]=createSignal(''),[busy,setBusy]=createSignal(false);
  let request=0;
  const sameRoot=(a:string,b:string)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
  const resolve=(value:string)=>path.resolve(directory(),value.trim().replace(/^"(.*)"$/,'$1'));
  const saved=createMemo(()=>history().filter(row=>folderMatches(row.root,filter())).toSorted((a,b)=>(tab()==='frequent'?b.visits-a.visits:Number(b.favorite)-Number(a.favorite))||b.lastUsed-a.lastUsed));
  async function refreshHistory(){try{setHistory(await listLibraryLocations(props.appDirectory));}catch(e){setError(String(e));}}
  async function browse(value:string){
    const id=++request;
    try{
      const full=await fs.realpath(resolve(value));const entries=await fs.readdir(full,{withFileTypes:true});if(id!==request)return;
      setDirectory(full);setValue(full);if(tab()==='folders')setSelected(0);setError('');
      setFolders([...(path.dirname(full)!==full?[{name:'..',file:path.dirname(full)}]:[]),...entries.filter(e=>e.isDirectory()&&!['.git','.ler','.leitor','.cache','node_modules'].includes(e.name)).sort((a,b)=>a.name.localeCompare(b.name)).map(e=>({name:e.name,file:path.join(full,e.name)}))]);
    }catch(e){if(id===request)setError(String(e));}
  }
  async function choose(value=directory()){
    if(busy())return;setBusy(true);setError('');try{await props.onChoose(resolve(value));}catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function toggleFavorite(root=tab()==='folders'?directory():saved()[selected()]?.root){
    if(!root||busy())return;setBusy(true);setError('');
    try{const favorite=history().find(row=>sameRoot(row.root,root))?.favorite??false;await setLibraryFavorite(root,props.appDirectory,!favorite);await refreshHistory();if(tab()!=='folders')setSelected(Math.max(0,saved().findIndex(row=>sameRoot(row.root,root))));}
    catch(e){setError(String(e));}finally{setBusy(false);}
  }
  function selectTab(next:ReturnType<typeof tab>){if(busy())return;setTab(next);setSelected(0);setError('');}
  async function submit(){
    if(busy())return;
    if(tab()!=='folders'){const entry=saved()[selected()];if(entry)await choose(entry.root);return;}
    if(resolve(value())!==directory()){await browse(value());return;}
    if(selected()===0)await choose();else {const folder=folders()[selected()-1];if(folder)await browse(folder.file);}
  }
  useKeyboard(e=>{
    if(busy()){e.preventDefault();return;}
    if(e.name==='tab'){e.preventDefault();const tabs=['folders','recent','frequent'] as const;selectTab(tabs[(tabs.indexOf(tab())+(e.shift?-1:1)+tabs.length)%tabs.length]);}
    else if(e.ctrl&&e.name==='f'){e.preventDefault();void toggleFavorite();}
    else if(e.ctrl&&e.name==='return'){e.preventDefault();if(tab()==='folders')void choose(value());else void submit();}
    else if(e.name==='up'||e.name==='down'){e.preventDefault();const count=tab()==='folders'?folders().length+1:saved().length;setSelected((selected()+(e.name==='up'?-1:1)+Math.max(1,count))%Math.max(1,count));}
  });
  void browse(props.root);void refreshHistory();
  const height=()=>Math.max(12,Math.min(size().height-6,18));
  const rows=()=>Math.max(1,height()-10);
  const options=()=>[{name:label('✓ Usar esta pasta','✓ Use this folder'),file:''},...folders()];
  const offset=()=>Math.max(0,selected()-rows()+1);
  return <box id="library-picker" position="absolute" left={3} top={3} width={Math.max(40,size().width-6)} height={height()} backgroundColor={colors().panel} border borderColor={colors().accent} padding={1} flexDirection="column">
    <text height={1} fg={colors().foreground}><b>{label('Selecionar biblioteca','Choose library')}</b></text>
    <box height={1} flexDirection="row" gap={2}>
      <For each={[{id:'folders' as const,name:label('Pastas','Folders')},{id:'recent' as const,name:label('Favoritos e recentes','Favorites & recent')},{id:'frequent' as const,name:label('Mais usadas','Most used')}]}>{item=><text height={1} flexShrink={0} fg={tab()===item.id?colors().accent:colors().muted} onMouseDown={()=>selectTab(item.id)}>{item.name}</text>}</For>
      <text height={1} flexShrink={0} fg={colors().secondary} onMouseDown={()=>void toggleFavorite()}>{history().some(row=>sameRoot(row.root,tab()==='folders'?directory():saved()[selected()]?.root??'')&&row.favorite)?'★':'☆'}</text>
    </box>
    <Show when={tab()==='folders'} fallback={<input id="library-history-search" focused value={filter()} placeholder={label('Filtrar caminhos salvos…','Filter saved locations…')} onInput={v=>{setFilter(v);setSelected(0);}} onSubmit={()=>void submit()} textColor={colors().foreground} backgroundColor={colors().panel}/>}>
      <input id="library-directory" focused value={value()} onInput={setValue} onSubmit={()=>void submit()} textColor={colors().foreground} backgroundColor={colors().panel}/>
    </Show>
    <KeyHints items={[["tab",label('abas','tabs')],["↑↓",label('escolher','choose')],["↵",label('abrir','open')],["ctrl+f",'★'],["esc",label('voltar','back')]]}/>
    <Show when={tab()==='folders'} fallback={<>
      <For each={saved().slice(offset(),offset()+rows())}>{(entry,i)=><box height={1} flexDirection="row" backgroundColor={selected()===offset()+i()?colors().selected:colors().panel}>
        <text height={1} width={3} fg={selected()===offset()+i()?colors().selectedText:colors().secondary} onMouseDown={e=>{e.stopPropagation();void toggleFavorite(entry.root);}}>{entry.favorite?'★ ':'☆ '}</text>
        <text height={1} flexGrow={1} fg={selected()===offset()+i()?colors().selectedText:colors().foreground} onMouseDown={()=>void choose(entry.root)}>{shortLibraryPath(entry.root,Math.max(8,size().width-24-(entry.available?0:14)))}{!entry.available?label(' (indisponível)',' (unavailable)'):entry.visits?' · '+entry.visits+'×':''}</text>
      </box>}</For>
      <Show when={!saved().length}><text height={1} fg={colors().muted}>{label('Nenhum caminho salvo encontrado.','No matching saved locations.')}</text></Show>
    </>}>
      <For each={options().slice(offset(),offset()+rows())}>{(entry,i)=><text height={1} fg={selected()===offset()+i()?colors().selectedText:colors().foreground} bg={selected()===offset()+i()?colors().selected:colors().panel} onMouseDown={()=>{if(!busy()){if(entry.file)void browse(entry.file);else void choose();}}}>{entry.file?'▸ ':''}{entry.name}</text>}</For>
    </Show>
    <text height={2} fg={colors().secondary}>{busy()?label('Aguarde…','Please wait…'):error()||(tab()==='folders'?'':saved()[selected()]?.root??'')}</text>
  </box>;
}
