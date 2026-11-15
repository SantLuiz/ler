import {commands,type HomeAction} from './home';

export type ReaderAction='search'|'contents'|'bookmarks'|'home'|'close'|'pause'|'highlight'|'language'|'protocol'|
  'save'|'info'|'tabs'|'switch'|'next-tab'|'previous-tab'|'chapter'|'page'|'next'|'previous'|'start'|'end'|'back'|'bookmark'|'width'|'spacing'|'zoom'|'fit'|'animation'|'palette'|'change-library';
export type PaletteCommand={name:string;action:HomeAction|ReaderAction;pt:string;en:string;usage?:string;arguments?:'required'|'optional'};
type ScopedCommand=PaletteCommand&{scope?:'reading'|'text'|'pdf'|'tabs'};
const extraCommands:ScopedCommand[]=[
  {name:'/change-library',action:'change-library',arguments:'optional',usage:'/change-library [path]',pt:'Escolher outra pasta de biblioteca',en:'Choose a different library directory'},
  {name:'/palette',action:'palette',arguments:'optional',usage:'/palette [blue|mint|lavender|amber|coral]',pt:'Escolher uma paleta de cores; sem valor alterna',en:'Choose a color palette; omit value to cycle'},
  {name:'/save',action:'save',pt:'Salvar progresso e dados agora',en:'Save progress and data now'},
  {name:'/info',action:'info',scope:'reading',pt:'Informações do livro e posição atual',en:'Book information and current position'},
  {name:'/tabs',action:'tabs',scope:'tabs',pt:'Escolher um livro aberto',en:'Choose an open book'},
  {name:'/switch',action:'switch',scope:'tabs',arguments:'required',usage:'/switch <number>',pt:'Abrir a aba pelo número de /tabs',en:'Switch by the number shown in /tabs'},
  {name:'/next-tab',action:'next-tab',scope:'tabs',pt:'Próximo livro aberto',en:'Next open book'},
  {name:'/previous-tab',action:'previous-tab',scope:'tabs',pt:'Livro aberto anterior',en:'Previous open book'},
  {name:'/chapter',action:'chapter',scope:'text',arguments:'required',usage:'/chapter <number>',pt:'Ir ao capítulo ou seção pelo número',en:'Go to chapter or section by number'},
  {name:'/page',action:'page',scope:'pdf',arguments:'required',usage:'/page <number>',pt:'Ir à página do PDF',en:'Go to PDF page'},
  {name:'/next',action:'next',scope:'reading',pt:'Próximo capítulo ou página',en:'Next chapter or page'},
  {name:'/previous',action:'previous',scope:'reading',pt:'Capítulo ou página anterior',en:'Previous chapter or page'},
  {name:'/start',action:'start',scope:'reading',pt:'Ir ao início do livro',en:'Go to beginning of book'},
  {name:'/end',action:'end',scope:'reading',pt:'Ir ao fim do livro',en:'Go to end of book'},
  {name:'/back',action:'back',scope:'reading',pt:'Voltar à posição anterior a um salto',en:'Return to position before a jump'},
  {name:'/bookmark',action:'bookmark',scope:'reading',pt:'Adicionar ou remover marcador aqui',en:'Toggle bookmark at current position'},
  {name:'/width',action:'width',arguments:'required',usage:'/width <40–140>',pt:'Definir largura de leitura',en:'Set reading width'},
  {name:'/spacing',action:'spacing',arguments:'required',usage:'/spacing <0–2>',pt:'Definir espaçamento entre linhas',en:'Set line spacing'},
  {name:'/zoom',action:'zoom',scope:'pdf',arguments:'required',usage:'/zoom <100–400>',pt:'Definir zoom do PDF em porcentagem',en:'Set PDF zoom percentage'},
  {name:'/fit',action:'fit',scope:'pdf',pt:'Ajustar página inteira e centralizar',en:'Fit entire page and center'},
  {name:'/animation',action:'animation',arguments:'optional',usage:'/animation [on|off]',pt:'Ligar ou desligar animações da home',en:'Turn home animations on or off'}
];
export function paletteCommands(reading:boolean,pdf:boolean,hasTabs:boolean):PaletteCommand[] {
  return [
    ...(reading?[
      {name:'/search',action:'search' as const,arguments:'optional' as const,usage:'/search [text]',pt:pdf?'Busca textual indisponível em PDF':'Buscar texto no livro',en:pdf?'Text search unavailable in PDF':'Search text in the book'},
      {name:'/contents',action:'contents' as const,pt:'Abrir sumário',en:'Open contents'},
      {name:'/bookmarks',action:'bookmarks' as const,pt:'Ver marcadores',en:'Browse bookmarks'},
      ...(!pdf?[{name:'/highlight',action:'highlight' as const,pt:'Selecionar texto para destacar',en:'Select text to highlight'}]:[]),
      {name:'/pause',action:'pause' as const,pt:'Pausar ou retomar o tempo de leitura',en:'Pause or resume reading time'},
      {name:'/home',action:'home' as const,pt:'Voltar à home',en:'Go to home'},
      {name:'/close',action:'close' as const,pt:'Salvar e fechar o livro',en:'Save and close book'}]:[]),
    ...commands,
    {name:'/language',action:'language',arguments:'optional',usage:'/language [en|pt-BR]',pt:'Trocar idioma',en:'Switch language'},
    {name:'/protocol',action:'protocol',arguments:'optional',usage:'/protocol [auto|blocks]',pt:'Definir protocolo de imagens',en:'Set image protocol'},
    ...extraCommands.filter(c=>!c.scope||(c.scope==='reading'&&reading)||(c.scope==='text'&&reading&&!pdf)||(c.scope==='pdf'&&reading&&pdf)||(c.scope==='tabs'&&hasTabs))
  ];
}
export function integerArgument(value:string,min:number,max:number) {
  if(!/^\d+$/.test(value))return undefined;
  const number=Number(value);return Number.isSafeInteger(number)&&number>=min&&number<=max?number:undefined;
}
