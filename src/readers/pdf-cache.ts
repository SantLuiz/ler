export type PdfBitmap={pixels:Uint8Array;width:number;height:number};

// Shared across PDF tabs: large documents cannot grow this cache without bound.
export class PdfBitmapCache {
  private entries=new Map<string,PdfBitmap>();
  private bytes=0;
  constructor(readonly byteLimit=48*1024*1024,readonly entryLimit=6){}
  get(key:string){const value=this.entries.get(key);if(value){this.entries.delete(key);this.entries.set(key,value);}return value;}
  set(key:string,value:PdfBitmap){
    this.delete(key);if(value.pixels.byteLength>this.byteLimit)return;
    this.entries.set(key,value);this.bytes+=value.pixels.byteLength;
    while(this.bytes>this.byteLimit||this.entries.size>this.entryLimit)this.delete(this.entries.keys().next().value!);
  }
  private delete(key:string){const value=this.entries.get(key);if(value){this.bytes-=value.pixels.byteLength;this.entries.delete(key);}}
  clear(prefix:string){for(const key of this.entries.keys())if(key.startsWith(prefix))this.delete(key);}
}
export const pdfBitmaps=new PdfBitmapCache();
