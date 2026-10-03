'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, ResetIcon } from '~/core/components/atoms/Icons';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { Modal } from '~/core/components/molecules/Modal';
import { SafeImage } from '~/core/components/atoms/SafeImage';
import { useImageStatus } from '~/core/hooks/useImageStatus';

export interface ViewerImage {
  /** Caption: what the image is ("Floor SVG", "Interior 2 — Kitchen"). */
  name: string;
  src: string;
}

interface Props {
  /** The set being viewed; the viewer is closed when this is empty. */
  images: ViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  labels: {
    close: string;
    previous: string;
    next: string;
    /** "{position} of {total}" is built by the caller's generator. */
    position: (current: number, total: number) => string;
    /** Under the animation while the file is fetched. */
    loading: string;
    /** Only when the file's request really failed. */
    unavailable: string;
  };
}

/*
 * The viewport, as Map & Plotting's canvas has it: `scale` is relative to the
 * fitted image (1 = the whole image in view, at its own aspect ratio), `x` /
 * `y` move its centre in stage pixels. Buttons step ×1.3 about the stage
 * centre, the wheel zooms about the pointer, dragging pans a zoomed image,
 * Reset returns to the fitted image. The image is only ever scaled uniformly,
 * so it is never distorted.
 */
interface View {
  scale: number;
  x: number;
  y: number;
}

const DEFAULT_VIEW: View = { scale: 1, x: 0, y: 0 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const BUTTON_ZOOM_STEP = 1.3;
const WHEEL_ZOOM_SPEED = 0.0015;
const PAN_THRESHOLD = 3;
const V = CORE_STRINGS.inventory.viewer;

const clampZoom = (scale: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));

/**
 * The design's image preview (`imgPreviewOpen`) and gallery (`galleryOpen`) in
 * one lightbox: the real file, as large as the screen allows, with arrows and
 * thumbnails when there is more than one, and the map's Zoom In / Zoom Out /
 * Reset to look closer. It only ever reads the images.
 */
export const ImageViewer = ({ images, index, onIndexChange, onClose, labels }: Props) => {
  const open = images.length > 0;
  const current = images[Math.min(Math.max(index, 0), Math.max(images.length - 1, 0))];
  const many = images.length > 1;
  const { ref, status, onLoad, onError } = useImageStatus(current?.src ?? null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    if (!open || !many) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, many, index, images.length, onIndexChange]);

  // Another image opens fitted.
  useEffect(() => {
    setView(DEFAULT_VIEW);
  }, [current?.src]);

  /** Keeps the image over the stage: at the fitted scale it sits centred, zoomed it may not leave the stage empty. */
  const bound = useCallback((next: View): View => {
    const stage = stageRef.current;
    if (!stage || next.scale <= 1) return { scale: next.scale, x: 0, y: 0 };
    const maxX = (stage.clientWidth * (next.scale - 1)) / 2;
    const maxY = (stage.clientHeight * (next.scale - 1)) / 2;
    return { scale: next.scale, x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }, []);

  /** Zooms by a factor about a stage point (the pointer), or about the stage centre (the buttons). */
  const zoomAt = useCallback(
    (factor: number, point: { x: number; y: number } | null) => {
      setView((currentView) => {
        const stage = stageRef.current;
        const scale = clampZoom(currentView.scale * factor);
        if (scale === currentView.scale || !stage) return currentView;
        const centre = { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
        const at = point ?? centre;
        const imageCentre = { x: centre.x + currentView.x, y: centre.y + currentView.y };
        // The image point under the pointer stays under it.
        const local = { x: (at.x - imageCentre.x) / currentView.scale, y: (at.y - imageCentre.y) / currentView.scale };
        const next = { x: at.x - local.x * scale, y: at.y - local.y * scale };
        return bound({ scale, x: next.x - centre.x, y: next.y - centre.y });
      });
    },
    [bound]
  );

  const resetView = useCallback(() => setView(DEFAULT_VIEW), []);

  // The wheel zooms about the pointer; a native listener so the dialog behind does not scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !open) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [open, zoomAt, current?.src]);

  // Dragging a zoomed image pans it.
  const pan = useRef<{ pointerId: number; startX: number; startY: number; origin: View; moved: boolean } | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (view.scale <= 1 || event.button !== 0 || (event.target as Element).closest('button')) return;
    pan.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: view, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = pan.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved) {
      if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
      active.moved = true;
      setPanning(true);
    }
    setView(bound({ ...active.origin, x: active.origin.x + dx, y: active.origin.y + dy }));
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pan.current?.pointerId !== event.pointerId) return;
    pan.current = null;
    setPanning(false);
  };

  if (!open || !current) return null;

  const isDefaultView = view.scale === 1 && view.x === 0 && view.y === 0;

  return (
    <Modal
      open
      title={current.name}
      subtitle={many ? labels.position(index + 1, images.length) : undefined}
      width={880}
      onClose={onClose}
      closeLabel={labels.close}
      dismissOnBackdrop
      className="bo-viewer"
    >
      <div
        ref={stageRef}
        className={`bo-viewer__stage${view.scale > 1 ? ' bo-viewer__stage--zoomed' : ''}${panning ? ' bo-viewer__stage--panning' : ''}`}
        aria-busy={status === 'loading'}
        data-scale={view.scale.toFixed(3)}
        data-testid="viewer-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {many && (
          <button
            type="button"
            className="bo-viewer__step bo-viewer__step--prev"
            aria-label={labels.previous}
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
          >
            <ChevronLeftIcon />
          </button>
        )}

        {status === 'failed' ? (
          <p className="bo-viewer__missing" role="status">
            {labels.unavailable}
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a plain <img>: these are the CMS's own S3 files, on hosts next/image is not configured for.
          <img
            key={current.src}
            ref={ref}
            className={`bo-viewer__image${status === 'loading' ? ' bo-viewer__image--loading' : ''}`}
            src={current.src}
            alt={current.name}
            draggable={false}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            onLoad={onLoad}
            onError={onError}
          />
        )}
        {status === 'loading' && <LoadingIndicator variant="cover" label={labels.loading} />}

        {many && (
          <button
            type="button"
            className="bo-viewer__step bo-viewer__step--next"
            aria-label={labels.next}
            onClick={() => onIndexChange((index + 1) % images.length)}
          >
            <ChevronRightIcon />
          </button>
        )}

        {status === 'ready' && (
          <div className="bo-viewer__zoom" role="group" aria-label={i18n.t(V.zoom)}>
            <button type="button" className="bo-viewer__zoombtn" aria-label={i18n.t(V.zoomIn)} title={i18n.t(V.zoomIn)} disabled={view.scale >= MAX_ZOOM} onClick={() => zoomAt(BUTTON_ZOOM_STEP, null)}>
              <PlusIcon />
            </button>
            <button type="button" className="bo-viewer__zoombtn" aria-label={i18n.t(V.zoomOut)} title={i18n.t(V.zoomOut)} disabled={view.scale <= MIN_ZOOM} onClick={() => zoomAt(1 / BUTTON_ZOOM_STEP, null)}>
              <MinusIcon />
            </button>
            <button type="button" className="bo-viewer__zoombtn" aria-label={i18n.t(V.resetView)} title={i18n.t(V.resetView)} disabled={isDefaultView} onClick={resetView}>
              <ResetIcon />
            </button>
          </div>
        )}
      </div>

      {many && (
        <div className="bo-viewer__thumbs">
          {images.map((image, position) => (
            <button
              key={`${image.src}-${position}`}
              type="button"
              className={`bo-viewer__thumb${position === index ? ' bo-viewer__thumb--active' : ''}`}
              aria-label={image.name}
              aria-current={position === index ? 'true' : undefined}
              onClick={() => onIndexChange(position)}
            >
              <SafeImage src={image.src} alt="" fallback={labels.unavailable} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
