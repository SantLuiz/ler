import type {Line} from '../readers/book';
/** Fit the preceding page while retaining the current first line as context. */
export function previousPage(lines:Line[],start:number,height:number,textRows:number,imageRows:number) {
  const cost=(line:Line)=>line.image?imageRows:textRows;
  let index=Math.min(start,lines.length);let rows=index<lines.length?cost(lines[index]):0;
  while(index>0){const next=cost(lines[index-1]);if(rows+next>height)break;rows+=next;index--;}
  return index===start?Math.max(0,start-1):index;
}
