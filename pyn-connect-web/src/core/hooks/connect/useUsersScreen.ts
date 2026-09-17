'use client';

import { useMemo } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generateUserRows } from '~/core/utils/generator/connect/admin.generator';

export const useUsersScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const users = useMemo(
    () =>
      generateUserRows(demo).map((user) => ({
        ...user,
        remove: () =>
          user.self
            ? dispatch(demoActions.showToast("You can't remove yourself."))
            : actions.confirm({
                title: `Remove ${user.name}?`,
                msg: `This revokes ${user.name}'s access immediately.`,
                label: 'Remove User',
                action: { type: demoActions.removeUser.type, payload: user.id }
              })
      })),
    [demo, dispatch, actions]
  );

  const inviteUser = () =>
    dispatch(
      demoActions.openModal({
        kind: 'user',
        form: { name: '', email: '', org: demo.orgs[0]?.name ?? '', role: 'Leasing-Concierge' }
      })
    );

  return { users, inviteUser };
};
