import {createResource, createMemo, createEffect, Show} from 'solid-js';
import {useRenderer} from '@opentui/solid';
import {imageInfo} from '@opentui/core';
import type {Book} from '../../readers/book';

export type PdfViewport = {width:number; height:number; crop?:{left:number;top:number;width:number;height:number}; band:number; bands:number; step:number; horizontal:boolean};

export function adjacentBand(y:number,direction:number,step:number) {
  const index=direction>0?Math.floor(y/step+0.00001)+1:Math.ceil(y/step-0.00001)-1;
  return Math.max(0,Math.min(1,index*step));
}

export function pageViewport(width:number,height:number,columns:number,rows:number,zoom:number,x:number,y:number,cellAspect=0.5):PdfViewport {
  const fit=Math.min(columns*cellAspect/width,rows/height);
  const fullWidth=width*fit/cellAspect*zoom;const fullHeight=height*fit*zoom;
  const overflowX=fullWidth>columns+0.01;const overflowY=fullHeight>rows+0.01;
  const cropWidth=overflowX?Math.max(1,Math.round(width*columns/fullWidth)):width;
  const cropHeight=overflowY?Math.max(1,Math.round(height*rows/fullHeight)):height;
  const clamp=(value:number)=>Math.max(0,Math.min(1,value));
  // Each band overlaps the previous one by 10% to keep text lines in context.
  const step=overflowY?Math.min(1,rows*0.9/(fullHeight-rows)):1;
  const bands=overflowY?Math.ceil(1/step)+1:1;
  return {width:Math.min(columns,Math.max(1,Math.ceil(fullWidth))),height:Math.min(rows,Math.max(1,Math.ceil(fullHeight))),
    crop:overflowX||overflowY?{left:Math.round((width-cropWidth)*clamp(x)),top:Math.round((height-cropHeight)*clamp(y)),width:cropWidth,height:cropHeight}:undefined,
    band:clamp(y)===1?bands:Math.min(bands,Math.floor(clamp(y)/step+0.00001)+1),bands,step,horizontal:overflowX};
}

export function PdfPage(props:{book:Book; page:number; width:number; height:number; zoom:number; x:number; y:number; protocol:'auto'|'blocks'; lang:'en'|'pt-BR'; onViewport?:(viewport:PdfViewport)=>void}) {
  const renderer=useRenderer();
  const [page]=createResource(()=>({book:props.book,page:props.page}),async({book,page})=>{
    try {const bytes=await book.resource(`page/${page}`);return {bytes,...imageInfo(bytes),error:''};}
    catch(error){return {bytes:undefined,width:0,height:0,error:String(error)};}
  });
  return <Show when={!page.loading&&page()} fallback={<text>{props.lang==='en'?'Rendering PDF page…':'Renderizando página PDF…'}</text>} keyed>{data=>{
    const viewport=createMemo(()=>{
      const resolution=renderer.resolution;
      const aspect=resolution?(resolution.width/renderer.width)/(resolution.height/renderer.height):0.5;
      return pageViewport(data.width||1,data.height||1,props.width,props.height,props.zoom,props.x,props.y,aspect);
    });
    createEffect(()=>props.onViewport?.(viewport()));
    return <Show when={data.bytes} fallback={<text fg="#e5a0a0">{data.error}</text>}>
      <image id="pdf-page-image" source={data.bytes} width={viewport().width} height={viewport().height} fit="fit" protocol={props.protocol} crop={viewport().crop}/>
    </Show>;
  }}</Show>;
}
