'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curInv, levels } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';
import {
  filteredUnits,
  generatePlanCards,
  generateUnitRows,
  generateUnitsSummary
} from '~/core/utils/generator/connect/units.generator';

import { useFloorplanForms } from './useFloorplanForms';

export const usePropertyUnitsScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const inv = curInv(demo);
  const forms = useFloorplanForms();

  const puUnitRows = useMemo(
    () =>
      generateUnitRows(demo).map((row) => ({
        ...row,
        toggleOverride: () => dispatch(demoActions.toggleUnitSrc({ id: row.id, field: 'price' })),
        open: () => actions.openUnit(row.id),
        manageImages: () => actions.openUnit(row.id)
      })),
    [demo, dispatch, actions]
  );

  const puPlanCards = useMemo(
    () =>
      generatePlanCards(demo).map((card) => ({
        ...card,
        edit: () => forms.editFloorplan(card.id),
        manageImages: () => forms.editFloorplan(card.id)
      })),
    [demo, forms]
  );

  return {
    prop: generatePropertyView(demo),
    ...generateUnitsSummary(demo),
    puQuery: demo.puQuery,
    puOnQuery: (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.setPuQuery(e.target.value)),
    puGoUnits: () => dispatch(demoActions.setTab({ key: 'puTab', value: 'units' })),
    puGoPlans: () => dispatch(demoActions.setTab({ key: 'puTab', value: 'floorplans' })),
    puSortName: () => dispatch(demoActions.setPuSort('name')),
    puSortFp: () => dispatch(demoActions.setPuSort('fp')),
    puSortPrice: () => dispatch(demoActions.setPuSort('price')),
    puSortAvail: () => dispatch(demoActions.setPuSort('avail')),
    puUnitRows,
    puPlanCards,
    puMassOverride: () =>
      filteredUnits(demo).length
        ? dispatch(demoActions.openModal({ kind: 'pumass', form: { action: 'protect' } }))
        : dispatch(demoActions.showToast('No units match the current search.')),
    puBulkImages: () =>
      dispatch(
        demoActions.showToast(
          'Select floor plan renders to upload — files are matched to plans by name.'
        )
      ),
    addUnit: () => {
      const level = levels(demo)[0];
      dispatch(
        demoActions.openModal({
          kind: 'unit',
          form: {
            name: '',
            ufp: inv.floorplans[0]?.name ?? '—',
            price: '2000',
            sqft: '800',
            ufloor: level?.floor ?? 'Floor 1',
            ubuilding: level?.building ?? 'Main',
            uavail: 'available',
            ulevel: level ? `${level.floor} · ${level.building}` : ''
          }
        })
      );
    },
    addFloorplan: forms.addFloorplan,
    resyncPms: () => {
      const protectedCount = inv.units.reduce(
        (total, u) => total + Object.values(u.src).filter((v) => v === 'manual').length,
        0
      );
      actions.confirm({
        title: 'Re-sync units from the PMS feed?',
        msg: `Provider-controlled fields are overwritten with the latest feed values. ${plural(
          protectedCount,
          'manual override'
        )} across this property will be preserved.`,
        label: 'Run Sync',
        action: { type: demoActions.resyncPms.type }
      });
    },
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties)
  };
};
