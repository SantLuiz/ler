import {promises as fs} from 'node:fs';
import type {Book} from './book';
import {bookTitle} from './formats';

export function decodeText(bytes: Uint8Array): string {
  let value: string;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) value = new TextDecoder('utf-16le').decode(bytes);
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) value = new TextDecoder('utf-16be').decode(bytes);
  else {
    try {value = new TextDecoder('utf-8', {fatal:true}).decode(bytes);}
    catch {value = new TextDecoder('windows-1252').decode(bytes);}
  }
  if (value.includes('\0')) throw new Error('Invalid TXT: binary content');
  return value.replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '').replace(/\t/g, '    ');
}

export async function openText(filename: string, id: string): Promise<Book> {
  if ((await fs.stat(filename)).size > 64 * 1024 * 1024) throw new Error('TXT exceeds 64 MiB');
  const text = decodeText(await fs.readFile(filename));
  if (!text.trim()) throw new Error('Empty TXT');
  const title = bookTitle(filename);
  return {id, title, format:'txt', chapters:[{href:'text', title, blocks:text.split('\n').map(text=>({text}))}], toc:[],
    resource:async()=>{throw new Error('TXT has no images');}, close:()=>{}};
}
