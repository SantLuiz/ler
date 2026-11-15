export const logoColors = {text:'#E6E8ED', accent:'#7AA2F7', baseline:'#535B6B'};
export type LogoPixel = {glyph:string; kind:'letter'|'spark'|'baseline'|'space'; x:number; offset?:number; period?:number};

const large = [
  ['0110000','1110000','1110000','1110000','1110000','1110000','1110000','1111110','1111111'],
  ['1111111','1111111','1110000','1111110','1111110','1110000','1110000','1111111','1111111'],
  ['1111100','1111110','1100110','1100110','1111100','1111000','1101100','1100110','1100011'],
];
const medium = [
  ['1100000','1100000','1100000','1100000','1100000','1100000','1111110'],
  ['1111110','1100000','1100000','1111100','1100000','1100000','1111110'],
  ['1111100','1100110','1100110','1111100','1101100','1100110','1100011'],
];
export function logoPixels(size:'large'|'medium'):LogoPixel[][] {
  const letters=size==='large'?large:medium;
  const height=letters[0].length;
  const rows=Array.from({length:height},(_,y)=>'  '+letters.map(letter=>letter[y]).join('00')+'  ');
  const result=rows.map(row=>[...row].map((cell,x):LogoPixel=>({x,kind:cell==='1'?'letter':'space',glyph:cell==='1'?'██':'  '})));
  // A dense field of stationary square pixels, staggered independently in each gap.
  for(let y=0;y<height;y++)for(const x of [9,10,18,19]){
    result[y][x]={x,kind:'spark',glyph:'▪ ',offset:(x*11+y*7)%48};
  }
  const width=result[0].length;
  result.push(Array.from({length:width},(_,x)=>({x,kind:'baseline',glyph:x>1&&x<width-2?'▪ ':'  ',offset:x-2,period:width-4+6})));
  return result;
}

export function pixelColor(pixel:LogoPixel,phase:number|undefined,background='#101114') {
  const blend=(from:string,brightness:number)=>{
    const channel=(offset:number)=>Math.round(parseInt(from.slice(offset,offset+2),16)*(1-brightness)+parseInt(logoColors.accent.slice(offset,offset+2),16)*brightness).toString(16).padStart(2,'0');
    return '#'+[1,3,5].map(channel).join('');
  };
  if(pixel.kind==='spark') {
    const brightness=phase===undefined?0:([0,0.1,0.2,0.35,0.5,0.7,0.85,1,1,0.85,0.7,0.5,0.35,0.2,0.1,0][(phase+(pixel.offset??0))%48]??0);
    return blend(background,brightness);
  }
  if(pixel.kind==='baseline') {
    // A bright head and fading tail travel strictly from left to right, then restart.
    if(phase===undefined)return logoColors.baseline;
    const distance=phase%(pixel.period??31)-(pixel.offset??0);
    const brightness=distance>=0&&distance<7?[1,1,0.85,0.65,0.4,0.2,0.1][distance]:0;
    return blend(logoColors.baseline,brightness);
  }
  return logoColors.text;
}
