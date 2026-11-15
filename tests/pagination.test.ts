import {test,expect} from 'bun:test';
import {previousPage,visibleLines} from '../src/reading/pagination';
import type {Line} from '../src/readers/book';
const lines:Line[]=Array.from({length:20},(_,i)=>({text:`line ${i}`,anchor:{chapter:0,block:i,offset:0},...(i===3?{image:'image.png'}:{})}));
test('paging backward includes text after a tall image rather than jumping over it',()=>{
 let index=8;index=previousPage(lines,index,10,1,8);expect(index).toBe(4);index=previousPage(lines,index,10,1,8);expect(index).toBe(2);index=previousPage(lines,index,10,1,8);expect(index).toBe(0);
});
test('the last page and line spacing use visual height instead of line count',()=>{
 expect(previousPage(lines,lines.length,10,2,8)).toBe(15);expect(previousPage(lines,0,10,1,8)).toBe(0);expect(previousPage(lines,4,8,1,8)).toBe(3);
});

test('visible lines preserve image heights, spacing and original references without scanning the remaining chapter',()=>{
 expect(visibleLines(lines,0,10,1,8)).toEqual(lines.slice(0,3));
 expect(visibleLines(lines,3,10,2,8)).toEqual(lines.slice(3,5));
 expect(visibleLines(lines,lines.length,10,1,8)).toEqual([]);expect(visibleLines(lines,3,7,1,8)).toEqual([]);
 const guarded=new Proxy(lines,{get(target,key,receiver){if(key==='slice'||key==='15')throw new Error('Read beyond viewport');return Reflect.get(target,key,receiver);}});
 const visible=visibleLines(guarded,10,4,2,8);expect(visible.length).toBe(2);expect(visible[0]).toBe(lines[10]);expect(visible[1]).toBe(lines[11]);
});
