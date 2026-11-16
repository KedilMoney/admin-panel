import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WRONG_ICON_FILE_MESSAGE,
  buildPlannerIconPayload,
  iconFileKind,
  iconPreviewDataUrl,
} from './icon-file.ts';

describe('iconFileKind rejects a file that is not SVG or PNG', () => {
  it('returns null for JPG', () => {
    assert.equal(iconFileKind('logo.jpg', 'image/jpeg'), null);
  });

  it('returns null for PDF', () => {
    assert.equal(iconFileKind('doc.pdf', 'application/pdf'), null);
  });
});

describe('iconFileKind accepts SVG and PNG', () => {
  it('detects SVG by extension or mime', () => {
    assert.equal(iconFileKind('a.SVG', ''), 'svg');
    assert.equal(iconFileKind('x', 'image/svg+xml'), 'svg');
  });

  it('detects PNG by extension or mime', () => {
    assert.equal(iconFileKind('hdfc.png', ''), 'png');
    assert.equal(iconFileKind('x', 'image/png'), 'png');
  });
});

describe('buildPlannerIconPayload sends exactly one of svg or png', () => {
  it('sends svg for an SVG icon', () => {
    const body = buildPlannerIconPayload('Fund houses', 'HDFC Mutual Fund', {
      format: 'svg',
      svg: '<svg/>',
    });
    assert.equal(body.svg, '<svg/>');
    assert.equal(body.png, undefined);
    assert.deepEqual(body.tags, ['HDFC Mutual Fund']);
  });

  it('sends png for a PNG icon', () => {
    const body = buildPlannerIconPayload('Fund houses', 'HDFC', {
      format: 'png',
      png: 'abc123',
    });
    assert.equal(body.png, 'abc123');
    assert.equal(body.svg, undefined);
  });

  it('prefers png when format is png even if svg is stale', () => {
    const body = buildPlannerIconPayload('G', 't', {
      format: 'png',
      png: 'pngdata',
      svg: 'old',
    });
    assert.equal(body.png, 'pngdata');
    assert.equal(body.svg, undefined);
  });
});

describe('iconPreviewDataUrl', () => {
  it('builds a PNG data URL', () => {
    assert.equal(
      iconPreviewDataUrl({ format: 'png', png: 'Zm9v' }),
      'data:image/png;base64,Zm9v',
    );
  });

  it('builds an SVG data URL', () => {
    const url = iconPreviewDataUrl({ format: 'svg', svg: '<svg></svg>' });
    assert.ok(url?.startsWith('data:image/svg+xml;charset=utf-8,'));
  });
});

describe('wrong file message matches inventory', () => {
  it('uses the ticket copy', () => {
    assert.equal(WRONG_ICON_FILE_MESSAGE, 'Choose an SVG or PNG file.');
  });
});