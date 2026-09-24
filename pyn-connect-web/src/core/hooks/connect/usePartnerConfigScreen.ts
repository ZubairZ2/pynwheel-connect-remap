'use client';

import { useMemo } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generatePartnerRows,
  generatePartnerSummary
} from '~/core/utils/generator/connect/admin.generator';

export const usePartnerConfigScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const partnerRows = useMemo(
    () =>
      generatePartnerRows(demo).map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          toggle: () => dispatch(demoActions.toggleIls({ propId: row.id, partnerId: cell.partnerId }))
        }))
      })),
    [demo, dispatch]
  );

  return {
    partnerSummary: generatePartnerSummary(demo),
    partnerRows,
    ilsFile: demo.ilsFile,
    ilsHasUpload: demo.ilsStep >= 2,
    ilsMatchLabel: `${demo.ilsMatched} matched · ${demo.ilsUnmatched} need review`,
    ilsTemplate: () => dispatch(demoActions.advanceIlsBulk('template')),
    ilsUpload: () => dispatch(demoActions.advanceIlsBulk('upload')),
    ilsApply: () =>
      actions.confirm({
        title: `Apply syndication changes to ${demo.ilsMatched} properties?`,
        msg: `This updates ILS partner syndication across every matched property in the uploaded CSV. The ${demo.ilsUnmatched} unmatched rows are skipped.`,
        label: `Apply to ${demo.ilsMatched} Properties`,
        action: { type: demoActions.advanceIlsBulk.type, payload: 'apply' }
      })
  };
};
