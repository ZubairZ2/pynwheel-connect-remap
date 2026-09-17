'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { generatePropOptions } from '~/core/utils/generator/connect/engagement.generator';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

import { usePricingCalculator } from './usePricingCalculator';

export const usePricingCalculatorScreen = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);

  return {
    ...usePricingCalculator(),
    prop: generatePropertyView(demo),
    propId: demo.propId,
    allPropOptions: generatePropOptions(demo),
    onPropSelect: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.selectProp(event.target.value))
  };
};
