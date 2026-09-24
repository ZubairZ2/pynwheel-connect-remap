'use client';

import { useCallback, useMemo, useState } from 'react';

import { i18n } from '~/resources/i18n';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import {
  generateInventoryHeader,
  generateInventoryTabs,
  type InventoryTab
} from '~/core/utils/generator/inventory/inventoryHeader.generator';
import type { ConfirmDescriptor, ImageDescriptor } from '~/core/utils/generator/inventory/inventory.types';
import { S } from '~/core/utils/generator/inventory/inventoryText';

/** The dialog on screen: which form, and for which record (null: Add). */
export type InventoryDialog =
  | { kind: 'floorplate' | 'floorplan' | 'unit' | 'amenity'; id: number | null }
  /** Mass overrides apply to the units the Units tab's filters leave. */
  | { kind: 'mass'; count: number; filtered: boolean };

export interface ViewerState {
  images: ImageDescriptor[];
  index: number;
}

/**
 * Screen-level state of the Property Inventory: the active tab, the image
 * viewer, and which dialog is open. Nothing here writes to the CMS.
 */
export const usePropertyInventory = (inventory: PropertyInventory, initialTab: InventoryTab) => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<InventoryTab>(initialTab);
  const [viewer, setViewer] = useState<ViewerState>({ images: [], index: 0 });
  const [dialog, setDialog] = useState<InventoryDialog | null>(null);

  // The tab lives in the URL so a link or a refresh lands on it. The native
  // history API keeps Next.js from re-rendering the page (and re-fetching the
  // inventory) for what is only a view change.
  const selectTab = useCallback((next: InventoryTab) => {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    if (next === 'floorplates') params.delete('tab');
    else params.set('tab', next);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  const openViewer = useCallback((images: ImageDescriptor[], index = 0) => {
    if (images.length) setViewer({ images, index });
  }, []);

  const closeViewer = useCallback(() => setViewer({ images: [], index: 0 }), []);

  const setViewerIndex = useCallback((index: number) => setViewer((current) => ({ ...current, index })), []);

  /**
   * The app's shared confirm dialog, with no action behind it: confirming only
   * closes it, and the message says so.
   */
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
    header: useMemo(() => generateInventoryHeader(inventory), [inventory]),
    tabs: useMemo(() => generateInventoryTabs(inventory, tab), [inventory, tab]),
    tab,
    selectTab,
    viewer,
    openViewer,
    closeViewer,
    setViewerIndex,
    dialog,
    openDialog: setDialog,
    closeDialog: useCallback(() => setDialog(null), []),
    confirm
  };
};

export type InventoryActions = Pick<
  ReturnType<typeof usePropertyInventory>,
  'openViewer' | 'openDialog' | 'confirm'
>;
