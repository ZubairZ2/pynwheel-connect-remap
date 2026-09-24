import type { ReactNode } from 'react';

import { CustomTable } from '~/core/components/organisms/CustomTable';
import type {
  ColumnDescriptor,
  ListingSummary,
  RowDescriptor
} from '~/core/utils/generator/listing.types';

interface Props {
  toolbar: ReactNode;
  columns: ColumnDescriptor[];
  rows: RowDescriptor[];
  emptyLabel: string;
  caption: string;
  summary?: ListingSummary | null;
  error?: string | null;
  footer?: ReactNode;
  busy?: boolean;
}

/** Summary + toolbar + table + pager — the listing body contract. */
export const ResourceListingTemplate = ({
  toolbar,
  columns,
  rows,
  emptyLabel,
  caption,
  summary,
  error,
  footer,
  busy
}: Props) => (
  <div className="bo-listing">
    {summary && (
      <div className="bo-listing__header">
        <h2 className="bo-listing__total">{summary.title}</h2>
        <span className="bo-listing__summary">{summary.subtitle}</span>
      </div>
    )}
    {error && <div className="bo-error" role="alert">{error}</div>}
    <div className="bo-toolbar">{toolbar}</div>
    <div className={`bo-panel ${busy ? 'bo-panel--busy' : ''}`} aria-busy={busy || undefined}>
      {/* Wide tables scroll sideways on narrow screens instead of squashing. */}
      <div className="bo-panel__scroll">
        <CustomTable columns={columns} rows={rows} emptyLabel={emptyLabel} caption={caption} />
      </div>
      {footer}
    </div>
  </div>
);
