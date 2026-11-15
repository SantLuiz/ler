import type {State} from './storage';
import type {Book,Anchor} from '../readers/book';
import {bookFormat} from '../readers/formats';

export type ReadingStats = {seconds:number; days:Record<string,number>; chapters:Record<string,{seconds:number; completed?:boolean; completedSeconds?:number; fromStart?:boolean}>; completed?:boolean};
export const newReadingStats=():ReadingStats=>({seconds:0,days:{},chapters:{}});
export const localDay=(now:number)=>{const date=new Date(now);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
export class ReadingClock {
  private previous:number;
  private activity:number;
  constructor(now=Date.now()){this.previous=now;this.activity=now;}
  touch(now=Date.now()){this.activity=now;}
  sample(stats:ReadingStats|undefined,chapter:number|undefined,enabled:boolean,now=Date.now()) {
    const elapsed=Math.max(0,Math.min(now,this.activity+120_000)-this.previous);
    const bounded=now-this.previous<=5000;this.previous=now;
    if(!enabled||!stats||!bounded||elapsed<=0)return;
    const seconds=elapsed/1000;stats.seconds+=seconds;
    const day=localDay(now);stats.days[day]=(stats.days[day]??0)+seconds;
    if(chapter!==undefined){const record=stats.chapters[chapter]??={seconds:0};record.seconds+=seconds;}
  }
}
export function completeChapter(stats:ReadingStats,chapter:number) {
  const record=stats.chapters[chapter];
  if(record?.fromStart&&!record.completed&&record.seconds>=1){record.completed=true;record.completedSeconds=record.seconds;}
}
export function remainingChapterSeconds(book:Book,anchor:Anchor,reading:ReadingStats|undefined) {
  if(!reading||book.format==='pdf')return undefined;
  const words=(text:string)=>text.match(/\S+/gu)?.length??0;
  let count=0,seconds=0;
  for(const [key,record] of Object.entries(reading.chapters)){const chapter=book.chapters[Number(key)];if(record.completed&&chapter){count+=chapter.blocks.filter(b=>!b.image).reduce((n,b)=>n+words(b.text),0);seconds+=record.completedSeconds??record.seconds;}}
  if(count===0||seconds===0)return undefined;
  const remaining=book.chapters[anchor.chapter]?.blocks.reduce((n,b,i)=>n+(b.image||i<anchor.block?0:words(i===anchor.block?b.text.slice(anchor.offset):b.text)),0)??0;
  return remaining*seconds/count;
}
export function libraryStatistics(state:State) {
  const files=Object.values(state.catalog??{});const present=new Set(files.map(f=>f.file));
  const books=Object.values(state.books).filter(b=>present.has(b.file));
  const stats=books.flatMap(b=>b.reading?[b.reading]:[]);
  const completed=stats.filter(s=>s.completed).length;
  const started=stats.filter(s=>s.seconds>0).length;
  const chapters=stats.flatMap(s=>Object.values(s.chapters)).filter(c=>c.completed);
  const today=localDay(Date.now());
  return {total:files.length,epub:files.filter(f=>bookFormat(f.file)==='epub').length,txt:files.filter(f=>bookFormat(f.file)==='txt').length,pdf:files.filter(f=>bookFormat(f.file)==='pdf').length,
    started,completed,unstarted:Math.max(0,files.length-started),seconds:stats.reduce((n,s)=>n+s.seconds,0),today:stats.reduce((n,s)=>n+(s.days[today]??0),0),
    highlights:books.reduce((n,b)=>n+(b.highlights?.length??0),0),chapters:chapters.length,average:chapters.length?chapters.reduce((n,c)=>n+(c.completedSeconds??c.seconds),0)/chapters.length:undefined};
}
export function duration(seconds:number) {const n=Math.floor(seconds);return `${Math.floor(n/3600)}h ${Math.floor(n%3600/60)}m ${n%60}s`;}
