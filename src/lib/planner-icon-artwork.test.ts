import { describe, expect, it } from 'vitest';
import {
  PLANNER_ICON_WRONG_FILE_TYPE,
  plannerIconArtworkFromIcon,
  plannerIconPayloadArtwork,
  plannerIconPreviewSrc,
  readPlannerIconFile,
} from './planner-icon-artwork';

/** 1×1 PNG */
const TINY_PNG_BYTES = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
);

describe('readPlannerIconFile rejects a file that is not SVG or PNG', () => {
  it('rejects JPG', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8])], 'logo.jpg', { type: 'image/jpeg' });
    const result = await readPlannerIconFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(PLANNER_ICON_WRONG_FILE_TYPE);
  });
});

describe('readPlannerIconFile accepts PNG', () => {
  it('reads PNG as base64 without a data: prefix', async () => {
    const file = new File([TINY_PNG_BYTES], 'hdfc.png', { type: 'image/png' });
    const result = await readPlannerIconFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artwork.format).toBe('png');
      expect(result.artwork.png).not.toMatch(/^data:/);
      expect(result.artwork.svg).toBe('');
    }
  });
});

describe('plannerIconPayloadArtwork sends exactly one of svg or png', () => {
  it('sends png only for PNG artwork', () => {
    const body = plannerIconPayloadArtwork({ format: 'png', png: 'abc', svg: '' });
    expect(body).toEqual({ png: 'abc' });
  });

  it('sends svg only for SVG artwork', () => {
    const body = plannerIconPayloadArtwork({ format: 'svg', svg: '<svg/>', png: '' });
    expect(body).toEqual({ svg: '<svg/>' });
  });
});

describe('plannerIconPreviewSrc', () => {
  it('builds a PNG data URL', () => {
    expect(plannerIconPreviewSrc({ format: 'png', png: 'abc', svg: '' })).toBe('data:image/png;base64,abc');
  });
});

describe('plannerIconArtworkFromIcon when editing a PNG icon without picking a new file', () => {
  it('keeps png artwork from format png', () => {
    const artwork = plannerIconArtworkFromIcon({
      slug: 'hdfc',
      groupTitle: 'Fund houses',
      tags: ['HDFC Mutual Fund'],
      format: 'png',
      png: 'stored',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(artwork.format).toBe('png');
    expect(artwork.png).toBe('stored');
  });
});