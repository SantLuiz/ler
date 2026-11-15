export const logoColors = {text:'#E6E8ED', accent:'#7AA2F7', trail:'#50658E', baseline:'#535B6B'};
export type LogoPixel = {glyph:string; kind:'letter'|'spark'|'baseline'|'space'; x:number; wave:boolean};

const large = [
  ['011000','111000','111000','111000','111000','111000','111110','111111'],
  ['111111','111111','111000','111110','111110','111000','111111','111111'],
  ['111110','111111','110011','110011','111110','111100','110110','110011'],
];
const medium = [
  ['110000','110000','110000','110000','111111'],
  ['111111','110000','111110','110000','111111'],
  ['111110','110011','111110','110110','110011'],
];
export function logoPixels(size:'large'|'medium'):LogoPixel[][] {
  const letters=size==='large'?large:medium;
  const height=letters[0].length;
  const rows=Array.from({length:height},(_,y)=>'  '+letters.map(letter=>letter[y]).join('00')+'  ');
  if(size==='large')rows.unshift('  s              s        ');
  const result=rows.map((row,y)=>[...row].map((cell,x):LogoPixel=>({x,kind:cell==='1'?'letter':cell==='s'?'spark':'space',glyph:cell==='1'?'██':cell==='s'?'▪ ':'  ',wave:y>=rows.length-2})));
  const width=result[0].length;
  result.push(Array.from({length:width},(_,x)=>({x,kind:'baseline',glyph:x>1&&x<width-2?'▪ ':'  ',wave:true})));
  return result;
}

export function pixelColor(pixel:LogoPixel,phase:number) {
  if(pixel.kind==='spark')return logoColors.accent;
  const distance=phase-3-pixel.x;
  if(pixel.wave&&phase<34&&distance>=0&&distance<4)return distance<2?logoColors.accent:logoColors.trail;
  return pixel.kind==='baseline'?logoColors.baseline:logoColors.text;
}
