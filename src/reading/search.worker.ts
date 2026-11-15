export {};
self.onmessage = (event: MessageEvent<{ chapters: { blocks: { text: string }[] }[]; query: string }>) => {
 const {chapters,query}=event.data;const needle=query.toLocaleLowerCase();const found:{label:string;anchor:{chapter:number;block:number;offset:number}}[]=[];
 if(needle.trim())for(let c=0;c<chapters.length;c++)chapters[c].blocks.forEach((block,b)=>{let offset=block.text.toLocaleLowerCase().indexOf(needle);while(offset>=0&&found.length<1000){found.push({label:`${c+1} · ${block.text.slice(Math.max(0,offset-15),offset+65)}`,anchor:{chapter:c,block:b,offset}});offset=block.text.toLocaleLowerCase().indexOf(needle,offset+needle.length);}});
 self.postMessage(found);
};
