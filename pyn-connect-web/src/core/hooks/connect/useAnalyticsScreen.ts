'use client';

import { useMemo } from 'react';

import { DATE_RANGES } from '~/data/mock/analytics.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  analyticsTotals,
  generateAnalyticsKpis,
  generateDeviceSplit,
  generateEntrySplit,
  generateFunnel,
  generateScopeOptions,
  generateScopeSummary,
  generateScopeTabs,
  generateSurfaceRows,
  generateTopProps
} from '~/core/utils/generator/connect/analytics.generator';

export const useAnalyticsScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const scopeTabs = useMemo(
    () =>
      generateScopeTabs(demo.scope).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setScope({ scope: tab.id }))
      })),
    [demo.scope, dispatch]
  );

  const topProps = useMemo(
    () => generateTopProps(demo).map((row) => ({ ...row, open: () => actions.openProp(row.id) })),
    [demo, actions]
  );

  return {
    dateRange: demo.dateRange,
    dateRanges: DATE_RANGES,
    onDateRange: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.setDateRange(event.target.value)),
    scopeTabs,
    scopeNeedsPicker: demo.scope !== 'platform',
    scopeOptions: generateScopeOptions(demo),
    scopeId: demo.scopeId,
    onScopeId: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.setScopeId(event.target.value)),
    scopeSummary: generateScopeSummary(demo),
    analyticsKpis: generateAnalyticsKpis(demo),
    analyticsEmpty: analyticsTotals(demo).tours === 0,
    analyticsEmptyLabel: `No sessions in this scope for ${demo.dateRange} — this property has not gone into production yet.`,
    funnel: generateFunnel(demo),
    surfaceRows: generateSurfaceRows(demo),
    deviceSplit: generateDeviceSplit(demo),
    ...generateEntrySplit(demo),
    topProps
  };
};
