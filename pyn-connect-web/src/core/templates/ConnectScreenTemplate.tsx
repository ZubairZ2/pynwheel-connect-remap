'use client';

import type { ReactNode } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { Navbar } from '~/core/components/organisms/Navbar';
import { i18n } from '~/resources/i18n';

interface Props {
  title: string;
  /**
   * True while the screen runs on demo seed data rather than the CMS: the
   * title carries the placeholder asterisk and a legend explains it. Drop the
   * flag (and the screen's `<DemoMark />`s) once it reads real data.
   */
  demo?: boolean;
  children: ReactNode;
}

/**
 * Page skeleton for every screen ported from the design: the shared topbar plus
 * a scrollable content area. The Rails-backed listings use
 * `ListingScreenTemplate`, which is the same shell.
 */
export const ConnectScreenTemplate = ({ title, demo = false, children }: Props) => (
  <>
    <Navbar title={title} demo={demo} />
    <main className="bo-content">
      {demo && <p className="bo-demo-legend">{i18n.t(CORE_STRINGS.shared.placeholderLegend)}</p>}
      {children}
    </main>
  </>
);
