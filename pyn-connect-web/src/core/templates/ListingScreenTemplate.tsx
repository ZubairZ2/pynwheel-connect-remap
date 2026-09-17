import type { ReactNode } from 'react';

import { Navbar } from '~/core/components/organisms/Navbar';

interface Props {
  headerTitle: string;
  recordCount?: number;
  children: ReactNode;
}

/** Page skeleton shared by every listing: header + scrollable content. */
export const ListingScreenTemplate = ({ headerTitle, recordCount, children }: Props) => (
  <>
    <Navbar title={headerTitle} recordCount={recordCount} />
    <main className="bo-content">{children}</main>
  </>
);
