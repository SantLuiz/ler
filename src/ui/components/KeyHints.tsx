import {For} from 'solid-js';
export type Hint = readonly [key:string, label:string];
export function KeyHints(props:{items:readonly Hint[]; color?:string}) {
  return <box flexDirection="row" gap={2} height={1} flexShrink={0}><For each={props.items}>{item=><text height={1} fg="#888888"><span style={{fg:props.color??'#cccccc'}}><b>{item[0]}</b></span> {item[1]}</text>}</For></box>;
}
