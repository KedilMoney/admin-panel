import { PlannerIcon } from '@/types';
import { plannerErrorMessage } from '@/lib/api/plannerIcons';

export type PlannerIconArtworkFormat = 'svg' | 'png';

export type PlannerIconFormArtwork = {
  format: PlannerIconArtworkFormat;
  svg: string;
  png: string;
};

export type PlannerIconFileRead =
  | { ok: true; artwork: Pick<PlannerIconFormArtwork, 'format'> & { svg?: string; png?: string } }
  | { ok: false; error: string };

export type PlannerIconSubmitForm = PlannerIconFormArtwork & {
  slug: string;
  groupTitle: string;
  tags: string;
};

const WRONG_FILE_TYPE = 'Choose an SVG or PNG file.';
const EMPTY_ARTWORK: PlannerIconFormArtwork = { format: 'svg', svg: '', png: '' };

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

export async function readPlannerIconFile(file: File): Promise<PlannerIconFileRead> {
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

/** Apply a file-read result. Invalid picks clear any previous picture so Save cannot resend it. */
export function applyPlannerIconFileResult(
  _current: PlannerIconFormArtwork,
  result: PlannerIconFileRead,
): { artwork: PlannerIconFormArtwork; error: string | null } {
  if (!result.ok) {
    return { artwork: { ...EMPTY_ARTWORK }, error: result.error };
  }
  return {
    artwork: {
      format: result.artwork.format,
      svg: result.artwork.svg ?? '',
      png: result.artwork.png ?? '',
    },
    error: null,
  };
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

type SubmitDeps = {
  mode: 'create' | 'update';
  create: (data: { slug: string; groupTitle: string; tags: string[] } & ({ svg: string } | { png: string })) => Promise<unknown>;
  update: (data: { groupTitle: string; tags: string[] } & ({ svg: string } | { png: string })) => Promise<unknown>;
};

/** Shared Save path used by the page and by submission tests. */
export async function attemptPlannerIconSubmit(
  form: PlannerIconSubmitForm,
  deps: SubmitDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const artwork = plannerIconPayloadArtwork(form);
  if (!artwork) return { ok: false, error: WRONG_FILE_TYPE };
  const body = {
    groupTitle: form.groupTitle.trim(),
    tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    ...artwork,
  };
  try {
    if (deps.mode === 'update') await deps.update(body);
    else await deps.create({ slug: form.slug.trim(), ...body });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plannerErrorMessage(err) };
  }
}

export { WRONG_FILE_TYPE as PLANNER_ICON_WRONG_FILE_TYPE };