import {createCliRenderer,type CliRenderer} from '@opentui/core';
import {render} from '@opentui/solid';
import {LibrarySession} from './LibrarySession';

export async function startInterface(props:Parameters<typeof LibrarySession>[0],onRenderer:(renderer:CliRenderer)=>void){
  const renderer=await createCliRenderer({exitOnCtrlC:false,consoleOptions:{title:'Console · Esc/F12'}});
  onRenderer(renderer);
  renderer.setTerminalTitle('LER — Leitor Extremamente Reduzido');
  await render(()=><LibrarySession {...props}/>,renderer);
}
