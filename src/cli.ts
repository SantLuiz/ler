import path from 'node:path';
import {version} from '../package.json';
export const VERSION = version;
export type CliOptions = { library?: string; open?:string; choose: boolean; lang?: 'en' | 'pt-BR'; check: boolean; help: boolean; version: boolean };
export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { choose:false, check:false, help:false, version:false };
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--help'||arg==='-h')options.help=true;
    else if(arg==='--version'||arg==='-v')options.version=true;
    else if(arg==='--choose')options.choose=true;
    else if(arg==='--check')options.check=true;
    else if(arg==='--library'||arg==='--lang'||arg==='--open') {
      const value=args[++i];if(!value||value.startsWith('--'))throw new Error(`Missing value: ${arg}`);
      if(arg==='--library'){if(options.library)throw new Error('Specify only one library');options.library=value;}
      else if(arg==='--open'){if(options.open)throw new Error('Specify only one book');options.open=value;}
      else {if(value!=='en'&&value!=='pt-BR')throw new Error('Use --lang en or --lang pt-BR');options.lang=value;}
    } else if(arg.startsWith('-'))throw new Error(`Unknown option: ${arg}`);
    else {if(options.library)throw new Error('Specify only one library');options.library=arg;}
  }
  return options;
}
export function libraryRoot(options:CliOptions,cwd:string,appDirectory:string) {
  if(options.library)return path.resolve(cwd,options.library);
  if(options.open){const file=path.resolve(cwd,options.open);const parent=path.dirname(appDirectory);const relative=path.relative(parent,file);return relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)?parent:path.dirname(file);}
  const relative=path.relative(appDirectory,cwd);
  const inside=relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));
  return inside?path.dirname(appDirectory):path.resolve(cwd);
}
export const HELP=`LER — Leitor Extremamente Reduzido

  LER                       Abrir a pasta atual / Open current folder
  LER "D:\\Livros"            Abrir outra biblioteca / Open another library
  LER --choose              Escolher pasta / Choose a folder
  LER --open "livro.epub"    Abrir um arquivo / Open a book file

  --library <folder>        Pasta da biblioteca / Library directory
  --open <file>             Abrir EPUB, TXT ou PDF / Open EPUB, TXT or PDF
  --lang <en|pt-BR>         Idioma / Interface language
  --check                   Validar pasta sem abrir a interface / Check library
  --version                 Mostrar versão / Show version
  --help                    Mostrar ajuda / Show help

Dentro do repositorio, a pasta pai e usada como biblioteca.
Inside the cloned repository, its parent is used as the library.
`;
