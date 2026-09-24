'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curTheme } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  BRAND_FONT_OPTIONS,
  generateAlignOptions,
  generateBrandTabs,
  generateHeroOptions,
  generateLogoCards,
  generateMarkerDot,
  generateMarkerSizeOptions,
  generateNavStyleOptions,
  generateStarterThemes,
  generateThemeView
} from '~/core/utils/generator/connect/branding.generator';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

export const useBrandingScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const theme = curTheme(demo);

  const brandTabs = useMemo(
    () =>
      generateBrandTabs(demo.brandTab).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setTab({ key: 'brandTab', value: tab.id }))
      })),
    [demo.brandTab, dispatch]
  );

  const starterThemes = useMemo(
    () =>
      generateStarterThemes(demo).map((starter) => ({
        ...starter,
        pick: () =>
          actions.confirm({
            title: `Apply the ${starter.name} theme?`,
            msg: `Primary and secondary colors, marker color, and navigation styling are replaced with the ${starter.name} starter values. Logos, hero media, and content pages are untouched.`,
            label: 'Apply Theme',
            action: { type: demoActions.applyStarterTheme.type, payload: starter.id }
          })
      })),
    [demo, actions]
  );

  const logoCards = useMemo(
    () =>
      generateLogoCards(demo).map((card) => ({
        ...card,
        upload: () => dispatch(demoActions.openCrop({ which: card.which, alreadySet: card.set })),
        crop: () => dispatch(demoActions.openCrop({ which: card.which, alreadySet: card.set })),
        clear: () =>
          actions.confirm({
            title: `Remove the ${card.which} logo?`,
            msg: `The ${card.which} logo is deleted from every surface using it — kiosk, web embed, and the emailed favorites brochure.`,
            label: 'Remove Logo',
            action: { type: demoActions.clearLogo.type, payload: card.which }
          })
      })),
    [demo, dispatch, actions]
  );

  const patch = (key: string, value: string | number) => dispatch(demoActions.patchTheme({ [key]: value }));

  return {
    prop: generatePropertyView(demo),
    theme: generateThemeView(demo),
    brandTabs,
    isBrandTheme: demo.brandTab === 'theme',
    isBrandTokens: demo.brandTab === 'tokens',
    isBrandLogos: demo.brandTab === 'logos',
    starterThemes,
    logoCards,
    ...BRAND_FONT_OPTIONS,
    alignOptions: generateAlignOptions(demo).map((option) => ({
      ...option,
      pick: () => patch('align', option.id)
    })),
    navStyleOptions: generateNavStyleOptions(demo).map((option) => ({
      ...option,
      pick: () => patch('navStyle', option.id)
    })),
    markerSizeOptions: generateMarkerSizeOptions(demo).map((option) => ({
      ...option,
      pick: () => patch('markerSize', option.id)
    })),
    heroOptions: generateHeroOptions(demo).map((option) => ({
      ...option,
      pick: () => patch('hero', option.id)
    })),
    markerDot: generateMarkerDot(demo),
    onPrimary: (e: React.ChangeEvent<HTMLInputElement>) => patch('primary', e.target.value),
    onSecondary: (e: React.ChangeEvent<HTMLInputElement>) => patch('secondary', e.target.value),
    onMarkerColor: (e: React.ChangeEvent<HTMLInputElement>) => patch('markerColor', e.target.value),
    onFont: (e: React.ChangeEvent<HTMLSelectElement>) => patch('font', e.target.value),
    onWeight: (e: React.ChangeEvent<HTMLSelectElement>) => patch('weight', e.target.value),
    onBrandSize: (e: React.ChangeEvent<HTMLInputElement>) =>
      patch('size', parseInt(e.target.value, 10) || 16),
    kickoffDone: !!theme?.kickoff,
    kickoffNeeded: !theme?.kickoff,
    openKickoff: () => dispatch(demoActions.openKickoff()),
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties)
  };
};
