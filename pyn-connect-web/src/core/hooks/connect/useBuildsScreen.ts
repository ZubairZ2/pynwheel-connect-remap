'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';

const NO_BUILDS = [
  { version: '—', platform: '—', status: 'Not Built', variant: 'neutral', by: '—', when: '—' }
];

export const useBuildsScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const prop = generatePropertyView(demo);
  const history = demo.builds[demo.propId] ?? NO_BUILDS;

  return {
    prop,
    buildHistory: history,
    buildVersion: demo.builds[demo.propId]?.[0]?.version ?? 'v5.1.4 (117)',
    confirmTriggerBuild: () =>
      actions.confirm({
        title: 'Trigger a new build?',
        msg: `This submits ${prop?.name ?? 'this property'} to the build pipeline and, on success, an automated store submission. Store review can take 24–48h.`,
        label: 'Trigger Build',
        action: { type: 'connect/triggerBuild' }
      }),
    toastStore: () => dispatch(demoActions.showToast('Opening store console in a new tab…'))
  };
};
