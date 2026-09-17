'use client';

import { useMemo } from 'react';

import { useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generateBillingStats,
  generateOrgRollup,
  generateRateCardRows
} from '~/core/utils/generator/connect/billing.generator';

export const useBillingScreen = () => {
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const rateCardRows = useMemo(
    () => generateRateCardRows(demo).map((row) => ({ ...row, open: () => actions.openProp(row.id) })),
    [demo, actions]
  );

  const orgRollup = useMemo(
    () => generateOrgRollup(demo).map((row) => ({ ...row, open: () => actions.openOrg(row.id) })),
    [demo, actions]
  );

  return {
    billingStats: generateBillingStats(demo),
    rateCardRows,
    orgRollup
  };
};
