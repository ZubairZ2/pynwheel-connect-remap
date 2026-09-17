'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curProp, curTheme, curTour } from '~/core/store/demo/demo.selectors';
import { generateThemeView } from '~/core/utils/generator/connect/branding.generator';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  PRODUCT_OPTIONS,
  generateIlsDetailPartners,
  generateInventoryCards,
  generateProductCards,
  generateProductSummary,
  productEnabled
} from '~/core/utils/generator/connect/productCards.generator';
import {
  generateBuildingSummary,
  generatePropertyView,
  generateStageSteps
} from '~/core/utils/generator/connect/property.generator';

export const usePropertyDetailScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const prop = curProp(demo);
  const tour = curTour(demo);
  const theme = curTheme(demo);

  const stageSteps = useMemo(
    () =>
      generateStageSteps(demo).map((step) => ({
        ...step,
        set: () => dispatch(demoActions.setPropStage(step.key))
      })),
    [demo, dispatch]
  );

  const inventoryCards = useMemo(
    () =>
      generateInventoryCards(demo).map((card) => ({
        ...card,
        open: () => actions.goInventory(card.tab)
      })),
    [demo, actions]
  );

  const productCards = useMemo(
    () =>
      generateProductCards(demo).map((card) => ({
        ...card,
        toggle: () => dispatch(demoActions.toggleProduct(card.id)),
        toggleExpand: () => dispatch(demoActions.toggleProductExpand(card.id)),
        onTDisplay: (e: React.ChangeEvent<HTMLSelectElement>) =>
          dispatch(demoActions.setProductSetting({ product: 'touch', key: 'display', value: e.target.value })),
        toggleTMdu: () => dispatch(demoActions.toggleProductFlag({ product: 'touch', key: 'mdu' })),
        onTIdv: (e: React.ChangeEvent<HTMLSelectElement>) =>
          dispatch(demoActions.setProductSetting({ product: 'touch', key: 'idv', value: e.target.value })),
        toggleTLocks: () => dispatch(demoActions.toggleProductFlag({ product: 'touch', key: 'enableLocks' })),
        onTStart: (e: React.ChangeEvent<HTMLInputElement>) =>
          dispatch(demoActions.setProductSetting({ product: 'touch', key: 'startDate', value: e.target.value })),
        onTourStart: (e: React.ChangeEvent<HTMLInputElement>) =>
          dispatch(demoActions.setProductSetting({ product: 'tour', key: 'startDate', value: e.target.value })),
        goTourSetup: actions.goTourSetup,
        goScheduling: () => actions.go(CONNECT_ROUTES.scheduling),
        toggleMBeans: () => dispatch(demoActions.toggleProductFlag({ product: 'maps', key: 'beans3d' })),
        toggleMSvg: () => dispatch(demoActions.toggleProductFlag({ product: 'maps', key: 'svgMode' })),
        toggleMWayfind: () => dispatch(demoActions.toggleProductFlag({ product: 'maps', key: 'autoWayfind' })),
        onMDisplay: (e: React.ChangeEvent<HTMLSelectElement>) =>
          dispatch(demoActions.setProductSetting({ product: 'maps', key: 'display', value: e.target.value })),
        toggleMGestures: () => dispatch(demoActions.toggleProductFlag({ product: 'maps', key: 'gestureIcons' }))
      })),
    [demo, dispatch, actions]
  );

  const ilsDetailPartners = useMemo(
    () =>
      generateIlsDetailPartners(demo).map((partner) => ({
        ...partner,
        toggle: () => dispatch(demoActions.toggleIls({ partnerId: partner.id }))
      })),
    [demo, dispatch]
  );

  const tourOn = productEnabled(demo, 'tour');
  const mapsOn = productEnabled(demo, 'maps');

  return {
    prop: generatePropertyView(demo),
    theme: generateThemeView(demo),
    stageSteps,
    propBilling: prop.billing,
    ...generateBuildingSummary(demo),
    inventoryCards,
    productCards,
    productSummary: generateProductSummary(demo),
    ...PRODUCT_OPTIONS,
    mapsOff: !mapsOn,
    mapConfigOpacity: mapsOn ? '1' : '0.5',
    tourBtnOpacity: tourOn ? '1' : '0.45',
    tourSetupTitle: tourOn ? 'Open Tour Setup' : 'Enable Self-Guided Tour to configure',
    tourSetupAccess: () =>
      tourOn
        ? actions.goTourSetup()
        : dispatch(
            demoActions.showToast('Enable Self-Guided Tour in the Products card to configure Tour Setup.')
          ),
    ilsDetailPartners,
    propNodeCount: tour.stops.length + tour.junctions.length,
    propEdgeCount: tour.edges.length,
    brandKickoffLabel: theme?.kickoff ? 'Design kickoff complete' : 'Design kickoff not submitted',
    brandKickoffV: theme?.kickoff ? 'ok' : 'warn',
    qrStamp: demo.qrStamp || 'Two active codes · lobby and gate',
    regenQr: () => dispatch(demoActions.regenQr()),
    prop3DToggleBg: prop.has3D ? 'var(--bo-accent)' : '#CDD2DB',
    prop3DKnob: prop.has3D ? '21px' : '3px',
    togglePropMap: () => dispatch(demoActions.togglePropMap()),
    publishTour: actions.publishTour,
    goProperties: () => actions.go(CONNECT_ROUTES.properties),
    goBuilds: () => actions.go(CONNECT_ROUTES.builds),
    goIntegrations: () => actions.go(CONNECT_ROUTES.integrations),
    goBranding: actions.goBranding,
    goContent: actions.goContent,
    goMapEditor: actions.goMapEditor,
    goPropPricing: actions.goPropPricing,
    goInventoryUnits: () => actions.goInventory('units'),
    editRates: () =>
      dispatch(
        demoActions.openModal({
          kind: 'rates',
          editingId: prop.id,
          form: {
            touch: prop.billing.touch,
            tour: prop.billing.tour,
            maps: prop.billing.maps,
            combined: prop.billing.combined,
            month: prop.billing.month
          }
        })
      ),
    editProperty: () =>
      dispatch(
        demoActions.openModal({
          kind: 'prop',
          editingId: prop.id,
          form: {
            name: prop.name,
            city: prop.city,
            units: String(prop.units),
            orgName: demo.orgs.find((o) => o.id === prop.orgId)?.name ?? demo.orgs[0]?.name ?? ''
          }
        })
      ),
    confirmDeleteProperty: () =>
      actions.confirm({
        title: `Delete ${prop.name}?`,
        msg: 'This removes the property, its map/route graph, tour content, QR codes, and unpublishes any live app build. This cannot be undone.',
        label: 'Delete Property',
        action: { type: demoActions.deleteProperty.type, payload: prop.id }
      })
  };
};
