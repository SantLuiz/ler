import {VERSION} from '../cli';
import { useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/solid';
import { batch, createSignal, createMemo, createEffect, createResource, onCleanup, on, For, Show } from 'solid-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openBook, layout, tocAnchor, type Book, type Anchor } from '../readers/book';
import { store, type State } from '../state/storage';
import { preferences, imageRows, type Preferences } from '../state/preferences';
import {searchCatalog,type Catalog,type CatalogEntry} from '../library/catalog';
import {folderMatches,type HomeAction} from './home';
import {paletteCommands,integerArgument} from './commands';
import {CommandBox} from './components/CommandBox';
import {HomeLogo} from './components/HomeLogo';
import {HomeStars} from './components/HomeStars';
import {KeyHints} from './components/KeyHints';
import {previousPage} from '../reading/pagination';
import {bookFormat,bookTitle} from '../readers/formats';
import {PdfPage,adjacentBand,type PdfViewport} from './components/PdfPage';
import {anchorAtCell,compareAnchors,orderedRange,rangeText,stepCursor,stepWordCursor,lineParts} from '../reading/highlights';
import {ReadingClock,newReadingStats,completeChapter,libraryStatistics,remainingChapterSeconds,duration} from '../state/statistics';
import {consumeBookRequests} from '../state/open-requests';

const dictionary = {
  library: ['Library', 'Biblioteca'],
  loading: ['Loading…', 'Carregando…'],
  search: ['Search', 'Buscar'],
  empty: ['No books here', 'Nenhum livro aqui'],
  toc: ['Contents', 'Sumário'],
  marks: ['Bookmarks', 'Marcadores'],
  help: ['Help', 'Ajuda'],
  settings: ['Commands', 'Comandos'],
  image: ['Image unavailable', 'Imagem indisponível']
} as const;
export function App(props: { root: string; appDirectory?: string; initialFile?:string; state: State; warning?: string; persistence?: Awaited<ReturnType<typeof store>>; opened: Book[]; exit: () => Promise<void> }) {
  const { root, state, persistence, opened, exit } = props; const warning = props.warning ?? '';
  const appDirectory=props.appDirectory??path.resolve(import.meta.dir,'../..');
  const dimensions = useTerminalDimensions(); const [language, setLanguage] = createSignal(state.lang);
  const renderer = useRenderer();
  const t = (key: keyof typeof dictionary) => dictionary[key][language() === 'en' ? 0 : 1];
  const label=(pt:string,en:string)=>language()==='pt-BR'?pt:en;
  const [tabs, setTabs] = createSignal<Book[]>([]); const [active, setActive] = createSignal(-1);
  const book = () => tabs()[active()]; const [chapter, setChapter] = createSignal(0); const [line, setLine] = createSignal(0);
  const pdf = () => book()?.format === 'pdf';
  const [pdfZoom,setPdfZoom]=createSignal(1);const [pdfX,setPdfX]=createSignal(0);const [pdfY,setPdfY]=createSignal(0);
  const [pdfViewport,setPdfViewport]=createSignal<PdfViewport>();
  createEffect(on(()=>book()?.id,()=>setPdfZoom(1)));
  createEffect(on(()=>[book()?.id,chapter()],()=>{setPdfX(0);setPdfY(0);setPdfViewport(undefined);}));
  const [directory, setDirectory] = createSignal(root!); const [entries, setEntries] = createSignal<{ name: string; full: string; dir: boolean }[]>([]); const [selected, setSelected] = createSignal(0);
  const [panel, setPanel] = createSignal(''); const [query, setQuery] = createSignal(''); const [status, setStatus] = createSignal(warning);
  const [selectedImage, setSelectedImage] = createSignal('');
  const [commandQuery,setCommandQuery]=createSignal('/');
  const [commandError,setCommandError]=createSignal('');
  const [tabFilter,setTabFilter]=createSignal('');
  const tabOptions=createMemo(()=>tabs().map((b,index)=>({book:b,index})).filter(row=>folderMatches(row.book.title,tabFilter())));
  const [cursor,setCursor]=createSignal<Anchor>();
  const [selectionStart,setSelectionStart]=createSignal<Anchor>();
  const [revision,setRevision]=createSignal(0);
  const [highlightFilter,setHighlightFilter]=createSignal('');
  const [onlyCurrent,setOnlyCurrent]=createSignal(false);
  const [paused,setPaused]=createSignal(false);
  const clock=new ReadingClock();
  let dragging=false;
  const changed=()=>setRevision(n=>n+1);
  function sampleReading(){const b=book();clock.sample(b?state.books[b.id]?.reading:undefined,pdf()?undefined:chapter(),!!b&&!panel()&&!renderer.console.visible&&!paused());}
  createEffect(on(()=>[active(),panel(),renderer.console.visible,paused()],()=>clock.touch()));
  const clockTimer=setInterval(()=>{sampleReading();changed();},1000);
  onCleanup(()=>{sampleReading();clearInterval(clockTimer);});
  const [libraryQuery,setLibraryQuery]=createSignal('');
  const [catalog,setCatalog]=createSignal<CatalogEntry[]>([]);
  const [librarySelected,setLibrarySelected]=createSignal(0);
  const [indexing,setIndexing]=createSignal(false);
  const [folderQuery,setFolderQuery]=createSignal('');
  const [lastBook,setLastBook]=createSignal<Book>();
  const [lastReadId,setLastReadId]=createSignal(state.lastRead??state.active??state.tabs.at(-1));
  const resumable=()=>!!(lastReadId()&&state.books[lastReadId()!]);
  const resumeTitle=()=>{const id=lastReadId();return tabs().find(b=>b.id===id)?.title??(lastBook()?.id===id?lastBook()!.title:bookTitle(state.books[id??'']?.file??''));};
  const homeActions=():HomeAction[]=>resumable()?['folders','continue','settings','help','highlights','statistics']:['folders','settings','help','highlights','statistics'];
  const actionLabel=(action:HomeAction)=>({folders:label('Biblioteca','Folders'),continue:label('Continuar','Resume'),settings:label('Aparência','Appearance'),help:label('Ajuda','Help'),refresh:label('Atualizar','Refresh'),quit:label('Sair','Quit'),highlights:label('Destaques','Highlights'),statistics:label('Estatísticas','Statistics')})[action];
  function openHomeOptions(last=false){setSelected(last?homeActions().length-1:0);setPanel('options');}
  function chooseHomeOption(index=selected()){const action=homeActions()[index];if(action){setPanel('');runAction(action);}}
  const home = () => active()===-1;
  const folderEntries = createMemo(()=>[
    ...(directory()!==root?[{name:'..',full:path.dirname(directory()),dir:true}]:[]),
    ...entries().filter(e=>folderMatches(e.name,folderQuery()))
  ]);
  let catalogWorker:Worker|undefined;let catalogReady=false;
  const matches=createMemo(()=>searchCatalog(catalog(),libraryQuery()));
  createEffect(on(libraryQuery,()=>setLibrarySelected(0)));
  function scanLibrary(){catalogWorker?.terminate();setIndexing(true);setCatalog([]);const next:Catalog={};const worker=new Worker(new URL('../library/catalog.worker.ts',import.meta.url).href);catalogWorker=worker;worker.onmessage=e=>{if(e.data.type==='entry'){const entry=e.data.entry as CatalogEntry;next[entry.file]=entry;setCatalog(previous=>[...previous,entry]);}else{setIndexing(false);catalogReady=e.data.type==='done';if(catalogReady){state.catalog=next;changed();void persistence?.save().catch(error=>setStatus(String(error)));}else setStatus(e.data.message);worker.terminate();}};worker.onerror=e=>{setStatus(e.message);setIndexing(false);};worker.postMessage({root,ignored:appDirectory,cached:state.catalog??{}});}
  onCleanup(()=>catalogWorker?.terminate());
  async function openLibraryResult(){const entry=matches()[librarySelected()];if(entry)await load(path.join(root,entry.file));}
  function homeInput(value:string){if(value.startsWith('/')){setLibraryQuery('');openCommands(value);return;}setLibraryQuery(value);if(value.trim()&&!catalogReady&&!indexing())scanLibrary();}
  async function openFolders(){setFolderQuery('');setSelected(0);setPanel('folders');await browse();}
  async function chooseFolder(index=selected()){const entry=folderEntries()[index];if(!entry)return;if(entry.dir){setFolderQuery('');await browse(entry.full);}else await load(entry.full);}
  async function resumeReading(){const id=lastReadId();const saved=id?state.books[id]:undefined;if(!saved){setStatus(label('Nenhuma leitura salva nesta biblioteca.','No saved reading in this library.'));return;}setStatus(warning);const index=tabs().findIndex(b=>b.id===id);if(index>=0)switchTab(index);else await load(path.join(root,saved.file));}
  function runAction(action:HomeAction){if(action==='highlights')openHighlights();if(action==='statistics')openStatistics();if(action==='folders')void openFolders();if(action==='settings')switchTab(-2);if(action==='continue')void resumeReading();if(action==='help')setPanel('help');if(action==='refresh')scanLibrary();if(action==='quit'){remember();void exit();}}
  function submitHome(){void openLibraryResult();}
  const [busy, setBusy] = createSignal(false);
  const [prefs, setPrefs] = createSignal(preferences(state.preferences));
  const protocol = () => prefs().protocol;
  function updatePrefs(patch: Partial<Preferences>) { const next = preferences({ ...prefs(), ...patch }); setPrefs(next); state.preferences = next; void persistence?.save().catch(e=>setStatus(String(e))); }
  const setProtocol = (protocol: 'auto' | 'blocks') => updatePrefs({protocol});
  const [setting, setSetting] = createSignal(0);
  const [colorField, setColorField] = createSignal<'background'|'foreground'>('background');
  const searches = new Map<string,{query:string;results:{label:string;anchor:Anchor}[];selected:number}>();
  const width = () => Math.max(20, Math.min(prefs().readingWidth, dimensions().width - 8)); const height = () => Math.max(4, dimensions().height - 4);
  const pictureHeight = () => imageRows(height(), prefs().imagePercent);
  const menuRows = () => Math.max(1, dimensions().height - 14);
  const textHeight = () => 1 + prefs().lineGap;
  const libraryPath = path.resolve(root);
  const footerPathWidth = () => Math.max(1, dimensions().width - 4 - (home() ? 12 : 0));
  const footerRows = () => book() || busy() ? 1 : Math.max(1, Math.ceil(Bun.stringWidth(libraryPath) / footerPathWidth()));
  const settingsText = () => language()==='en' ? ['Background','Text color','Reading width','Image height','Line spacing','Image protocol','Language','Home effects','Animation pixel size','Pixel quantity','Reset appearance'] : ['Cor do fundo','Cor do texto','Largura da leitura','Altura das imagens','Espaçamento entre linhas','Protocolo de imagem','Idioma','Efeitos da home','Tamanho dos pixels','Quantidade de pixels','Restaurar aparência'];
  const values = () => [prefs().background,prefs().foreground,String(prefs().readingWidth),prefs().imagePercent+'%',String(prefs().lineGap),protocol(),language(),prefs().logoAnimation===false?label('Desligados','Off'):label('Ligados','On'),[label('Pequeno','Small'),label('Médio','Medium'),label('Grande','Large')][(prefs().animationPixelSize??2)-1],(prefs().animationDensity??100)+'%','↵'];
  function changeSetting(delta = 1) { const index=setting(); if(index<2) { setColorField(index===0?'background':'foreground');setQuery(prefs()[index===0?'background':'foreground']);setPanel('color'); } else if(index===2)updatePrefs({readingWidth:prefs().readingWidth+delta*4});else if(index===3)updatePrefs({imagePercent:prefs().imagePercent+delta*10});else if(index===4)updatePrefs({lineGap:prefs().lineGap+delta});else if(index===5)setProtocol(protocol()==='auto'?'blocks':'auto');else if(index===6){state.lang=language()==='en'?'pt-BR':'en';setLanguage(state.lang);void persistence?.save();}else if(index===7)updatePrefs({logoAnimation:prefs().logoAnimation===false});else if(index===8)updatePrefs({animationPixelSize:(prefs().animationPixelSize??2)+delta});else if(index===9)updatePrefs({animationDensity:(prefs().animationDensity??100)+delta*25});else updatePrefs(preferences()); }
  const lines = createMemo(() => book() ? layout(book()!, width(), chapter()) : []);
  const anchor = (): Anchor => lines()[line()]?.anchor ?? { chapter: chapter(), block: 0, offset: 0 };
  function remember() { sampleReading();const b = book(); if (b && state.books[b.id]) {state.books[b.id].anchor = anchor();state.lastRead=b.id;setLastReadId(b.id);} state.tabs = tabs().map(b => b.id); state.active = b?.id; void persistence?.save().catch(e => setStatus(String(e))); }
  function invalidateChapter(){const b=book();const record=b?state.books[b.id].reading?.chapters[chapter()]:undefined;if(record&&!record.completed)record.fromStart=false;}
  const navigationHistory=new Map<string,Anchor[]>();
  function jump(a: Anchor,discontinuous=true,recordHistory=true) { sampleReading();const current=book();if(current&&discontinuous&&recordHistory&&compareAnchors(anchor(),a)!==0){const history=navigationHistory.get(current.id)??[];history.push({...anchor()});navigationHistory.set(current.id,history.slice(-50));}if(discontinuous)invalidateChapter();setCursor(undefined);setSelectionStart(undefined);batch(()=>{setChapter(Math.max(0,Math.min(Number.isFinite(a.chapter)?Math.trunc(a.chapter):0, book()!.chapters.length - 1))); const ls = layout(book()!, width(), chapter()); let index = 0;for(let i=0;i<ls.length;i++)if(ls[i].anchor.block===a.block&&ls[i].anchor.offset<=a.offset)index=i;setLine(index);if(discontinuous)invalidateChapter();}); }
  function switchTab(index: number) { batch(()=>{const old=book();if(old){setLastBook(old);searches.set(old.id,{query:query(),results:results(),selected:selected()});}remember();searchWorker?.terminate();setActive(index===-3?-1:index); setPanel('');if(book()){setLastBook(book());jump(state.books[book()!.id].anchor,false);const saved=searches.get(book()!.id);setQuery(saved?.query??'');setResults(saved?.results??[]);setSelected(saved?.selected??0);}}); }
  function closeTab(index:number){batch(()=>{remember();const b=tabs()[index];if(!b)return;setTabs(tabs().filter(x=>x!==b));b.close();setActive(-1);remember();});}
  async function browse(dir = directory()) { try { const list = await fs.readdir(dir, { withFileTypes: true }); setEntries(list.filter(e => !['.git', '.leitor', '.ler', 'node_modules'].includes(e.name) && path.join(dir, e.name) !== appDirectory && (e.isDirectory() || bookFormat(e.name))).map(e => ({ name: e.name, full: path.join(dir, e.name), dir: e.isDirectory() })).sort((a,b) => Number(b.dir)-Number(a.dir) || a.name.localeCompare(b.name))); setDirectory(dir); setSelected(0); } catch(e) { setStatus(String(e)); } }
  async function load(file: string, restore = false) { setBusy(true); try { const b = await openBook(file); const existing = tabs().findIndex(t => t.id === b.id); if (existing >= 0) { b.close(); switchTab(existing); return true; } opened.push(b); state.books[b.id] ??= { file: path.relative(root!, file), anchor: { chapter: 0, block: 0, offset: 0 }, bookmarks: [] }; state.books[b.id].file = path.relative(root!, file);state.books[b.id].title=b.title;state.books[b.id].reading??=newReadingStats(); setTabs([...tabs(), b]); switchTab(tabs().length - 1); if (!restore) remember();return true; } catch(e) { setStatus(String(e));return false; } finally { setBusy(false); } }
  async function startup() { const ids = [...state.tabs];const current=lastReadId();await browse();for (const id of ids) { const saved = state.books[id]; if (saved) await load(path.join(root!, saved.file), true); }const previous=tabs().find(b=>b.id===current);switchTab(-1);setLastBook(previous);setLastReadId(current);state.lastRead=current;if(props.initialFile)await load(props.initialFile); }
  let requestsReady=false,readingRequests=false,disposed=false;
  void startup().finally(()=>{requestsReady=true;});
  const requestTimer=persistence?setInterval(async()=>{if(!requestsReady||readingRequests||disposed)return;readingRequests=true;try{await consumeBookRequests(persistence.directory,async file=>{if(!disposed)await load(file);});}catch(error){if(!disposed)setStatus(String(error));}finally{readingRequests=false;}},500):undefined;
  onCleanup(()=>{disposed=true;if(requestTimer)clearInterval(requestTimer);});
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => { line(); chapter(); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(remember, 500); });
  const autosave = setInterval(remember, 2000);
  onCleanup(()=>{clearInterval(autosave);if(saveTimer)clearTimeout(saveTimer);});
  createEffect(on(width, (_next,previous)=>{ if(previous && book()) { const old=layout(book()!,previous,chapter())[line()]?.anchor;const caret=cursor(),start=selectionStart();if(old)jump(old,false);setCursor(caret);setSelectionStart(start); } }));
  const [results, setResults] = createSignal<{ label: string; anchor: Anchor }[]>([]);
  let searchWorker:Worker|undefined;
  onCleanup(()=>searchWorker?.terminate());
  async function search(q: string) {searchWorker?.terminate();setSelected(0);setResults([]);const b=book();if(!b||!q.trim()){setResults([]);return;}const worker=new Worker(new URL('../reading/search.worker.ts',import.meta.url).href);searchWorker=worker;worker.onmessage=e=>{setResults(e.data);worker.terminate();};worker.onerror=e=>setStatus(e.message);worker.postMessage({chapters:b.chapters,query:q});}
  function move(delta: number) { sampleReading();const stats=state.books[book()!.id].reading;const target = line()+delta;
    if(stats){const record=stats.chapters[chapter()]??={seconds:0};if(line()===0&&delta>0)record.fromStart=true;if(target>=lines().length&&delta>0){completeChapter(stats,chapter());if(chapter()===book()!.chapters.length-1)stats.completed=book()!.chapters.every((_,i)=>stats.chapters[i]?.completed);}}
    if (target >= lines().length && chapter()+1 < book()!.chapters.length) { setChapter(chapter()+1); setLine(0); } else if (target < 0 && chapter() > 0) { setChapter(chapter()-1); setLine(previousPage(lines(),lines().length,height(),textHeight(),pictureHeight())); } else setLine(Math.max(0,Math.min(Math.max(0,lines().length-1),target))); }
  function openHighlights(){remember();setOnlyCurrent(false);setHighlightFilter('');setSelected(0);setCursor(undefined);setSelectionStart(undefined);setActive(-4);setPanel('');}
  function openStatistics(){remember();setCursor(undefined);setSelectionStart(undefined);setActive(-5);setPanel('');if(!indexing())scanLibrary();}
  const highlights=createMemo(()=>{revision();const q=highlightFilter().normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();return Object.entries(state.books).flatMap(([id,saved])=>(saved.highlights??[]).map(mark=>({id,file:saved.file,title:saved.title??bookTitle(saved.file),mark}))).filter(row=>(!onlyCurrent()||row.id===lastReadId())&&`${row.title} ${row.mark.text}`.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(q)).sort((a,b)=>b.mark.date.localeCompare(a.mark.date));});
  async function openHighlight(row=highlights()[selected()]){if(!row)return;const ok=await load(path.join(root,row.file));if(ok){if(book()?.id!==row.id){setStatus(label('O arquivo foi alterado; destaque original preservado.','File changed; original highlight preserved.'));return;}jump(row.mark.start);setCursor(row.mark.start);}}
  function saveHighlight(){const b=book(),a=selectionStart(),c=cursor();if(!b||!a||!c||compareAnchors(a,c)===0){setStatus(label('Selecione com Shift + setas antes de salvar.','Select with Shift + arrows before saving.'));return;}const [start,end]=orderedRange(a,c);const text=rangeText(b,start,end);if(!text.trim())return;const marks=state.books[b.id].highlights??=[];if(!marks.some(m=>compareAnchors(m.start,start)===0&&compareAnchors(m.end,end)===0))marks.push({id:crypto.randomUUID(),start:{...start},end:{...end},text,date:new Date().toISOString()});changed();remember();setSelectionStart(undefined);setCursor(undefined);setStatus(label('Destaque salvo · F7 para consultar','Highlight saved · F7 to browse'));}
  function moveCursor(name:string,extend:boolean,word=false){invalidateChapter();const b=book()!,a=cursor()!;if(extend&&!selectionStart())setSelectionStart(a);if(!extend)setSelectionStart(undefined);let next=a;
    if(name==='left'||name==='right')next=(word?stepWordCursor:stepCursor)(b,a,name==='left'?-1:1);
    else {const ls=layout(b,width(),a.chapter);let index=0;for(let i=0;i<ls.length;i++)if(ls[i].anchor.block===a.block&&ls[i].anchor.offset<=a.offset&&!ls[i].image)index=i;
      if(name==='home')next=ls[index].anchor;else if(name==='end')next={...ls[index].anchor,offset:ls[index].anchor.offset+ls[index].text.length};
      else {const direction=['up','pageup'].includes(name)?-1:1;const distance=['pageup','pagedown'].includes(name)?Math.max(1,visible().length-1):1;let target=Math.max(0,Math.min(ls.length-1,index+direction*distance));while(ls[target]?.image&&target>0&&target<ls.length-1)target+=direction;const col=Bun.stringWidth(ls[index].text.slice(0,a.offset-ls[index].anchor.offset));next=anchorAtCell(ls[target],col);if(target===index)next=stepCursor(b,a,direction);}}
    sampleReading();setCursor(next);setChapter(next.chapter);invalidateChapter();const ls=lines();let index=0;for(let i=0;i<ls.length;i++)if(ls[i].anchor.block===next.block&&ls[i].anchor.offset<=next.offset)index=i;
    if(index<line()||!visible().some(l=>l===ls[index]))setLine(index);
  }
  const ranges=()=>{revision();const result:{start:Anchor;end:Anchor}[]=[...(book()?state.books[book()!.id].highlights??[]:[])];if(cursor()&&selectionStart()){const [start,end]=orderedRange(cursor()!,selectionStart()!);result.push({start,end});}return result;};
  const caretLine=createMemo(()=>{const a=cursor();return a&&a.chapter===chapter()?lines().findLast(l=>!l.image&&l.anchor.block===a.block&&l.anchor.offset<=a.offset):undefined;});
  function toggleCursor(){if(cursor()){setCursor(undefined);setSelectionStart(undefined);return;}const first=lines().slice(line()).find(l=>!l.image&&l.text.length);if(first)setCursor(first.anchor);else setStatus(label('Nenhum texto selecionável nesta tela.','No selectable text on this screen.'));setSelectionStart(undefined);}
  const availableCommands=()=>paletteCommands(!!book(),pdf(),tabs().length>0);
  function toggleBookmark(){const b=book();if(!b)return;const marks=state.books[b.id].bookmarks;const a=anchor();const index=marks.findIndex(m=>m.anchor.chapter===a.chapter&&m.anchor.block===a.block);if(index>=0)marks.splice(index,1);else marks.push({anchor:{...a},excerpt:lines()[line()]?.text??'',date:new Date().toISOString()});remember();changed();setStatus(t('marks')+': '+marks.length);}
  function chooseTab(index:number){if(!tabs()[index])return;switchTab(index);}
  const commandTerm=()=>commandQuery().trim().split(/\s+/)[0]??'';
  const commandMatches=createMemo(()=>{const term=commandTerm().toLowerCase();const normalized=term.startsWith('/')?term:'/'+term;return availableCommands().filter(c=>c.name.startsWith(normalized)).sort((a,b)=>Number(b.name===normalized)-Number(a.name===normalized));});
  function openCommands(value='/'){sampleReading();searchWorker?.terminate();setCommandQuery(value);setCommandError('');setSelected(0);setPanel('commands');}
  async function submitCommand(command=commandMatches()[selected()]){
    if(!command){setCommandError(label('Comando desconhecido. Digite / para ver opções.','Unknown command. Type / for options.'));return;}
    const args=commandQuery().trim().slice(commandTerm().length).trim();
    const usage=(detail='')=>setCommandError(`${label('Uso','Usage')}: ${command.usage??command.name}${detail?' · '+detail:''}`);
    if(args&&!command.arguments){setCommandError(label('Este comando não recebe argumentos.','This command takes no arguments.'));return;}
    if(!args&&command.arguments==='required'){usage();return;}
    const bounds:Record<string,[number,number]>={chapter:[1,book()?.chapters.length??1],page:[1,book()?.chapters.length??1],switch:[1,tabs().length],width:[40,140],spacing:[0,2],zoom:[100,400]};
    let number:number|undefined;
    if(bounds[command.action]){const [min,max]=bounds[command.action];number=integerArgument(command.action==='zoom'?args.replace(/%$/,''):args,min,max);if(number===undefined){usage(`${min}–${max}`);return;}}
    const value=args.toLowerCase();
    if(command.action==='language'&&args&&!['en','pt-br'].includes(value)){usage();return;}
    if(command.action==='protocol'&&args&&!['auto','blocks'].includes(value)){usage();return;}
    if(command.action==='animation'&&args&&!['on','off'].includes(value)){usage();return;}
    if(command.action==='back'&&!navigationHistory.get(book()!.id)?.length){setCommandError(label('Nenhuma posição anterior nesta sessão.','No previous position in this session.'));return;}
    if(command.action==='search'){
      if(pdf()){setCommandError(label('PDF exibido como imagem: busca textual indisponível.','PDF is displayed as images: text search is unavailable.'));return;}
      setQuery(args);setResults([]);setSelected(0);setPanel('search');if(args)void search(args);return;
    }
    if(command.action==='save'){
      if(!persistence){setCommandError(label('Armazenamento indisponível; dados apenas nesta sessão.','Storage unavailable; data only in this session.'));return;}
      remember();try{await persistence.save();setPanel('');setStatus(label('Progresso e dados salvos.','Progress and data saved.'));}catch(error){setCommandError(String(error));}return;
    }
    setPanel('');
    if(command.action==='home')switchTab(-1);
    else if(command.action==='close')closeTab(active());
    else if(command.action==='contents'){setSelected(0);setPanel('toc');}
    else if(command.action==='bookmarks'){setSelected(0);setPanel('marks');}
    else if(command.action==='highlight')toggleCursor();
    else if(command.action==='bookmark')toggleBookmark();
    else if(command.action==='info')setPanel('info');
    else if(command.action==='tabs'){setTabFilter('');setSelected(Math.max(0,active()));setPanel('tabs');}
    else if(command.action==='switch')chooseTab(number!-1);
    else if(command.action==='next-tab'||command.action==='previous-tab'){const count=tabs().length;chooseTab(active()<0?(command.action==='next-tab'?0:count-1):(active()+(command.action==='next-tab'?1:-1)+count)%count);}
    else if(command.action==='chapter'||command.action==='page'){jump({chapter:number!-1,block:0,offset:0});remember();}
    else if(command.action==='next'||command.action==='previous'){const next=chapter()+(command.action==='next'?1:-1);if(next<0||next>=book()!.chapters.length)setStatus(label('Limite do livro alcançado.','Book boundary reached.'));else {jump({chapter:next,block:0,offset:0});remember();}}
    else if(command.action==='start'){jump({chapter:0,block:0,offset:0});remember();}
    else if(command.action==='end'){const last=book()!.chapters.length-1;const blocks=book()!.chapters[last].blocks;const block=Math.max(0,blocks.length-1);jump({chapter:last,block:pdf()?0:block,offset:pdf()?0:blocks[block]?.text.length??0});if(!pdf())setLine(previousPage(lines(),lines().length,height(),textHeight(),pictureHeight()));remember();}
    else if(command.action==='back'){const previous=navigationHistory.get(book()!.id)!.pop()!;jump(previous,true,false);remember();}
    else if(command.action==='width'){updatePrefs({readingWidth:number});setStatus(label('Largura da leitura','Reading width')+': '+number);}
    else if(command.action==='spacing'){updatePrefs({lineGap:number});setStatus(label('Espaçamento','Line spacing')+': '+number);}
    else if(command.action==='zoom'){setPdfZoom(number!/100);setPdfX(0);setPdfY(0);}
    else if(command.action==='fit'){setPdfZoom(1);setPdfX(0);setPdfY(0);}
    else if(command.action==='animation'){const enabled=args?value==='on':prefs().logoAnimation===false;updatePrefs({logoAnimation:enabled});setStatus(label('Animações','Animations')+': '+(enabled?'on':'off'));}
    else if(command.action==='pause'){setPaused(v=>!v);setStatus(paused()?label('Contagem pausada','Timer paused'):label('Contagem retomada','Timer resumed'));}
    else if(command.action==='language'){state.lang=args?(value==='en'?'en':'pt-BR'):(language()==='en'?'pt-BR':'en');setLanguage(state.lang);remember();}
    else if(command.action==='protocol')setProtocol(args?value as 'auto'|'blocks':protocol()==='auto'?'blocks':'auto');
    else runAction(command.action);
  }
  const commandRows=()=>Math.max(1,Math.min(9,dimensions().height-footerRows()-9));
  const menu = createMemo(() => panel() === 'toc' && book() ? (book()!.toc.length ? book()!.toc.flatMap(c=>{const anchor=tocAnchor(book()!,c.href);return anchor?[{label:c.label,anchor}]:[];}) : book()!.chapters.map((c,i) => ({ label:c.title, anchor:{chapter:i,block:0,offset:0} }))) : panel() === 'marks' && book() ? state.books[book()!.id].bookmarks.map(m => ({ label:m.excerpt,anchor:m.anchor })) : results());
  useKeyboard(e => {
    sampleReading();clock.touch();
    if (e.ctrl && e.name === 'c') { remember(); clearInterval(autosave); void exit(); return; }
    if (e.name === 'f12' || (e.name === 'escape' && renderer.console.visible)) {
      e.preventDefault();e.stopPropagation();
      if (renderer.console.visible) renderer.console.hide(); else renderer.console.show();
      renderer.requestRender();return;
    }
    if (renderer.console.visible) {e.preventDefault();return;}
    if (e.name === 'escape') {e.preventDefault();searchWorker?.terminate();if(panel())setPanel('');else if(cursor()){setCursor(undefined);setSelectionStart(undefined);}else if(book())closeTab(active());else if(active()===-4||active()===-5)switchTab(-1);else if(home()){setLibraryQuery('');}return; }
    if (e.name === 'f7') {openHighlights();return;}
    if (e.name === 'f8') {openStatistics();return;}
    if (e.name === 'f6') { const order=[-1,...tabs().map((_,i)=>i),-2,...(active()===-4||active()===-5?[active()]:[])];const next=order[(order.indexOf(active())+(e.shift?-1:1)+order.length)%order.length];if(next===-5)openStatistics();else switchTab(next); return; }
    if (e.name === 'f3') { switchTab(-2); return; }
    if (e.name === 'f5') { switchTab(-3); return; }
    if (e.name === 'f4' && book()) { closeTab(active()); return; }
    if (e.name === 'f2') {e.preventDefault();openCommands();return;}
    if(e.ctrl&&e.name==='p'){e.preventDefault();openCommands();return;}
    if(panel()==='options'){if(['tab','up','down','j','k','home','end','return'].includes(e.name)){e.preventDefault();const size=homeActions().length;if(e.name==='return')chooseHomeOption();else if(e.name==='home')setSelected(0);else if(e.name==='end')setSelected(size-1);else setSelected((selected()+((e.name==='tab'&&e.shift)||e.name==='up'||e.name==='k'?-1:1)+size)%size);}return;}
    if(panel()==='tabs'){if(e.name==='up'||e.name==='down'){e.preventDefault();setSelected(Math.max(0,Math.min(tabOptions().length-1,selected()+(e.name==='up'?-1:1))));}return;}
    if(panel()==='info')return;
    if(panel()==='commands'){if(e.name==='up'||e.name==='down'){e.preventDefault();setSelected(Math.max(0,Math.min(commandMatches().length-1,selected()+(e.name==='up'?-1:1))));}if(e.name==='tab'){e.preventDefault();const command=commandMatches()[selected()];if(command){setCommandQuery(command.name);setSelected(0);setCommandError('');}}return;}
    if(!panel()&&e.sequence==='/'&&(!home()||!libraryQuery())){e.preventDefault();openCommands();return;}
    if(!panel()&&active()===-5)return;
    if(!panel()&&active()===-4){if(e.name==='down'||e.name==='up'){e.preventDefault();setSelected(Math.max(0,Math.min(highlights().length-1,selected()+(e.name==='down'?1:-1))));}if(e.name==='tab'){e.preventDefault();setOnlyCurrent(v=>!v);setSelected(0);}if(e.ctrl&&e.name==='d'){e.preventDefault();const row=highlights()[selected()];if(row){state.books[row.id].highlights=state.books[row.id].highlights?.filter(m=>m.id!==row.mark.id);changed();setSelected(Math.max(0,Math.min(selected(),highlights().length-1)));remember();}}if(e.name==='return'){e.preventDefault();void openHighlight();}return;}
    if(panel()==='folders') {if(e.name==='down'||e.name==='up'){e.preventDefault();setSelected(Math.max(0,Math.min(folderEntries().length-1,selected()+(e.name==='down'?1:-1))));}if(e.name==='return'){e.preventDefault();void chooseFolder();}if(e.name==='backspace'&&!folderQuery()&&directory()!==root){e.preventDefault();void browse(path.dirname(directory()));}return;}
    if(home()&&!panel()) {if(e.name==='tab'){e.preventDefault();openHomeOptions(e.shift);return;}if(e.name==='down'||e.name==='up'){e.preventDefault();const count=matches().length;setLibrarySelected(Math.max(0,Math.min(count-1,librarySelected()+(e.name==='down'?1:-1))));}if(e.name==='return'){e.preventDefault();submitHome();}if(e.ctrl&&e.name==='r'){e.preventDefault();scanLibrary();}return;}
    if(panel()==='search'&&e.name==='down'){setSelected(Math.min(results().length-1,selected()+1));e.preventDefault();return;}
    if(panel()==='search'&&e.name==='up'){setSelected(Math.max(0,selected()-1));e.preventDefault();return;}
    if (panel() === 'search' || panel()==='color') return;
    if(panel()==='marks' && e.name==='d') {state.books[book()!.id].bookmarks.splice(selected(),1);remember();setSelected(Math.max(0,selected()-1));setPanel('');return;}
    if (panel()) { const size=menu().length; if (e.name === 'down'||e.name==='j') setSelected(Math.min(Math.max(0,size-1),selected()+1)); if(e.name === 'up'||e.name==='k') setSelected(Math.max(0,selected()-1));if(e.name==='home')setSelected(0);if(e.name==='end')setSelected(Math.max(0,size-1)); if (e.name === 'return') {const result=menu()[selected()];if(result)jump(result.anchor);setPanel('');}return;}
    if(active()===-2) { if(e.name==='down'||e.name==='j')setSetting(Math.min(10,setting()+1));if(e.name==='up'||e.name==='k')setSetting(Math.max(0,setting()-1));if(['right','return','space'].includes(e.name)){e.preventDefault();changeSetting(1);}if(e.name==='left'){e.preventDefault();changeSetting(-1);}return; }
    if (!book()) { if(e.sequence==='/'){e.preventDefault();switchTab(-3);} if(e.name==='down') setSelected(Math.min(entries().length-1,selected()+1)); if(e.name==='up') setSelected(Math.max(0,selected()-1)); if(e.name==='backspace' && directory()!==root) void browse(path.dirname(directory())); if(e.name==='return') { const entry=entries()[selected()]; if(entry) entry.dir ? void browse(entry.full) : void load(entry.full); } return; }
    if(e.ctrl&&e.name==='t'){e.preventDefault();setPaused(v=>!v);setStatus(paused()?label('Contagem pausada','Timer paused'):label('Contagem retomada','Timer resumed'));return;}
    if(!pdf()&&e.ctrl&&e.name==='s'){e.preventDefault();saveHighlight();return;}
    if(!pdf()&&e.name==='v'){e.preventDefault();toggleCursor();return;}
    if(!pdf()&&cursor()&&['left','right','up','down','home','end','pageup','pagedown'].includes(e.name)){e.preventDefault();moveCursor(e.name,e.shift,e.ctrl);return;}
    if(pdf()) {
      const pageKeys=['pagedown','pageup','space','right','left','down','up','j','k','home','end'];
      if(e.sequence==='+'||e.sequence==='='||e.sequence==='-'||e.name==='i'||e.name==='0') {
        e.preventDefault();setPdfZoom(e.name==='0'?1:Math.max(1,Math.min(4,pdfZoom()+(e.sequence==='-'?-0.5:0.5))));return;
      }
      if(pageKeys.includes(e.name)) {
        e.preventDefault();
        if(pdfZoom()>1&&['pagedown','pageup','space'].includes(e.name)) {
          const direction=e.name==='pageup'?-1:1;
          if((direction>0&&pdfY()<1&&(pdfViewport()?.bands??1)>1)||(direction<0&&pdfY()>0))setPdfY(adjacentBand(pdfY(),direction,pdfViewport()?.step??1));
          else {const previous=chapter();jump({chapter:chapter()+direction,block:0,offset:0});if(direction<0&&chapter()!==previous)setPdfY(1);}
          return;
        }
        if(pdfZoom()>1&&['up','down','left','right','j','k'].includes(e.name)) {
          if(e.name==='left'||e.name==='right'){if(pdfViewport()?.horizontal)setPdfX(Math.max(0,Math.min(1,pdfX()+(e.name==='left'?-0.15:0.15))));}
          else setPdfY(Math.max(0,Math.min(1,pdfY()+(['up','k'].includes(e.name)?-0.15:0.15))));
        } else {const next=e.name==='home'?0:e.name==='end'?book()!.chapters.length-1:chapter()+(['pageup','left','up','k'].includes(e.name)?-1:1);jump({chapter:next,block:0,offset:0});}
        return;
      }
    }
    if(['down','j'].includes(e.name)) move(1); if(['up','k'].includes(e.name)) move(-1);
    if(['right','pagedown','space'].includes(e.name)) move(Math.max(1,visible().length-1)); if(['left','pageup'].includes(e.name)){if(line()===0)move(-1);else setLine(previousPage(lines(),line(),height(),textHeight(),pictureHeight()));}
    if(e.name==='home') setLine(0); if(e.name==='end'){invalidateChapter();setLine(previousPage(lines(),lines().length,height(),textHeight(),pictureHeight()));}
    if(e.name==='s') {setPanel('toc');setSelected(0);}
    if(e.name==='b' && !e.shift)toggleBookmark();
    if(e.name==='b' && e.shift) {setPanel('marks');setSelected(0);}
    if(e.name==='n' && results().length) { const next=(selected()+(e.shift?-1:1)+results().length)%results().length;setSelected(next);jump(results()[next].anchor); }
    if(e.sequence==='?') setPanel('help');
    if(e.name==='i'){const image=visible().find(l=>l.image)?.image;if(image){setSelectedImage(image);setPanel('image');}}
  });
  const visibleTabs = createMemo(()=>{const tabWidth=Math.max(10,Math.min(25,dimensions().width-31));const count=Math.max(1,Math.floor((dimensions().width-16-(active()===-2?18:0))/(tabWidth+2)));const start=Math.max(0,active()-count+1);return tabs().slice(start,start+count);});
  function HomeScreen() {
    const homeWidth=()=>Math.min(76,dimensions().width-12);
    const resultRows=()=>Math.max(1,Math.min(5,Math.floor((dimensions().height-18)/2)));
    return <box width={homeWidth()} flexDirection="column" gap={1} backgroundColor={prefs().background}>
      <box alignItems="center" flexDirection="column" marginBottom={1}>
        <HomeLogo size={libraryQuery().trim()?'small':dimensions().height>=38&&dimensions().width>=76?'large':dimensions().height>=28&&dimensions().width>=72?'medium':'small'} animate={!panel()&&!libraryQuery().trim()&&prefs().logoAnimation!==false} background={prefs().background} pixelSize={prefs().animationPixelSize} quantity={prefs().animationDensity}/>
        <text fg="#777777">Leitor Extremamente Reduzido</text>
      </box>
      <box backgroundColor="#202020" border={['left']} borderColor="#73a5df" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} flexDirection="column">
        <input id="home-search" focused={!panel()} placeholder={label('Busque por título ou autor…','Search by title or author…')} value={libraryQuery()} onInput={homeInput} onSubmit={submitHome} backgroundColor="#202020"/>
        <box flexDirection="row" justifyContent="space-between" height={1}><text fg={indexing()?'#888888':'#73a5df'}>{indexing()?label('Atualizando biblioteca…','Updating library…'):label('Livros','Books')}</text><KeyHints items={libraryQuery().trim()?[['enter',label('abrir','open')],['esc',label('limpar','clear')]]:[['/',label('comandos','commands')]]}/></box>
      </box>
      <Show when={!libraryQuery().trim()&&resumable()}><text height={1} fg="#888888" onMouseDown={()=>runAction('continue')}>{language()==='en'?'Resume':'Retomar'} · {resumeTitle().slice(0,homeWidth()-12)}</text></Show>
      <Show when={libraryQuery().trim()&&!libraryQuery().startsWith('/')}><text fg="#777777">{matches().length} {label('livros encontrados','books found')}</text><For each={matches().slice(Math.max(0,librarySelected()-resultRows()+1),Math.max(resultRows(),librarySelected()+1))}>{entry=><box height={2} flexDirection="column" backgroundColor={matches()[librarySelected()]===entry?'#252525':prefs().background} onMouseDown={()=>void load(path.join(root,entry.file))}><text height={1} fg={matches()[librarySelected()]===entry?'#eeeeee':'#aaaaaa'}>{entry.title}{entry.authors.length?' — '+entry.authors.join(', '):''}</text><text height={1} fg="#777777">{entry.file}</text></box>}</For><Show when={!indexing()&&!matches().length}><text fg="#888888">{language()==='en'?'No matching books.':'Nenhum livro encontrado.'}</text></Show></Show>
      <box justifyContent="flex-end" flexDirection="row" gap={2} height={1}><Show when={libraryQuery().trim()}><KeyHints items={[["↑↓",label('escolher','select')]]}/></Show><text height={1} fg="#888888" onMouseDown={()=>openHomeOptions()}><span style={{fg:'#cccccc'}}><b>tab</b></span> {label('opções','options')}</text><KeyHints items={[["ctrl+p",label('ações','actions')]]}/></box>
    </box>;
  }
  function Picture(props: { href: string; height?:number }) { const [bytes] = createResource(() => ({ b:book(),href:props.href }), async value => { try { return await value.b?.resource(value.href); } catch { return undefined; } }); return <Show when={bytes()} fallback={<text fg="#888888">{t('image')}</text>}><image source={bytes()} width={width()} height={props.height??pictureHeight()} fit="fit" protocol={protocol()} onMouseDown={()=>{setSelectedImage(props.href);setPanel('image');}} /></Show>; }
  const visible = createMemo(() => { const output: ReturnType<typeof lines> = []; let count=0; for(const l of lines().slice(line())) { const size=l.image?pictureHeight():textHeight(); if(count+size>height()) break; output.push(l);count+=size; } return output; });
  function mouseAnchor(l:ReturnType<typeof lines>[number],x:number,left:number){return anchorAtCell(l,Math.max(0,x-left));}
  function TextLine(props:{value:ReturnType<typeof lines>[number]}) {
    const parts=createMemo(()=>lineParts(props.value,ranges(),caretLine()===props.value?cursor():undefined));
    return <text width={width()} height={textHeight()} fg={prefs().foreground} selectable={false}
      onMouseDown={e=>{if(panel()||e.button!==0)return;sampleReading();clock.touch();const a=mouseAnchor(props.value,e.x,e.currentTarget?.screenX??0);if(!e.modifiers.shift||!cursor())setSelectionStart(a);else setSelectionStart(selectionStart()??cursor());setCursor(a);dragging=true;e.preventDefault();}}
      onMouseMove={e=>{if(dragging&&!panel()){setCursor(mouseAnchor(props.value,e.x,e.currentTarget?.screenX??0));e.preventDefault();}}}
      onMouseUp={e=>{if(dragging){setCursor(mouseAnchor(props.value,e.x,e.currentTarget?.screenX??0));dragging=false;}}}>
      <For each={parts()}>{part=><span style={{fg:part.cursor?'#101010':part.selected?'#fff3b0':prefs().foreground,bg:part.cursor?'#7bb4ff':part.selected?'#594717':undefined}}>{part.text}</span>}</For>
      <Show when={caretLine()===props.value&&cursor()&&compareAnchors(cursor()!,{...props.value.anchor,offset:props.value.anchor.offset+props.value.text.length})===0}><span style={{fg:'#101010',bg:'#7bb4ff'}}> </span></Show>
    </text>;
  }
  const stats=createMemo(()=>{revision();catalog();return libraryStatistics(state);});
  const lastReading=()=>{revision();return state.books[lastReadId()??''];};
  const remaining=()=>{revision();const b=tabs().find(b=>b.id===lastReadId());const saved=lastReading();return b&&saved?remainingChapterSeconds(b,saved.anchor,saved.reading):undefined;};
  function StatisticsScreen(){return <box width={Math.min(80,dimensions().width-6)} flexDirection="column" paddingTop={1}>
    <text height={1} fg="#eeeeee"><b>{label('Estatísticas da biblioteca','Library statistics')}</b></text>
    <text height={1}>{indexing()?label('Atualizando catálogo…','Updating catalog…'):`${label('Livros','Books')}: ${stats().total} · EPUB ${stats().epub} · TXT ${stats().txt} · PDF ${stats().pdf}`}</text>
    <text height={1}>{label('Não iniciados','Not started')}: {stats().unstarted} · {label('Lendo','Reading')}: {Math.max(0,stats().started-stats().completed)} · {label('Concluídos','Completed')}: {stats().completed}</text>
    <text height={1}>{label('Tempo total','Total time')}: {duration(stats().seconds)} · {label('Hoje','Today')}: {duration(stats().today)}</text>
    <text height={1}>{label('Capítulos concluídos','Completed chapters')}: {stats().chapters}</text>
    <text height={1}>{label('Média por capítulo','Average per chapter')}: {stats().average===undefined?label('Dados insuficientes','Insufficient data'):duration(stats().average!)}</text>
    <text height={1}>{label('Destaques','Highlights')}: {stats().highlights}</text>
    <Show when={lastReading()}><text height={1} fg="#7bb4ff">{resumeTitle()}</text><text height={1}>{label('Tempo neste livro','Time in this book')}: {duration(lastReading()?.reading?.seconds??0)}</text><text height={1}>{label('Restante no capítulo (estimativa)','Chapter remaining (estimate)')}: {remaining()===undefined?'—':duration(remaining()!)}</text></Show>
    <text fg="#888888">{label('Pausa em painéis e após 2 min sem interação.\nCtrl+T pausa/retoma. Tempo aproximado.\nMédia: capítulos percorridos do início ao fim.\nColeta a partir desta versão; sem retroativo.','Pauses in panels and after 2 min of inactivity.\nCtrl+T pauses/resumes. Approximate time.\nAverage: chapters traversed from start to finish.\nMeasured from this version; no past history.')}</text>
  </box>;}
  function HighlightsScreen(){return <box width={Math.min(100,dimensions().width-6)} flexDirection="column" paddingTop={1}>
    <text height={1} fg="#eeeeee"><b>{label('Destaques','Highlights')}</b> · {highlights().length} · {onlyCurrent()?label('Último livro','Last book'):label('Todos os livros','All books')}</text>
    <input id="highlight-filter" focused={!panel()} placeholder={label('Filtrar por livro ou trecho…','Filter by book or passage…')} value={highlightFilter()} onInput={q=>{setHighlightFilter(q);setSelected(0);}} onSubmit={()=>void openHighlight()}/>
    <KeyHints items={[["↑↓",label('navegar','navigate')],["enter",label('abrir','open')],["tab",label('filtrar livro','filter book')],["ctrl+d",label('excluir','delete')]]}/>
    <For each={highlights().slice(Math.max(0,selected()-Math.max(1,Math.floor((height()-5)/3))+1),Math.max(Math.max(1,Math.floor((height()-5)/3)),selected()+1))}>{row=><box height={3} flexDirection="column" backgroundColor={row===highlights()[selected()]?'#252c38':prefs().background} onMouseDown={()=>void openHighlight(row)}><text height={1} fg="#7bb4ff">{row.title} · {row.mark.start.chapter+1} · {new Date(row.mark.date).toLocaleDateString(language())}</text><text height={2} fg="#eeeeee">{row.mark.text.replace(/\n/g,' ')}</text></box>}</For>
    <Show when={!highlights().length}><text fg="#888888">{label('Nenhum destaque. No livro: v → Shift + setas → Ctrl+S.','No highlights. In a book: v → Shift + arrows → Ctrl+S.')}</text></Show>
  </box>;}
  return <box flexDirection="column" width="100%" height="100%" backgroundColor={prefs().background} paddingLeft={2} paddingRight={2}>
    <Show when={home()&&prefs().logoAnimation!==false&&dimensions().width>=60&&dimensions().height>=20}><HomeStars width={dimensions().width-4} height={Math.max(1,dimensions().height-footerRows()-2)} background={prefs().background} animate={!panel()&&!libraryQuery().trim()} pixelSize={prefs().animationPixelSize} quantity={prefs().animationDensity}/></Show>
    <box height={1} flexShrink={0} flexDirection="row" gap={0} backgroundColor="#0c0c0c"><text height={1} width={7} fg={home()?'#eeeeee':'#777777'} bg={home()?'#252525':'#0c0c0c'} onMouseDown={()=>switchTab(-1)}><b>  LER  </b></text><For each={visibleTabs()}>{b=><box flexDirection="row" height={1} backgroundColor={b===book()?'#252525':'#171717'}><text height={1} width={Math.max(10,Math.min(25,dimensions().width-31))} fg={b===book()?'#eeeeee':'#777777'} onMouseDown={()=>switchTab(tabs().indexOf(b))}><b>  {b.title.slice(0,Math.max(6,Math.min(21,dimensions().width-35)))}</b></text><text height={1} width={2} fg="#777777" onMouseDown={()=>closeTab(tabs().indexOf(b))}>× </text></box>}</For><Show when={active()===-2}><text height={1} fg="#eeeeee" bg="#252525">  {language()==='en'?'Settings':'Configurações'}  </text></Show><text height={1} fg="#777777" onMouseDown={()=>{setLibraryQuery('');switchTab(-1);}}>  +  </text></box>
    <Show when={dimensions().width>=60 && dimensions().height>=20} fallback={<text>Resize terminal / Aumente o terminal (60×20)</text>}>
    <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent={home()?'center':'flex-start'} onMouseUp={()=>{dragging=false;}} onMouseScroll={e=>{sampleReading();clock.touch();if(book()&&!panel()){if(pdf()){const delta=e.scroll?.direction==='up'?-1:1;if(pdfZoom()>1)setPdfY(Math.max(0,Math.min(1,pdfY()+delta*0.1)));else jump({chapter:chapter()+delta,block:0,offset:0});}else move(e.scroll?.direction==='up'?-3:3);}}}>
      <Show when={home()}><HomeScreen/></Show><Show when={active()===-4}><HighlightsScreen/></Show><Show when={active()===-5}><StatisticsScreen/></Show>
      <Show when={active()===-2}><box width="100%" flexDirection="column" paddingTop={1}><text fg="#dddddd"><b>{label('Aparência','Appearance')}</b></text><For each={settingsText()}>{(label,i)=><text height={1} fg={setting()===i()?'#7bb4ff':prefs().foreground} bg={setting()===i()?'#252c38':prefs().background} onMouseDown={()=>{setSetting(i());changeSetting();}}>{setting()===i()?'› ':'  '}{label}: {values()[i()]}</text>}</For><text fg={prefs().foreground}>{language()==='en'?'Font size: controlled by your terminal.\nWindows Terminal: Ctrl + Plus/Minus, or Ctrl + mouse wheel.\nChanges are saved automatically.':'Tamanho da letra: controlado pelo terminal.\nWindows Terminal: Ctrl + Mais/Menos ou Ctrl + roda do mouse.\nAlterações são salvas automaticamente.'}</text></box></Show>
      <Show when={pdf()}><PdfPage book={book()!} page={chapter()} width={Math.max(20,dimensions().width-4)} height={height()} zoom={pdfZoom()} x={pdfX()} y={pdfY()} protocol={protocol()} lang={language()} onViewport={setPdfViewport}/></Show>
      <Show when={book()&&!pdf()}><For each={visible()}>{l=><Show when={l.image} fallback={<TextLine value={l}/>}><Picture href={l.image!}/></Show>}</For></Show>
    </box>
    </Show>
    <Show when={panel()&&panel()!=='commands'&&panel()!=='search'&&panel()!=='tabs'&&panel()!=='options'}><box position="absolute" left={3} top={4} width={Math.max(30,dimensions().width-6)} height={Math.max(10,dimensions().height-8)} backgroundColor="#20232a" border padding={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between" height={1}><text fg="#dddddd"><b>{panel()==='info'?label('Informações do livro','Book information'):panel()==='folders'?t('library'):panel()==='search'?t('search'):panel()==='toc'?t('toc'):panel()==='marks'?t('marks'):panel()==='commands'?t('settings'):panel()==='color'?label('Cor personalizada','Custom color'):panel()==='image'?label('Imagem','Image'):t('help')}</b></text><KeyHints items={[["esc",label('fechar','close')]]}/></box>
      <Show when={panel()==='folders'}><text height={1} fg="#888888">{path.relative(root,directory())||path.basename(root)}</text><input id="folder-search" focused placeholder={language()==='en'?'Filter folders and files…':'Filtrar pastas e arquivos…'} value={folderQuery()} onInput={value=>{setFolderQuery(value);setSelected(0);}} onSubmit={()=>void chooseFolder()}/><KeyHints items={[["↑↓",label('navegar','navigate')],["enter",label('abrir','open')],["backspace",label('voltar','back')]]}/><For each={folderEntries().slice(Math.max(0,selected()-Math.max(1,menuRows()-2)+1),Math.max(Math.max(1,menuRows()-2),selected()+1))}>{entry=><text height={1} width="100%" fg={folderEntries()[selected()]===entry?'#eeeeee':'#aaaaaa'} bg={folderEntries()[selected()]===entry?'#303030':'#20232a'} onMouseDown={()=>void chooseFolder(folderEntries().indexOf(entry))}>{entry.dir?'▸ ':'  '}{entry.name}</text>}</For><Show when={!folderEntries().length}><text fg="#888888">{t('empty')}</text></Show></Show>
      <Show when={panel()==='info'&&book()}><text fg="#eeeeee">{book()!.title}</text><text fg="#aaaaaa">{(book()!.format??'epub').toUpperCase()} · {label('Capítulo/página','Chapter/page')} {chapter()+1}/{book()!.chapters.length}</text><text fg="#aaaaaa">{book()!.chapters[chapter()]?.title}</text><text fg="#aaaaaa">{label('Marcadores','Bookmarks')}: {state.books[book()!.id].bookmarks.length} · {label('Destaques','Highlights')}: {state.books[book()!.id].highlights?.length??0}</text><text fg="#aaaaaa">{label('Tempo de leitura','Reading time')}: {duration(state.books[book()!.id].reading?.seconds??0)}</text><text fg="#aaaaaa">{label('Arquivo','File')}: {path.join(root,state.books[book()!.id].file)}</text></Show>
      <Show when={panel()==='color'}><text fg="#eeeeee">{language()==='en'?'Color (#RRGGBB), Enter to apply':'Cor (#RRGGBB), Enter para aplicar'}</text><input focused value={query()} onInput={setQuery} onSubmit={()=>{if(/^#[0-9a-f]{6}$/i.test(query())){updatePrefs({[colorField()]:query()});setPanel('');}else setStatus(language()==='en'?'Use #RRGGBB':'Use #RRGGBB');}}/></Show>
      <Show when={panel()==='image'&&selectedImage()}><Picture href={selectedImage()} height={Math.max(1,dimensions().height-14)}/></Show>
      <Show when={panel()==='help'}><text>{pdf() ? label('PDF: PgUp/PgDn ou Espaço: faixas/páginas\n+/- zoom · 0 página inteira · setas para mover\nHome/End primeira/última · s lista de páginas\nb marcador · Shift+B lista\nEsc salvar/fechar aba · Ctrl+C sair\nPDF como imagem: sem busca textual.', 'PDF: PgUp/PgDn or Space: bands/pages\n+/- zoom · 0 fit page · arrows to pan\nHome/End first/last · s page list\nb bookmark · Shift+B bookmarks\nEsc save/close tab · Ctrl+C exit\nPDF image mode: no text search.') : label('↑↓ j/k · PgUp/PgDn ←→ Espaço\nF6 abas · F4 fechar · F2 comandos\n/ comandos · /search buscar · n/N resultados · s sumário\nb marcador · Shift+B lista · d remover\nv cursor · setas mover · Shift+setas selecionar\nCtrl+S destacar · F7 destaques · F8 estatísticas\nCtrl+T pausar/retomar tempo\ni ampliar imagem · F12 console\nEsc salvar/fechar aba · Ctrl+C sair', '↑↓ j/k · PgUp/PgDn ←→ Space\nF6 tabs · F4 close · F2 commands\n/ commands · /search find · n/N results · s contents\nb bookmark · Shift+B bookmarks · d delete\nv cursor · arrows move · Shift+arrows select\nCtrl+S highlight · F7 highlights · F8 statistics\nCtrl+T pause/resume timer\ni enlarge image · F12 console\nEsc save/close tab · Ctrl+C exit')}</text></Show>
      <Show when={panel()==='toc'||panel()==='marks'}><KeyHints items={[["↑↓",label('navegar','navigate')],["enter",label('abrir','open')]]}/><For each={menu().slice(Math.max(0,selected()-menuRows()+1),Math.max(menuRows(),selected()+1))}>{item=><text height={1} width="100%" fg={menu()[selected()]===item?'#ffffff':'#c4cbd6'} bg={menu()[selected()]===item?'#26446b':'#20232a'} onMouseDown={()=>{jump(item.anchor);setPanel('');}}>{menu()[selected()]===item?'› ':'  '}{item.label}</text>}</For></Show>
    </box></Show>
    <Show when={panel()==='options'}><box id="home-options" position="absolute" left={Math.floor((dimensions().width-Math.min(48,dimensions().width-8))/2)} top={Math.max(2,Math.floor((dimensions().height-homeActions().length-6)/2))} width={Math.min(48,dimensions().width-8)} height={homeActions().length+6} flexDirection="column" backgroundColor="#20232a" border borderColor="#73a5df" padding={1}>
      <text height={1} fg="#eeeeee"><b>{label('Opções','Options')}</b></text>
      <For each={homeActions()}>{(action,i)=><text height={1} fg={selected()===i()?'#ffffff':'#c4cbd6'} bg={selected()===i()?'#26446b':'#20232a'} onMouseDown={()=>chooseHomeOption(i())}>{selected()===i()?'› ':'  '}{actionLabel(action)}</text>}</For>
      <KeyHints items={[["tab/↑↓",label('escolher','choose')],["enter",label('abrir','open')],["esc",label('fechar','close')]]}/>
    </box></Show>
    <Show when={panel()==='commands'}><CommandBox width={Math.min(86,dimensions().width-8)} left={Math.floor((dimensions().width-Math.min(86,dimensions().width-8))/2)} bottom={footerRows()+2} rows={commandRows()} value={commandQuery()} placeholder={label('Digite um comando…','Type a command…')} empty={label('Nenhum comando encontrado','No matching commands')} options={commandMatches().map(c=>({name:c.name,description:label(c.pt,c.en)+(c.usage?' · '+c.usage:'')}))} selected={selected()} error={commandError()} lang={language()} onInput={q=>{setCommandQuery(q);setSelected(0);setCommandError('');}} onSubmit={()=>submitCommand()} onChoose={index=>submitCommand(commandMatches()[index])}/></Show>
    <Show when={panel()==='tabs'}><CommandBox width={Math.min(86,dimensions().width-8)} left={Math.floor((dimensions().width-Math.min(86,dimensions().width-8))/2)} bottom={footerRows()+2} rows={commandRows()} value={tabFilter()} placeholder={label('Filtrar livros abertos…','Filter open books…')} empty={label('Nenhum livro aberto','No open books')} options={tabOptions().map(row=>({name:String(row.index+1),description:(book()===row.book?'› ':'')+row.book.title}))} selected={selected()} lang={language()} onInput={value=>{setTabFilter(value);setSelected(0);}} onSubmit={()=>chooseTab(tabOptions()[selected()]?.index??-1)} onChoose={index=>chooseTab(tabOptions()[index]?.index??-1)}/></Show>
    <Show when={panel()==='search'}><CommandBox width={Math.min(86,dimensions().width-8)} left={Math.floor((dimensions().width-Math.min(86,dimensions().width-8))/2)} bottom={footerRows()+2} rows={commandRows()} value={query()} placeholder={label('Buscar texto neste livro…','Search text in this book…')} empty={query().trim()?label('Nenhum resultado','No results'):label('Digite um trecho para buscar no livro','Type a passage to search in the book')} options={results().map(r=>({description:r.label}))} selected={selected()} lang={language()} onInput={q=>{setQuery(q);void search(q);}} onSubmit={()=>{const result=results()[selected()];if(result){jump(result.anchor);setPanel('');}}} onChoose={index=>{const result=results()[index];if(result){jump(result.anchor);setPanel('');}}}/></Show>
    <box height={footerRows()+1} flexShrink={0} flexDirection="column"><box flexDirection="row" justifyContent="space-between" height={footerRows()}><text width={book()||busy()?undefined:footerPathWidth()} wrapMode="char" fg="#777777">{busy()?t('loading'):book()?pdf()?`${chapter()+1}/${book()!.chapters.length} · PDF · ${Math.round(pdfZoom()*100)}%${(pdfViewport()?.bands??1)>1?` · ${label('faixa','band')} ${pdfViewport()!.band}/${pdfViewport()!.bands}`:''}`:`${chapter()+1}/${book()!.chapters.length} · ${Math.round(100*(chapter()+line()/Math.max(1,lines().length))/book()!.chapters.length)}%`:libraryPath}</text><Show when={pdf()}><KeyHints items={[["PgUp/PgDn",pdfZoom()>1?label('faixas','bands'):label('páginas','pages')],["+/−",'zoom'],["↑↓←→",label('mover','pan')],["0",label('ajustar','fit')]]}/></Show><Show when={book()&&!pdf()}><KeyHints items={cursor()?[["shift+↑↓←→",label('selecionar','select')],["ctrl+s",label('destacar','highlight')],["esc",label('cancelar','cancel')]]:[["v",label('cursor','cursor')],["/",label('comandos','commands')],["?",label('atalhos','shortcuts')]]}/></Show><Show when={active()===-2}><KeyHints items={[["↑↓",label('selecionar','select')],["←→",label('ajustar','adjust')],["enter",label('editar','edit')]]}/></Show><Show when={home()}><text width={11} height={1} flexShrink={0} fg="#666666">LER {VERSION}</text></Show></box><text fg="#888888">{status()}</text></box>
  </box>;
}
