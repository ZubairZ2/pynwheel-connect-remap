'use client';

import { useEffect, useMemo, useState } from 'react';

import { generatePager, type PagerDescriptor } from '~/core/utils/generator/pagination.generator';

/**
 * Pages a list the browser already holds, with the listings' pager. The page
 * resets to the first whenever the list itself changes (a new filter), and is
 * clamped when the list shrinks under it.
 */
export const useClientPages = <T,>(items: T[], pageSize: number) => {
  const [page, setPage] = useState(1);

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

  return { pageItems, pager, setPage };
};
