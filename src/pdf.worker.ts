import {PDFiumLibrary, type PDFiumDocument} from '@hyzyla/pdfium';
import {encode} from 'fast-png';
import {promises as fs} from 'node:fs';

let library: PDFiumLibrary | undefined;
let document: PDFiumDocument | undefined;
const cache = new Map<number, Uint8Array>();
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<{id:number; filename?:string; page?:number}>) => {
  const {id, filename, page} = event.data;
  queue = queue.then(async()=>{
    try {
      if (filename) {
        library = await PDFiumLibrary.init();
        document = await library.loadDocument(await fs.readFile(filename));
        const pages = document.getPageCount();
        if (pages < 1 || pages > 20000) throw new Error('PDF sem páginas ou excede 20 mil páginas / Invalid PDF page count');
        self.postMessage({id, pages});
      } else {
        if (!document || page === undefined || !Number.isInteger(page) || page < 0 || page >= document.getPageCount()) throw new Error('Página PDF inválida / Invalid PDF page');
        let bytes = cache.get(page);
        if (!bytes) {
          const current = document.getPage(page);
          try {
            const {originalWidth:w, originalHeight:h} = current.getOriginalSize();
            if (!(w > 0 && h > 0 && Number.isFinite(w*h))) throw new Error('Dimensões PDF inválidas / Invalid PDF dimensions');
            // Limit bitmap memory even for posters and unusually large pages.
            const scale = Math.min(3, 3000 / Math.max(w,h), Math.sqrt(4_000_000 / (w*h)));
            const image = await current.render({scale, colorSpace:'RGBA', transparent:false, renderFormFields:true});
            bytes = encode({width:image.width, height:image.height, data:image.data, channels:4, depth:8});
          } finally {current.close();}
        }
        cache.delete(page);cache.set(page, bytes);
        while (cache.size > 2) cache.delete(cache.keys().next().value!);
        self.postMessage({id, bytes});
      }
    } catch(error) {self.postMessage({id, error:String(error)});}
  });
};
