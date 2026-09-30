'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_API, APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type { InventoryUnitListing, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import {
  dialogNeedsUnits,
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

/** The units listing's state while the screen reads it on demand; `ready` once it is in `inventory`. */
export type UnitsStatus = 'ready' | 'idle' | 'loading' | 'failed';

export interface ViewerState {
  images: ImageDescriptor[];
  index: number;
}

/**
 * Screen-level state of the Property Inventory: the active tab, the image
 * viewer, which dialog is open, and the units listing, which the server leaves
 * out and this hook reads the first time the Units tab or a dialog that needs
 * units opens — once: later visits reuse it, and a second trigger while it is
 * on its way joins the same request. Nothing here writes to the CMS.
 */
export const usePropertyInventory = (initial: PropertyInventory, initialTab: InventoryTab) => {
  const dispatch = useAppDispatch();
  const [inventory, setInventory] = useState(initial);
  const [unitsStatus, setUnitsStatus] = useState<UnitsStatus>(initial.unitsLoaded ? 'ready' : 'idle');
  const [tab, setTab] = useState<InventoryTab>(initialTab);
  const [viewer, setViewer] = useState<ViewerState>({ images: [], index: 0 });
  const [dialog, setDialog] = useState<InventoryDialog | null>(null);
  const unitsRequest = useRef<Promise<void> | null>(null);
  const propertyId = initial.property.id;

  const loadUnits = useCallback(() => {
    if (unitsRequest.current) return;
    setUnitsStatus('loading');
    unitsRequest.current = (async () => {
      try {
        const response = await fetch(APP_API.inventoryUnits(propertyId), {
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (response.status === 401) {
          window.location.assign(APP_ROUTES.signIn);
          return;
        }
        const body = (await response.json()) as { ok: boolean; listing?: InventoryUnitListing };
        if (!response.ok || !body.ok || !body.listing) throw new Error(`units listing answered ${response.status}`);
        const listing = body.listing;
        setInventory((current) => ({ ...current, ...listing, unitsLoaded: true, unitCount: listing.units.length }));
        setUnitsStatus('ready');
      } catch {
        setUnitsStatus('failed');
      } finally {
        unitsRequest.current = null;
      }
    })();
  }, [propertyId]);

  // Read the units when something on screen first needs them. A failure waits
  // for Retry rather than looping.
  const wantsUnits = tab === 'units' || (!!dialog && dialogNeedsUnits(dialog.kind));
  useEffect(() => {
    if (wantsUnits && unitsStatus === 'idle') loadUnits();
  }, [wantsUnits, unitsStatus, loadUnits]);

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
    inventory,
    unitsStatus,
    retryUnits: loadUnits,
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
