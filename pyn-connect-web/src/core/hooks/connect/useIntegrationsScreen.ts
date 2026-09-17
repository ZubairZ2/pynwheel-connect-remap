'use client';

import { useMemo } from 'react';

import { plural } from '~/core/utils/connect/format';
import { CATEGORY_META, SEED_INTEG } from '~/data/mock/core.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curProp } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generatePropOptions } from '~/core/utils/generator/connect/engagement.generator';
import {
  generateAccessFilterOptions,
  generateAccessLog,
  generateIntegTabs,
  generateLockSummary,
  generateLockVendors,
  generateVendorCategories,
  type CategoryKey
} from '~/core/utils/generator/connect/integrations.generator';

export const useIntegrationsScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const prop = curProp(demo);
  const row = demo.integ[demo.propId] ?? SEED_INTEG.wharf;

  const integTabs = useMemo(
    () =>
      generateIntegTabs(demo.integTab).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setTab({ key: 'integTab', value: tab.id }))
      })),
    [demo.integTab, dispatch]
  );

  const lockVendors = useMemo(
    () =>
      generateLockVendors(demo).map((lock) => {
        const setVendor = () => dispatch(demoActions.setLockVendor(lock.id));
        const live = row.locks.find((l) => l.on);

        const toggle = () => {
          if (lock.on) {
            actions.confirm({
              title: `Disconnect ${lock.name}?`,
              msg: `Locks imported from ${lock.name} at ${prop?.name} stop responding to tour access requests, and any active key grants are revoked immediately.`,
              label: 'Disconnect',
              action: { type: demoActions.setLockVendor.type, payload: lock.id }
            });
          } else if (live) {
            actions.confirm({
              title: `Switch to ${lock.name}?`,
              msg: `${prop?.name} can use one lock provider at a time. ${live.name} will be disconnected, its imported locks removed, and any active key grants revoked.`,
              label: 'Switch Provider',
              action: { type: demoActions.setLockVendor.type, payload: lock.id }
            });
          } else {
            setVendor();
          }
        };

        return {
          ...lock,
          toggle,
          connect: toggle,
          revoke: toggle,
          test: () => actions.lockTest(lock.id),
          imp: () => dispatch(demoActions.importLocks(lock.id)),
          automap: () => dispatch(demoActions.autoMapLocks(lock.id)),
          instr: () => dispatch(demoActions.openInstructions(lock.id))
        };
      }),
    [demo, dispatch, actions, prop, row]
  );

  const vendorCategories = useMemo(
    () =>
      generateVendorCategories(demo).map((category) => ({
        ...category,
        vendors: category.vendors.map((vendor) => ({
          ...vendor,
          connect: () => {
            const connection = row[category.key as CategoryKey];
            if (connection.connected && connection.vendor !== vendor.name) {
              actions.confirm({
                title: 'Switch provider?',
                msg: `${prop?.name} can use one ${CATEGORY_META[category.key].label} at a time. ${connection.vendor} will be disconnected, its credential revoked, and anything queued for it is dropped.`,
                label: 'Switch Provider',
                action: {
                  type: demoActions.connectVendor.type,
                  payload: { key: category.key, vendor: vendor.name }
                }
              });
            } else if (connection.connected && connection.vendor === vendor.name) {
              dispatch(demoActions.showToast(`${vendor.name} is already connected.`));
            } else {
              dispatch(demoActions.connectVendor({ key: category.key as CategoryKey, vendor: vendor.name }));
            }
          },
          test: () => actions.vendorTest(category.key as CategoryKey),
          revoke: () =>
            actions.confirm({
              title: `Disconnect ${row[category.key as CategoryKey].vendor}?`,
              msg: `This revokes the ${CATEGORY_META[category.key].label} credential for ${prop?.name}. Dependent tour features stop working until a provider is connected again.`,
              label: 'Disconnect',
              action: { type: demoActions.revokeVendor.type, payload: category.key }
            }),
          act: () => dispatch(demoActions.runVendorAction(category.key as CategoryKey))
        }))
      })),
    [demo, dispatch, actions, prop, row]
  );

  const accessLog = generateAccessLog(demo);

  return {
    integTabs,
    isIntegTab: demo.integTab === 'integrations',
    isAccessTab: demo.integTab === 'access',
    propId: demo.propId,
    allPropOptions: generatePropOptions(demo),
    onPropSelect: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.selectProp(event.target.value)),
    lockVendors,
    ...generateLockSummary(demo),
    vendorCategories,
    accessFilter: demo.accessFilter,
    onAccessFilter: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.setAccessFilter(event.target.value)),
    accessFilterOptions: generateAccessFilterOptions(demo),
    accessLog,
    accessLogCount: plural(accessLog.length, 'event')
  };
};
