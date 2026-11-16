export type PlannerIconFileKind = 'svg' | 'png';

export function iconFileKind(fileName: string, mimeType: string): PlannerIconFileKind | null {
  const lower = fileName.toLowerCase();
  if (mimeType === 'image/svg+xml' || lower.endsWith('.svg')) return 'svg';
  if (mimeType === 'image/png' || lower.endsWith('.png')) return 'png';
  return null;
}

export const WRONG_ICON_FILE_MESSAGE = 'Choose an SVG or PNG file.';
export const MISSING_ICON_FILE_MESSAGE = 'Choose an SVG or PNG file.';

/** Build the admin API body; sends exactly one of svg or png when an image is included. */
export function buildPlannerIconPayload(
  groupTitle: string,
  tagsCsv: string,
  image: { format: PlannerIconFileKind; svg?: string; png?: string },
): { groupTitle: string; tags: string[]; svg?: string; png?: string } {
  const tags = tagsCsv
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const base = { groupTitle: groupTitle.trim(), tags };
  const usePng = image.format === 'png' || (!image.svg && !!image.png);
  if (usePng && image.png) {
    return { ...base, png: image.png };
  }
  if (image.svg) {
    return { ...base, svg: image.svg };
  }
  return base;
}

export function iconPreviewDataUrl(icon: {
  format?: PlannerIconFileKind;
  svg?: string;
  png?: string;
}): string | null {
  const format = icon.format ?? (icon.png ? 'png' : 'svg');
  if (format === 'png' && icon.png) {
    return `data:image/png;base64,${icon.png}`;
  }
  if (icon.svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`;
  }
  return null;
}

export async function readIconFileFromBlob(
  file: Blob,
  kind: PlannerIconFileKind,
): Promise<{ format: PlannerIconFileKind; svg?: string; png?: string }> {
  if (kind === 'svg') {
    return { format: 'svg', svg: await file.text(), png: undefined };
  }
  const base64 = await readBlobAsBase64(file);
  return { format: 'png', png: base64, svg: undefined };
}

function readBlobAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}