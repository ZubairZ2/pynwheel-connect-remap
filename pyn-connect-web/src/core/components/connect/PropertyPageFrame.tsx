import Link from 'next/link';
import type { ReactNode } from 'react';

import { propRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { APP_ROUTES } from '~/config/app/urls';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { i18n } from '~/resources/i18n';

interface Props {
  propId: string;
  /** The property's name; null when it could not be loaded. */
  propName: string | null;
  /** The page's own name, the breadcrumb's last item. */
  current: string;
  /** A one-line notice above the page (the demo-data note on a real property). */
  note?: string | null;
  error?: string | null;
  children: ReactNode;
}

/**
 * The frame of a property-scoped page from the Back Office design
 * (Properties / {property} / {page}): the breadcrumb, an optional notice and
 * the page itself. Integrations, Pricing Calculator, Favorites, Resident
 * Access and Live Chat use it over their existing screens.
 */
export const PropertyPageFrame = ({ propId, propName, current, note, error, children }: Props) => {
  const S = CORE_STRINGS.propertyDetail;

  if (!propName) {
    return (
      <div className="bo-detail">
        <Breadcrumb items={[{ label: i18n.t(S.breadcrumb), href: APP_ROUTES.properties }, { label: current }]} />
        {error ? (
          <div className="bo-error" role="alert">
            {error}
          </div>
        ) : (
          <div className="bo-section bo-section--empty" role="status">
            <h2 className="bo-section__title">{i18n.t(S.notFound.title)}</h2>
            <p className="bo-section__subtitle">{i18n.t(S.notFound.body)}</p>
            <Link href={APP_ROUTES.properties} className="bo-linkbutton">
              {i18n.t(S.notFound.back)}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bo-detail">
      <Breadcrumb items={[{ label: i18n.t(S.breadcrumb), href: APP_ROUTES.properties }, { label: propName, href: propRoute(propId) }, { label: current }]} />
      {note && (
        <p className="bo-map__readonly" role="note">
          {note}
        </p>
      )}
      <div>{children}</div>
    </div>
  );
};
