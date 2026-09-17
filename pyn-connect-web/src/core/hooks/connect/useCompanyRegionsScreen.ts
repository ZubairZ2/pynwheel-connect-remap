'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curOrg } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generateOrgView, generateRegionRows } from '~/core/utils/generator/connect/company.generator';

export const useCompanyRegionsScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const org = curOrg(demo);

  const regionRows = useMemo(
    () =>
      generateRegionRows(demo).map((region) => ({
        ...region,
        edit: () =>
          dispatch(
            demoActions.openModal({
              kind: 'region',
              editingId: region.id,
              form: {
                name: region.name,
                contact: region.contact,
                email: region.email,
                propIds: demo.props
                  .filter((p) => p.orgId === org?.id && p.region === region.name)
                  .map((p) => p.id)
              }
            })
          ),
        remove: () =>
          actions.confirm({
            title: `Delete the ${region.name} region?`,
            msg: `Reporting and CSV exports stop grouping by ${region.name}. Its properties stay in the company but become unassigned.`,
            label: 'Delete Region',
            action: { type: demoActions.deleteRegion.type, payload: region.id }
          })
      })),
    [demo, dispatch, actions, org]
  );

  return {
    org: generateOrgView(demo),
    regionRows,
    orgHasRegions: (org?.regions.length ?? 0) > 0,
    addRegion: () =>
      dispatch(
        demoActions.openModal({
          kind: 'region',
          form: { name: '', contact: '', email: '', propIds: [] }
        })
      ),
    backToOrg: actions.backToOrg,
    goOrgs: () => actions.go(CONNECT_ROUTES.orgs)
  };
};
