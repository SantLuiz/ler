import path from 'node:path';

export function shortLibraryPath(value:string,width:number) {
  const api=/^[a-z]:[\\/]|^\\\\/i.test(value)?path.win32:path.posix;
  const root=api.parse(value).root;const parts=value.slice(root.length).split(/[\\/]+/).filter(Boolean);
  if(!parts.length)return value;
  let count=Math.min(4,parts.length);
  const text=()=> (count<parts.length?'…'+api.sep:root)+parts.slice(-count).join(api.sep);
  while(count>1&&Bun.stringWidth(text())>width)count--;
  const result=text();if(Bun.stringWidth(result)<=width)return result;
  const segments=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(parts.at(-1)!)].map(s=>s.segment);
  let output='';for(const segment of segments.reverse()){if(Bun.stringWidth('…'+segment+output)>width)break;output=segment+output;}
  return '…'+output;
}
