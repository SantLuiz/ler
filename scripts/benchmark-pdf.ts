import {NativeImage,imageInfo} from '@opentui/core';
import {openBook} from '../src/readers/book';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';

// Deterministic, self-authored raster PDF; never needs personal books or committed binaries.
function fixture(){
 const width=1200,height=1600,pixels=Buffer.alloc(width*height*3);let seed=42;
 for(let i=0;i<pixels.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]=seed>>>24;}
 const compressed=deflateSync(pixels),stream=Buffer.from('q 600 0 0 800 0 0 cm /Im1 Do Q');
 const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>'),Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('\nendstream')]),Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`),compressed,Buffer.from('\nendstream')])];
 const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];let offset=parts[0].length;
 objects.forEach((object,i)=>{offsets.push(offset);const part=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);parts.push(part);offset+=part.length;});
 parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`));return Buffer.concat(parts);
}
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ler-pdf-bench-'));
try{
 const filename=path.join(directory,'Raster.pdf');await fs.writeFile(filename,fixture());
 const results:{png:number;raw:number;cached:number}[]=[];
 // Fresh workers for each sample; opening/hash/WASM initialization is outside page timing.
 for(let sample=0;sample<4;sample++){
  const result={png:0,raw:0,cached:0};
  for(const mode of (sample%2?['raw','png']:['png','raw'])){
   const book=await openBook(filename);
   try{
    let started=performance.now();
    if(mode==='png'){const bytes=await book.resource('page/0');imageInfo(bytes);const image=NativeImage.decode(bytes);result.png=performance.now()-started;image.dispose();}
    else{
     const bitmap=await book.pdfPage!(0),image=NativeImage.fromRgba(bitmap.pixels,bitmap.width,bitmap.height);result.raw=performance.now()-started;image.dispose();
     started=performance.now();const cached=await book.pdfPage!(0),cachedImage=NativeImage.fromRgba(cached.pixels,cached.width,cached.height);result.cached=performance.now()-started;cachedImage.dispose();
    }
   }finally{book.close();}
  }
  if(sample>0)results.push(result);
 }
 const median=(key:keyof typeof results[number])=>Number(results.map(r=>r[key]).sort((a,b)=>a-b)[1].toFixed(2));
 console.log(JSON.stringify({fixture:'1200x1600 deterministic RGB raster, same PDFium resolution',samples:results.length,medianMs:{previousPng:median('png'),directPixels:median('raw'),cachedPixels:median('cached')},scope:'page render + image preparation; excludes document opening and terminal output'},null,2));
}finally{await fs.rm(directory,{recursive:true,force:true});}
