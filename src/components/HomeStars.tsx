import {createMemo,createSignal,For} from 'solid-js';
import {onAnimationTick} from '@opentui/solid';
import {homeStars,twinkleColor,animationPixel} from '../logo';

export function HomeStars(props:{width:number;height:number;background:string;animate:boolean;pixelSize?:number;quantity?:number}) {
  const [phase,setPhase]=createSignal(0);
  const stars=createMemo(()=>homeStars(props.width,props.height,props.quantity));
  onAnimationTick(()=>props.animate?6:undefined,(_delta,ticks)=>setPhase(previous=>previous+ticks));
  return <box id="home-stars" position="absolute" left={2} top={1} width={props.width} height={props.height} zIndex={0}>
    <For each={stars()}>{star=><text position="absolute" left={star.x} top={star.y} width={1} height={1} fg={twinkleColor(star.offset,props.animate?phase():undefined,props.background)}>{animationPixel(props.pixelSize)}</text>}</For>
  </box>;
}
