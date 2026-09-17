import type { ReactNode } from 'react';

import { CustomTable } from '~/core/components/organisms/CustomTable';
import type { ColumnDescriptor, RowDescriptor } from '~/core/utils/generator/listing.types';

interface Props {
  toolbar: ReactNode;
  columns: ColumnDescriptor[];
  rows: RowDescriptor[];
  emptyLabel: string;
  caption: string;
  error?: string | null;
  footer?: ReactNode;
  busy?: boolean;
}

/** Toolbar + table + pager — the listing body contract. */
export const ResourceListingTemplate = ({
  toolbar,
  columns,
  rows,
  emptyLabel,
  caption,
  error,
  footer,
  busy
}: Props) => (
  <div className="bo-listing">
    {error && <div className="bo-error" role="alert">{error}</div>}
    <div className="bo-toolbar">{toolbar}</div>
    <div className={`bo-panel ${busy ? 'bo-panel--busy' : ''}`} aria-busy={busy || undefined}>
      <CustomTable columns={columns} rows={rows} emptyLabel={emptyLabel} caption={caption} />
      {footer}
    </div>
  </div>
);
