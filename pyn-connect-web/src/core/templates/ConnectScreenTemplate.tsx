'use client';

import type { ReactNode } from 'react';

import { Navbar } from '~/core/components/organisms/Navbar';

interface Props {
  title: string;
  children: ReactNode;
}

/**
 * Page skeleton for every screen ported from the design: the shared topbar plus
 * a scrollable content area. The Rails-backed listings keep using
 * `ListingScreenTemplate`, which adds a record count to the same header.
 */
export const ConnectScreenTemplate = ({ title, children }: Props) => (
  <>
    <Navbar title={title} />
    <main className="bo-content">{children}</main>
  </>
);
