'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PAGE_SIZE_OPTIONS, type PagerDescriptor } from '~/core/utils/generator/pagination.generator';

interface Props {
  pager: PagerDescriptor;
  label: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  /** The rows-per-page the list is paged by; with `onPageSizeChange`, the pager offers the standard sizes. */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

const P = CORE_STRINGS.pager;

const fill = (key: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), i18n.t(key));

/**
 * Pager for the listing tables and the inventory tabs. Renders descriptors
 * from `generatePager` — it holds no state and does not know which listing it
 * is in. The rows-per-page select (25 · 50 · 75 · 100) shows whenever the
 * caller can act on it; a change is the caller's to apply (a new request, or
 * a new slice), back on the first page.
 */
export const Pagination = ({ pager, label, disabled, onPageChange, pageSize, onPageSizeChange }: Props) => {
  if (pager.totalCount === 0) return null;
  const sizes = onPageSizeChange ? PAGE_SIZE_OPTIONS.filter((size, index) => index === 0 || pager.totalCount > PAGE_SIZE_OPTIONS[index - 1]) : [];
  // The current size is always offered, even when the list is shorter than it.
  const options = pageSize && !sizes.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? [...sizes, pageSize].sort((a, b) => a - b) : sizes;

  return (
    <div className="bo-pager">
      <div className="bo-pager__left">
        {onPageSizeChange && options.length > 1 && (
          <label className="bo-pager__size">
            <span className="bo-pager__sizelabel">{i18n.t(P.rowsPerPage)}</span>
            <select
              className="bo-pager__sizeselect"
              value={pageSize}
              disabled={disabled}
              aria-label={i18n.t(P.rowsPerPage)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {options.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="bo-pager__summary">
          {fill(P.summary, { start: pager.rangeStart, end: pager.rangeEnd, total: pager.totalCount.toLocaleString('en-US') })}
        </span>
      </div>

      {pager.visible && (
        <nav className="bo-pager__nav" aria-label={label}>
          <button
            type="button"
            className="bo-pager__step"
            disabled={disabled || pager.previousPage == null}
            aria-label={i18n.t(P.previousPage)}
            onClick={() => pager.previousPage && onPageChange(pager.previousPage)}
          >
            {i18n.t(P.previous)}
          </button>

          {pager.items.map((item) =>
            item.type === 'gap' ? (
              <span key={item.key} className="bo-pager__gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item.page}
                type="button"
                className={`bo-pager__page ${item.active ? 'bo-pager__page--active' : ''}`}
                aria-current={item.active ? 'page' : undefined}
                aria-label={fill(P.page, { page: item.page })}
                disabled={disabled}
                onClick={() => onPageChange(item.page)}
              >
                {item.page}
              </button>
            )
          )}

          <button
            type="button"
            className="bo-pager__step"
            disabled={disabled || pager.nextPage == null}
            aria-label={i18n.t(P.nextPage)}
            onClick={() => pager.nextPage && onPageChange(pager.nextPage)}
          >
            {i18n.t(P.next)}
          </button>
        </nav>
      )}
    </div>
  );
};
