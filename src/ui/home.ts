export type HomeAction = 'folders' | 'settings' | 'continue' | 'help' | 'refresh' | 'quit' | 'highlights' | 'statistics';
export const commands: {name:string; action:HomeAction; pt:string; en:string}[] = [
 {name:'/highlights',action:'highlights',pt:'Ver trechos salvos',en:'Browse saved passages'},
 {name:'/stats',action:'statistics',pt:'Estatísticas da biblioteca',en:'Library statistics'},
 {name:'/library',action:'folders',pt:'Explorar pastas',en:'Browse folders'},
 {name:'/settings',action:'settings',pt:'Ajustar aparência',en:'Change appearance'},
 {name:'/continue',action:'continue',pt:'Retomar a última leitura',en:'Resume last book'},
 {name:'/help',action:'help',pt:'Ver atalhos',en:'Keyboard shortcuts'},
 {name:'/refresh',action:'refresh',pt:'Atualizar catálogo',en:'Refresh catalog'},
 {name:'/quit',action:'quit',pt:'Salvar e sair',en:'Save and quit'},
];
export function folderMatches(name:string,query:string){const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();return normalize(name).includes(normalize(query.trim()));}
