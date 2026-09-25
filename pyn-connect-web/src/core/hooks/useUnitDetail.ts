'use client';

import { useCallback, useMemo, useState } from 'react';

import { i18n } from '~/resources/i18n';
import type { InventoryUnit, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import type { ConfirmDescriptor, ImageDescriptor } from '~/core/utils/generator/inventory/inventory.types';
import { S } from '~/core/utils/generator/inventory/inventoryText';
import { generateUnitDetail } from '~/core/utils/generator/inventory/unitDetail.generator';
import type { ViewerState } from './usePropertyInventory';

/**
 * View state of the Unit Detail screen: the image viewer, the Edit Unit
 * dialog, and the shared confirm for Delete / Re-sync. Nothing here writes to
 * the CMS: the dialog's Save and the confirm's button only close.
 */
export const useUnitDetail = (inventory: PropertyInventory, unit: InventoryUnit, today: string) => {
  const dispatch = useAppDispatch();
  const [viewer, setViewer] = useState<ViewerState>({ images: [], index: 0 });
  const [editing, setEditing] = useState(false);

  const detail = useMemo(() => generateUnitDetail(inventory, unit, today), [inventory, unit, today]);

  const openViewer = useCallback((images: ImageDescriptor[], index = 0) => {
    if (images.length) setViewer({ images, index });
  }, []);
  const closeViewer = useCallback(() => setViewer({ images: [], index: 0 }), []);
  const setViewerIndex = useCallback((index: number) => setViewer((current) => ({ ...current, index })), []);

  // The app's shared confirm dialog with no action behind it, as the inventory uses it.
  const confirm = useCallback(
    (descriptor: ConfirmDescriptor) =>
      dispatch(
        demoActions.askConfirm({
          title: descriptor.title,
          msg: `${descriptor.message} ${i18n.t(S.dialogs.confirm.readOnly)}`,
          label: descriptor.label,
          action: null
        })
      ),
    [dispatch]
  );

  return {
    detail,
    viewer,
    openViewer,
    closeViewer,
    setViewerIndex,
    editing,
    openEdit: useCallback(() => setEditing(true), []),
    closeEdit: useCallback(() => setEditing(false), []),
    resync: () => confirm(detail.resyncConfirm),
    remove: () => confirm(detail.deleteConfirm)
  };
};
