import {cp, mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {logoPixels, pixelColor} from '../src/ui/logo';

const root = join(import.meta.dir, '..');
const output = join(root, 'dist', 'site');
await mkdir(join(output, 'assets'), {recursive: true});
await mkdir(join(output, 'en'), {recursive: true});
for (const name of ['style.css', 'main.js']) {
  await cp(join(root, 'site', name), join(output, name));
}
const revisions = await Promise.all(['style.css', 'main.js'].map(async name => ({name, hash:createHash('sha256').update(await readFile(join(root, 'site', name))).digest('hex').slice(0,12)})));
for (const name of ['index.html', 'en/index.html']) {
  let html = await readFile(join(root, 'site', name), 'utf8');
  for (const revision of revisions) html = html.replaceAll(`${revision.name}"`, `${revision.name}?v=${revision.hash}"`);
  await writeFile(join(output, name), html);
}
await cp(join(root, 'assets', 'ler.png'), join(output, 'assets', 'ler.png'));
const rows = logoPixels('large', 100, 2);
const pixels = rows.flatMap((row, y) => row.filter(pixel => pixel.kind !== 'space').map(pixel => {
  const small = ['spark', 'inset', 'baseline'].includes(pixel.kind);
  const color = pixelColor(pixel, 7, '#101114');
  return `<rect x="${pixel.x * 20 + (small ? 6 : 0)}" y="${y * 20 + (small ? 6 : 0)}" width="${small ? 8 : 20}" height="${small ? 8 : 20}" fill="${color}"/>`;
}));
await writeFile(join(output, 'assets', 'logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0].length * 20} ${rows.length * 20}" shape-rendering="crispEdges">${pixels.join('')}</svg>\n`);
await writeFile(join(output, '.nojekyll'), '');
console.log(`Site ready: ${output}`);
