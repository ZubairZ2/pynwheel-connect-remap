'use client';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

import { usePricingCalculator } from './usePricingCalculator';

export const usePropertyPricingScreen = () => {
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  return {
    ...usePricingCalculator(),
    prop: generatePropertyView(demo),
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties)
  };
};
