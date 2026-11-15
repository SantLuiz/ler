import {encode} from 'fast-png';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {logoPixels,logoColors,pixelColor} from '../src/ui/logo';

// Render the existing home-screen pixel logo; no separate font or logo design.
const grid=logoPixels('large'),width=grid[0].length,height=grid.length;
const sizes=[16,24,32,48,64,128,256];
function render(size:number){
 const data=new Uint8Array(size*size*4),scale=(size*0.9)/width;
 const left=(size-width*scale)/2,top=(size-height*scale)/2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const radius=size*0.12,dx=Math.max(radius-x-0.5,0,x+0.5-(size-radius)),dy=Math.max(radius-y-0.5,0,y+0.5-(size-radius));
  if(dx*dx+dy*dy>radius*radius)continue;
  let color='#101114';const gx=Math.floor((x-left)/scale),gy=Math.floor((y-top)/scale);
  const pixel=grid[gy]?.[gx];
  if(pixel&&pixel.kind!=='space'){
   const localX=(x-left)/scale-gx,localY=(y-top)/scale-gy;
   const square=localX>=0.25&&localX<0.75&&localY>=0.25&&localY<0.75;
   if(pixel.kind==='letter'||square)color=pixel.kind==='spark'?logoColors.accent:pixelColor(pixel,7);
  }
  const offset=(y*size+x)*4;data[offset]=parseInt(color.slice(1,3),16);data[offset+1]=parseInt(color.slice(3,5),16);data[offset+2]=parseInt(color.slice(5,7),16);data[offset+3]=255;
 }
 return encode({width:size,height:size,data,channels:4});
}
const images=sizes.map(render),header=Buffer.alloc(6+16*sizes.length);
header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
images.forEach((png,index)=>{const entry=6+index*16;header[entry]=header[entry+1]=sizes[index]===256?0:sizes[index];header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(png.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=png.length;});
const directory=path.resolve(import.meta.dir,'../assets');await mkdir(directory,{recursive:true});
await writeFile(path.join(directory,'ler.ico'),Buffer.concat([header,...images]));
await writeFile(path.join(directory,'ler.png'),images.at(-1)!);
