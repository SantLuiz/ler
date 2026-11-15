import {useTheme} from '../theme';
import {For,Show} from 'solid-js';
import {KeyHints} from './KeyHints';

export type CommandOption={name?:string;description:string};
export function CommandBox(props:{width:number;left:number;bottom:number;rows:number;value:string;placeholder:string;empty:string;options:CommandOption[];selected:number;error?:string;lang:'en'|'pt-BR';onInput:(value:string)=>void;onSubmit:()=>void;onChoose:(index:number)=>void}) {
  const colors=useTheme();
  const start=()=>Math.max(0,props.selected-props.rows+1);
  const options=()=>props.options.slice(start(),start()+props.rows);
  const label=(pt:string,en:string)=>props.lang==='pt-BR'?pt:en;
  return <box id="command-box" position="absolute" left={props.left} bottom={props.bottom} width={props.width} height={Math.max(1,options().length)+5} flexDirection="column" backgroundColor={colors().panel} border={['left']} borderColor={colors().accent} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
    <For each={options()}>{(option,i)=><box height={1} flexShrink={0} flexDirection="row" backgroundColor={start()+i()===props.selected?colors().selected:colors().panel} onMouseDown={()=>props.onChoose(start()+i())}>
      <Show when={option.name}><text height={1} width={16} flexShrink={0} fg={start()+i()===props.selected?colors().selectedText:colors().foreground}>{option.name}</text></Show>
      <text height={1} flexGrow={1} fg={start()+i()===props.selected?colors().selectedText:colors().muted}>{option.description}</text>
    </box>}</For>
    <Show when={!options().length}><text height={1} fg={colors().muted}>{props.empty}</text></Show>
    <box marginTop={1} height={1}><input id="command-input" focused value={props.value} placeholder={props.placeholder} onInput={props.onInput} onSubmit={props.onSubmit} backgroundColor={colors().panel} textColor={colors().foreground}/></box>
    <Show when={props.error} fallback={<KeyHints items={[["↑↓",label('escolher','choose')],["enter",label('executar','run')],["esc",label('fechar','close')]]}/>}><text height={1} fg={colors().selected}>{props.error}</text></Show>
  </box>;
}
