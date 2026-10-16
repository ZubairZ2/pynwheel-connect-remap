import { notFound, redirect } from 'next/navigation';

import { SETUP_PRODUCTS, TITLES, tourSetupRoute, type SetupProduct } from '~/config/app/connectRoutes';
import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { parsePropertyDetail } from '~/core/repository/parser/property.parser';
import { fetchPropertyDetail } from '~/core/repository/remote/api/properties.api';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { ProductSetupScreen as DemoProductSetupScreen } from '~/core/screens/connect/properties/productSetup.screen';
import { ProductSetupScreen } from '~/core/screens/properties/productSetup.screen';

export const dynamic = 'force-dynamic';

const REAL_ID = /^\d+$/;

/**
 * Touch Setup (`/setup/touch`) and Map Setup (`/setup/maps`), the design's
 * `prodSetup` screen. `/setup/tour` is the Tours page. Real ids read
 * communities#edit.json, as Property Detail does; demo slugs keep the demo frame.
 */
export default async function Page({ params }: { params: Promise<{ propId: string; product: string }> }) {
  const { propId, product } = await params;
  if (product === 'tour') redirect(tourSetupRoute(propId));
  if (!SETUP_PRODUCTS.includes(product as SetupProduct)) notFound();
  const setupProduct = product as SetupProduct;

  if (!REAL_ID.test(propId)) {
    return (
      <ConnectScreenTemplate title={TITLES.prodSetup} demo>
        <PropertyScope propId={propId}>
          <DemoProductSetupScreen product={setupProduct} />
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  const response = await fetchPropertyDetail(await readRailsCookie(), Number(propId));
  if (response.status === 401 || response.status === 302) redirect(APP_ROUTES.signIn);

  const property = response.ok ? parsePropertyDetail(response.body) : null;
  const failed = !response.ok && response.status !== 404;

  return (
    <ConnectScreenTemplate title={TITLES.prodSetup}>
      <ProductSetupScreen
        property={property}
        product={setupProduct}
        error={failed ? i18n.t(CORE_STRINGS.propertyDetail.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
