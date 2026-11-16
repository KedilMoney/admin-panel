import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptedIconFile,
  arrayBufferToBase64,
  buildPlannerIconBody,
  CHOOSE_ICON_FILE,
  hasIconDrawing,
  iconPreviewSrc,
  plannerIconPreviewSrc,
  readIconFile,
} from './upload.ts';

describe('acceptedIconFile', () => {
  it('accepts SVG by type and extension', () => {
    assert.equal(acceptedIconFile({ type: 'image/svg+xml', name: 'x.SVG' }), true);
    assert.equal(acceptedIconFile({ type: 'application/octet-stream', name: 'icon.svg' }), true);
  });

  it('accepts PNG by type and extension', () => {
    assert.equal(acceptedIconFile({ type: 'image/png', name: 'logo.png' }), true);
    assert.equal(acceptedIconFile({ type: '', name: 'fund.PNG' }), true);
  });

  it('rejects JPG and PDF', () => {
    assert.equal(acceptedIconFile({ type: 'image/jpeg', name: 'x.jpg' }), false);
    assert.equal(acceptedIconFile({ type: 'application/pdf', name: 'x.pdf' }), false);
  });
});

describe('readIconFile', () => {
  it('reads SVG as text and clears png', async () => {
    const file = {
      type: 'image/svg+xml',
      name: 'a.svg',
      text: async () => '<svg/>',
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    const result = await readIconFile(file);
    assert.deepEqual(result, { format: 'svg', svg: '<svg/>', png: '' });
  });

  it('reads PNG as base64 without data: prefix', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const file = {
      type: 'image/png',
      name: 'hdfc.png',
      text: async () => '',
      arrayBuffer: async () => bytes.buffer,
    };
    const result = await readIconFile(file);
    assert.equal(result.format, 'png');
    assert.equal(result.svg, '');
    assert.equal(result.png, arrayBufferToBase64(bytes.buffer));
    assert.ok(!result.png.startsWith('data:'));
  });

  it('throws Choose an SVG or PNG file for wrong type', async () => {
    const file = {
      type: 'image/jpeg',
      name: 'x.jpg',
      text: async () => '',
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    await assert.rejects(() => readIconFile(file), { message: CHOOSE_ICON_FILE });
  });
});

describe('iconPreviewSrc', () => {
  it('previews PNG from base64', () => {
    const src = iconPreviewSrc({ format: 'png', svg: '', png: 'abcd' });
    assert.equal(src, 'data:image/png;base64,abcd');
  });

  it('previews SVG as encoded data URL', () => {
    const src = iconPreviewSrc({ format: 'svg', svg: '<svg x="&"/>', png: '' });
    assert.equal(src, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg x="&"/>'));
  });
});

describe('plannerIconPreviewSrc', () => {
  it('uses png field when format is png', () => {
    const src = plannerIconPreviewSrc({ format: 'png', png: 'qq==' });
    assert.equal(src, 'data:image/png;base64,qq==');
  });

  it('defaults missing format to svg text', () => {
    const src = plannerIconPreviewSrc({ svg: '<svg/>' });
    assert.ok(src.includes('image/svg+xml'));
  });
});

describe('buildPlannerIconBody', () => {
  it('sends png only for a PNG upload', () => {
    const body = buildPlannerIconBody({
      groupTitle: ' Fund houses ',
      tags: 'HDFC Mutual Fund, ',
      format: 'png',
      svg: '',
      png: 'abcd',
    });
    assert.deepEqual(body, {
      groupTitle: 'Fund houses',
      tags: ['HDFC Mutual Fund'],
      png: 'abcd',
    });
    assert.equal('svg' in body, false);
  });

  it('sends svg only for an SVG upload', () => {
    const body = buildPlannerIconBody({
      groupTitle: 'Goals',
      tags: 'school',
      format: 'svg',
      svg: '<svg/>',
      png: '',
    });
    assert.deepEqual(body, {
      groupTitle: 'Goals',
      tags: ['school'],
      svg: '<svg/>',
    });
    assert.equal('png' in body, false);
  });

  it('keeps existing png when editing tags without a new file', () => {
    const body = buildPlannerIconBody({
      groupTitle: 'Fund houses',
      tags: 'HDFC',
      format: 'png',
      svg: '',
      png: 'stored',
    });
    assert.equal(body.png, 'stored');
    assert.equal('svg' in body, false);
  });
});

describe('hasIconDrawing', () => {
  it('requires svg or png content when creating', () => {
    assert.equal(hasIconDrawing({ format: null, svg: '', png: '' }), false);
    assert.equal(hasIconDrawing({ format: 'png', svg: '', png: 'x' }), true);
    assert.equal(hasIconDrawing({ format: 'svg', svg: '<svg/>', png: '' }), true);
  });
});