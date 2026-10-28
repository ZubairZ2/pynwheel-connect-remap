/**
 * The pictures of the ID check (October 28, 2026): the phone's camera through
 * the web view (`getUserMedia`, the back camera for the document and the
 * front one for the selfie), a photo picker as the fallback where the camera
 * is refused or absent, and the frame scaled to what CheckpointID needs. A
 * picture lives in memory until it is sent to the server, and nowhere else.
 */

export type CameraFacing = 'environment' | 'user';

/** The long edge the document and selfie pictures are scaled to; enough for the machine-readable zone, small enough to send. */
export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;

/** The size a `width × height` picture gets when its long edge is capped at `maxEdge` (never upscaled). */
export const fitWithin = (width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } => {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
};

/** A JPEG or PNG data URL, as the server accepts it. */
export const isImageDataUrl = (value: unknown): value is string => typeof value === 'string' && /^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/]+=*$/.test(value);

/** Roughly how many bytes a base64 data URL carries. */
export const dataUrlBytes = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
};

export const cameraSupported = (): boolean => typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

/** Opens the camera; the caller attaches the stream to a <video> and stops it with `stopStream`. */
export const openCamera = async (facing: CameraFacing): Promise<MediaStream> => {
  if (!cameraSupported()) throw new Error('camera_unsupported');
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing === 'user' ? 'user' : { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
};

export const stopStream = (stream: MediaStream | null | undefined): void => {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      /* already stopped */
    }
  });
};

/** The current frame of a playing <video>, scaled to fit and encoded as a JPEG data URL; a selfie from the front camera is un-mirrored. */
export const captureFrame = (video: HTMLVideoElement, options: { mirror?: boolean } = {}): string => {
  const source = fitWithin(video.videoWidth || video.clientWidth, video.videoHeight || video.clientHeight);
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  if (options.mirror) {
    ctx.translate(source.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, source.width, source.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
};

/** A picked photo file, decoded, scaled to fit and re-encoded as a JPEG data URL (the picker's own EXIF rotation is applied by the browser). */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const size = fitWithin(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_unavailable');
        ctx.drawImage(image, 0, 0, size.width, size.height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('decode_failed'));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode_failed'));
    };
    image.src = url;
  });
