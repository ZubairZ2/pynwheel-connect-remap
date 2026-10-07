import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';

/**
 * Pan and zoom for the map: one finger drags, two fingers pinch, a mouse
 * wheel zooms (desktop review), double-tap zooms in. The transform is a
 * CSS transform on the plan wrapper (GPU), never a re-render of the SVG.
 * `fit()` frames a box of level pixels inside the viewport.
 */

export interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 6;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useMapViewport = (levelWidth: number, levelHeight: number) => {
  const container = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startDistance: number; startScale: number; centre: { x: number; y: number }; startTx: number; startTy: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const baseScale = useRef(1);

  /** The scale that fits the whole level in the container. */
  const fitScale = useCallback(
    (box: Box, padding = 16) => {
      const el = container.current;
      if (!el) return 1;
      const cw = el.clientWidth - padding * 2;
      const ch = el.clientHeight - padding * 2;
      if (cw <= 0 || ch <= 0 || box.w <= 0 || box.h <= 0) return 1;
      return Math.min(cw / box.w, ch / box.h);
    },
    [container]
  );

  const fit = useCallback(
    (box: Box = { x: 0, y: 0, w: levelWidth, h: levelHeight }, padding = 16, maxZoom = 2.2) => {
      const el = container.current;
      if (!el) return;
      const whole = fitScale({ x: 0, y: 0, w: levelWidth, h: levelHeight }, padding);
      baseScale.current = whole;
      const scale = clamp(Math.min(fitScale(box, padding), whole * maxZoom), whole * 0.9, MAX_SCALE);
      const tx = el.clientWidth / 2 - (box.x + box.w / 2) * scale;
      const ty = el.clientHeight / 2 - (box.y + box.h / 2) * scale;
      setViewport({ scale, tx, ty });
    },
    [fitScale, levelWidth, levelHeight]
  );

  /** Pan so a level point is at the centre, keeping the zoom (used to follow the walker). */
  const centerOn = useCallback((x: number, y: number) => {
    const el = container.current;
    if (!el) return;
    setViewport((v) => ({ ...v, tx: el.clientWidth / 2 - x * v.scale, ty: el.clientHeight / 2 - y * v.scale }));
  }, []);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setViewport((v) => {
      const scale = clamp(v.scale * factor, Math.min(MIN_SCALE, baseScale.current * 0.8), MAX_SCALE);
      const k = scale / v.scale;
      return { scale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    });
  }, []);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = container.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    e.currentTarget.setPointerCapture(e.pointerId);
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = { startDistance: 0, startScale: viewport.scale, centre: p, startTx: viewport.tx, startTy: viewport.ty, moved: false };
    } else if (pts.length === 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      gesture.current = { startDistance: d, startScale: viewport.scale, centre: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }, startTx: viewport.tx, startTy: viewport.ty, moved: true };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length >= 2 && g.startDistance > 0) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const centre = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const scale = clamp((g.startScale * d) / g.startDistance, Math.min(MIN_SCALE, baseScale.current * 0.8), MAX_SCALE);
      const k = scale / g.startScale;
      setViewport({ scale, tx: centre.x - (g.centre.x - g.startTx) * k, ty: centre.y - (g.centre.y - g.startTy) * k });
      g.moved = true;
    } else if (pts.length === 1) {
      const p = pts[0];
      const dx = p.x - g.centre.x;
      const dy = p.y - g.centre.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
      setViewport((v) => ({ ...v, tx: g.startTx + dx, ty: g.startTy + dy }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      const now = Date.now();
      if (g && !g.moved) {
        if (now - lastTap.current < 320) {
          const p = local(e);
          zoomAt(1.8, p.x, p.y);
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }
      }
      gesture.current = null;
    } else if (pointers.current.size === 1) {
      const p = [...pointers.current.values()][0];
      gesture.current = { startDistance: 0, startScale: viewport.scale, centre: p, startTx: viewport.tx, startTy: viewport.ty, moved: true };
    }
  };

  // React registers wheel listeners as passive, so the page scroll is prevented by the native listener below.
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const p = local(e);
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  };

  // A non-passive native listener keeps the wheel from scrolling the page while zooming the map.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const prevent = (event: WheelEvent) => event.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  /** Was the last pointer sequence a tap (so a marker tap is not a drag)? */
  const wasTap = () => !gesture.current?.moved;

  return { container, viewport, fit, centerOn, zoomAt, wasTap, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel } };
};
