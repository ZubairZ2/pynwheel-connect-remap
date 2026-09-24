import type { ReactNode } from 'react';

import { Navbar } from '~/core/components/organisms/Navbar';

interface Props {
  headerTitle: string;
  children: ReactNode;
}

/**
 * Page skeleton shared by the Rails-backed listings: header + scrollable
 * content. Their totals sit in the listing's own summary line
 * (`ResourceListingTemplate`), not in the top bar.
 */
export const ListingScreenTemplate = ({ headerTitle, children }: Props) => (
  <>
    <Navbar title={headerTitle} />
    <main className="bo-content">{children}</main>
  </>
);
