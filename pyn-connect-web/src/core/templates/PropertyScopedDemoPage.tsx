import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { PropertyPageFrame } from '~/core/components/connect/PropertyPageFrame';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { loadPropertyCrumb } from '~/core/repository/remote/propertyCrumb.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { i18n } from '~/resources/i18n';

interface Props {
  propId: string;
  /** The top bar title and the breadcrumb's last item. */
  title: string;
  /** What a real property sees above the demo screen. */
  realNote: string;
  children: ReactNode;
}

/**
 * A property page whose screen still runs on the demo data set (Integrations,
 * Pricing Calculator, Favorites, Resident Access, Live Chat). A demo slug
 * selects that demo property for the screen; a real community gets its real
 * name in the breadcrumb, the screen's own demo property picker, and a note
 * saying the data below is not this property's yet.
 */
export const PropertyScopedDemoPage = async ({ propId, title, realNote, children }: Props) => {
  const crumb = await loadPropertyCrumb(await readRailsCookie(), propId);
  if (crumb.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  const name = crumb.status === 'found' ? crumb.name : null;
  const demo = crumb.status === 'found' && crumb.demo;

  return (
    <ConnectScreenTemplate title={title} demo>
      <PropertyPageFrame
        propId={propId}
        propName={name}
        current={title}
        note={name && !demo ? realNote : null}
        error={crumb.status === 'failed' ? i18n.t(CORE_STRINGS.propertyDetail.loadFailed) : null}
      >
        {demo ? <PropertyScope propId={propId}>{children}</PropertyScope> : children}
      </PropertyPageFrame>
    </ConnectScreenTemplate>
  );
};
