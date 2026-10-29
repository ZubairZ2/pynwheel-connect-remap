import { describe, expect, it } from 'vitest';
import { dataUrlBytes, fitWithin, isImageDataUrl, MAX_EDGE } from './idCapture';

describe('the ID pictures', () => {
  it('scales a frame to the long edge CheckpointID needs and never upscales', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_EDGE, height: 1200 });
    expect(fitWithin(1080, 1920)).toEqual({ width: 900, height: MAX_EDGE });
    expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 });
    expect(fitWithin(0, 0)).toEqual({ width: 1, height: 1 });
  });
  it('recognises the data URLs the server accepts and sizes them', () => {
    expect(isImageDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(isImageDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isImageDataUrl('data:text/plain;base64,aGk=')).toBe(false);
    expect(isImageDataUrl('/9j/4AAQ')).toBe(false);
    expect(dataUrlBytes('data:image/jpeg;base64,aGVsbG8=')).toBe(5);
  });
});
