import path from 'node:path';

export type BookFormat = 'epub' | 'txt' | 'pdf';
export function bookFormat(filename: string): BookFormat | undefined {
  const extension = path.extname(filename).slice(1).toLowerCase();
  return extension === 'epub' || extension === 'txt' || extension === 'pdf' ? extension : undefined;
}
export const bookTitle = (filename: string) => path.basename(filename, path.extname(filename));
