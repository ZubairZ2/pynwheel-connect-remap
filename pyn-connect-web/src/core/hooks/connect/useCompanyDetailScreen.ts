'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curOrg, propCount } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generateGroupRows,
  generateOrgPmsSummary,
  generateOrgPmsVendors,
  generateOrgProperties,
  generateOrgView,
  generateRegionRows
} from '~/core/utils/generator/connect/company.generator';

export const useCompanyDetailScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const org = curOrg(demo);
  const properties = propCount(demo, org?.id ?? '');

  const orgPmsVendors = useMemo(
    () =>
      generateOrgPmsVendors(demo).map((vendor) => ({
        ...vendor,
        connect: () => {
          const open = () =>
            dispatch(
              demoActions.openModal({
                kind: 'orgPms',
                form: { pmsProvider: vendor.name, pmsUser: '', pmsKey: '' },
                editingId: org?.id
              })
            );
          if (org?.pms.provider && org.pms.provider !== vendor.name) {
            actions.confirm({
              title: `Switch to ${vendor.name}?`,
              msg: `${org.name} holds one company PMS credential at a time. Connecting ${vendor.name} revokes the ${org.pms.provider} credential and stops company-level push-down to ${plural(
                properties,
                'property',
                'properties'
              )} until the new key is verified.`,
              label: 'Switch Provider',
              action: { type: 'connect/openOrgPms', payload: vendor.name }
            });
          } else {
            open();
          }
        },
        test: () => dispatch(demoActions.testOrgPms()),
        rotate: () =>
          dispatch(
            demoActions.openModal({
              kind: 'orgPms',
              form: { pmsProvider: org?.pms.provider ?? '', pmsUser: '', pmsKey: '' },
              editingId: org?.id
            })
          ),
        revoke: () =>
          actions.confirm({
            title: `Disconnect ${org?.pms.provider}?`,
            msg: `Company-level credentials stop pushing down to ${plural(
              properties,
              'property',
              'properties'
            )}. Each property keeps its own property-level credential until a new company provider is set.`,
            label: 'Disconnect',
            action: { type: demoActions.disconnectOrgPms.type }
          })
      })),
    [demo, dispatch, actions, org, properties]
  );

  const orgProperties = useMemo(
    () =>
      generateOrgProperties(demo).map((prop) => ({ ...prop, open: () => actions.openProp(prop.id) })),
    [demo, actions]
  );

  return {
    org: generateOrgView(demo),
    orgPmsSummary: generateOrgPmsSummary(demo),
    orgPmsVendors,
    orgPmsToggleBg: org?.pms.pushDown ? 'var(--bo-accent)' : '#CDD2DB',
    orgPmsKnob: org?.pms.pushDown ? '21px' : '3px',
    toggleOrgPms: () => dispatch(demoActions.toggleOrgPmsPushDown()),
    orgRegions: generateRegionRows(demo),
    orgHasRegions: (org?.regions.length ?? 0) > 0,
    orgGroups: generateGroupRows(demo),
    orgHasGroups: (org?.groups.length ?? 0) > 0,
    orgHistory: org?.history ?? [],
    orgProperties,
    orgHasNoProps: properties === 0,
    goOrgs: () => actions.go(CONNECT_ROUTES.orgs),
    goRegions: actions.goRegions,
    goGroups: actions.goGroups,
    editOrg: () =>
      dispatch(
        demoActions.openModal({
          kind: 'org',
          editingId: org?.id,
          form: {
            name: org?.name ?? '',
            contact: org?.contact ?? '',
            email: org?.email ?? '',
            pmsProvider: org?.pms.provider || 'Yardi Voyager'
          }
        })
      ),
    confirmDeleteOrg: () =>
      actions.confirm({
        title: `Delete ${org?.name}?`,
        msg: `This permanently removes the company, its ${properties} properties, all regions, portfolio groups, users, and PMS credentials. This cannot be undone.`,
        label: 'Delete Company',
        action: { type: demoActions.deleteOrg.type, payload: org?.id },
        match: org?.name
      })
  };
};
