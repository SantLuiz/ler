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
export type Language = 'en' | 'pt-BR';
export function interfaceLanguage(args: string[], locale = Intl.DateTimeFormat().resolvedOptions().locale): Language {
  const index = args.indexOf('--lang');
  const requested = index >= 0 ? args[index + 1] : undefined;
  return requested === 'en' || requested === 'pt-BR' ? requested : locale.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}
export const HELP=`LER — Leitor Extremamente Reduzido

  LER                       Open the home screen
  LER "D:\\Books"             Open another library
  LER --choose              Open home (compatibility option)
  LER --open "book.epub"     Open a book file

  --library <folder>        Library directory
  --open <file>             Open EPUB, TXT or PDF
  --lang <en|pt-BR>          Interface language
  --check                   Check the library without opening the interface
  --version                 Show version
  --help                    Show help

Inside the cloned repository, its parent is used as the library.
Choose a library inside LER with Ctrl+L on the home screen.
`;
export function helpText(lang: Language) { return lang === 'en' ? HELP : `LER — Leitor Extremamente Reduzido

  LER                       Abrir a tela inicial
  LER "D:\\Livros"            Abrir outra biblioteca
  LER --choose              Abrir a home (opção de compatibilidade)
  LER --open "livro.epub"    Abrir um arquivo

  --library <folder>        Pasta da biblioteca
  --open <file>             Abrir EPUB, TXT ou PDF
  --lang <en|pt-BR>          Idioma da interface
  --check                   Validar pasta sem abrir a interface
  --version                 Mostrar versão
  --help                    Mostrar ajuda

Dentro do repositório, a pasta pai é usada como biblioteca.
Escolha uma biblioteca dentro do LER com Ctrl+L na tela inicial.
`; }
