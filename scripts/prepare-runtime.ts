import {promises as fs} from 'node:fs';
import path from 'node:path';

// Preserve module locations: storage defaults and worker URLs depend on them.
const target=path.resolve(process.argv[2]??'dist/runtime');
const repo=path.resolve(import.meta.dir,'..');
if(!target.startsWith(path.join(repo,'dist')+path.sep))throw new Error('Runtime staging must be inside dist.');
const testsOnly=process.argv.includes('--tests-only');
const babelModule='@babel/core',typescriptModule='@babel/preset-typescript',solidModule='babel-preset-solid';
const [{transformAsync},{default:typescript},{default:solid}]=await Promise.all([import(babelModule),import(typescriptModule),import(solidModule)]);
const runtime=path.join(target,'src/runtime-solid.js');
if(!testsOnly){
const built=await Bun.build({entrypoints:[Bun.resolveSync('@opentui/solid',repo)],outdir:path.dirname(runtime),naming:'runtime-solid.js',target:'bun',minify:true,
  external:['@opentui/core','@opentui/core/*','solid-js','solid-js/*'],
  plugins:[{name:'client-solid',setup(build){build.onResolve({filter:/^solid-js$/},()=>({path:'solid-js/dist/solid.js',external:true}));}}]});
if(!built.success)throw new AggregateError(built.logs,'Cannot prepare Solid runtime');
}
const tree=testsOnly?'tests':'src';
for await(const relative of new Bun.Glob('**/*.{ts,tsx}').scan({cwd:path.join(repo,tree)})){
  if(testsOnly&&['install.test.ts','site.test.ts','storage-location.test.ts'].includes(relative))continue;
  const filename=path.join(repo,tree,relative),destination=path.join(target,tree,relative.replace(/\.tsx?$/,'.js'));
  let solidImport=path.relative(path.dirname(destination),runtime).replaceAll('\\','/');if(!solidImport.startsWith('.'))solidImport='./'+solidImport;
  const result=await transformAsync(await fs.readFile(filename,'utf8'),{filename,configFile:false,babelrc:false,comments:false,compact:true,
    presets:[...(filename.endsWith('.tsx')?[[solid,{moduleName:solidImport,generate:'universal'}]]:[]),typescript],
    plugins:[()=>({visitor:{
      ImportDeclaration(node:any){rewrite(node.node.source);},ExportNamedDeclaration(node:any){rewrite(node.node.source);},ExportAllDeclaration(node:any){rewrite(node.node.source);},
      NewExpression(node:any){const value=node.node;if(value.callee.name==='URL'&&value.arguments[0]?.type==='StringLiteral'&&value.arguments[0].value.endsWith('.worker.ts'))value.arguments[0].value=value.arguments[0].value.replace(/\.ts$/,'.js');},
      CallExpression(node:any){if(node.node.callee.type==='Import')rewrite(node.node.arguments[0]);}
    }})]});
  function rewrite(source:{value:string}|null){if(!source||typeof source.value!=='string')return;const value=source.value;if(value==='@opentui/solid')source.value=solidImport;else if(value==='solid-js')source.value='solid-js/dist/solid.js';else if(value.startsWith('.')&&!path.extname(value))source.value=value+'.js';}
  await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,result.code+'\n');
}

if(testsOnly)process.exit(0);
// Follow package manifests rather than deleting files inside vendor packages.
// The release install was made from the frozen application lockfile.
const manifest=await Bun.file(path.join(target,'package.json')).json();
delete manifest.dependencies['@opentui/solid'];delete manifest.devDependencies;delete manifest.scripts;
await Bun.write(path.join(target,'package.json'),JSON.stringify(manifest,null,2)+'\n');
const modules=path.join(target,'node_modules'),keep=new Set<string>();
async function visit(name:string,optional=false){
  if(keep.has(name))return;
  let pkg;try{pkg=await Bun.file(path.join(modules,name,'package.json')).json();}catch(error){if(optional)return;throw error;}
  keep.add(name);
  for(const dependency of Object.keys(pkg.dependencies??{}))await visit(dependency);
  for(const dependency of Object.keys(pkg.optionalDependencies??{}))await visit(dependency,true);
}
for(const name of Object.keys(manifest.dependencies))await visit(name);
const packages:string[]=[];
for(const item of await fs.readdir(modules,{withFileTypes:true})){
  if(item.name.startsWith('@'))for(const child of await fs.readdir(path.join(modules,item.name)))packages.push(item.name+'/'+child);
  else packages.push(item.name);
}
let notices='Bundled JavaScript dependencies (original package licenses)\n\n';
for(const name of packages){
  if(name.startsWith('.'))continue;
  const directory=path.join(modules,name);
  for(const file of await fs.readdir(directory))if(/^licen[cs]e(?:\.|$)/i.test(file))notices+=`\n--- ${name}/${file} ---\n${await fs.readFile(path.join(directory,file),'utf8')}\n`;
  if(!keep.has(name))await fs.rm(directory,{recursive:true,force:true});
}
await fs.rm(path.join(modules,'.bin'),{recursive:true,force:true});
for(const item of await fs.readdir(modules))if(item.startsWith('@')&&(await fs.readdir(path.join(modules,item))).length===0)await fs.rmdir(path.join(modules,item));
await Bun.write(path.join(target,'THIRD-PARTY-NOTICES.txt'),notices);
console.log(`Precompiled interface; ${keep.size} runtime packages retained.`);
