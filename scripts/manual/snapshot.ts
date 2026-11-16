import ts from 'typescript';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const repo=path.resolve(import.meta.dir,'../..');
const output=path.join(repo,'dist/manual-data');await fs.mkdir(output,{recursive:true});
const git=(...args:string[])=>execFileSync('git',['-c',`safe.directory=${repo.replaceAll('\\','/')}`,...args],{cwd:repo,encoding:'utf8'}).trim();
const paths=git('ls-files').split('\n').filter(file=>/^(src\/|tests\/|scripts\/|bin\/|site\/|\.github\/|package\.json$|bunfig\.toml$|tsconfig\.json$|AGENTS\.md$)/.test(file)&&!file.startsWith('scripts/manual/'));
const modules=[];
for(const file of paths){
 const source=await fs.readFile(path.join(repo,file),'utf8');
 const symbols:{name:string;kind:string;line:number;end:number;signature:string;calls:string[]}[]=[];
 const imports:string[]=[],tests:string[]=[],constants:{name:string;line:number;type:string}[]=[];
 if(/\.[jt]sx?$/.test(file)){
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const line=(node:ts.Node)=>ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1;
  function walk(node:ts.Node){
   if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier.text);
   let name='',kind='',body:ts.Node|undefined;
   if(ts.isFunctionDeclaration(node)&&node.name){name=node.name.text;kind='função';body=node.body;}
   else if(ts.isClassDeclaration(node)&&node.name){name=node.name.text;kind='classe';}
   else if(ts.isPropertyDeclaration(node)){name=(ts.isClassDeclaration(node.parent)?node.parent.name?.text+'.':'')+node.name.getText(ast);kind='campo';}
   else if(ts.isMethodDeclaration(node)||ts.isGetAccessorDeclaration(node)||ts.isConstructorDeclaration(node)){name=ts.isConstructorDeclaration(node)?'constructor':node.name.getText(ast);const parent=node.parent;name=(ts.isClassDeclaration(parent)?parent.name?.text+'.':'')+name;kind=ts.isGetAccessorDeclaration(node)?'getter':'método';body=node.body;}
   else if(ts.isVariableDeclaration(node)&&node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer))){name=node.name.getText(ast);kind='função atribuída';body=node.initializer.body;}
   else if(ts.isTypeAliasDeclaration(node)||ts.isInterfaceDeclaration(node)){name=node.name.text;kind='tipo';}
   if(name){
    const calls=new Set<string>();function collect(n:ts.Node){if(ts.isCallExpression(n))calls.add(n.expression.getText(ast));ts.forEachChild(n,collect);}if(body)collect(body);
    let signature=source.slice(node.getStart(ast),body?body.getStart(ast):node.end);if(kind==='classe')signature=signature.slice(0,signature.indexOf('{'));
    symbols.push({name,kind,line:line(node),end:ast.getLineAndCharacterOfPosition(node.end).line+1,signature:signature.replace(/\s+/g,' ').slice(0,1600),calls:[...calls].filter(c=>c.length<90).slice(0,24)});
   }
   if(ts.isVariableDeclaration(node)&&node.parent.parent.parent===ast)constants.push({name:node.name.getText(ast),line:line(node),type:node.type?.getText(ast)??(node.initializer&&ts.isCallExpression(node.initializer)?node.initializer.expression.getText(ast):'inferido')});
   if(ts.isCallExpression(node)&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&/^test(?:\.|\()/.test(node.expression.getText(ast)+'('))tests.push(node.arguments[0].text);
   ts.forEachChild(node,walk);
  }walk(ast);
 }else if(/\.(ps1|iss)$/.test(file)){
  const pattern=/^(?:\s*(?:function|procedure)\s+([\w-]+)[^\r\n]*)/gmi;let match;
  while((match=pattern.exec(source)))symbols.push({name:match[1],kind:file.endsWith('.iss')?'callback do instalador':'função PowerShell',line:source.slice(0,match.index).split('\n').length,end:0,signature:match[0].trim(),calls:[]});
 }
 modules.push({file,source,lines:source.split('\n').length,bytes:Buffer.byteLength(source),imports,symbols,constants,tests});
}
const manifest=await Bun.file(path.join(repo,'package.json')).json();
const dependencies=[];
for(const [name,requested]of Object.entries({...manifest.dependencies,...manifest.devDependencies})){
 const pkg=await Bun.file(path.join(repo,'node_modules',name,'package.json')).json();dependencies.push({name,requested,resolved:pkg.version,license:pkg.license,production:name in manifest.dependencies,dependencies:pkg.dependencies??{},peerDependencies:pkg.peerDependencies??{}});
}
const lock=ts.parseConfigFileTextToJson('bun.lock',await fs.readFile(path.join(repo,'bun.lock'),'utf8')).config;
const data={version:manifest.version,commit:git('rev-parse','HEAD'),stableCommit:git('rev-parse','v1.1.3^{}'),date:'2026-11-15',branch:git('branch','--show-current'),modules,dependencies,lockPackages:lock.packages,manifest};
await Bun.write(path.join(output,'snapshot.json'),JSON.stringify(data,null,2));
console.log(JSON.stringify({modules:modules.length,symbols:modules.reduce((n,m)=>n+m.symbols.length,0),tests:modules.reduce((n,m)=>n+m.tests.length,0),output}));
