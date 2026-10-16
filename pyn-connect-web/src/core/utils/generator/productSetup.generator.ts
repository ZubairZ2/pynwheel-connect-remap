import {
  CONNECT_ROUTES,
  brandingRoute,
  contentRoute,
  mapEditorRoute,
  productSetupRoute,
  propFavoritesRoute,
  tourContentRoute,
  tourSetupRoute,
  type SetupProduct
} from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { ProductKey, PropertyDetail } from '~/core/models/data/property.data';
import { generateConfigCards, type ConfigCard, type ManageItem } from './propertyDetail.generator';

/**
 * The Product Setup page (Back Office design, Oct 13, 2026): Touch Setup and
 * Map Setup. Each is the product's tools plus its configuration card from
 * Property Detail, on real data (communities#edit.json). Tour's setup page is
 * the Tours page, which the segmented control links to.
 */

const P = CORE_STRINGS.prodSetup;
const t = (key: string): string => i18n.t(key);

export interface SetupSwitchOption {
  id: ProductKey;
  label: string;
  href: string;
  on: boolean;
}

export interface ProductSetupView {
  product: SetupProduct;
  title: string;
  subtitle: string;
  icon: string;
  active: boolean;
  offNote: string | null;
  switcher: SetupSwitchOption[];
  tools: ManageItem[];
  card: ConfigCard;
}

export const generateSetupSwitcher = (propId: string, current: ProductKey): SetupSwitchOption[] => [
  { id: 'tour', label: t(P.tourSwitch), href: tourSetupRoute(propId), on: current === 'tour' },
  { id: 'touch', label: t(P.touchSwitch), href: productSetupRoute(propId, 'touch'), on: current === 'touch' },
  { id: 'maps', label: t(P.mapsSwitch), href: productSetupRoute(propId, 'maps'), on: current === 'maps' }
];

const tool = (key: keyof typeof P.tools & string, icon: string, href: string): ManageItem => ({
  id: key,
  label: t(P.tools[key]),
  sub: t(P.tools[`${key}Sub` as keyof typeof P.tools]),
  icon,
  href,
  dim: false
});

export const generateSetupTools = (propId: string, product: SetupProduct): ManageItem[] =>
  product === 'touch'
    ? [
        tool('homeScreen', 'pages', contentRoute(propId)),
        tool('favorites', 'heart', propFavoritesRoute(propId)),
        tool('branding', 'palette', brandingRoute(propId))
      ]
    : [
        tool('mapPlotting', 'map', mapEditorRoute(propId)),
        tool('inventory', 'bed', tourContentRoute(propId)),
        tool('svgOptimizer', 'cube', CONNECT_ROUTES.svgOptimizer)
      ];

export const productSetupTitle = (product: SetupProduct): string => t(product === 'touch' ? P.touchTitle : P.mapsTitle);

export const generateProductSetup = (property: PropertyDetail, product: SetupProduct): ProductSetupView => {
  const id = String(property.id);
  const active = property.products[product];
  const card = generateConfigCards(property).find((row) => row.id === product);
  if (!card) throw new Error(`No configuration card for ${product}`);
  const productName = t(product === 'touch' ? CORE_STRINGS.propertyDetail.products.touch : CORE_STRINGS.propertyDetail.products.maps);

  return {
    product,
    title: productSetupTitle(product),
    subtitle: t(product === 'touch' ? P.touchSub : P.mapsSub),
    icon: product === 'touch' ? 'grid' : 'map',
    active,
    offNote: active ? null : t(P.offNote).replace('{product}', productName),
    switcher: generateSetupSwitcher(id, product),
    tools: generateSetupTools(id, product),
    // The card carries its own off note on Property Detail; here the page says it once, above.
    card: { ...card, offNote: null }
  };
};
