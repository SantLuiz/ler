import {useTheme} from '../theme';
import {createSignal,createMemo,For,Show} from 'solid-js';
import {onAnimationTick} from '@opentui/solid';
import {logoPixels,pixelColor} from '../logo';

export function HomeLogo(props:{size:'large'|'medium'|'small'; animate:boolean; background?:string; pixelSize?:number; quantity?:number}) {
  const theme=useTheme();
  const colors=()=>({text:theme().logoText,accent:theme().logoAccent,baseline:theme().palette.id==='blue'?'#535B6B':theme().muted});
  const [phase,setPhase]=createSignal(0);
  // The LED chase and independent twinkles share a low-rate clock, stopped when hidden.
  onAnimationTick(()=>props.animate&&props.size!=='small'?6:undefined,(_delta,ticks)=>setPhase(previous=>previous+ticks));
  return <Show when={props.size!=='small'} fallback={<text id="home-logo" height={1} fg={colors().text}>L E R<span style={{fg:colors().accent}}> ▪</span></text>}>
    <Show when={props.size} keyed>{size=>{
      const rows=createMemo(()=>logoPixels(size==='large'?'large':'medium',props.quantity,props.pixelSize));
      return <box id="home-logo" width={rows()[0].length*2} height={rows().length} flexShrink={0} flexDirection="column">
        <For each={rows()}>{row=><text height={1} fg={colors().text}><For each={row}>{pixel=><span style={{fg:pixelColor(pixel,props.animate?phase():undefined,props.background,colors()),bg:pixel.kind==='inset'?colors().text:undefined}}>{pixel.glyph}</span>}</For></text>}</For>
      </box>;
    }}</Show>
  </Show>;
}
