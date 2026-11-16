import {testRender} from '@opentui/solid';
import {App} from '../../src/ui/App';
import {openBook,type Book} from '../../src/readers/book';
import type {State} from '../../src/state/storage';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pdfFixture} from '../../tests/fixtures';

const repo=path.resolve(import.meta.dir,'../..'),output=path.join(repo,'dist/manual-data/captures');
await fs.mkdir(output,{recursive:true});
const root=path.join(repo,'dist/manual-data/Biblioteca demonstrativa');await fs.mkdir(root,{recursive:true});
const sample=path.join(root,'Engenharia do LER.txt');
await fs.writeFile(sample,'Engenharia do LER\n\nUm leitor local pode ser pequeno sem esconder como funciona. Este texto foi criado exclusivamente para as capturas do manual.\n\nA interface mostra livros, progresso e comandos. Os dados de leitura ficam separados dos arquivos originais.\n\nCada destaque preserva uma posição no conteúdo, em vez de depender da largura da janela.\n\nLer o código é acompanhar uma sequência de decisões: entrada, transformação, estado e apresentação.');
const opened:Book[]=[];const state:State={version:1,books:{},tabs:[],lang:'pt-BR',preferences:{background:'#101114',foreground:'#d6d6d6',readingWidth:88,imagePercent:80,lineGap:0,protocol:'blocks',logoAnimation:false}};
const book=await openBook(sample);opened.push(book);state.books[book.id]={file:path.basename(sample),title:book.title,anchor:{chapter:0,block:0,offset:0},bookmarks:[]};state.tabs=[book.id];
const setup=await testRender(()=><App root={root} appDirectory={path.join(root,'app')} state={state} opened={opened} exit={async()=>{}}/>,{width:110,height:34});
async function shot(name:string){await Bun.sleep(60);await setup.renderOnce();const frame=setup.captureSpans();await Bun.write(path.join(output,name+'.json'),JSON.stringify(frame));await Bun.write(path.join(output,name+'.txt'),setup.captureCharFrame());}
try{
 await shot('01-home');setup.mockInput.pressTab();await shot('02-opcoes');setup.mockInput.pressKey('ESCAPE');setup.mockInput.pressKey('F3');await shot('03-aparencia');setup.mockInput.pressKey('F5');setup.mockInput.pressKey('F6');await shot('04-leitura');
 setup.mockInput.pressKey('v');for(let i=0;i<19;i++)setup.mockInput.pressArrow('right',{shift:true});await shot('05-selecao');setup.mockInput.pressKey('s',{ctrl:true});setup.mockInput.pressKey('F7');await shot('06-destaques');setup.mockInput.pressKey('F5');setup.mockInput.pressKey('F2');await setup.mockInput.typeText('palette');await shot('07-comandos');
}finally{await setup.dispose();opened.forEach(b=>b.close());}
const pdfFile=path.join(root,'PDF demonstrativo.pdf');await fs.writeFile(pdfFile,pdfFixture());const pdf=await openBook(pdfFile);
const pdfState:State={version:1,books:{[pdf.id]:{file:path.basename(pdfFile),anchor:{chapter:0,block:0,offset:0},bookmarks:[]}},tabs:[pdf.id],lang:'pt-BR',preferences:state.preferences};
const pdfOpened=[pdf];const pdfSetup=await testRender(()=><App root={root} appDirectory={path.join(root,'pdf-app')} state={pdfState} opened={pdfOpened} exit={async()=>{}}/>,{width:110,height:34});
try{await Bun.sleep(100);pdfSetup.mockInput.pressKey('F6');await Bun.sleep(350);await pdfSetup.renderOnce();await Bun.write(path.join(output,'08-pdf.json'),JSON.stringify(pdfSetup.captureSpans()));await Bun.write(path.join(output,'08-pdf.txt'),pdfSetup.captureCharFrame());}finally{await pdfSetup.dispose();pdfOpened.forEach(b=>b.close());}
console.log('Captured eight actual OpenTUI frames with synthetic book data.');
