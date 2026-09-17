'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  DASH_ALERTS,
  DASH_SCOPE_LABEL,
  RECENT_SIGNUPS,
  TREND_TITLE,
  generateDashProducts,
  generateKpis,
  generateLiveTours,
  generateTrendBars
} from '~/core/utils/generator/connect/dashboard.generator';

const KPI_TARGET: Record<string, string> = {
  properties: CONNECT_ROUTES.properties,
  sessions: CONNECT_ROUTES.scheduling,
  alerts: CONNECT_ROUTES.audit,
  rates: CONNECT_ROUTES.billing
};

export const useDashboardScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const product = demo.dashProduct;

  const kpis = useMemo(
    () => generateKpis(demo).map((kpi) => ({ ...kpi, go: () => actions.go(KPI_TARGET[kpi.id]) })),
    [demo, actions]
  );

  const dashProducts = useMemo(
    () =>
      generateDashProducts(demo).map((row) => ({
        ...row,
        pick: () => dispatch(demoActions.setDashProduct(row.id))
      })),
    [demo, dispatch]
  );

  const liveTours = useMemo(
    () => generateLiveTours(product).map((tour) => ({ ...tour, go: () => actions.openProp(tour.propId) })),
    [product, actions]
  );

  const alerts = useMemo(
    () =>
      DASH_ALERTS.map((alert) => ({
        ...alert,
        go: () => {
          if (alert.target.kind === 'prop') actions.openProp(alert.target.id);
          else if (alert.target.kind === 'org') actions.openOrg(alert.target.id);
          else actions.go(CONNECT_ROUTES.scheduling);
        }
      })),
    [actions]
  );

  const recentSignups = useMemo(
    () => RECENT_SIGNUPS.map((row) => ({ ...row, go: () => actions.openOrg(row.orgId) })),
    [actions]
  );

  return {
    kpis,
    dashProducts,
    dashScopeLabel: DASH_SCOPE_LABEL[product],
    dashScoped: product !== 'all',
    clearDashProduct: () => dispatch(demoActions.setDashProduct('all')),
    trendTitle: TREND_TITLE[product],
    trendBars: generateTrendBars(product),
    liveTours,
    alerts,
    recentSignups
  };
};
