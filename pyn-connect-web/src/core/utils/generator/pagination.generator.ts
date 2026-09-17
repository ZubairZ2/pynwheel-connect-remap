import type { Pagination } from '~/core/models/data/session.data';

export type PagerItem =
  | { type: 'page'; page: number; active: boolean }
  | { type: 'gap'; key: string };

export interface PagerDescriptor {
  items: PagerItem[];
  previousPage: number | null;
  nextPage: number | null;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  totalPages: number;
  visible: boolean;
}

/** How many numbers sit either side of the current page before it gaps out. */
const WINDOW = 1;

/**
 * Pure transform of pagination metadata into the descriptors the pager renders
 * — the generator contract from react-architecture.md §8: no state, no fetching.
 */
export const generatePager = (pagination: Pagination | null): PagerDescriptor => {
  if (!pagination) {
    return {
      items: [],
      previousPage: null,
      nextPage: null,
      rangeStart: 0,
      rangeEnd: 0,
      totalCount: 0,
      totalPages: 0,
      visible: false
    };
  }

  const { page, perPage, totalCount, totalPages } = pagination;
  const current = Math.min(Math.max(page, 1), Math.max(totalPages, 1));

  const pages = pageNumbers(current, totalPages);
  const items: PagerItem[] = [];

  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous != null && value - previous > 1) {
      items.push({ type: 'gap', key: `gap-${previous}-${value}` });
    }
    items.push({ type: 'page', page: value, active: value === current });
  });

  return {
    items,
    previousPage: current > 1 ? current - 1 : null,
    nextPage: current < totalPages ? current + 1 : null,
    rangeStart: totalCount === 0 ? 0 : (current - 1) * perPage + 1,
    rangeEnd: Math.min(current * perPage, totalCount),
    totalCount,
    totalPages,
    // One page of results needs no pager, but the range summary still helps.
    visible: totalPages > 1
  };
};

/** First, last, and a window around the current page. */
const pageNumbers = (current: number, totalPages: number): number[] => {
  if (totalPages <= 0) return [];

  const wanted = new Set<number>([1, totalPages, current]);

  for (let offset = 1; offset <= WINDOW; offset += 1) {
    if (current - offset >= 1) wanted.add(current - offset);
    if (current + offset <= totalPages) wanted.add(current + offset);
  }

  return Array.from(wanted).sort((a, b) => a - b);
};
