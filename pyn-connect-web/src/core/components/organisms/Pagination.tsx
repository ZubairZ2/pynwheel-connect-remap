'use client';

import type { PagerDescriptor } from '~/core/utils/generator/pagination.generator';

interface Props {
  pager: PagerDescriptor;
  label: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Pager for the listing tables. Renders descriptors from
 * `generatePager` — it holds no state and does not know which listing it is in.
 */
export const Pagination = ({ pager, label, disabled, onPageChange }: Props) => {
  if (pager.totalCount === 0) return null;

  return (
    <div className="bo-pager">
      <span className="bo-pager__summary">
        {pager.rangeStart}–{pager.rangeEnd} of {pager.totalCount.toLocaleString()}
      </span>

      {pager.visible && (
        <nav className="bo-pager__nav" aria-label={label}>
          <button
            type="button"
            className="bo-pager__step"
            disabled={disabled || pager.previousPage == null}
            aria-label="Previous page"
            onClick={() => pager.previousPage && onPageChange(pager.previousPage)}
          >
            Prev
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
                aria-label={`Page ${item.page}`}
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
            aria-label="Next page"
            onClick={() => pager.nextPage && onPageChange(pager.nextPage)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
};
