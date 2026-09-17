'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { generateKickoffSwatches } from '~/core/utils/generator/connect/branding.generator';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

/** The design kickoff brief: a palette, a written direction and a moodboard. */
export const useKickoffDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);

  return {
    kickoffOpen: demo.kickoffOpen,
    prop: generatePropertyView(demo),
    koSwatches: generateKickoffSwatches(demo).map((swatch) => ({
      ...swatch,
      pick: () => dispatch(demoActions.setKickoffPalette(swatch.hex))
    })),
    koDirection: demo.koDirection,
    onKoDirection: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      dispatch(demoActions.setKickoffDirection(event.target.value)),
    koMoodLabel: demo.koMood
      ? 'moodboard-2026.jpg uploaded'
      : 'Drop a moodboard image or click to upload',
    koUpload: () => dispatch(demoActions.uploadMoodboard()),
    submitKickoff: () => dispatch(demoActions.submitKickoff()),
    closeKickoff: () => dispatch(demoActions.closeKickoff())
  };
};
