import {useTheme} from '../theme';
import {For} from 'solid-js';
export type Hint = readonly [key:string, label:string];
export function KeyHints(props:{items:readonly Hint[]; color?:string}) {
  const colors=useTheme();
  return <box flexDirection="row" gap={2} height={1} flexShrink={0}><For each={props.items}>{item=><text height={1} fg={colors().muted}><span style={{fg:props.color??colors().foreground}}><b>{item[0]}</b></span> {item[1]}</text>}</For></box>;
}
