import {test,expect} from 'bun:test';
import {preferences,imageRows} from '../src/preferences';
import {blocksFromHtml,tocAnchor,resolveLink,type Book} from '../src/book';
test('old state receives defaults and invalid appearance values are bounded',()=>{
 expect(preferences().imagePercent).toBe(80);expect(imageRows(30,80)).toBe(24);expect(imageRows(4,100)).toBe(4);
 expect(preferences({background:'bad',readingWidth:999,lineGap:-2,imagePercent:NaN})).toMatchObject({background:'#101114',readingWidth:140,lineGap:0,imagePercent:80});
});
test('contents fragments navigate to blocks within the same chapter',()=>{
 const targets:Record<string,number>=Object.create(null);const blocks=blocksFromHtml('<h1 id="a">A</h1><p>text</p><h2 id="seção">B</h2>','one.xhtml',targets);
 const book={chapters:[{href:'one.xhtml',blocks,targets}]} as Book;
 expect(resolveLink('nav.xhtml','one.xhtml#se%C3%A7%C3%A3o')).toBe('one.xhtml#se%C3%A7%C3%A3o');expect(resolveLink('one.xhtml','#a')).toBe('one.xhtml#a');expect(tocAnchor(book,'one.xhtml#se%C3%A7%C3%A3o')).toEqual({chapter:0,block:2,offset:0});expect(tocAnchor(book,'missing.xhtml')).toBeUndefined();
});
