export const logoColors = {text:'#E6E8ED', accent:'#7AA2F7', baseline:'#535B6B'};
export type LogoPixel = {glyph:string; kind:'letter'|'inset'|'spark'|'baseline'|'space'; x:number; offset?:number; period?:number};

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
export const animationPixel=(size=2)=>size<=1?'·':size>=3?'■':'▪';
export function logoPixels(size:'large'|'medium',quantity=100,pixelSize=2):LogoPixel[][] {
  const letters=size==='large'?large:medium;
  const height=letters[0].length;
  const rows=Array.from({length:height},(_,y)=>'  '+letters.map(letter=>letter[y]).join('00')+'  ');
  const result=rows.map(row=>[...row].map((cell,x):LogoPixel=>({x,kind:cell==='1'?'letter':'space',glyph:cell==='1'?'██':'  '})));
  // A dense field of stationary square pixels, staggered independently in each gap.
  for(let y=0;y<height;y++)for(const x of [9,10,18,19]){
    result[y][x]={x,kind:'spark',glyph:'▪ ',offset:(x*11+y*7)%48};
  }
  for(let y=0;y<height;y++)for(const pixel of result[y]){
    if(pixel.kind==='letter'&&(pixel.x*3+y*5)%11===0){pixel.kind='inset';pixel.glyph='▪ ';pixel.offset=(pixel.x*13+y*17)%48;}
    else if(pixel.kind==='space'&&(pixel.x+y*3)%3===0){pixel.kind='spark';pixel.glyph='▪ ';pixel.offset=(pixel.x*19+y*11)%48;}
  }
  for(let y=0;y<height;y++)for(const pixel of result[y]){
    const rank=(pixel.x*31+y*17)%100;
    if(quantity<100&&(pixel.kind==='spark'||pixel.kind==='inset')&&rank>=quantity){
      pixel.kind=pixel.kind==='inset'?'letter':'space';pixel.glyph=pixel.kind==='letter'?'██':'  ';
    } else if(quantity>100&&((pixel.kind==='space'&&rank<(quantity-100)*0.6)||(pixel.kind==='letter'&&rank<(quantity-100)*0.2))){
      pixel.kind=pixel.kind==='letter'?'inset':'spark';pixel.offset=(pixel.x*13+y*17)%48;
    }
    if(pixel.kind==='spark'||pixel.kind==='inset')pixel.glyph=animationPixel(pixelSize)+' ';
  }
  const width=result[0].length;
  result.push(Array.from({length:width},(_,x)=>({x,kind:'baseline',glyph:x>1&&x<width-2?animationPixel(pixelSize)+' ':'  ',offset:x-2,period:width-4+6})));
  return result;
}

export function mixBlue(from:string,brightness:number,accent=logoColors.accent) {
    const channel=(offset:number)=>Math.round(parseInt(from.slice(offset,offset+2),16)*(1-brightness)+parseInt(accent.slice(offset,offset+2),16)*brightness).toString(16).padStart(2,'0');
    return '#'+[1,3,5].map(channel).join('');
}
export function twinkleColor(offset:number,phase:number|undefined,background:string,accent=logoColors.accent) {
  const brightness=phase===undefined?0:([0,0.1,0.2,0.35,0.5,0.7,0.85,1,1,0.85,0.7,0.5,0.35,0.2,0.1,0][(phase+offset)%48]??0);
  return mixBlue(background,brightness,accent);
}
export function pixelColor(pixel:LogoPixel,phase:number|undefined,background='#101114',colors=logoColors) {
  if(pixel.kind==='spark'||pixel.kind==='inset') {
    return twinkleColor(pixel.offset??0,phase,pixel.kind==='inset'?colors.text:background,colors.accent);
  }
  if(pixel.kind==='baseline') {
    // A bright head and fading tail travel strictly from left to right, then restart.
    if(phase===undefined)return colors.baseline;
    const distance=phase%(pixel.period??31)-(pixel.offset??0);
    const brightness=distance>=0&&distance<7?[1,1,0.85,0.65,0.4,0.2,0.1][distance]:0;
    return mixBlue(colors.baseline,brightness,colors.accent);
  }
  return colors.text;
}

export function homeStars(width:number,height:number,quantity=100) {
  const cols=Math.floor(width)-2,rows=Math.floor(height)-2;
  if(cols<1||rows<1)return [];
  const count=Math.min(cols*rows,480,Math.round(Math.min(240,Math.floor(cols*rows/40))*quantity/100));
  let seed=1573;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const positions=new Set<number>();const stars:{x:number;y:number;offset:number}[]=[];
  for(let attempt=0;stars.length<count&&attempt<count*5;attempt++){
    const x=1+Math.floor(random()*cols),y=1+Math.floor(random()*rows),key=y*width+x;
    if(positions.has(key))continue;positions.add(key);stars.push({x,y,offset:Math.floor(random()*48)});
  }
  return stars;
}
