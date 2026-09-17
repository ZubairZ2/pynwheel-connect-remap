'use client';

import type { DragEvent } from 'react';
import { useMemo } from 'react';

import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curPcalc, curProp } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generatePcCategories,
  generatePcEstimate,
  generatePcStatus,
  generatePcSummary
} from '~/core/utils/generator/connect/pricing.generator';

/**
 * The fee builder, shared by the portfolio-level Pricing Calculator screen and
 * the property-scoped Pricing & Availability tab — they render the same editor.
 */
export const usePricingCalculator = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const pcCategories = useMemo(
    () =>
      generatePcCategories(demo).map((cat) => ({
        ...cat,
        onName: (event: React.ChangeEvent<HTMLInputElement>) =>
          dispatch(demoActions.pcRenameCategory({ id: cat.id, value: event.target.value })),
        addFee: () =>
          dispatch(
            demoActions.openModal({
              kind: 'pcfee',
              form: {
                _catId: cat.id,
                flabel: '',
                flogic: 'fixed',
                fbase: '0',
                fmax: '0',
                ffreq: 'onetime',
                fmult: 'none',
                fqtyEnabled: false,
                fqtyMin: '0',
                fqtyMax: '2',
                fvisible: true,
                fdisplay: '',
                fpre: '',
                fpost: ''
              }
            })
          ),
        remove: () =>
          actions.confirm({
            title: `Delete the ${cat.name} category?`,
            msg: `Its ${plural(cat.fees.length, 'fee')} are removed from the estimator draft.`,
            label: 'Delete Category',
            action: { type: demoActions.pcRemoveCategory.type, payload: cat.id }
          }),
        onDropEnd: (event: DragEvent) => {
          event.preventDefault();
          dispatch(demoActions.pcMoveFee({ targetCat: cat.id, beforeFeeId: null }));
        },
        fees: cat.fees.map((fee) => ({
          ...fee,
          toggleVis: () => dispatch(demoActions.pcToggleFeeVisibility({ catId: cat.id, feeId: fee.id })),
          edit: () => {
            const source = curPcalc(demo)
              .cats.find((c) => c.id === cat.id)
              ?.fees.find((f) => f.id === fee.id);
            if (!source) return;
            dispatch(
              demoActions.openModal({
                kind: 'pcfee',
                editingId: fee.id,
                form: {
                  _catId: cat.id,
                  flabel: source.label,
                  flogic: source.logic,
                  fbase: String(source.base),
                  fmax: String(source.max),
                  ffreq: source.freq,
                  fmult: source.mult,
                  fqtyEnabled: source.qtyEnabled,
                  fqtyMin: String(source.qtyMin),
                  fqtyMax: String(source.qtyMax),
                  fvisible: source.visible,
                  fdisplay: source.displayText,
                  fpre: source.preText,
                  fpost: source.postText
                }
              })
            );
          },
          remove: () =>
            actions.confirm({
              title: `Delete ${fee.label}?`,
              msg: 'The fee is removed from the estimator draft. Publish to push the change to the public widget.',
              label: 'Delete Fee',
              action: { type: demoActions.pcRemoveFee.type, payload: { catId: cat.id, feeId: fee.id } }
            }),
          onDragStart: (event: DragEvent) => {
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move';
              try {
                event.dataTransfer.setData('text/plain', fee.id);
              } catch {
                /* Safari refuses setData outside a real drag — harmless here */
              }
            }
            dispatch(demoActions.pcDragStart({ catId: cat.id, feeId: fee.id }));
          },
          onDropBefore: (event: DragEvent) => {
            event.preventDefault();
            dispatch(demoActions.pcMoveFee({ targetCat: cat.id, beforeFeeId: fee.id }));
          }
        }))
      })),
    [demo, dispatch, actions]
  );

  return {
    pcSummary: generatePcSummary(demo),
    ...generatePcStatus(demo),
    pcEstimate: generatePcEstimate(demo),
    pcEstimateNote: '2 applicants, 1 pet · one-time fees only',
    pcCategories,
    pcLiveUrl: `widgets.pynwheel.com/${demo.propId}/pricing`,
    pcDraftUrl: `widgets.pynwheel.com/${demo.propId}/pricing?draft=1`,
    pcCopyLive: () => dispatch(demoActions.showToast('Live embed URL copied to clipboard.')),
    pcCopyDraft: () => dispatch(demoActions.showToast('Draft embed URL copied to clipboard.')),
    pcAddCategory: () => dispatch(demoActions.pcAddCategory()),
    pcSaveDraft: () => dispatch(demoActions.pcSaveDraft()),
    pcAllowDrop: (event: DragEvent) => event.preventDefault(),
    pcPublish: () =>
      actions.confirm({
        title: 'Publish the move-in cost estimator?',
        msg: `The current draft replaces what the public widget shows for ${curProp(demo)?.name ?? 'this property'}.`,
        label: 'Publish',
        action: { type: demoActions.pcPublish.type }
      }),
    pcDiscard: () =>
      actions.confirm({
        title: 'Discard draft changes?',
        msg: 'Unpublished fee edits are thrown away and the estimator reverts to the published version.',
        label: 'Discard Draft',
        action: { type: demoActions.pcDiscard.type }
      })
  };
};
