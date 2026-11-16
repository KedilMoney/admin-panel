import { PlannerIcon } from '@/types';

export type PlannerIconArtworkFormat = 'svg' | 'png';

export type PlannerIconFormArtwork = {
  format: PlannerIconArtworkFormat;
  svg: string;
  png: string;
};

const WRONG_FILE_TYPE = 'Choose an SVG or PNG file.';

function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

function isPngFile(file: File): boolean {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function readPlannerIconFile(
  file: File,
): Promise<{ ok: true; artwork: Pick<PlannerIconFormArtwork, 'format'> & { svg?: string; png?: string } } | { ok: false; error: string }> {
  if (isSvgFile(file)) {
    const svg = await file.text();
    return { ok: true, artwork: { format: 'svg', svg, png: '' } };
  }
  if (isPngFile(file)) {
    const png = arrayBufferToBase64(await file.arrayBuffer());
    return { ok: true, artwork: { format: 'png', png, svg: '' } };
  }
  return { ok: false, error: WRONG_FILE_TYPE };
}

export function plannerIconArtworkFromIcon(icon: PlannerIcon): PlannerIconFormArtwork {
  const format: PlannerIconArtworkFormat =
    icon.format ?? (icon.png && !icon.svg ? 'png' : 'svg');
  return {
    format,
    svg: icon.svg ?? '',
    png: icon.png ?? '',
  };
}

export function plannerIconPreviewSrc(artwork: Pick<PlannerIconFormArtwork, 'format' | 'svg' | 'png'>): string | null {
  if (artwork.format === 'png' && artwork.png) {
    return `data:image/png;base64,${artwork.png}`;
  }
  if (artwork.format === 'svg' && artwork.svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork.svg)}`;
  }
  return null;
}

export function plannerIconHasArtwork(artwork: Pick<PlannerIconFormArtwork, 'format' | 'svg' | 'png'>): boolean {
  return artwork.format === 'png' ? !!artwork.png : !!artwork.svg;
}

export function plannerIconPayloadArtwork(artwork: PlannerIconFormArtwork): { svg: string } | { png: string } | null {
  if (artwork.format === 'png' && artwork.png) return { png: artwork.png };
  if (artwork.format === 'svg' && artwork.svg) return { svg: artwork.svg };
  return null;
}

export { WRONG_FILE_TYPE as PLANNER_ICON_WRONG_FILE_TYPE };