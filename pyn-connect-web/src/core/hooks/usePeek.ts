'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hover state for a popover that opens on hover and holds interactive
 * controls: `key` follows the hovered thing at once, and when the hover ends
 * it waits a moment before clearing — never while the pointer is over the
 * popover itself — so the pointer can travel from the hovered marker into
 * the popover and click there. `reset` drops it at once (a floor change, a
 * click that pins the popover open).
 */
export const usePeek = (hovered: string | null, grace = 180) => {
  const [key, setKey] = useState<string | null>(hovered);
  const overPopover = useRef(false);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    if (hovered) {
      setKey(hovered);
      return undefined;
    }
    if (overPopover.current) return undefined;
    timer.current = window.setTimeout(() => {
      if (!overPopover.current) setKey(null);
    }, grace);
    return clearTimer;
  }, [clearTimer, grace, hovered]);

  const onEnter = useCallback(() => {
    overPopover.current = true;
    clearTimer();
  }, [clearTimer]);

  const onLeave = useCallback(() => {
    overPopover.current = false;
    setKey(null);
  }, []);

  const reset = useCallback(() => {
    overPopover.current = false;
    clearTimer();
    setKey(null);
  }, [clearTimer]);

  return { key, onEnter, onLeave, reset };
};
