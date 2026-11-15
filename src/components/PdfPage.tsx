import {createResource, Show} from 'solid-js';
import {imageInfo} from '@opentui/core';
import type {Book} from '../book';

export function pageCrop(width:number, height:number, zoom:number, x:number, y:number) {
  const cropWidth=Math.max(1,Math.floor(width/zoom));const cropHeight=Math.max(1,Math.floor(height/zoom));
  return {left:Math.round((width-cropWidth)*Math.max(0,Math.min(1,x))), top:Math.round((height-cropHeight)*Math.max(0,Math.min(1,y))), width:cropWidth, height:cropHeight};
}

export function PdfPage(props:{book:Book; page:number; width:number; height:number; zoom:number; x:number; y:number; protocol:'auto'|'blocks'; lang:'en'|'pt-BR'}) {
  const [page]=createResource(()=>({book:props.book,page:props.page}),async({book,page})=>{
    try {const bytes=await book.resource(`page/${page}`);return {bytes,...imageInfo(bytes),error:''};}
    catch(error){return {bytes:undefined,width:0,height:0,error:String(error)};}
  });
  return <Show when={!page.loading&&page()} fallback={<text>{props.lang==='en'?'Rendering PDF page…':'Renderizando página PDF…'}</text>} keyed>{data=>
    <Show when={data.bytes} fallback={<text fg="#e5a0a0">{data.error}</text>}>
      <image id="pdf-page-image" source={data.bytes} width={props.width} height={props.height} fit="fit" protocol={props.protocol}
        crop={props.zoom>1?pageCrop(data.width,data.height,props.zoom,props.x,props.y):undefined}/>
    </Show>
  }</Show>;
}
