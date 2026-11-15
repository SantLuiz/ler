export const LOGO = '██      ██████  █████ \n██      ██      ██  ██\n██      █████   █████ \n██      ██      ██ ██ \n██████  ██████  ██  ██';
export type HomeAction = 'folders' | 'settings' | 'continue' | 'help' | 'refresh' | 'quit';
export const commands: {name:string; alias:string; action:HomeAction; pt:string; en:string}[] = [
 {name:'/biblioteca',alias:'/library',action:'folders',pt:'Explorar pastas',en:'Browse folders'},
 {name:'/config',alias:'/settings',action:'settings',pt:'Ajustar aparência',en:'Change appearance'},
 {name:'/continuar',alias:'/continue',action:'continue',pt:'Retomar a última leitura',en:'Resume last book'},
 {name:'/ajuda',alias:'/help',action:'help',pt:'Ver atalhos',en:'Keyboard shortcuts'},
 {name:'/atualizar',alias:'/refresh',action:'refresh',pt:'Atualizar catálogo',en:'Refresh catalog'},
 {name:'/sair',alias:'/quit',action:'quit',pt:'Salvar e sair',en:'Save and quit'},
];
export function matchingCommands(query:string) {const value=query.trim().toLocaleLowerCase();return value.startsWith('/')?commands.filter(c=>c.name.startsWith(value)||c.alias.startsWith(value)):[];}
export function folderMatches(name:string,query:string){const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();return normalize(name).includes(normalize(query.trim()));}
