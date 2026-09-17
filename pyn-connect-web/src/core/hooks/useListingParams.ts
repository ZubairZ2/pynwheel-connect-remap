'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * Listing state lives in the URL, because the data lives on the server: a page
 * or filter change is a navigation, which re-runs the server component and
 * fetches exactly one page. It also means a refresh or a shared link restores
 * the same view.
 *
 * `isPending` is the loading state for that navigation.
 */
export const useListingParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: Record<string, string | number | null>, options: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const asString = value == null ? '' : String(value).trim();

        // `all` is the filter selects' "no filter" option, and page 1 is the
        // default — neither belongs in the URL.
        if (asString === '' || asString === 'all' || (key === 'page' && asString === '1')) {
          next.delete(key);
        } else {
          next.set(key, asString);
        }
      });

      // Any change other than paging invalidates the current page number:
      // page 7 of a filtered list is rarely page 7 of the next one.
      if (!options.keepPage) next.delete('page');

      const query = next.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams]
  );

  return { setParams, isPending };
};
