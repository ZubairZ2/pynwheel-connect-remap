'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  INSTR_STEPS,
  generateInstrVendor
} from '~/core/utils/generator/connect/integrations.generator';

/** How a visitor unlocks a door with the connected lock vendor. */
export const useLockInstructionsDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);

  return {
    instrOpen: demo.instrOpen,
    instrVendor: generateInstrVendor(demo),
    instrSteps: INSTR_STEPS,
    closeInstr: () => dispatch(demoActions.closeInstructions())
  };
};
