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
}

/** Toolbar + table + empty state — the listing body contract. */
export const ResourceListingTemplate = ({
  toolbar,
  columns,
  rows,
  emptyLabel,
  caption,
  error
}: Props) => (
  <div className="bo-listing">
    {error && <div className="bo-error" role="alert">{error}</div>}
    <div className="bo-toolbar">{toolbar}</div>
    <CustomTable columns={columns} rows={rows} emptyLabel={emptyLabel} caption={caption} />
  </div>
);
