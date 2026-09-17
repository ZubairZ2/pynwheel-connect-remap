import { plural } from '~/core/utils/connect/format';
import { PC_FREQ, PC_LOGIC, PC_MULT } from '~/data/mock/fees.mock';
import { curPcalc } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

export const generatePcSummary = (state: DemoState): string => {
  const set = curPcalc(state);
  const fees = set.cats.reduce((sum, cat) => sum + cat.fees.length, 0);
  return `${plural(fees, 'fee')} in ${plural(set.cats.length, 'category', 'categories')}`;
};

export const generatePcStatus = (state: DemoState) => {
  const set = curPcalc(state);
  return {
    pcStatusV: !set.published ? 'neutral' : set.draftDirty ? 'warn' : 'ok',
    pcStatusLabel: !set.published ? 'Draft' : set.draftDirty ? 'Unpublished Edits' : 'Published',
    pcDraftDirty: set.draftDirty,
    pcNoCategories: set.cats.length === 0,
    pcVisibleCount: set.cats.reduce((sum, cat) => sum + cat.fees.filter((f) => f.visible).length, 0),
    pcHiddenCount: set.cats.reduce((sum, cat) => sum + cat.fees.filter((f) => !f.visible).length, 0)
  };
};

/** The widget's headline number: visible one-time fees for 2 applicants, 1 pet. */
export const generatePcEstimate = (state: DemoState): string => {
  const rent = 2000;
  const applicants = 2;
  const pets = 1;
  let total = 0;

  curPcalc(state).cats.forEach((cat) =>
    cat.fees.forEach((fee) => {
      if (!fee.visible || fee.freq !== 'onetime') return;
      const amount =
        fee.logic === 'percent'
          ? Math.round((rent * fee.base) / 100)
          : fee.logic === 'varies'
            ? 0
            : fee.base;
      const multiplier = fee.mult === 'applicant' ? applicants : fee.mult === 'pet' ? pets : 1;
      total += amount * multiplier;
    })
  );

  return `$${total.toLocaleString()}`;
};

export const generatePcCategories = (state: DemoState) => {
  const set = curPcalc(state);
  const drag = state.pcDragFrom;

  return set.cats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    count: plural(cat.fees.length, 'fee'),
    empty: cat.fees.length === 0,
    fees: cat.fees.map((fee) => {
      const price =
        fee.logic === 'range'
          ? `$${fee.base.toLocaleString()}–$${fee.max.toLocaleString()}`
          : fee.logic === 'percent'
            ? `${fee.base}% of rent`
            : fee.logic === 'unittype'
              ? 'By unit type'
              : fee.logic === 'varies'
                ? 'Varies'
                : `$${fee.base.toLocaleString()}${fee.freq === 'monthly' ? '/mo' : ''}`;

      const meta = [PC_FREQ[fee.freq]];
      if (PC_MULT[fee.mult] !== 'None') meta.push(PC_MULT[fee.mult]);
      if (fee.qtyEnabled) meta.push(`Qty ${fee.qtyMin}–${fee.qtyMax}`);

      return {
        id: fee.id,
        label: fee.label,
        logicLabel: PC_LOGIC[fee.logic],
        meta: meta.join(' · '),
        priceLabel: price,
        op: fee.visible ? '1' : '0.55',
        rowBg: drag?.feeId === fee.id ? '#F1F3F6' : '#fff',
        visLabel: fee.visible ? 'On' : 'Off',
        visBg: fee.visible ? 'var(--bo-accent)' : '#CDD2DB',
        visKnob: fee.visible ? '20px' : '3px'
      };
    })
  }));
};

export const PC_LOGIC_OPTIONS = [
  { id: 'fixed', label: 'Fixed' },
  { id: 'range', label: 'Range' },
  { id: 'percent', label: 'Percentage' },
  { id: 'unittype', label: 'Unit Type' },
  { id: 'varies', label: 'Varies' }
];

export const PC_FREQ_OPTIONS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'onetime', label: 'One-Time' },
  { id: 'situational', label: 'Situational' }
];

export const PC_MULT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'applicant', label: 'Per Applicant' },
  { id: 'pet', label: 'Per Pet' }
];
