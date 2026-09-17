'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  generateModalFields,
  generateModalSaveLabel,
  generateModalTitle
} from '~/core/utils/generator/connect/modalFields.generator';
import { stopSourceOptions } from '~/core/utils/generator/connect/tour.generator';

import { useModalSave } from './useModalSave';

/** The shared add/edit dialog behind most of the app's forms. */
export const useFormDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const saveModal = useModalSave();

  const GENERIC_MODALS = [
    'org', 'prop', 'user', 'stop', 'page', 'tile', 'link', 'fee', 'bcc', 'rates',
    'region', 'group', 'booking', 'elevator', 'unit', 'amenity', 'orgPms', 'floorplan'
  ];

  const modalFields = generateModalFields(demo, stopSourceOptions(demo)).map((field) => ({
    ...field,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      dispatch(demoActions.setFormField({ key: field.key, value: event.target.value })),
    boxes:
      'boxes' in field
        ? field.boxes.map((box) => ({
            ...box,
            toggle: () => dispatch(demoActions.toggleFormCheck({ key: field.key, id: box.id }))
          }))
        : undefined
  }));

  return {
    // The Floorplan and Floorplate dialogs have their own richer layouts.
    modalOpen: !!demo.modal && GENERIC_MODALS.includes(demo.modal) && demo.modal !== 'floorplan',
    modalTitle: generateModalTitle(demo),
    modalSaveLabel: generateModalSaveLabel(demo),
    modalFields,
    closeModal: () => dispatch(demoActions.closeModal()),
    saveModal
  };
};
