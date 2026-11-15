import {createResource, createMemo, createEffect, onCleanup, Show} from 'solid-js';
import {useRenderer} from '@opentui/solid';
import {NativeImage} from '@opentui/core';
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
    try {return book.pdfPage?{bitmap:await book.pdfPage(page),bytes:undefined,error:''}:{bitmap:undefined,bytes:await book.resource(`page/${page}`),error:''};}
    catch(error){return {bitmap:undefined,bytes:undefined,error:String(error)};}
  });
  return <Show when={!page.loading&&page()} fallback={<text>{props.lang==='en'?'Rendering PDF page…':'Renderizando página PDF…'}</text>} keyed>{data=>{
    const image=data.bitmap?NativeImage.fromRgba(data.bitmap.pixels,data.bitmap.width,data.bitmap.height):data.bytes?NativeImage.decode(data.bytes):undefined;
    onCleanup(()=>image?.dispose());
    // Warm only one next page after navigation settles; closing or switching cancels the timer.
    const book=props.book,next=props.page+1;
    const prefetch=image&&book.pdfPage&&next<book.chapters.length?setTimeout(()=>void book.pdfPage!(next).catch(()=>{}),250):undefined;
    onCleanup(()=>{if(prefetch)clearTimeout(prefetch);});
    const viewport=createMemo(()=>{
      const resolution=renderer.resolution;
      const aspect=resolution?(resolution.width/renderer.width)/(resolution.height/renderer.height):0.5;
      return pageViewport(image?.width||1,image?.height||1,props.width,props.height,props.zoom,props.x,props.y,aspect);
    });
    createEffect(()=>props.onViewport?.(viewport()));
    return <Show when={image} fallback={<text fg="#e5a0a0">{data.error}</text>}>
      <image id="pdf-page-image" source={image} width={viewport().width} height={viewport().height} fit="fit" protocol={props.protocol} crop={viewport().crop}/>
    </Show>;
  }}</Show>;
}
