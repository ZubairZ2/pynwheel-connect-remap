'use client';

import Link from 'next/link';

import { propRoute, type SetupProduct } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { APP_ROUTES } from '~/config/app/urls';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { DemoMark } from '~/core/components/atoms/DemoMark';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { SetupSwitcher } from '~/core/components/molecules/SetupSwitcher';
import { ToolCards } from '~/core/components/molecules/ToolCards';
import { curProp } from '~/core/store/demo/demo.selectors';
import { useAppSelector } from '~/core/store/hooks';
import { productEnabled } from '~/core/utils/generator/connect/productCards.generator';
import { generateSetupSwitcher, generateSetupTools, productSetupTitle } from '~/core/utils/generator/productSetup.generator';
import { i18n } from '~/resources/i18n';

const t = (key: string): string => i18n.t(key);

/**
 * Touch Setup / Map Setup for a demo property (slug ids). The product's
 * settings for the demo data set live on its Property Detail screen, so this
 * page is the design's frame — switcher and tools — with a note and a link.
 */
export const ProductSetupScreen = ({ product }: { product: SetupProduct }) => {
  const demo = useAppSelector((s) => s.demo);
  const prop = curProp(demo);
  const active = productEnabled(demo, product);
  const P = CORE_STRINGS.prodSetup;
  const title = productSetupTitle(product);

  return (
    <div className="bo-detail bo-prodsetup">
      <Breadcrumb items={[{ label: t(CORE_STRINGS.propertyDetail.breadcrumb), href: APP_ROUTES.properties }, { label: prop.name, href: propRoute(prop.id) }, { label: title }]} />
      <div className="bo-prodsetup__header">
        <span className={`bo-prodsetup__tile${active ? '' : ' bo-prodsetup__tile--off'}`} aria-hidden="true">
          <Icon name={product === 'touch' ? 'grid' : 'map'} />
        </span>
        <div className="bo-prodsetup__heading">
          <h2 className="bo-prodsetup__title">
            {title}
            <DemoMark />
          </h2>
          <p className="bo-prodsetup__sub">{t(product === 'touch' ? P.touchSub : P.mapsSub)}</p>
        </div>
        <SetupSwitcher options={generateSetupSwitcher(prop.id, product)} label={t(P.switchLabel)} />
      </div>
      <ToolCards tools={generateSetupTools(prop.id, product)} label={t(P.toolsTitle)} />
      <div className="bo-section">
        <div className="bo-offnote" role="status">
          {t(P.demoNote)}
        </div>
        <Link href={`${propRoute(prop.id)}#prop-config`} className="bo-linkbutton" style={{ alignSelf: 'flex-start' }}>
          {t(CORE_STRINGS.propertyDetail.title)}: {prop.name}
        </Link>
      </div>
    </div>
  );
};
