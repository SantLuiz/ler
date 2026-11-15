import {test,expect} from 'bun:test';
import {ReadingClock,newReadingStats,completeChapter,libraryStatistics,localDay,remainingChapterSeconds} from '../src/state/statistics';
import type {Book} from '../src/readers/book';
import type {State} from '../src/state/storage';

test('reading clock excludes panels, pauses, idle time, clock reversal and sleep',()=>{
 const stats=newReadingStats();const clock=new ReadingClock(0);
 clock.sample(stats,0,true,1000);clock.sample(stats,0,false,2000);
 expect(stats.seconds).toBe(1);
 for(let t=3000;t<=125000;t+=1000)clock.sample(stats,0,true,t);
 expect(stats.seconds).toBe(119);
 clock.touch(125000);clock.sample(stats,1,true,126000);expect(stats.seconds).toBe(120);
 clock.sample(stats,1,true,150000);expect(stats.seconds).toBe(120);
 clock.sample(stats,1,true,149000);expect(stats.seconds).toBe(120);
 expect(stats.days[localDay(126000)]).toBe(120);
});

test('library totals include unopened files, exclude removed books, and average only completed chapters',()=>{
 const reading=newReadingStats();reading.seconds=90;reading.chapters={'0':{seconds:60,fromStart:true},'1':{seconds:30}};
 completeChapter(reading,0);completeChapter(reading,1);expect(reading.chapters['1'].completed).toBeUndefined();
 const state:State={version:1,lang:'pt-BR',tabs:[],catalog:{'a.txt':{file:'a.txt',title:'A',authors:[],size:1,modified:0},'b.epub':{file:'b.epub',title:'B',authors:[],size:1,modified:0}},books:{a:{file:'a.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[],reading},removed:{file:'gone.txt',anchor:{chapter:0,block:0,offset:0},bookmarks:[],reading:{...newReadingStats(),seconds:1000}}}};
 const result=libraryStatistics(state);expect(result.total).toBe(2);expect(result.started).toBe(1);expect(result.unstarted).toBe(1);expect(result.seconds).toBe(90);expect(result.chapters).toBe(1);expect(result.average).toBe(60);
 expect(libraryStatistics({...state,books:{}}).average).toBeUndefined();
});

test('remaining time uses completed chapters and their word counts; rereading does not inflate the baseline',()=>{
 const book:Book={id:'x',title:'X',format:'epub',chapters:[{href:'a',title:'A',blocks:[{text:'one two three four'}]},{href:'b',title:'B',blocks:[{text:'five six'}]}],toc:[],resource:async()=>new Uint8Array(),close(){}};
 const stats=newReadingStats();expect(remainingChapterSeconds(book,{chapter:1,block:0,offset:0},stats)).toBeUndefined();
 stats.chapters['0']={seconds:40,fromStart:true};completeChapter(stats,0);stats.chapters['0'].seconds=100;completeChapter(stats,0);
 expect(remainingChapterSeconds(book,{chapter:1,block:0,offset:0},stats)).toBe(20);
 expect(remainingChapterSeconds(book,{chapter:1,block:0,offset:5},stats)).toBe(10);
 expect(remainingChapterSeconds({...book,format:'pdf'},{chapter:0,block:0,offset:0},stats)).toBeUndefined();
});
