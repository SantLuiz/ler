export const logoColors = {text:'#E6E8ED', accent:'#7AA2F7', baseline:'#535B6B'};
export type LogoPixel = {glyph:string; kind:'letter'|'spark'|'baseline'|'space'; x:number; offset?:number};

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
  // Tiny stationary dots in the gaps; each has its own staggered twinkle.
  [[9,1],[10,height-2],[18,Math.floor(height/2)],[19,height-1]].forEach(([x,y],i)=>{
    result[y][x]={x,kind:'spark',glyph:'· ',offset:i*18};
  });
  const width=result[0].length;
  result.push(Array.from({length:width},(_,x)=>({x,kind:'baseline',glyph:x>1&&x<width-2?'▪ ':'  '})));
  return result;
}

export function pixelColor(pixel:LogoPixel,phase:number,background='#101114') {
  if(pixel.kind==='spark') {
    const brightness=[0,0.15,0.45,0.8,1,0.8,0.45,0.15,0][(phase+(pixel.offset??0))%72]??0;
    const channel=(offset:number)=>Math.round(parseInt(background.slice(offset,offset+2),16)*(1-brightness)+parseInt(logoColors.accent.slice(offset,offset+2),16)*brightness).toString(16).padStart(2,'0');
    return '#'+[1,3,5].map(channel).join('');
  }
  return pixel.kind==='baseline'?logoColors.baseline:logoColors.text;
}
