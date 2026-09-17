'use client';

import { useEffect } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { curInv } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';

/** Selects the unit named in the URL before the Unit screen renders. */
export const UnitScope = ({ unitId, children }: { unitId: string; children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const known = useAppSelector((s) => curInv(s.demo).units.some((u) => u.id === unitId));
  const current = useAppSelector((s) => s.demo.unitId);

  useEffect(() => {
    if (known && current !== unitId) dispatch(demoActions.selectUnit(unitId));
  }, [known, current, unitId, dispatch]);

  if (!known || current !== unitId) return null;
  return <>{children}</>;
};
