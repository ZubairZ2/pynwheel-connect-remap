'use client';

import { useMemo } from 'react';

import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generateSvgOptRows,
  generateSvgOptSummary
} from '~/core/utils/generator/connect/admin.generator';

export const useSvgOptimizerScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const svgOptRows = useMemo(
    () =>
      generateSvgOptRows(demo).map((row) => ({
        ...row,
        optimize: () => dispatch(demoActions.optimizePropSvg(row.id))
      })),
    [demo, dispatch]
  );

  const needing = demo.props.filter((p) => demo.svgPropOpt[p.id]?.status === 'needs').length;

  return {
    svgOptSummary: generateSvgOptSummary(demo),
    svgOptRows,
    optimizeAllSvg: () =>
      actions.confirm({
        title: 'Optimize all property SVGs?',
        msg: `Runs SVG optimization across every property that needs it (${plural(
          needing,
          'property',
          'properties'
        )}). Existing valid plans are left untouched.`,
        label: 'Optimize All',
        action: { type: demoActions.optimizeAllSvg.type }
      })
  };
};
