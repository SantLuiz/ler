import {test,expect} from 'bun:test';
import {previousPage} from '../src/pagination';
import type {Line} from '../src/book';
const lines:Line[]=Array.from({length:20},(_,i)=>({text:`line ${i}`,anchor:{chapter:0,block:i,offset:0},...(i===3?{image:'image.png'}:{})}));
test('paging backward includes text after a tall image rather than jumping over it',()=>{
 let index=8;index=previousPage(lines,index,10,1,8);expect(index).toBe(4);index=previousPage(lines,index,10,1,8);expect(index).toBe(2);index=previousPage(lines,index,10,1,8);expect(index).toBe(0);
});
test('the last page and line spacing use visual height instead of line count',()=>{
 expect(previousPage(lines,lines.length,10,2,8)).toBe(15);expect(previousPage(lines,0,10,1,8)).toBe(0);expect(previousPage(lines,4,8,1,8)).toBe(3);
});
