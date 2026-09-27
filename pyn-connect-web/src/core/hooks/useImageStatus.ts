'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ImageStatus = 'loading' | 'ready' | 'failed';

/**
 * Whether an `<img>` is still loading, has loaded, or failed — for the loading
 * indicator and the "could not be loaded" text of every image the screens
 * show. `status` is per `src`: a new source starts as loading again.
 *
 * An image that finished before React attached its handlers (already cached,
 * or loaded before hydration) never fires `onLoad`, so the element is also
 * inspected once it is mounted: `complete` with a natural width means loaded,
 * `complete` without one means the request failed.
 *
 * Give the `<img>` `key={src}` so a changed source mounts a fresh element,
 * whose `complete` flag speaks for the new request rather than the old one.
 */
export const useImageStatus = (src: string | null) => {
  const ref = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<{ src: string | null; status: ImageStatus }>({ src, status: 'loading' });
  const status: ImageStatus = state.src === src ? state.status : 'loading';

  useEffect(() => {
    const element = ref.current;
    if (!element || !src || !element.complete) return;
    setState({ src, status: element.naturalWidth > 0 ? 'ready' : 'failed' });
  }, [src]);

  const onLoad = useCallback(() => setState({ src, status: 'ready' }), [src]);
  const onError = useCallback(() => setState({ src, status: 'failed' }), [src]);

  return { ref, status, onLoad, onError };
};
