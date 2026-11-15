export {};
self.onmessage = (event: MessageEvent<{ chapters: { blocks: { text: string }[] }[]; query: string }>) => {
 const {chapters,query}=event.data;const needle=query.toLocaleLowerCase();const found:{label:string;anchor:{chapter:number;block:number;offset:number}}[]=[];
 if(needle.trim())outer:for(let c=0;c<chapters.length;c++)for(let b=0;b<chapters[c].blocks.length;b++){
  const block=chapters[c].blocks[b],lower=block.text.toLocaleLowerCase();let offset=lower.indexOf(needle),sourceOffset=0,foldedOffset=0;
  while(offset>=0){
   let originalOffset=offset;
   // Some letters expand when lowercased (İ → i + combining dot). Keep anchors in the original text.
   if(lower.length!==block.text.length){
    while(foldedOffset<offset){const char=String.fromCodePoint(block.text.codePointAt(sourceOffset)!);const size=char.toLocaleLowerCase().length;if(foldedOffset+size>offset)break;foldedOffset+=size;sourceOffset+=char.length;}
    originalOffset=sourceOffset;
   }
   found.push({label:`${c+1} · ${block.text.slice(Math.max(0,originalOffset-15),originalOffset+65)}`,anchor:{chapter:c,block:b,offset:originalOffset}});
   if(found.length===1000)break outer;offset=lower.indexOf(needle,offset+needle.length);
  }
 }
 self.postMessage(found);
};
