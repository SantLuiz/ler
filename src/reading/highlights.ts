import type {Anchor, Book, Line} from '../readers/book';

export type Highlight = {id:string; start:Anchor; end:Anchor; text:string; date:string};
export const compareAnchors = (a:Anchor,b:Anchor) => a.chapter-b.chapter || a.block-b.block || a.offset-b.offset;
export function orderedRange(a:Anchor,b:Anchor):[Anchor,Anchor] {return compareAnchors(a,b)<=0?[a,b]:[b,a];}
export function rangeText(book:Book,a:Anchor,b:Anchor) {
  const [start,end]=orderedRange(a,b);const parts:string[]=[];
  for(let c=start.chapter;c<=end.chapter;c++) {
    const blocks=book.chapters[c]?.blocks??[];
    for(let i=c===start.chapter?start.block:0;i<blocks.length&&(c!==end.chapter||i<=end.block);i++) {
      if(blocks[i].image)continue;
      const text=blocks[i].text.slice(c===start.chapter&&i===start.block?start.offset:0,c===end.chapter&&i===end.block?end.offset:undefined);
      if(text)parts.push(text);
    }
  }
  return parts.join('\n');
}
const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
export function graphemes(text:string) {return [...segmenter.segment(text)].map(s=>({text:s.segment,offset:s.index}));}
export function stepCursor(book:Book,a:Anchor,direction:number):Anchor {
  const text=book.chapters[a.chapter].blocks[a.block]?.text??'';
  const offsets=[...graphemes(text).map(s=>s.offset),text.length];
  const next=direction>0?offsets.find(o=>o>a.offset):offsets.findLast(o=>o<a.offset);
  if(next!==undefined)return {...a,offset:next};
  for(let c=a.chapter;c>=0&&c<book.chapters.length;c+=direction) {
    const blocks=book.chapters[c].blocks;
    for(let b=c===a.chapter?a.block+direction:direction>0?0:blocks.length-1;b>=0&&b<blocks.length;b+=direction) {
      if(!blocks[b].image&&blocks[b].text.length)return {chapter:c,block:b,offset:direction>0?0:blocks[b].text.length};
    }
  }
  return a;
}
export function stepWordCursor(book:Book,a:Anchor,direction:number):Anchor {
  const text=book.chapters[a.chapter].blocks[a.block]?.text??'';
  const starts=[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(text)].filter(s=>s.isWordLike).map(s=>s.index);
  const offset=direction>0?starts.find(i=>i>a.offset):starts.findLast(i=>i<a.offset);
  if(offset!==undefined)return {...a,offset};
  return stepCursor(book,{...a,offset:direction>0?text.length:0},direction);
}
export function anchorAtCell(line:Line,cell:number):Anchor {
  let width=0;let offset=0;
  for(const part of graphemes(line.text)){if(width+Bun.stringWidth(part.text)>cell)break;width+=Bun.stringWidth(part.text);offset=part.offset+part.text.length;}
  return {...line.anchor,offset:line.anchor.offset+offset};
}
export function lineParts(line:Line,ranges:{start:Anchor;end:Anchor}[],cursor?:Anchor) {
  const parts:{text:string;selected:boolean;cursor:boolean}[]=[];
  for(const part of graphemes(line.text)){
    const a={...line.anchor,offset:line.anchor.offset+part.offset};
    const selected=ranges.some(r=>compareAnchors(a,r.start)>=0&&compareAnchors(a,r.end)<0),caret=!!cursor&&compareAnchors(a,cursor)===0;
    const previous=parts.at(-1);
    if(previous&&previous.selected===selected&&previous.cursor===caret)previous.text+=part.text;
    else parts.push({text:part.text,selected,cursor:caret});
  }
  return parts;
}
