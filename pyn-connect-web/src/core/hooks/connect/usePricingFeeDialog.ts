'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  PC_FREQ_OPTIONS,
  PC_LOGIC_OPTIONS,
  PC_MULT_OPTIONS
} from '~/core/utils/generator/connect/pricing.generator';

import { useModalSave } from './useModalSave';

/** Add / edit one fee in the pricing calculator's builder. */
export const usePricingFeeDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const saveModal = useModalSave();

  const form = demo.form as Record<string, string>;
  const logic = form.flogic || 'fixed';
  const onField = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    dispatch(demoActions.setFormField({ key, value: event.target.value }));

  return {
    pcFeeModalOpen: demo.modal === 'pcfee',
    pcFeeTitle: demo.editingId ? 'Edit Fee' : 'Add Fee',
    pcFeeSaveLabel: demo.editingId ? 'Save Fee' : 'Add Fee',
    pcLogicOptions: PC_LOGIC_OPTIONS,
    pcFreqOptions: PC_FREQ_OPTIONS,
    pcMultOptions: PC_MULT_OPTIONS,
    closeModal: () => dispatch(demoActions.closeModal()),
    saveModal,
    pcFee: {
      label: form.flabel ?? '',
      onLabel: onField('flabel'),
      logic,
      onLogic: onField('flogic'),
      freq: form.ffreq || 'onetime',
      onFreq: onField('ffreq'),
      mult: form.fmult || 'none',
      onMult: onField('fmult'),
      base: form.fbase ?? '',
      onBase: onField('fbase'),
      max: form.fmax ?? '',
      onMax: onField('fmax'),
      showPrice: logic !== 'varies',
      noPrice: logic === 'varies',
      showMax: logic === 'range',
      baseLabel:
        logic === 'range'
          ? 'Min Price (USD)'
          : logic === 'percent'
            ? 'Percentage (%)'
            : logic === 'unittype'
              ? 'Base Price (USD)'
              : 'Amount (USD)',
      variesNote: 'Price is determined at the leasing office and shown as “Varies” in the estimator.',
      qtyEnabled: !!demo.form.fqtyEnabled,
      toggleQty: () => dispatch(demoActions.toggleFormFlag('fqtyEnabled')),
      qtyBg: demo.form.fqtyEnabled ? 'var(--bo-accent)' : '#CDD2DB',
      qtyKnob: demo.form.fqtyEnabled ? '21px' : '3px',
      qtyMin: form.fqtyMin ?? '',
      onQtyMin: onField('fqtyMin'),
      qtyMax: form.fqtyMax ?? '',
      onQtyMax: onField('fqtyMax'),
      visBg: demo.form.fvisible ? 'var(--bo-accent)' : '#CDD2DB',
      visKnob: demo.form.fvisible ? '21px' : '3px',
      toggleVis: () => dispatch(demoActions.toggleFormFlag('fvisible')),
      displayText: form.fdisplay ?? '',
      onDisplay: onField('fdisplay'),
      preText: form.fpre ?? '',
      onPre: onField('fpre'),
      postText: form.fpost ?? '',
      onPost: onField('fpost')
    }
  };
};
