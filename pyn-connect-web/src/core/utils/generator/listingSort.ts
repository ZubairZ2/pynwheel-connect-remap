import { CORE_STRINGS } from '~/config/app/strings';
import { t } from './inventory/inventoryText';

/**
 * Column sorting for the server-paged listings (Companies, Properties). The
 * CMS sorts the whole list (`sort` / `dir` on the listing request, whitelisted
 * by `ListingSort` in Rails), so the order holds across pages and searches;
 * this module only decides the header's state and the next one. Pure.
 */
export type SortDirection = 'asc' | 'desc';

export interface ListingSort {
  /** The CMS's name for the column (`name`, `pms_provider`, `data_provider`…). */
  key: string;
  dir: SortDirection;
}

/** The sort a URL asks for, when it names an offered column and a direction; otherwise the default order. */
export const parseListingSort = (
  sort: string | undefined,
  dir: string | undefined,
  keys: readonly string[]
): ListingSort | null =>
  sort && keys.includes(sort) && (dir === 'asc' || dir === 'desc') ? { key: sort, dir } : null;

/**
 * A click on a sortable header: a new column starts ascending; the active one
 * goes ascending → descending → back to the default order.
 */
export const nextListingSort = (current: ListingSort | null, key: string): ListingSort | null => {
  if (!current || current.key !== key) return { key, dir: 'asc' };
  return current.dir === 'asc' ? { key, dir: 'desc' } : null;
};

/** The URL parameters for a sort; nulls drop them (the default order). */
export const listingSortParams = (sort: ListingSort | null): { sort: string | null; dir: SortDirection | null } => ({
  sort: sort?.key ?? null,
  dir: sort?.dir ?? null
});

/** The state a sortable header shows. */
export const sortStateOf = (sort: ListingSort | null, key: string): SortDirection | 'none' =>
  sort?.key === key ? sort.dir : 'none';

/** `aria-sort` for a sortable header. */
export const ariaSortOf = (state: SortDirection | 'none'): 'ascending' | 'descending' | 'none' =>
  state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : 'none';

/** "Sort by Company": a sortable header's tooltip. */
export const sortByLabel = (column: string): string => t(CORE_STRINGS.shared.sortBy, { column });
