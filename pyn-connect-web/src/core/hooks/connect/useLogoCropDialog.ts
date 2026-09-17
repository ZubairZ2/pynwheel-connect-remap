'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useRef } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector, useAppStore } from '~/core/store/hooks';
import type { CropRect } from '~/core/store/demo/demo.state';

type DragMode = 'move' | 'resize';

/** Drag-to-crop for the two property logos. */
export const useLogoCropDialog = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const demo = useAppSelector((s) => s.demo);
  const cropRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ mode: DragMode; start: { x: number; y: number }; rect: CropRect } | null>(null);

  const rel = useCallback((event: { clientX: number; clientY: number }) => {
    const element = cropRef.current;
    if (!element) return { x: 50, y: 50 };
    const rect = element.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }, []);

  const onDown = (mode: DragMode) => (event: ReactPointerEvent<Element>) => {
    event.stopPropagation();
    drag.current = { mode, start: rel(event), rect: { ...store.getState().demo.cropRect } };
    try {
      (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
        event.pointerId
      );
    } catch {
      /* pointer capture is best-effort */
    }
  };

  const onMove = (event: ReactPointerEvent<Element>) => {
    const current = drag.current;
    if (!current) return;
    const point = rel(event);
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

    const next: CropRect =
      current.mode === 'move'
        ? {
            ...current.rect,
            x: clamp(current.rect.x + dx, 0, 100 - current.rect.w),
            y: clamp(current.rect.y + dy, 0, 100 - current.rect.h)
          }
        : {
            ...current.rect,
            w: clamp(current.rect.w + dx, 14, 100 - current.rect.x),
            h: clamp(current.rect.h + dy, 14, 100 - current.rect.y)
          };

    dispatch(demoActions.setCropRect(next));
  };

  const rect = demo.cropRect;

  return {
    cropOpen: demo.cropOpen,
    cropRef,
    cropWhichLabel: demo.cropWhich === 'primary' ? 'Primary Logo' : 'Secondary Logo',
    cropFrame: { left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` },
    cropSizeLabel: `${Math.round(rect.w)}% × ${Math.round(rect.h)}% · origin ${Math.round(rect.x)}%, ${Math.round(rect.y)}%`,
    cropPreview: {
      imgW: `${(100 / rect.w) * 100}%`,
      imgH: `${(100 / rect.h) * 100}%`,
      imgLeft: `${(-rect.x / rect.w) * 100}%`,
      imgTop: `${(-rect.y / rect.h) * 100}%`
    },
    onCropFrameDown: onDown('move'),
    onCropHandleDown: onDown('resize'),
    onCropMove: onMove,
    onCropUp: () => {
      drag.current = null;
    },
    confirmCrop: () => dispatch(demoActions.confirmCrop()),
    closeCrop: () => dispatch(demoActions.closeCrop())
  };
};
