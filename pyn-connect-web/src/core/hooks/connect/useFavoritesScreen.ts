'use client';

import { FAVORITE_SAMPLE } from '~/data/mock/favorites.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curCfg, curTheme } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  generateBrochureView,
  generatePropOptions
} from '~/core/utils/generator/connect/engagement.generator';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

export const useFavoritesScreen = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const cfg = curCfg(demo);

  return {
    prop: generatePropertyView(demo),
    theme: curTheme(demo),
    propId: demo.propId,
    allPropOptions: generatePropOptions(demo),
    onPropSelect: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.selectProp(event.target.value)),
    ...generateBrochureView(demo),
    onCfgHeadline: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.patchBrochureConfig({ headline: event.target.value })),
    onCfgBody: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      dispatch(demoActions.patchBrochureConfig({ body: event.target.value })),
    onCfgLogo: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.patchBrochureConfig({ logo: event.target.value })),
    cfgBcc: (cfg?.bcc ?? []).map((address) => ({
      addr: address,
      remove: () => dispatch(demoActions.removeBcc(address))
    })),
    addBcc: () => dispatch(demoActions.openModal({ kind: 'bcc', form: { email: '' } })),
    sendTestBrochure: () => dispatch(demoActions.showToast('Test brochure sent to your address.')),
    favoriteSample: FAVORITE_SAMPLE,
    brochureLinks: (demo.brochure[demo.propId] ?? []).map((link) => ({
      ...link,
      toggle: () => dispatch(demoActions.toggleLinkButton(link.id))
    }))
  };
};
