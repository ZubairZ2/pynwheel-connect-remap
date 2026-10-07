import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapLevel } from '~/models';
import { useRepository } from '~/repositories/repositoryContext';
import type { TourRepository } from '~/repositories/tourRepository';
import { frameOf, looksLikeSvg, parseSvgViewBox, plainS3Url, type Frame, type ViewBox } from './mapBase';

/**
 * Loads a level's plan (its floor SVG through the API, else its floor image)
 * and tells the map what it has:
 *
 *   loading → ready(svg | image) | error(unavailable | invalid | network | none)
 *
 * The SVG comes as a Blob URL (drawn by an `<image>`, so a 5 MB Illustrator
 * export is rasterised by the browser's image pipeline, not inflated into
 * the DOM) and is kept per level for the session: switching floors and
 * coming back costs nothing. A raster that fails on the accelerated S3 host
 * is retried on the plain one before it is called unavailable.
 */

export type BaseStatus = 'loading' | 'ready' | 'error';
export type BaseErrorKind = 'unavailable' | 'invalid' | 'network' | 'none';

export interface LevelBase {
  status: BaseStatus;
  kind: 'svg' | 'image' | null;
  error: BaseErrorKind | null;
  svgUrl: string | null;
  viewBox: ViewBox | null;
  imageUrl: string | null;
  frame: Frame;
}

interface CachedSvg {
  blobUrl: string;
  viewBox: ViewBox | null;
}

const svgCache = new Map<string, CachedSvg | { error: BaseErrorKind }>();
const inflight = new Map<string, Promise<CachedSvg>>();

export const resetLevelBaseCache = (): void => {
  svgCache.forEach((v) => {
    if ('blobUrl' in v) URL.revokeObjectURL(v.blobUrl);
  });
  svgCache.clear();
  inflight.clear();
};

/**
 * Warms a level's plan ahead of time (the floor SVG into the session cache,
 * the floor image into the browser's image cache) so that when Play Route or
 * a floor pill switches to it, the map shows at once instead of fetching and
 * decoding a multi-megapixel file in the middle of the animation.
 */
export const prefetchLevelPlan = (level: MapLevel, repository: Pick<TourRepository, 'getLevelSvg'>): void => {
  if (level.svgPath && !svgCache.has(level.id) && !inflight.has(level.id)) {
    const promise = repository
      .getLevelSvg(level)
      .then(async (blob) => {
        const head = await blob.slice(0, 65536).text();
        if (!looksLikeSvg(head)) throw Object.assign(new Error('not an SVG document'), { kind: 'invalid' });
        const entry: CachedSvg = { blobUrl: URL.createObjectURL(blob.type.startsWith('image/svg') ? blob : new Blob([blob], { type: 'image/svg+xml' })), viewBox: parseSvgViewBox(head) };
        svgCache.set(level.id, entry);
        return entry;
      })
      .finally(() => inflight.delete(level.id));
    promise.catch(() => undefined);
    inflight.set(level.id, promise);
  }
  if (level.image && !prefetchedImages.has(level.image)) {
    prefetchedImages.add(level.image);
    const img = new Image();
    img.decoding = 'async';
    img.src = level.image;
  }
};

const prefetchedImages = new Set<string>();

/** Prefetches every level a route visits (its stages) other than the one shown. */
export const usePrefetchRouteLevels = (route: { stages: { level: string }[] } | null, levels: MapLevel[], currentLevelId: string | null): void => {
  const repository = useRepository();
  useEffect(() => {
    if (!route) return;
    const wanted = new Set(route.stages.map((s) => s.level));
    wanted.delete(currentLevelId ?? '');
    levels.filter((l) => wanted.has(l.id)).forEach((l) => prefetchLevelPlan(l, repository));
  }, [route, levels, currentLevelId, repository]);
};

export const useLevelBase = (level: MapLevel): LevelBase => {
  const repository = useRepository();
  const [svg, setSvg] = useState<CachedSvg | { error: BaseErrorKind } | 'loading' | null>(null);
  const [image, setImage] = useState<{ url: string | null; status: 'loading' | 'ready' | 'error'; natural: { width: number; height: number } | null }>({ url: level.image, status: level.image ? 'loading' : 'error', natural: null });
  const generation = useRef(0);

  // 1. The floor SVG, when the level has one.
  useEffect(() => {
    generation.current += 1;
    const mine = generation.current;
    if (!level.svgPath) {
      setSvg(null);
      return;
    }
    const cached = svgCache.get(level.id);
    if (cached) {
      setSvg(cached);
      return;
    }
    setSvg('loading');
    let promise = inflight.get(level.id);
    if (!promise) {
      promise = repository
        .getLevelSvg(level)
        .then(async (blob) => {
          const head = await blob.slice(0, 65536).text();
          if (!looksLikeSvg(head)) throw Object.assign(new Error('not an SVG document'), { kind: 'invalid' });
          const entry: CachedSvg = { blobUrl: URL.createObjectURL(blob.type.startsWith('image/svg') ? blob : new Blob([blob], { type: 'image/svg+xml' })), viewBox: parseSvgViewBox(head) };
          svgCache.set(level.id, entry);
          return entry;
        })
        .finally(() => inflight.delete(level.id));
      inflight.set(level.id, promise);
    }
    promise
      .then((entry) => {
        if (generation.current === mine) setSvg(entry);
      })
      .catch((error: unknown) => {
        const kind: BaseErrorKind = (error as { kind?: BaseErrorKind }).kind === 'invalid' || (error as { code?: string }).code === 'invalid_svg' ? 'invalid' : (error as { code?: string }).code === 'network' || (error as { code?: string }).code === 'timeout' ? 'network' : 'unavailable';
        if (kind !== 'network') svgCache.set(level.id, { error: kind });
        if (generation.current === mine) setSvg({ error: kind });
      });
  }, [level.id, level.svgPath, repository, level]);

  // 2. The floor image: measured on load (a level without a stored size takes the image's natural size), retried on the plain S3 host.
  useEffect(() => {
    setImage({ url: level.image, status: level.image ? 'loading' : 'error', natural: null });
    if (!level.image) return;
    let cancelled = false;
    const probe = (url: string, fallback: string | null) => {
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setImage({ url, status: 'ready', natural: { width: img.naturalWidth, height: img.naturalHeight } });
      };
      img.onerror = () => {
        if (cancelled) return;
        if (fallback) probe(fallback, null);
        else setImage({ url: null, status: 'error', natural: null });
      };
      img.src = url;
    };
    probe(level.image, plainS3Url(level.image));
    return () => {
      cancelled = true;
    };
  }, [level.id, level.image]);

  return useMemo<LevelBase>(() => {
    const svgReady = svg && svg !== 'loading' && 'blobUrl' in svg ? svg : null;
    const svgError = svg && svg !== 'loading' && 'error' in svg ? svg.error : null;
    const viewBox = svgReady?.viewBox ?? null;
    const frame = frameOf(level, viewBox, image.natural);
    if (level.svgPath) {
      if (svgReady) return { status: 'ready', kind: 'svg', error: null, svgUrl: svgReady.blobUrl, viewBox, imageUrl: image.status === 'ready' ? image.url : null, frame };
      if (svgError) {
        // The SVG is the level's plan; a stored raster still shows the floor when the SVG cannot.
        if (image.status === 'ready') return { status: 'ready', kind: 'image', error: svgError, svgUrl: null, viewBox: null, imageUrl: image.url, frame };
        if (image.status === 'loading') return { status: 'loading', kind: null, error: null, svgUrl: null, viewBox: null, imageUrl: null, frame };
        return { status: 'error', kind: null, error: svgError, svgUrl: null, viewBox: null, imageUrl: null, frame };
      }
      return { status: 'loading', kind: null, error: null, svgUrl: null, viewBox: null, imageUrl: null, frame };
    }
    if (level.image) {
      if (image.status === 'ready') return { status: 'ready', kind: 'image', error: null, svgUrl: null, viewBox: null, imageUrl: image.url, frame };
      if (image.status === 'loading') return { status: 'loading', kind: null, error: null, svgUrl: null, viewBox: null, imageUrl: null, frame };
      return { status: 'error', kind: null, error: 'unavailable', svgUrl: null, viewBox: null, imageUrl: null, frame };
    }
    // Demo levels carry inline geometry and no file; anything else without a file has no plan at all.
    return { status: level.svg ? 'ready' : 'error', kind: null, error: level.svg ? null : 'none', svgUrl: null, viewBox: null, imageUrl: null, frame };
  }, [level, svg, image]);
};
