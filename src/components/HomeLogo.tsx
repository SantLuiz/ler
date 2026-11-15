import {createSignal,For,Show} from 'solid-js';
import {onAnimationTick} from '@opentui/solid';
import {logoPixels,pixelColor,logoColors} from '../logo';

export function HomeLogo(props:{size:'large'|'medium'|'small'; animate:boolean; background?:string}) {
  const [phase,setPhase]=createSignal(0);
  // The LED chase and independent twinkles share a low-rate clock, stopped when hidden.
  onAnimationTick(()=>props.animate&&props.size!=='small'?6:undefined,(_delta,ticks)=>setPhase(previous=>previous+ticks));
  return <Show when={props.size!=='small'} fallback={<text id="home-logo" height={1} fg={logoColors.text}>L E R<span style={{fg:logoColors.accent}}> ▪</span></text>}>
    <Show when={props.size} keyed>{size=>{
      const rows=logoPixels(size==='large'?'large':'medium');
      return <box id="home-logo" width={rows[0].length*2} height={rows.length} flexShrink={0} flexDirection="column">
        <For each={rows}>{row=><text height={1} fg={logoColors.text}><For each={row}>{pixel=><span style={{fg:pixelColor(pixel,props.animate?phase():undefined,props.background),bg:pixel.kind==='inset'?logoColors.text:undefined}}>{pixel.glyph}</span>}</For></text>}</For>
      </box>;
    }}</Show>
  </Show>;
}
