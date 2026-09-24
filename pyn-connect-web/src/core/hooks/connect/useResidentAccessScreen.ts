'use client';

import { useMemo } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { curResident } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generateGrantRows,
  generatePropOptions,
  generateResidentList,
  generateResidentView
} from '~/core/utils/generator/connect/engagement.generator';

export const useResidentAccessScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const resident = curResident(demo);

  const residentList = useMemo(
    () =>
      generateResidentList(demo).map((row) => ({
        ...row,
        pick: () => dispatch(demoActions.pickResident(row.id))
      })),
    [demo, dispatch]
  );

  const grantRows = useMemo(
    () =>
      generateGrantRows(demo).map((row) => ({
        ...row,
        toggle: () => {
          const granting = !row.on;
          if (granting) {
            dispatch(demoActions.setGrant({ target: row.label, on: true }));
            return;
          }
          actions.confirm({
            title: `Revoke ${row.label} access?`,
            msg: `${resident?.name ?? 'This resident'} loses phone-as-key access to ${row.label} immediately. Any credential already on their device stops working on the next lock handshake.`,
            label: 'Revoke Access',
            action: { type: demoActions.setGrant.type, payload: { target: row.label, on: false } }
          });
        }
      })),
    [demo, dispatch, actions, resident]
  );

  return {
    residentList,
    residentEmpty: (demo.residents[demo.propId] ?? []).length === 0,
    residentCount: (demo.residents[demo.propId] ?? []).length,
    resident: generateResidentView(demo),
    hasResident: !!resident,
    grantRows,
    residentLog: resident?.log ?? [],
    revokeAllResident: () =>
      actions.confirm({
        title: `Revoke all access for ${resident?.name ?? 'this resident'}?`,
        msg: 'Every grant — unit and amenities — is removed at once. Use this at move-out or for a lost device.',
        label: 'Revoke Everything',
        action: { type: demoActions.revokeAllGrants.type }
      }),
    propId: demo.propId,
    allPropOptions: generatePropOptions(demo),
    onPropSelect: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.selectProp(event.target.value))
  };
};
