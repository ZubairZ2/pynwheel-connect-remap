'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps the search box responsive while the list itself is server-paged: the
 * input updates immediately, the navigation waits for a pause in typing.
 */
export const useDebouncedSearch = (initialValue: string, onCommit: (value: string) => void, delay = 350) => {
  const [value, setValue] = useState(initialValue);
  const committed = useRef(initialValue);

  // A change that came from elsewhere (a cleared filter, the back button).
  useEffect(() => {
    committed.current = initialValue;
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (value === committed.current) return undefined;

    const timer = setTimeout(() => {
      committed.current = value;
      onCommit(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, onCommit]);

  return { value, setValue };
};
