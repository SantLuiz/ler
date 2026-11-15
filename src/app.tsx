import { useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/solid';
import { batch, createSignal, createMemo, createEffect, createResource, onCleanup, on, For, Show } from 'solid-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openBook, layout, tocAnchor, type Book, type Anchor } from './book';
import { store, type State } from './storage';
import { preferences, imageRows, type Preferences } from './preferences';
import {searchCatalog,type Catalog,type CatalogEntry} from './catalog';
import {LOGO,matchingCommands,folderMatches,type HomeAction} from './home';
import {KeyHints} from './components/KeyHints';
import {previousPage} from './pagination';
import {bookFormat,bookTitle} from './formats';
import {PdfPage,adjacentBand,type PdfViewport} from './components/PdfPage';

const dictionary = {
  library: ['Library', 'Biblioteca'], open: ['Open', 'Abrir'], loading: ['Loading…', 'Carregando…'], search: ['Search', 'Buscar'], empty: ['No books here', 'Nenhum livro aqui'], toc: ['Contents', 'Sumário'], marks: ['Bookmarks', 'Marcadores'], help: ['Help', 'Ajuda'], settings: ['Commands', 'Comandos'], image: ['Image unavailable', 'Imagem indisponível'], quit: ['Save and quit', 'Salvar e sair'], language: ['Switch language', 'Trocar idioma'], refresh: ['Refresh library', 'Atualizar biblioteca'], motion: ['Toggle reduced motion', 'Alternar movimento reduzido'], protocol: ['Toggle image blocks / auto', 'Alternar imagens blocos / auto']
} as const;
export function App(props: { root: string; appDirectory?: string; state: State; warning?: string; persistence?: Awaited<ReturnType<typeof store>>; opened: Book[]; exit: () => Promise<void> }) {
  const { root, state, persistence, opened, exit } = props; const warning = props.warning ?? '';
  const appDirectory=props.appDirectory??path.resolve(import.meta.dir,'..');
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
  const [libraryQuery,setLibraryQuery]=createSignal('');
  const [catalog,setCatalog]=createSignal<CatalogEntry[]>([]);
  const [librarySelected,setLibrarySelected]=createSignal(0);
  const [indexing,setIndexing]=createSignal(false);
  const [homeFocus,setHomeFocus]=createSignal(0);
  const [folderQuery,setFolderQuery]=createSignal('');
  const [lastBook,setLastBook]=createSignal<Book>();
  const [lastReadId,setLastReadId]=createSignal(state.lastRead??state.active??state.tabs.at(-1));
  const resumable=()=>!!(lastReadId()&&state.books[lastReadId()!]);
  const resumeTitle=()=>{const id=lastReadId();return tabs().find(b=>b.id===id)?.title??(lastBook()?.id===id?lastBook()!.title:bookTitle(state.books[id??'']?.file??''));};
  const homeActions=():HomeAction[]=>resumable()?['folders','continue','settings','help']:['folders','settings','help'];
  const home = () => active()===-1;
  const homeCommands = createMemo(()=>matchingCommands(libraryQuery()));
  const folderEntries = createMemo(()=>[
    ...(directory()!==root?[{name:'..',full:path.dirname(directory()),dir:true}]:[]),
    ...entries().filter(e=>folderMatches(e.name,folderQuery()))
  ]);
  let catalogWorker:Worker|undefined;let catalogReady=false;
  const matches=createMemo(()=>searchCatalog(catalog(),libraryQuery()));
  createEffect(on(libraryQuery,()=>setLibrarySelected(0)));
  function scanLibrary(){catalogWorker?.terminate();setIndexing(true);setCatalog([]);const next:Catalog={};const worker=new Worker(new URL('./catalog.worker.ts',import.meta.url).href);catalogWorker=worker;worker.onmessage=e=>{if(e.data.type==='entry'){const entry=e.data.entry as CatalogEntry;next[entry.file]=entry;setCatalog(previous=>[...previous,entry]);}else{setIndexing(false);catalogReady=e.data.type==='done';if(catalogReady){state.catalog=next;void persistence?.save().catch(error=>setStatus(String(error)));}else setStatus(e.data.message);worker.terminate();}};worker.onerror=e=>{setStatus(e.message);setIndexing(false);};worker.postMessage({root,ignored:appDirectory,cached:state.catalog??{}});}
  onCleanup(()=>catalogWorker?.terminate());
  async function openLibraryResult(){const entry=matches()[librarySelected()];if(entry)await load(path.join(root,entry.file));}
  function homeInput(value:string){setLibraryQuery(value);setHomeFocus(0);if(value.trim()&&!value.startsWith('/')&&!catalogReady&&!indexing())scanLibrary();}
  async function openFolders(){setFolderQuery('');setSelected(0);setPanel('folders');await browse();}
  async function chooseFolder(index=selected()){const entry=folderEntries()[index];if(!entry)return;if(entry.dir){setFolderQuery('');await browse(entry.full);}else await load(entry.full);}
  async function resumeReading(){const id=lastReadId();const saved=id?state.books[id]:undefined;if(!saved){setStatus(label('Nenhuma leitura salva nesta biblioteca.','No saved reading in this library.'));return;}setStatus(warning);const index=tabs().findIndex(b=>b.id===id);if(index>=0)switchTab(index);else await load(path.join(root,saved.file));}
  function runAction(action:HomeAction){if(action==='folders')void openFolders();if(action==='settings')switchTab(-2);if(action==='continue')void resumeReading();if(action==='help')setPanel('help');if(action==='refresh')scanLibrary();if(action==='quit'){remember();void exit();}}
  function submitHome(){if(libraryQuery().startsWith('/')){const command=homeCommands()[librarySelected()];if(command){setLibraryQuery('');runAction(command.action);}}else void openLibraryResult();}
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
  const settingsText = () => language()==='en' ? ['Background','Text color','Reading width','Image height','Line spacing','Image protocol','Language','Reset appearance'] : ['Cor do fundo','Cor do texto','Largura da leitura','Altura das imagens','Espaçamento entre linhas','Protocolo de imagem','Idioma','Restaurar aparência'];
  const values = () => [prefs().background,prefs().foreground,String(prefs().readingWidth),prefs().imagePercent+'%',String(prefs().lineGap),protocol(),language(),'↵'];
  function changeSetting(delta = 1) { const index=setting(); if(index<2) { setColorField(index===0?'background':'foreground');setQuery(prefs()[index===0?'background':'foreground']);setPanel('color'); } else if(index===2)updatePrefs({readingWidth:prefs().readingWidth+delta*4});else if(index===3)updatePrefs({imagePercent:prefs().imagePercent+delta*10});else if(index===4)updatePrefs({lineGap:prefs().lineGap+delta});else if(index===5)setProtocol(protocol()==='auto'?'blocks':'auto');else if(index===6){state.lang=language()==='en'?'pt-BR':'en';setLanguage(state.lang);void persistence?.save();}else updatePrefs(preferences()); }
  const lines = createMemo(() => book() ? layout(book()!, width(), chapter()) : []);
  const anchor = (): Anchor => lines()[line()]?.anchor ?? { chapter: chapter(), block: 0, offset: 0 };
  function remember() { const b = book(); if (b && state.books[b.id]) {state.books[b.id].anchor = anchor();state.lastRead=b.id;setLastReadId(b.id);} state.tabs = tabs().map(b => b.id); state.active = b?.id; void persistence?.save().catch(e => setStatus(String(e))); }
  function jump(a: Anchor) { batch(()=>{setChapter(Math.max(0,Math.min(Number.isFinite(a.chapter)?Math.trunc(a.chapter):0, book()!.chapters.length - 1))); const ls = layout(book()!, width(), chapter()); let index = 0;for(let i=0;i<ls.length;i++)if(ls[i].anchor.block===a.block&&ls[i].anchor.offset<=a.offset)index=i;setLine(index);}); }
  function switchTab(index: number) { batch(()=>{const old=book();if(old){setLastBook(old);searches.set(old.id,{query:query(),results:results(),selected:selected()});}remember();searchWorker?.terminate();setActive(index===-3?-1:index);setHomeFocus(0); setPanel('');if(book()){setLastBook(book());jump(state.books[book()!.id].anchor);const saved=searches.get(book()!.id);setQuery(saved?.query??'');setResults(saved?.results??[]);setSelected(saved?.selected??0);}}); }
  function closeTab(index:number){batch(()=>{remember();const b=tabs()[index];if(!b)return;setTabs(tabs().filter(x=>x!==b));b.close();setActive(-1);remember();});}
  async function browse(dir = directory()) { try { const list = await fs.readdir(dir, { withFileTypes: true }); setEntries(list.filter(e => !['.git', '.leitor', '.ler', 'node_modules'].includes(e.name) && path.join(dir, e.name) !== appDirectory && (e.isDirectory() || bookFormat(e.name))).map(e => ({ name: e.name, full: path.join(dir, e.name), dir: e.isDirectory() })).sort((a,b) => Number(b.dir)-Number(a.dir) || a.name.localeCompare(b.name))); setDirectory(dir); setSelected(0); } catch(e) { setStatus(String(e)); } }
  async function load(file: string, restore = false) { setBusy(true); try { const b = await openBook(file); const existing = tabs().findIndex(t => t.id === b.id); if (existing >= 0) { b.close(); switchTab(existing); return; } opened.push(b); state.books[b.id] ??= { file: path.relative(root!, file), anchor: { chapter: 0, block: 0, offset: 0 }, bookmarks: [] }; state.books[b.id].file = path.relative(root!, file); setTabs([...tabs(), b]); switchTab(tabs().length - 1); if (!restore) remember(); } catch(e) { setStatus(String(e)); } finally { setBusy(false); } }
  async function startup() { const ids = [...state.tabs];const current=lastReadId();await browse();for (const id of ids) { const saved = state.books[id]; if (saved) await load(path.join(root!, saved.file), true); }const previous=tabs().find(b=>b.id===current);switchTab(-1);setLastBook(previous);setLastReadId(current);state.lastRead=current; }
  void startup();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => { line(); chapter(); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(remember, 500); });
  const autosave = setInterval(remember, 2000);
  onCleanup(()=>{clearInterval(autosave);if(saveTimer)clearTimeout(saveTimer);});
  createEffect(on(width, (_next,previous)=>{ if(previous && book()) { const old=layout(book()!,previous,chapter())[line()]?.anchor;if(old)jump(old); } }));
  const [results, setResults] = createSignal<{ label: string; anchor: Anchor }[]>([]);
  let searchWorker:Worker|undefined;
  onCleanup(()=>searchWorker?.terminate());
  async function search(q: string) {searchWorker?.terminate();setSelected(0);const b=book();if(!b||!q.trim()){setResults([]);return;}const worker=new Worker(new URL('./search.worker.ts',import.meta.url).href);searchWorker=worker;worker.onmessage=e=>{setResults(e.data);worker.terminate();};worker.onerror=e=>setStatus(e.message);worker.postMessage({chapters:b.chapters,query:q});}
  function move(delta: number) { const target = line()+delta; if (target >= lines().length && chapter()+1 < book()!.chapters.length) { setChapter(chapter()+1); setLine(0); } else if (target < 0 && chapter() > 0) { setChapter(chapter()-1); setLine(previousPage(lines(),lines().length,height(),textHeight(),pictureHeight())); } else setLine(Math.max(0,Math.min(Math.max(0,lines().length-1),target))); }
  const menu = createMemo(() => panel() === 'toc' && book() ? (book()!.toc.length ? book()!.toc.flatMap(c=>{const anchor=tocAnchor(book()!,c.href);return anchor?[{label:c.label,anchor}]:[];}) : book()!.chapters.map((c,i) => ({ label:c.title, anchor:{chapter:i,block:0,offset:0} }))) : panel() === 'marks' && book() ? state.books[book()!.id].bookmarks.map(m => ({ label:m.excerpt,anchor:m.anchor })) : results());
  useKeyboard(e => {
    if (e.ctrl && e.name === 'c') { remember(); clearInterval(autosave); void exit(); return; }
    if (e.name === 'f12' || (e.name === 'escape' && renderer.console.visible)) {
      e.preventDefault();e.stopPropagation();
      if (renderer.console.visible) renderer.console.hide(); else renderer.console.show();
      renderer.requestRender();return;
    }
    if (renderer.console.visible) {e.preventDefault();return;}
    if (e.name === 'escape') {e.preventDefault();searchWorker?.terminate();if(panel())setPanel('');else if(book())closeTab(active());else if(home()){setLibraryQuery('');setHomeFocus(0);}return; }
    if (e.name === 'f6') { const order=[-1,...tabs().map((_,i)=>i),-2];switchTab(order[(order.indexOf(active())+(e.shift?-1:1)+order.length)%order.length]); return; }
    if (e.name === 'f3') { switchTab(-2); return; }
    if (e.name === 'f5') { switchTab(-3); return; }
    if (e.name === 'f4' && book()) { closeTab(active()); return; }
    if (e.name === 'f2') { setPanel('commands'); setSelected(0); return; }
    if(e.ctrl&&e.name==='p'){e.preventDefault();setPanel('commands');setSelected(0);return;}
    if(panel()==='folders') {if(e.name==='down'||e.name==='up'){e.preventDefault();setSelected(Math.max(0,Math.min(folderEntries().length-1,selected()+(e.name==='down'?1:-1))));}if(e.name==='return'){e.preventDefault();void chooseFolder();}if(e.name==='backspace'&&!folderQuery()&&directory()!==root){e.preventDefault();void browse(path.dirname(directory()));}return;}
    if(home()&&!panel()) {if(e.name==='tab'){e.preventDefault();setHomeFocus((homeFocus()+(e.shift?-1:1)+homeActions().length+1)%(homeActions().length+1));return;}if(e.name==='down'||e.name==='up'){e.preventDefault();const count=libraryQuery().startsWith('/')?homeCommands().length:matches().length;setLibrarySelected(Math.max(0,Math.min(count-1,librarySelected()+(e.name==='down'?1:-1))));}if(e.name==='return'){e.preventDefault();if(homeFocus()===0)submitHome();else runAction(homeActions()[homeFocus()-1]);}if(e.ctrl&&e.name==='r'){e.preventDefault();scanLibrary();}return;}
    if(panel()==='search'&&e.name==='down'){setSelected(Math.min(results().length-1,selected()+1));e.preventDefault();return;}
    if(panel()==='search'&&e.name==='up'){setSelected(Math.max(0,selected()-1));e.preventDefault();return;}
    if (panel() === 'search' || panel()==='color') return;
    if(panel()==='marks' && e.name==='d') {state.books[book()!.id].bookmarks.splice(selected(),1);remember();setSelected(Math.max(0,selected()-1));setPanel('');return;}
    if (panel()) { const size=panel()==='commands'?4:menu().length; if (e.name === 'down'||e.name==='j') setSelected(Math.min(Math.max(0,size-1),selected()+1)); if(e.name === 'up'||e.name==='k') setSelected(Math.max(0,selected()-1));if(e.name==='home')setSelected(0);if(e.name==='end')setSelected(Math.max(0,size-1)); if (e.name === 'return') { if(panel() === 'commands') { const choice=selected()%4; if(choice===0) { state.lang=language()==='en'?'pt-BR':'en'; setLanguage(state.lang); } if(choice===1) void browse(); if(choice===2) setProtocol(protocol()==='auto'?'blocks':'auto'); if(choice===3) { remember(); void exit(); } } else { const result=menu()[selected()]; if(result) jump(result.anchor); } setPanel(''); } return; }
    if(active()===-2) { if(e.name==='down'||e.name==='j')setSetting(Math.min(7,setting()+1));if(e.name==='up'||e.name==='k')setSetting(Math.max(0,setting()-1));if(['right','return','space'].includes(e.name)){e.preventDefault();changeSetting(1);}if(e.name==='left'){e.preventDefault();changeSetting(-1);}return; }
    if (!book()) { if(e.sequence==='/'){e.preventDefault();switchTab(-3);} if(e.name==='down') setSelected(Math.min(entries().length-1,selected()+1)); if(e.name==='up') setSelected(Math.max(0,selected()-1)); if(e.name==='backspace' && directory()!==root) void browse(path.dirname(directory())); if(e.name==='return') { const entry=entries()[selected()]; if(entry) entry.dir ? void browse(entry.full) : void load(entry.full); } return; }
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
      if(e.sequence==='/'){setStatus(label('PDF exibido como imagem: busca textual indisponível.','PDF is displayed as images: text search is unavailable.'));return;}
    }
    if(['down','j'].includes(e.name)) move(1); if(['up','k'].includes(e.name)) move(-1);
    if(['right','pagedown','space'].includes(e.name)) move(Math.max(1,visible().length-1)); if(['left','pageup'].includes(e.name)){if(line()===0)move(-1);else setLine(previousPage(lines(),line(),height(),textHeight(),pictureHeight()));}
    if(e.name==='home') setLine(0); if(e.name==='end') setLine(previousPage(lines(),lines().length,height(),textHeight(),pictureHeight()));
    if(e.sequence==='/') { e.preventDefault();setPanel('search'); setQuery(''); setSelected(0); }
    if(e.name==='s') {setPanel('toc');setSelected(0);}
    if(e.name==='b' && !e.shift) { const marks=state.books[book()!.id].bookmarks; const a=anchor(); const index=marks.findIndex(m=>m.anchor.chapter===a.chapter && m.anchor.block===a.block); if(index>=0) marks.splice(index,1); else marks.push({anchor:a,excerpt:lines()[line()]?.text ?? '',date:new Date().toISOString()}); remember(); setStatus(t('marks')+': '+marks.length); }
    if(e.name==='b' && e.shift) {setPanel('marks');setSelected(0);}
    if(e.name==='n' && results().length) { const next=(selected()+(e.shift?-1:1)+results().length)%results().length;setSelected(next);jump(results()[next].anchor); }
    if(e.sequence==='?') setPanel('help');
    if(e.name==='i'){const image=visible().find(l=>l.image)?.image;if(image){setSelectedImage(image);setPanel('image');}}
  });
  const visibleTabs = createMemo(()=>{const tabWidth=Math.max(10,Math.min(25,dimensions().width-31));const count=Math.max(1,Math.floor((dimensions().width-16-(active()===-2?18:0))/(tabWidth+2)));const start=Math.max(0,active()-count+1);return tabs().slice(start,start+count);});
  function HomeScreen() {
    const homeWidth=()=>Math.min(76,dimensions().width-12);
    const resultRows=()=>Math.max(1,Math.min(5,Math.floor((dimensions().height-18)/2)));
    const actionLabel=(action:HomeAction)=>({folders:label('Biblioteca','Folders'),continue:label('Continuar','Resume'),settings:label('Aparência','Appearance'),help:label('Ajuda','Help'),refresh:label('Atualizar','Refresh'),quit:label('Sair','Quit')})[action];
    return <box width={homeWidth()} flexDirection="column" gap={1}>
      <box alignItems="center" flexDirection="column" marginBottom={1}>
        <text fg="#e3e3e3" height={dimensions().height>=28?5:1}>{dimensions().height>=28?LOGO:'L E R'}</text>
        <text fg="#777777">Leitor Extremamente Reduzido</text>
      </box>
      <box backgroundColor="#202020" border={['left']} borderColor="#73a5df" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} flexDirection="column">
        <input id="home-search" focused={homeFocus()===0&&!panel()} placeholder={label('Busque por título ou autor…','Search by title or author…')} value={libraryQuery()} onInput={homeInput} onSubmit={submitHome} backgroundColor="#202020"/>
        <box flexDirection="row" justifyContent="space-between" height={1}><text fg={indexing()?'#888888':'#73a5df'}>{indexing()?label('Atualizando biblioteca…','Updating library…'):label('Livros','Books')}</text><KeyHints items={libraryQuery().trim()?[['enter',label('abrir','open')],['esc',label('limpar','clear')]]:[['/',label('comandos','commands')]]}/></box>
      </box>
      <box flexDirection="row" gap={2}><For each={homeActions()}>{(action,i)=><text fg={homeFocus()===i()+1?'#eeeeee':'#888888'} bg={homeFocus()===i()+1?'#252525':prefs().background} onMouseDown={()=>runAction(action)}>{actionLabel(action)}</text>}</For></box>
      <Show when={!libraryQuery().trim()&&resumable()}><text height={1} fg="#888888" onMouseDown={()=>runAction('continue')}>{language()==='en'?'Resume':'Retomar'} · {resumeTitle().slice(0,homeWidth()-12)}</text></Show>
      <Show when={libraryQuery().trim().startsWith('/')}><For each={homeCommands()}>{(command,i)=><text height={1} fg={librarySelected()===i()?'#eeeeee':'#888888'} bg={librarySelected()===i()?'#252525':prefs().background} onMouseDown={()=>{setLibraryQuery('');runAction(command.action);}}>{language()==='en'?command.alias:command.name}  {language()==='en'?command.en:command.pt}</text>}</For><Show when={!homeCommands().length}><text fg="#888888">{language()==='en'?'Unknown command. Type /help.':'Comando desconhecido. Digite /ajuda.'}</text></Show></Show>
      <Show when={libraryQuery().trim()&&!libraryQuery().startsWith('/')}><text fg="#777777">{matches().length} {label('livros encontrados','books found')}</text><For each={matches().slice(Math.max(0,librarySelected()-resultRows()+1),Math.max(resultRows(),librarySelected()+1))}>{entry=><box height={2} flexDirection="column" backgroundColor={matches()[librarySelected()]===entry?'#252525':prefs().background} onMouseDown={()=>void load(path.join(root,entry.file))}><text height={1} fg={matches()[librarySelected()]===entry?'#eeeeee':'#aaaaaa'}>{entry.title}{entry.authors.length?' — '+entry.authors.join(', '):''}</text><text height={1} fg="#777777">{entry.file}</text></box>}</For><Show when={!indexing()&&!matches().length}><text fg="#888888">{language()==='en'?'No matching books.':'Nenhum livro encontrado.'}</text></Show></Show>
      <box justifyContent="flex-end" flexDirection="row" height={1}><KeyHints items={libraryQuery().trim()?[['↑↓',label('escolher','select')],['ctrl+p',label('ações','actions')]]:[['tab',label('opções','options')],['ctrl+p',label('ações','actions')]]}/></box>
    </box>;
  }
  function Picture(props: { href: string; height?:number }) { const [bytes] = createResource(() => ({ b:book(),href:props.href }), async value => { try { return await value.b?.resource(value.href); } catch { return undefined; } }); return <Show when={bytes()} fallback={<text fg="#888888">{t('image')}</text>}><image source={bytes()} width={width()} height={props.height??pictureHeight()} fit="fit" protocol={protocol()} onMouseDown={()=>{setSelectedImage(props.href);setPanel('image');}} /></Show>; }
  const visible = createMemo(() => { const output: ReturnType<typeof lines> = []; let count=0; for(const l of lines().slice(line())) { const size=l.image?pictureHeight():textHeight(); if(count+size>height()) break; output.push(l);count+=size; } return output; });
  return <box flexDirection="column" width="100%" height="100%" backgroundColor={prefs().background} paddingLeft={2} paddingRight={2}>
    <box height={1} flexShrink={0} flexDirection="row" gap={0} backgroundColor="#0c0c0c"><text height={1} width={7} fg={home()?'#eeeeee':'#777777'} bg={home()?'#252525':'#0c0c0c'} onMouseDown={()=>switchTab(-1)}><b>  LER  </b></text><For each={visibleTabs()}>{b=><box flexDirection="row" height={1} backgroundColor={b===book()?'#252525':'#171717'}><text height={1} width={Math.max(10,Math.min(25,dimensions().width-31))} fg={b===book()?'#eeeeee':'#777777'} onMouseDown={()=>switchTab(tabs().indexOf(b))}><b>  {b.title.slice(0,Math.max(6,Math.min(21,dimensions().width-35)))}</b></text><text height={1} width={2} fg="#777777" onMouseDown={()=>closeTab(tabs().indexOf(b))}>× </text></box>}</For><Show when={active()===-2}><text height={1} fg="#eeeeee" bg="#252525">  {language()==='en'?'Settings':'Configurações'}  </text></Show><text height={1} fg="#777777" onMouseDown={()=>{setLibraryQuery('');switchTab(-1);}}>  +  </text></box>
    <Show when={dimensions().width>=60 && dimensions().height>=20} fallback={<text>Resize terminal / Aumente o terminal (60×20)</text>}>
    <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent={home()?'center':'flex-start'} onMouseScroll={e=>{if(book()&&!panel()){if(pdf()){const delta=e.scroll?.direction==='up'?-1:1;if(pdfZoom()>1)setPdfY(Math.max(0,Math.min(1,pdfY()+delta*0.1)));else jump({chapter:chapter()+delta,block:0,offset:0});}else move(e.scroll?.direction==='up'?-3:3);}}}>
      <Show when={home()}><HomeScreen/></Show>
      <Show when={active()===-2}><box width="100%" flexDirection="column" paddingTop={1}><text fg="#dddddd"><b>{label('Aparência','Appearance')}</b></text><For each={settingsText()}>{(label,i)=><text height={1} fg={setting()===i()?'#7bb4ff':prefs().foreground} bg={setting()===i()?'#252c38':prefs().background} onMouseDown={()=>{setSetting(i());changeSetting();}}>{setting()===i()?'› ':'  '}{label}: {values()[i()]}</text>}</For><text fg={prefs().foreground}>{language()==='en'?'Font size: controlled by your terminal.\nWindows Terminal: Ctrl + Plus/Minus, or Ctrl + mouse wheel.\nChanges are saved automatically.':'Tamanho da letra: controlado pelo terminal.\nWindows Terminal: Ctrl + Mais/Menos ou Ctrl + roda do mouse.\nAlterações são salvas automaticamente.'}</text></box></Show>
      <Show when={pdf()}><PdfPage book={book()!} page={chapter()} width={Math.max(20,dimensions().width-4)} height={height()} zoom={pdfZoom()} x={pdfX()} y={pdfY()} protocol={protocol()} lang={language()} onViewport={setPdfViewport}/></Show>
      <Show when={book()&&!pdf()}><For each={visible()}>{l=><Show when={l.image} fallback={<text width={width()} height={textHeight()} fg={prefs().foreground}>{l.text}</text>}><Picture href={l.image!}/></Show>}</For></Show>
    </box>
    </Show>
    <Show when={panel()}><box position="absolute" left={3} top={4} width={Math.max(30,dimensions().width-6)} height={Math.max(10,dimensions().height-8)} backgroundColor="#20232a" border padding={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between" height={1}><text fg="#dddddd"><b>{panel()==='folders'?t('library'):panel()==='search'?t('search'):panel()==='toc'?t('toc'):panel()==='marks'?t('marks'):panel()==='commands'?t('settings'):panel()==='color'?label('Cor personalizada','Custom color'):panel()==='image'?label('Imagem','Image'):t('help')}</b></text><KeyHints items={[["esc",label('fechar','close')]]}/></box>
      <Show when={panel()==='folders'}><text height={1} fg="#888888">{path.relative(root,directory())||path.basename(root)}</text><input id="folder-search" focused placeholder={language()==='en'?'Filter folders and files…':'Filtrar pastas e arquivos…'} value={folderQuery()} onInput={value=>{setFolderQuery(value);setSelected(0);}} onSubmit={()=>void chooseFolder()}/><KeyHints items={[["↑↓",label('navegar','navigate')],["enter",label('abrir','open')],["backspace",label('voltar','back')]]}/><For each={folderEntries().slice(Math.max(0,selected()-Math.max(1,menuRows()-2)+1),Math.max(Math.max(1,menuRows()-2),selected()+1))}>{entry=><text height={1} width="100%" fg={folderEntries()[selected()]===entry?'#eeeeee':'#aaaaaa'} bg={folderEntries()[selected()]===entry?'#303030':'#20232a'} onMouseDown={()=>void chooseFolder(folderEntries().indexOf(entry))}>{entry.dir?'▸ ':'  '}{entry.name}</text>}</For><Show when={!folderEntries().length}><text fg="#888888">{t('empty')}</text></Show></Show>
      <Show when={panel()==='color'}><text fg="#eeeeee">{language()==='en'?'Color (#RRGGBB), Enter to apply':'Cor (#RRGGBB), Enter para aplicar'}</text><input focused value={query()} onInput={setQuery} onSubmit={()=>{if(/^#[0-9a-f]{6}$/i.test(query())){updatePrefs({[colorField()]:query()});setPanel('');}else setStatus(language()==='en'?'Use #RRGGBB':'Use #RRGGBB');}}/></Show>
      <Show when={panel()==='image'&&selectedImage()}><Picture href={selectedImage()} height={Math.max(1,dimensions().height-14)}/></Show>
      <Show when={panel()==='search'}><input focused placeholder={t('search')} value={query()} onInput={q=>{setQuery(q);void search(q);}} onSubmit={()=>{const r=results()[selected()]??results()[0];if(r)jump(r.anchor);setPanel('');}}/><For each={results().slice(Math.max(0,selected()-height()+6),Math.max(height()-5,selected()+1))}>{r=><text fg={results()[selected()]===r?'#7bb4ff':'#eeeeee'} onMouseDown={()=>{jump(r.anchor);setPanel('');}}>{r.label}</text>}</For></Show>
      <Show when={panel()==='help'}><text>{pdf() ? label('PDF: PgUp/PgDn ou Espaço: faixas/páginas\n+/- zoom · 0 página inteira · setas para mover\nHome/End primeira/última · s lista de páginas\nb marcador · Shift+B lista\nEsc salvar/fechar aba · Ctrl+C sair\nPDF como imagem: sem busca textual.', 'PDF: PgUp/PgDn or Space: bands/pages\n+/- zoom · 0 fit page · arrows to pan\nHome/End first/last · s page list\nb bookmark · Shift+B bookmarks\nEsc save/close tab · Ctrl+C exit\nPDF image mode: no text search.') : label('↑↓ j/k · PgUp/PgDn ←→ Espaço\nF6 abas · F4 fechar · F2 comandos\n/ buscar · n/N resultados · s sumário\nb marcador · Shift+B lista · d remover\ni ampliar imagem · F12 console\nEsc salvar/fechar aba · Ctrl+C sair', '↑↓ j/k · PgUp/PgDn ←→ Space\nF6 tabs · F4 close · F2 commands\n/ search · n/N results · s contents\nb bookmark · Shift+B bookmarks · d delete\ni enlarge image · F12 console\nEsc save/close tab · Ctrl+C exit')}</text></Show>
      <Show when={panel()==='commands'}><For each={[t('language'),t('refresh'),t('protocol'),t('quit')]}>{(item,i)=><text fg={selected()%4===i()?'#7bb4ff':'#eeeeee'}>{item}</text>}</For></Show>
      <Show when={panel()==='toc'||panel()==='marks'}><KeyHints items={[["↑↓",label('navegar','navigate')],["enter",label('abrir','open')]]}/><For each={menu().slice(Math.max(0,selected()-menuRows()+1),Math.max(menuRows(),selected()+1))}>{item=><text height={1} width="100%" fg={menu()[selected()]===item?'#ffffff':'#c4cbd6'} bg={menu()[selected()]===item?'#26446b':'#20232a'} onMouseDown={()=>{jump(item.anchor);setPanel('');}}>{menu()[selected()]===item?'› ':'  '}{item.label}</text>}</For></Show>
    </box></Show>
    <box height={footerRows()+1} flexShrink={0} flexDirection="column"><box flexDirection="row" justifyContent="space-between" height={footerRows()}><text width={book()||busy()?undefined:footerPathWidth()} wrapMode="char" fg="#777777">{busy()?t('loading'):book()?pdf()?`${chapter()+1}/${book()!.chapters.length} · PDF · ${Math.round(pdfZoom()*100)}%${(pdfViewport()?.bands??1)>1?` · ${label('faixa','band')} ${pdfViewport()!.band}/${pdfViewport()!.bands}`:''}`:`${chapter()+1}/${book()!.chapters.length} · ${Math.round(100*(chapter()+line()/Math.max(1,lines().length))/book()!.chapters.length)}%`:libraryPath}</text><Show when={pdf()}><KeyHints items={[["PgUp/PgDn",pdfZoom()>1?label('faixas','bands'):label('páginas','pages')],["+/−",'zoom'],["↑↓←→",label('mover','pan')],["0",label('ajustar','fit')]]}/></Show><Show when={book()&&!pdf()}><KeyHints items={[["/",label('buscar','search')],["s",label('sumário','contents')],["?",label('atalhos','shortcuts')]]}/></Show><Show when={active()===-2}><KeyHints items={[["↑↓",label('selecionar','select')],["←→",label('ajustar','adjust')],["enter",label('editar','edit')]]}/></Show><Show when={home()}><text width={11} height={1} flexShrink={0} fg="#666666">LER 0.1.0</text></Show></box><text fg="#888888">{status()}</text></box>
  </box>;
}
