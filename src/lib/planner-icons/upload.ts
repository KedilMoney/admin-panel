export const CHOOSE_ICON_FILE = 'Choose an SVG or PNG file.';

export type PlannerIconDrawing = {
  format?: 'svg' | 'png';
  svg?: string;
  png?: string;
};

export const ICON_FILE_ACCEPT = '.svg,image/svg+xml,.png,image/png';

export const ICON_FILE_HELPER =
  'Square SVG or PNG. SVG up to 200 KB, PNG up to 300 KB. Shown in the Planner exactly as uploaded.';

export type IconFileFormat = 'svg' | 'png';

export function acceptedIconFile(file: { type: string; name: string }): boolean {
  const name = file.name.toLowerCase();
  if (file.type === 'image/svg+xml' || name.endsWith('.svg')) return true;
  if (file.type === 'image/png' || name.endsWith('.png')) return true;
  return false;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function readIconFile(
  file: Pick<File, 'type' | 'name' | 'text' | 'arrayBuffer'>,
): Promise<{ format: IconFileFormat; svg: string; png: string }> {
  if (!acceptedIconFile(file)) {
    throw new Error(CHOOSE_ICON_FILE);
  }
  const name = file.name.toLowerCase();
  const isPng = file.type === 'image/png' || name.endsWith('.png');
  if (isPng) {
    const png = arrayBufferToBase64(await file.arrayBuffer());
    return { format: 'png', svg: '', png };
  }
  const svg = await file.text();
  return { format: 'svg', svg, png: '' };
}

export function iconPreviewSrc(content: {
  format: IconFileFormat | null;
  svg: string;
  png: string;
}): string | null {
  if (content.format === 'png' && content.png) {
    return `data:image/png;base64,${content.png}`;
  }
  if (content.svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content.svg)}`;
  }
  return null;
}

export function plannerIconPreviewSrc(icon: PlannerIconDrawing): string {
  const format: IconFileFormat = icon.format ?? (icon.png ? 'png' : 'svg');
  if (format === 'png' && icon.png) {
    return `data:image/png;base64,${icon.png}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg ?? '')}`;
}

export function iconFormatFromPlannerIcon(icon: PlannerIconDrawing): IconFileFormat {
  return icon.format ?? (icon.png ? 'png' : 'svg');
}

export function buildPlannerIconBody(form: {
  groupTitle: string;
  tags: string;
  format: IconFileFormat | null;
  svg: string;
  png: string;
}): { groupTitle: string; tags: string[]; svg?: string; png?: string } {
  const body: { groupTitle: string; tags: string[]; svg?: string; png?: string } = {
    groupTitle: form.groupTitle.trim(),
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
  if (form.format === 'png' && form.png) {
    body.png = form.png;
  } else if (form.format === 'svg' && form.svg) {
    body.svg = form.svg;
  } else if (form.png) {
    body.png = form.png;
  } else if (form.svg) {
    body.svg = form.svg;
  }
  return body;
}

export function hasIconDrawing(form: {
  format: IconFileFormat | null;
  svg: string;
  png: string;
}): boolean {
  return !!(form.format === 'png' ? form.png : form.svg);
}