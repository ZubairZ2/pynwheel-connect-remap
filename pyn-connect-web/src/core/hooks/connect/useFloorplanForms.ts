'use client';

import { useCallback } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { curInv } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';

const BLANK_FLOORPLAN = {
  fplOverride: 'No',
  name: '',
  providerId: '',
  beds: '1',
  baths: '1',
  sqft: '720',
  price: '1950',
  fstatus: 'available',
  btnLabel: '3D Tour',
  btnUrl: '',
  btnNewTab: false,
  b2Label: '',
  b2Url: '',
  b2NewTab: false,
  b3Label: '',
  b3Url: '',
  b3NewTab: false,
  detailsTitle: 'More Details',
  details: '',
  primaryImg: '',
  secondaryImg: ''
};

/** Opening the Floor Plan dialog, add or edit — shared by two screens. */
export const useFloorplanForms = () => {
  const dispatch = useAppDispatch();
  const inv = useAppSelector((s) => curInv(s.demo));

  const addFloorplan = useCallback(
    () => dispatch(demoActions.openModal({ kind: 'floorplan', form: { ...BLANK_FLOORPLAN } })),
    [dispatch]
  );

  const editFloorplan = useCallback(
    (id: string) => {
      const plan = inv.floorplans.find((f) => f.id === id);
      if (!plan) return;
      dispatch(
        demoActions.openModal({
          kind: 'floorplan',
          editingId: id,
          form: {
            ...BLANK_FLOORPLAN,
            fplOverride: 'Yes',
            name: plan.name,
            beds: String(plan.beds),
            baths: String(plan.baths),
            sqft: String(plan.sqft),
            price: String(plan.rent),
            fstatus: plan.status,
            btnUrl: plan.tourUrl
          }
        })
      );
    },
    [dispatch, inv]
  );

  return { addFloorplan, editFloorplan };
};
