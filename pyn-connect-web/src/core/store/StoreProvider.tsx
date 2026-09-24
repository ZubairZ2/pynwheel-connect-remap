'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';

import { makeStore, type AppStore } from './store';

/**
 * Creates the store once per browser session and hands it to the tree.
 *
 * App Router renders server-side too, so the store must never be a module
 * singleton — otherwise demo edits from one request would leak into the next.
 */
export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();

  return <Provider store={storeRef.current}>{children}</Provider>;
};
