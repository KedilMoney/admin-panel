import { describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import {
  PLANNER_ICON_WRONG_FILE_TYPE,
  applyPlannerIconFileResult,
  attemptPlannerIconSubmit,
  plannerIconArtworkFromIcon,
  plannerIconHasArtwork,
  plannerIconPayloadArtwork,
  plannerIconPreviewSrc,
  readPlannerIconFile,
} from './planner-icon-artwork';
import { plannerErrorMessage } from './api/plannerIcons';

/** 1×1 PNG */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_BYTES = Uint8Array.from(atob(TINY_PNG_B64), (c) => c.charCodeAt(0));
const TINY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

describe('readPlannerIconFile rejects a file that is not SVG or PNG', () => {
  it('rejects JPG', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8])], 'logo.jpg', { type: 'image/jpeg' });
    const result = await readPlannerIconFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(PLANNER_ICON_WRONG_FILE_TYPE);
  });
});

describe('invalid-file submission with an existing valid picture loaded', () => {
  it('clears the previous picture so Save sends no request', async () => {
    const loaded = { format: 'png' as const, svg: '', png: TINY_PNG_B64 };
    const jpg = new File([new Uint8Array([0xff, 0xd8])], 'logo.jpg', { type: 'image/jpeg' });
    const read = await readPlannerIconFile(jpg);
    const next = applyPlannerIconFileResult(loaded, read);
    expect(next.error).toBe(PLANNER_ICON_WRONG_FILE_TYPE);
    expect(plannerIconHasArtwork(next.artwork)).toBe(false);
    expect(plannerIconPayloadArtwork(next.artwork)).toBeNull();

    const create = vi.fn();
    const outcome = await attemptPlannerIconSubmit(
      { slug: 'hdfc', groupTitle: 'Fund houses', tags: 'HDFC Mutual Fund', ...next.artwork },
      { mode: 'create', create, update: vi.fn() },
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe(PLANNER_ICON_WRONG_FILE_TYPE);
    expect(create).not.toHaveBeenCalled();
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

describe('SVG regression — upload, preview and payload', () => {
  it('reads SVG text, builds a data URL preview, and sends svg only', async () => {
    const file = new File([TINY_SVG], 'mark.svg', { type: 'image/svg+xml' });
    const result = await readPlannerIconFile(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const artwork = { format: result.artwork.format, svg: result.artwork.svg ?? '', png: result.artwork.png ?? '' };
    expect(plannerIconPreviewSrc(artwork)).toMatch(/^data:image\/svg\+xml/);
    expect(plannerIconPayloadArtwork(artwork)).toEqual({ svg: TINY_SVG });
  });
});

describe('plannerIconPayloadArtwork sends exactly one of svg or png', () => {
  it('sends png only for PNG artwork', () => {
    expect(plannerIconPayloadArtwork({ format: 'png', png: 'abc', svg: '' })).toEqual({ png: 'abc' });
  });

  it('sends svg only for SVG artwork', () => {
    expect(plannerIconPayloadArtwork({ format: 'svg', svg: '<svg/>', png: '' })).toEqual({ svg: '<svg/>' });
  });
});

describe('plannerIconPreviewSrc', () => {
  it('builds a PNG data URL', () => {
    expect(plannerIconPreviewSrc({ format: 'png', png: 'abc', svg: '' })).toBe('data:image/png;base64,abc');
  });
});

describe('tags-only edits keep the existing picture', () => {
  it('loads PNG artwork from the icon and still sends png when only tags change', () => {
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
    expect(plannerIconPayloadArtwork(artwork)).toEqual({ png: 'stored' });
  });
});

describe('format replacements PNG ↔ SVG', () => {
  it('replacing SVG with PNG clears svg in the payload', () => {
    const fromSvg = applyPlannerIconFileResult(
      { format: 'svg', svg: TINY_SVG, png: '' },
      { ok: true, artwork: { format: 'png', png: 'newpng', svg: '' } },
    );
    expect(fromSvg.artwork.format).toBe('png');
    expect(plannerIconPayloadArtwork(fromSvg.artwork)).toEqual({ png: 'newpng' });
  });

  it('replacing PNG with SVG clears png in the payload', () => {
    const fromPng = applyPlannerIconFileResult(
      { format: 'png', svg: '', png: 'oldpng' },
      { ok: true, artwork: { format: 'svg', svg: TINY_SVG, png: '' } },
    );
    expect(fromPng.artwork.format).toBe('svg');
    expect(plannerIconPayloadArtwork(fromPng.artwork)).toEqual({ svg: TINY_SVG });
  });
});

describe('API error handling for oversized PNG, duplicate slug, network and wrong key', () => {
  it('shows the server message for an oversized PNG', () => {
    const error = new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: { error: 'PNG must be 300 KB or smaller.' },
    });
    expect(plannerErrorMessage(error)).toBe('PNG must be 300 KB or smaller.');
  });

  it('shows the server message for a duplicate slug', () => {
    const error = new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: { error: 'An icon with that slug already exists.' },
    });
    expect(plannerErrorMessage(error)).toBe('An icon with that slug already exists.');
  });

  it('shows the network failure message when there is no response', () => {
    const error = new axios.AxiosError('Network Error', 'ERR_NETWORK');
    expect(plannerErrorMessage(error)).toBe('Could not reach the Planner API.');
  });

  it('shows the wrong-key message on 401', () => {
    const error = new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: { error: 'Unauthorized' },
    });
    expect(plannerErrorMessage(error)).toBe('Planner admin key is missing or wrong.');
  });
});

describe('attemptPlannerIconSubmit surfaces API errors without claiming success', () => {
  it('returns the oversized PNG server message and does not treat Save as done', async () => {
    const create = vi.fn().mockRejectedValue(
      new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
        data: { error: 'PNG must be 300 KB or smaller.' },
      }),
    );
    const outcome = await attemptPlannerIconSubmit(
      { slug: 'hdfc', groupTitle: 'Fund houses', tags: 'x', format: 'png', svg: '', png: TINY_PNG_B64 },
      { mode: 'create', create, update: vi.fn() },
    );
    expect(create).toHaveBeenCalledOnce();
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe('PNG must be 300 KB or smaller.');
  });
});
