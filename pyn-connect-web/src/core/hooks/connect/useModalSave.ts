'use client';

import { useCallback } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { curInv, levels } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppStore } from '~/core/store/hooks';
import { rangeLabelOf } from '~/core/utils/generator/connect/inventory.generator';
import { stopIconFor } from '~/core/utils/generator/connect/tour.generator';

/**
 * The design's single `saveModal()`, split by modal kind.
 *
 * A few saves need values derived from state before the reducer runs — the
 * floorplate's display name, a promoted stop's icon and level, a booking's CRM —
 * so they are resolved here and passed in as the action payload.
 */
export const useModalSave = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  return useCallback(() => {
    const state = store.getState().demo;
    const form = state.form as Record<string, string>;

    switch (state.modal) {
      case 'org':
        return dispatch(demoActions.saveOrg());
      case 'orgPms':
        return dispatch(demoActions.saveOrgPms());
      case 'prop':
        return dispatch(demoActions.saveProperty());
      case 'user':
        return dispatch(demoActions.saveUser());
      case 'region':
        return dispatch(demoActions.saveRegion());
      case 'group':
        return dispatch(demoActions.saveGroup());
      case 'rates':
        return dispatch(demoActions.saveRates());
      case 'page':
        return dispatch(demoActions.savePage());
      case 'tile':
        return dispatch(demoActions.saveTile());
      case 'link':
        return dispatch(demoActions.saveLinkButton());
      case 'bcc':
        return dispatch(demoActions.saveBccModal());
      case 'fee':
        return dispatch(demoActions.saveFee());
      case 'pcfee':
        return dispatch(demoActions.pcSaveFee());
      case 'floorplan':
        return dispatch(demoActions.saveFloorplan());
      case 'unit':
        return dispatch(demoActions.saveUnit());
      case 'amenity':
        return dispatch(demoActions.saveAmenity());
      case 'elevator':
        return dispatch(demoActions.saveElevator());

      case 'pumass': {
        const ids = curInv(state).units.map((u) => u.id);
        return dispatch(demoActions.massOverrideUnits({ ids, action: form.action ?? 'protect' }));
      }

      case 'booking': {
        const prop = state.props.find((p) => p.name === form.bprop) ?? state.props[0];
        const crm = state.integ[prop?.id ?? '']?.crm.vendor || 'Not connected';
        return dispatch(demoActions.saveBooking({ propId: prop?.id ?? '', crm }));
      }

      case 'floorplate': {
        const manual = form.fpOverride === 'Yes';
        const rangeLabel = rangeLabelOf(form.fpRange);
        const hasRange = !!(form.fpRange ?? '').trim();

        if (manual && !(form.fpName ?? '').trim()) {
          return dispatch(demoActions.showToast('Enter a floorplate name, or set Manual Override to No.'));
        }
        if (!manual && !hasRange) {
          return dispatch(
            demoActions.showToast('Enter a floor range, or set Manual Override to Yes and name it.')
          );
        }
        if (hasRange && !rangeLabel) {
          return dispatch(demoActions.showToast("Range must be '3', '3-10', or '3,5,7'."));
        }
        return dispatch(demoActions.saveFloorplate({ label: manual ? form.fpName : rangeLabel }));
      }

      case 'stop': {
        if (state.editingId) {
          return dispatch(
            demoActions.saveStop({ icon: 'pin', floorLabel: form.floorLabel ?? '', levelId: '' })
          );
        }
        const inv = curInv(state);
        const unit = inv.units.find((u) => u.name === form.source);
        const amenity = inv.amenities.find((a) => a.name === form.source);
        const item = unit ?? amenity;
        if (!item) return dispatch(demoActions.showToast('Pick a unit or amenity to promote.'));

        const level =
          levels(state).find((l) => l.id === (item.plevel ?? item.level)) ?? levels(state)[0];
        const plan = unit ? inv.floorplans.find((f) => f.id === unit.fpId) : undefined;
        const floorLabel = unit
          ? `${plan ? (plan.beds === 0 ? 'Studio' : `${plan.beds} Bed`) : 'Unit'}${
              plan ? ` · ${plan.baths} Bath` : ''
            }`
          : (level?.floor ?? '—');

        return dispatch(
          demoActions.saveStop({
            icon: stopIconFor(amenity?.category, !!unit),
            floorLabel,
            levelId: level?.id ?? '',
            beds: plan?.beds
          })
        );
      }

      default:
        return dispatch(demoActions.closeModal());
    }
  }, [dispatch, store]);
};
