'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { propRoute, type SetupProduct } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { APP_ROUTES } from '~/config/app/urls';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { ConfigCardView } from '~/core/components/molecules/ConfigCard';
import { SetupSwitcher } from '~/core/components/molecules/SetupSwitcher';
import { ToolCards } from '~/core/components/molecules/ToolCards';
import type { PropertyDetail } from '~/core/models/data/property.data';
import { generateProductSetup, productSetupTitle } from '~/core/utils/generator/productSetup.generator';
import { i18n } from '~/resources/i18n';

const t = (key: string): string => i18n.t(key);

interface Props {
  property: PropertyDetail | null;
  product: SetupProduct;
  error?: string | null;
}

/**
 * Touch Setup / Map Setup on real data (the design's `prodSetup` screen):
 * breadcrumb, header, the Tour / Touch / Map switcher, the product's tools and
 * its configuration card from communities#edit.json. Read-only.
 */
export const ProductSetupScreen = ({ property, product, error }: Props) =>
  property ? <ProductSetupView property={property} product={product} /> : <ProductSetupUnavailable product={product} error={error ?? null} />;

const ProductSetupView = ({ property, product }: { property: PropertyDetail; product: SetupProduct }) => {
  const view = useMemo(() => generateProductSetup(property, product), [property, product]);
  const propId = String(property.id);

  return (
    <div className="bo-detail bo-prodsetup">
      <Breadcrumb
        items={[
          { label: t(CORE_STRINGS.propertyDetail.breadcrumb), href: APP_ROUTES.properties },
          { label: property.name, href: propRoute(propId) },
          { label: view.title }
        ]}
      />

      <div className="bo-prodsetup__header">
        <span className={`bo-prodsetup__tile${view.active ? '' : ' bo-prodsetup__tile--off'}`} aria-hidden="true">
          <Icon name={view.icon} />
        </span>
        <div className="bo-prodsetup__heading">
          <h2 className="bo-prodsetup__title">{view.title}</h2>
          <p className="bo-prodsetup__sub">{view.subtitle}</p>
        </div>
        <SetupSwitcher options={view.switcher} label={t(CORE_STRINGS.prodSetup.switchLabel)} />
      </div>

      {view.offNote && (
        <div className="bo-offnote" role="status">
          {view.offNote}
        </div>
      )}

      <ToolCards tools={view.tools} label={t(CORE_STRINGS.prodSetup.toolsTitle)} />

      <ConfigCardView card={view.card} className="bo-prodsetup__card" />
    </div>
  );
};

const ProductSetupUnavailable = ({ product, error }: { product: SetupProduct; error: string | null }) => {
  const S = CORE_STRINGS.propertyDetail;
  return (
    <div className="bo-detail">
      <Breadcrumb items={[{ label: t(S.breadcrumb), href: APP_ROUTES.properties }, { label: productSetupTitle(product) }]} />
      {error ? (
        <div className="bo-error" role="alert">
          {error}
        </div>
      ) : (
        <div className="bo-section bo-section--empty" role="status">
          <h2 className="bo-section__title">{t(S.notFound.title)}</h2>
          <p className="bo-section__subtitle">{t(S.notFound.body)}</p>
          <Link href={APP_ROUTES.properties} className="bo-linkbutton">
            {t(S.notFound.back)}
          </Link>
        </div>
      )}
    </div>
  );
};
