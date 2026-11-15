import * as yauzl from 'yauzl';
import { parseDocument } from 'htmlparser2';
import { createHash } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import {bookFormat, type BookFormat} from './formats';
import {openText} from './text';
import {openPdf} from './pdf';

export type Block = { text: string; image?: string; heading?: boolean };
export type Chapter = { href: string; title: string; blocks: Block[]; targets?: Record<string, number> };
export type Anchor = { chapter: number; block: number; offset: number };
export type Book = { id: string; title: string; format?: BookFormat; chapters: Chapter[]; toc: { label: string; href: string }[]; resource: (href: string) => Promise<Uint8Array>; close: () => void };
const children = (n: any): any[] => n.children ?? [];
const text = (n: any): string => n.type === 'text' ? n.data : children(n).map(text).join('');
function all(n: any, tag: string): any[] { return [...(n.name?.split(':').pop() === tag ? [n] : []), ...children(n).flatMap(c => all(c, tag))]; }
export function resolveHref(base: string, href: string) {
  if (/^[a-z]+:/i.test(href)) throw new Error('Remote resources are unsupported');
  if (href.startsWith('#')) return base;
  const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(base), decodeURIComponent(href.split('#')[0])));
  if (normalized.startsWith('../') || normalized.startsWith('/')) throw new Error('Invalid resource path');
  return normalized;
}
export function blocksFromHtml(html: string, href: string, targets: Record<string, number> = {}): Block[] {
  const root = parseDocument(html); const blocks: Block[] = []; let pending = '';
  const flush = (heading = false) => { const value = pending.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '').replace(/\s+/g, ' ').trim(); if (value) blocks.push({ text: value, heading }); pending = ''; };
  function walk(n: any) {
    if (n.type === 'text') { pending += n.data; return; }
    if (['script', 'style', 'head'].includes(n.name)) return;
    if (n.name === 'img' || n.name === 'image') { flush(); const src = n.attribs?.src ?? n.attribs?.['xlink:href'] ?? n.attribs?.href; if (src) { try { blocks.push({ text: n.attribs?.alt ?? '', image: resolveHref(href, src) }); } catch {} } return; }
    const boundary = /^(p|div|h[1-6]|li|blockquote|pre|tr|br)$/.test(n.name ?? '');
    if (boundary) flush();
    const id = n.attribs?.id ?? n.attribs?.['xml:id'] ?? (n.name === 'a' ? n.attribs?.name : undefined);
    if (id) targets[id] = blocks.length;
    if (n.name === 'li') pending += '• ';
    children(n).forEach(walk); if (boundary) flush(/^h[1-6]$/.test(n.name));
  }
  walk(all(root, 'body')[0] ?? root); flush(); return blocks;
}
export async function openBook(filename: string): Promise<Book> {
  const format = bookFormat(filename);
  if (!format) throw new Error('Formato não suportado / Unsupported format: EPUB, TXT, PDF');
  if(format!=='epub') {
    const limit=(format==='pdf'?256:64)*1024*1024;
    if((await fs.stat(filename)).size>limit)throw new Error(`${format.toUpperCase()} excede / exceeds ${limit/1024/1024} MiB`);
  }
  const hash = createHash('sha256'); for await (const chunk of createReadStream(filename)) hash.update(chunk);
  const id = hash.digest('hex');
  if (format === 'txt') return openText(filename, id);
  if (format === 'pdf') return openPdf(filename, id);
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => yauzl.open(filename, { lazyEntries: true, autoClose: false }, (e, z) => e ? reject(e) : resolve(z!)));
  try {
    const entries = new Map<string, yauzl.Entry>();
    await new Promise<void>((resolve, reject) => { zip.on('error', reject); zip.on('entry', e => { entries.set(e.fileName, e); if (entries.size > 20000) { reject(new Error('Too many ZIP entries')); return; } zip.readEntry(); }); zip.on('end', resolve); zip.readEntry(); });
    const encrypted = new Set<string>();
    const resource = async (href: string) => {
      if (encrypted.has(href)) throw new Error(`Recurso criptografado não suportado / Encrypted resource is unsupported: ${href}`);
      const entry = entries.get(href); if (!entry) throw new Error(`Missing resource: ${href}`);
      if (entry.uncompressedSize > 32 * 1024 * 1024) throw new Error('Resource exceeds 32 MiB');
      const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => zip.openReadStream(entry, (e, s) => e ? reject(e) : resolve(s!)));
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of stream as any) { size += chunk.length; if (size > 32 * 1024 * 1024) throw new Error('Resource exceeds limit'); chunks.push(Buffer.from(chunk)); }
      return Buffer.concat(chunks);
    };
    const xml = async (href: string) => parseDocument(Buffer.from(await resource(href)).toString('utf8'), { xmlMode: true });
    if (entries.has('META-INF/encryption.xml')) {
      const encryption = await xml('META-INF/encryption.xml');
      for (const data of all(encryption, 'EncryptedData')) {
        const references = all(data, 'CipherReference');
        if (!references.length) throw new Error('Invalid EPUB encryption metadata');
        for (const ref of references) {
          if (!ref.attribs?.URI) throw new Error('Invalid EPUB encryption resource');
          encrypted.add(resolveHref('encryption.xml', ref.attribs.URI));
        }
      }
    }
    const container = await xml('META-INF/container.xml'); const opf = all(container, 'rootfile')[0]?.attribs?.['full-path']; if (!opf) throw new Error('Missing EPUB package');
    const pkg = await xml(opf); if (all(pkg, 'meta').some(n => n.attribs?.property === 'rendition:layout' && text(n).trim() === 'pre-paginated')) throw new Error('Fixed layout EPUB is unsupported');
    const manifest = new Map<string, any>(all(pkg, 'item').map(n => [n.attribs.id, n.attribs]));
    const chapters: Chapter[] = []; let total = 0;
    for (const ref of all(pkg, 'itemref')) {
      if (ref.attribs.linear === 'no') continue;
      const item = manifest.get(ref.attribs.idref); if (!item) continue;
      const href = resolveHref(opf, item.href); const bytes = await resource(href); total += bytes.length; if (total > 64 * 1024 * 1024) throw new Error('Book text exceeds 64 MiB');
      const targets: Record<string, number> = Object.create(null);
      const blocks = blocksFromHtml(Buffer.from(bytes).toString('utf8'), href, targets);
      chapters.push({ href, title: blocks.find(b => b.heading)?.text ?? `#${chapters.length + 1}`, blocks, targets });
    }
    if (!chapters.length) throw new Error('No readable chapters');
    const toc: Book['toc'] = [];
    const nav = [...manifest.values()].find(n => n.properties?.split(' ').includes('nav'));
    if (nav) { const href = resolveHref(opf, nav.href); const doc = await xml(href); const section = all(doc, 'nav').find(n => n.attribs?.['epub:type']?.includes('toc')) ?? all(doc, 'nav')[0]; for (const a of all(section ?? doc, 'a')) { try { toc.push({ label: text(a).trim(), href: resolveLink(href, a.attribs.href) }); } catch {} } }
    else { const ncx = [...manifest.values()].find(n => n['media-type'] === 'application/x-dtbncx+xml'); if (ncx) { const href = resolveHref(opf, ncx.href); for (const point of all(await xml(href), 'navPoint')) { const src = all(point, 'content')[0]?.attribs.src; if (src) toc.push({ label: text(all(point, 'navLabel')[0] ?? point).trim(), href: resolveLink(href, src) }); } } }
    return { id, format:'epub', title: text(all(pkg, 'title')[0] ?? {}).trim() || path.basename(filename, '.epub'), chapters, toc, resource, close: () => zip.close() };
  } catch (e) { zip.close(); throw e; }
}
export function resolveLink(base: string, href: string) {
  const fragment = href.indexOf('#');
  return resolveHref(base, href) + (fragment >= 0 ? '#' + href.slice(fragment + 1) : '');
}
export function tocAnchor(book: Book, href: string): Anchor | undefined {
  const [file, fragment] = href.split('#'); const chapter = book.chapters.findIndex(c => c.href === file);
  if (chapter < 0) return undefined;
  let id = fragment; try { if (id) id = decodeURIComponent(id); } catch {}
  return { chapter, block: id ? book.chapters[chapter].targets?.[id] ?? 0 : 0, offset: 0 };
}
export type Line = { text: string; anchor: Anchor; image?: string };
export function layout(book: Book, width: number, chapter: number): Line[] {
  const lines: Line[] = []; const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  book.chapters[chapter].blocks.forEach((block, b) => {
    if (block.image) { lines.push({ text: block.text, image: block.image, anchor: { chapter, block: b, offset: 0 } }); return; }
    let value = ''; let start = 0; let cells = 0;
    for (const { segment } of segmenter.segment(block.text)) {
      const size = Bun.stringWidth(segment);
      if (cells + size > width && value) { const space=value.lastIndexOf(' '); const cut=space>0?space+1:value.length;lines.push({ text: value.slice(0,cut), anchor: { chapter, block: b, offset: start } }); value = value.slice(cut);start+=cut;cells=Bun.stringWidth(value); }
      value += segment; cells += size;
    }
    if (value) lines.push({ text: value, anchor: { chapter, block: b, offset: start } });
    lines.push({ text: '', anchor: { chapter, block: b, offset: block.text.length } });
  }); return lines;
}
