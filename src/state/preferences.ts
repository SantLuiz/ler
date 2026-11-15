import {paletteById,type PaletteId} from './palettes';
export type Preferences = { background: string; foreground: string; readingWidth: number; imagePercent: number; lineGap: number; protocol: 'auto' | 'blocks'; logoAnimation?:boolean; animationPixelSize?:number; animationDensity?:number; palette?:PaletteId };
export const defaults: Preferences = { background: '#101114', foreground: '#d6d6d6', readingWidth: 88, imagePercent: 80, lineGap: 0, protocol: 'auto', logoAnimation:true, animationPixelSize:2, animationDensity:100 };
export function preferences(value?: Partial<Preferences>): Preferences {
  const palette=paletteById(value?.palette);
  const clamp = (n: unknown, fallback: number, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  const color = (s: unknown, fallback: string) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
  return { palette:palette.id,background: color(value?.background, palette.background), foreground: color(value?.foreground, palette.foreground), readingWidth: clamp(value?.readingWidth, 88, 40, 140), imagePercent: clamp(value?.imagePercent, 80, 30, 100), lineGap: clamp(value?.lineGap, 0, 0, 2), protocol: value?.protocol === 'blocks' ? 'blocks' : 'auto', logoAnimation:value?.logoAnimation!==false, animationPixelSize:clamp(value?.animationPixelSize,2,1,3), animationDensity:clamp(value?.animationDensity,100,25,200) };
}
export function imageRows(viewport: number, percent: number) { return Math.max(1, Math.min(viewport, Math.round(viewport * percent / 100))); }
