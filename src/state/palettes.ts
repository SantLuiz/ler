export const palettes = [
  {id:'blue',pt:'Azul e branco',en:'Blue & white',background:'#101114',foreground:'#d6d6d6',accent:'#7bb4ff',secondary:'#e6e8ed'},
  {id:'mint',pt:'Menta e creme',en:'Mint & cream',background:'#101715',foreground:'#ece9dc',accent:'#8dd9b5',secondary:'#ece9dc'},
  {id:'lavender',pt:'Lavanda, rosa e marfim',en:'Lavender, rose & ivory',background:'#17141e',foreground:'#eee9f4',accent:'#baa4ef',secondary:'#e7a5bc'},
  {id:'amber',pt:'Âmbar e marfim',en:'Amber & ivory',background:'#191610',foreground:'#efe8d8',accent:'#e5bd78',secondary:'#efe8d8'},
  {id:'coral',pt:'Coral, turquesa e creme',en:'Coral, teal & cream',background:'#16191b',foreground:'#f0e9df',accent:'#eea28d',secondary:'#8ed3cf'}
] as const;
export type PaletteId=typeof palettes[number]['id'];
export function paletteById(id:unknown){return palettes.find(p=>p.id===id)??palettes[0];}
export function blend(from:string,to:string,amount:number){return '#'+[1,3,5].map(i=>Math.round(parseInt(from.slice(i,i+2),16)*(1-amount)+parseInt(to.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');}
export function themeFor(value:{palette?:PaletteId;background:string;foreground:string}){
  const palette=paletteById(value.palette);
  return {palette,background:value.background,foreground:value.foreground,accent:palette.accent,secondary:palette.secondary,
    panel:blend(value.background,value.foreground,0.075),muted:blend(value.background,value.foreground,0.65),
    selected:palette.accent,selectedText:palette.background,subtle:blend(value.background,palette.accent,0.16),
    logoText:palette.id==='blue'?'#E6E8ED':value.foreground,logoAccent:palette.id==='blue'?'#7AA2F7':palette.accent};
}
export type Theme=ReturnType<typeof themeFor>;
