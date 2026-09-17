'use client';

import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  MASS_OVERRIDE_OPTIONS,
  filteredUnits,
  massOverrideWarning
} from '~/core/utils/generator/connect/units.generator';

import { useModalSave } from './useModalSave';

/** Applies one override to every unit currently in view. */
export const useMassOverrideDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const saveModal = useModalSave();
  const rows = filteredUnits(demo);

  return {
    puMassModalOpen: demo.modal === 'pumass',
    puMassOptions: MASS_OVERRIDE_OPTIONS,
    puMassCount: rows.length,
    puMassScope: demo.puQuery.trim()
      ? `the ${plural(rows.length, 'unit')} matching your search`
      : `all ${plural(rows.length, 'unit')}`,
    puMassWarn: massOverrideWarning(demo.form.action as string | undefined),
    puMass: {
      action: (demo.form.action as string) ?? 'protect',
      onAction: (event: React.ChangeEvent<HTMLSelectElement>) =>
        dispatch(demoActions.setFormField({ key: 'action', value: event.target.value }))
    },
    closeModal: () => dispatch(demoActions.closeModal()),
    saveModal
  };
};
