import { describe, expect, it } from 'vitest';
import { frameOf, looksLikeSvg, parseSvgViewBox, plainS3Url, svgPlacement } from './mapBase';

const AI = '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generator: Adobe Illustrator -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [ <!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/"> ]>\n<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 1412.16 912.24" style="enable-background:new 0 0 1412.16 912.24;" xml:space="preserve"><g/></svg>';

describe('mapBase', () => {
  it('reads the viewBox of a real Illustrator export, or the implied one', () => {
    expect(parseSvgViewBox(AI)).toEqual({ x: 0, y: 0, w: 1412.16, h: 912.24 });
    expect(parseSvgViewBox('<svg width="800" height="600"></svg>')).toEqual({ x: 0, y: 0, w: 800, h: 600 });
    expect(parseSvgViewBox('<svg></svg>')).toBeNull();
    expect(looksLikeSvg(AI)).toBe(true);
    expect(looksLikeSvg('<html><body>Not found</body></html>')).toBe(false);
    expect(looksLikeSvg('\u0089PNG')).toBe(false);
  });

  it('frames a level by its image, else its viewBox, else the measured image', () => {
    expect(frameOf({ width: 1251, height: 626 }, { x: 0, y: 0, w: 1412, h: 912 }, null)).toEqual({ width: 1251, height: 626, source: 'image' });
    expect(frameOf({ width: 0, height: 0 }, { x: 0, y: 0, w: 2000, h: 2000 }, null)).toEqual({ width: 2000, height: 2000, source: 'viewBox' });
    expect(frameOf({ width: 0, height: 0 }, null, { width: 1412, height: 932 })).toEqual({ width: 1412, height: 932, source: 'natural-image' });
    expect(frameOf({ width: 0, height: 0 }, null, null).source).toBe('none');
  });

  it('places the SVG the way the CMS canvas does: stretched into the frame, unless a calibration is stored', () => {
    const frame = { width: 1251, height: 626, source: 'image' as const };
    const vb = { x: 0, y: 0, w: 1412, h: 912 };
    expect(svgPlacement(frame, vb, null)).toEqual({ x: 0, y: 0, width: 1251, height: 626, transform: null, preserveAspectRatio: 'none' });
    const calibrated = svgPlacement(frame, vb, { a: 0.9, b: 0, c: 0, d: 0.7, e: 10, f: -5 });
    expect(calibrated).toEqual({ x: 0, y: 0, width: 1412, height: 912, transform: 'matrix(0.9 0 0 0.7 10 -5)', preserveAspectRatio: 'none' });
    // An SVG-only plate: the viewBox is the frame, drawn 1:1.
    expect(svgPlacement({ width: 2000, height: 2000, source: 'viewBox' }, { x: 0, y: 0, w: 2000, h: 2000 }, null)).toEqual({ x: 0, y: 0, width: 2000, height: 2000, transform: null, preserveAspectRatio: 'none' });
  });

  it('knows the plain twin of an accelerated S3 URL', () => {
    expect(plainS3Url('https://images-pynwheel-cms-v2.s3-accelerate.amazonaws.com/uploads/x.png')).toBe('https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/x.png');
    expect(plainS3Url('https://example.com/x.png')).toBeNull();
  });
});
