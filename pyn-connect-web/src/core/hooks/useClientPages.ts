'use client';

import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_PAGE_SIZE, generatePager, type PagerDescriptor } from '~/core/utils/generator/pagination.generator';

/**
 * Pages a list the browser already holds, with the listings' pager. The page
 * resets to the first whenever the list itself changes (a new filter) or the
 * rows-per-page changes, and is clamped when the list shrinks under it.
 */
export const useClientPages = <T,>(items: T[], initialPageSize: number = DEFAULT_PAGE_SIZE) => {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState(initialPageSize);

  useEffect(() => setPage(1), [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize]
  );

  const pager: PagerDescriptor = useMemo(
    () => generatePager({ page: current, perPage: pageSize, totalCount: items.length, totalPages }),
    [current, pageSize, items.length, totalPages]
  );

  const setPageSize = (size: number) => {
    setSize(size);
    setPage(1);
  };

  return { pageItems, pager, setPage, pageSize, setPageSize };
};
