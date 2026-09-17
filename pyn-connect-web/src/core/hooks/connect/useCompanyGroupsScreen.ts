'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curOrg } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generateGroupRows, generateOrgView } from '~/core/utils/generator/connect/company.generator';

export const useCompanyGroupsScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const org = curOrg(demo);

  const groupRows = useMemo(
    () =>
      generateGroupRows(demo).map((group) => ({
        ...group,
        edit: () =>
          dispatch(
            demoActions.openModal({
              kind: 'group',
              editingId: group.id,
              form: {
                name: group.name,
                master: group.master,
                propIds: group.propIds ?? [],
                video: group.video ? 'Yes' : 'No',
                design: group.design || 'Pynwheel Signature'
              }
            })
          ),
        remove: () =>
          actions.confirm({
            title: `Delete the ${group.name} portfolio group?`,
            msg: 'The branded landing page at this group’s URL goes offline immediately, along with its loop video and design. Member properties are untouched.',
            label: 'Delete Group',
            action: { type: demoActions.deleteGroup.type, payload: group.id }
          })
      })),
    [demo, dispatch, actions]
  );

  return {
    org: generateOrgView(demo),
    groupRows,
    orgHasGroups: (org?.groups.length ?? 0) > 0,
    addGroup: () =>
      dispatch(
        demoActions.openModal({
          kind: 'group',
          form: {
            name: '',
            master: demo.props.find((p) => p.orgId === org?.id)?.name ?? '',
            propIds: [],
            video: 'No',
            design: 'Pynwheel Signature'
          }
        })
      ),
    backToOrg: actions.backToOrg,
    goOrgs: () => actions.go(CONNECT_ROUTES.orgs)
  };
};
