'use client';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curInv, curTour, levels } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generateUnitDetail } from '~/core/utils/generator/connect/inventory.generator';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

const noop = () => undefined;

/** Shown when a property has no units at all, so the screen still renders. */
const EMPTY_UNIT = {
  onAvail: noop,
  addPhoto: noop,
  edit: noop,
  remove: noop,
  view: noop,
  id: '',
  name: '—',
  fpName: '—',
  bedLabel: '—',
  availLabel: '—',
  availV: 'neutral',
  avail: 'available',
  availOptions: ['available', 'almost', 'sold'],
  priceLabel: '—',
  sqftLabel: '—',
  where: '—',
  pmsFloor: '—',
  plottedLabel: 'Not on map',
  plottedV: 'warn',
  plotted: false,
  notPlotted: true,
  coord: '—',
  fields: [] as Array<Record<string, unknown>>,
  photoCount: '0 photos',
  hasPhotos: false,
  photos: [] as Array<Record<string, unknown>>,
  termRows: [] as Array<Record<string, unknown>>,
  viewLabel: 'Plot on Plan'
};

export const useUnitDetailScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const detail = generateUnitDetail(demo);
  const inv = curInv(demo);

  const unitDetail = detail
    ? {
        ...detail,
        onAvail: (e: React.ChangeEvent<HTMLSelectElement>) =>
          dispatch(
            demoActions.setUnitAvail({
              id: detail.id,
              value: e.target.value as 'available' | 'almost' | 'sold'
            })
          ),
        fields: detail.fields.map((field) => ({
          ...field,
          toggle: () => dispatch(demoActions.toggleUnitSrc({ id: detail.id, field: field.key })),
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            dispatch(demoActions.setUnitField({ id: detail.id, field: field.key, value: e.target.value }))
        })),
        addPhoto: () => dispatch(demoActions.addGalleryPhoto({ kind: 'units', id: detail.id })),
        photos: detail.photos.map((photo) => ({
          ...photo,
          up: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'units', id: detail.id, index: photo.index, dir: -1 })),
          down: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'units', id: detail.id, index: photo.index, dir: 1 })),
          drop: () =>
            actions.confirm({
              title: 'Remove this photo?',
              msg: 'It is deleted from the gallery on the kiosk, the web embed, and the emailed brochure.',
              label: 'Remove Photo',
              action: {
                type: demoActions.removeGalleryPhoto.type,
                payload: { kind: 'units', id: detail.id, index: photo.index }
              }
            })
        })),
        edit: () => {
          const unit = inv.units.find((u) => u.id === detail.id);
          if (!unit) return;
          const level =
            levels(demo).find((l) => l.id === (unit.plevel ?? unit.level)) ?? levels(demo)[0];
          dispatch(
            demoActions.openModal({
              kind: 'unit',
              editingId: unit.id,
              form: {
                name: unit.name,
                ufp: inv.floorplans.find((f) => f.id === unit.fpId)?.name ?? '—',
                price: String(unit.price),
                sqft: String(unit.sqft),
                ufloor: unit.floor,
                ubuilding: unit.building,
                uavail: unit.avail,
                ulevel: level ? `${level.floor} · ${level.building}` : ''
              }
            })
          );
        },
        remove: () => {
          const unit = inv.units.find((u) => u.id === detail.id);
          if (!unit) return;
          const stopped = curTour(demo).stops.some((s) => s.name === unit.name);
          actions.confirm({
            title: `Delete ${unit.name}?`,
            msg: `The unit, its pin on the site plan, and its gallery are removed${
              stopped
                ? ', and the tour stop promoted from it is deleted with its pathway connections.'
                : '.'
            }`,
            label: 'Delete Unit',
            action: { type: demoActions.removeUnit.type, payload: unit.id }
          });
        },
        view: () => actions.plotItem({ kind: 'unit', id: detail.id }, detail.plotted ? 'select' : 'plot')
      }
    : EMPTY_UNIT;

  return {
    prop: generatePropertyView(demo),
    unitDetail,
    goInventoryFromUnit: () => actions.goInventory('units'),
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties),
    resyncPms: () => {
      const protectedCount = inv.units.reduce(
        (total, u) => total + Object.values(u.src).filter((v) => v === 'manual').length,
        0
      );
      actions.confirm({
        title: 'Re-sync units from the PMS feed?',
        msg: `Provider-controlled fields are overwritten with the latest feed values. ${plural(
          protectedCount,
          'manual override'
        )} across this property will be preserved.`,
        label: 'Run Sync',
        action: { type: demoActions.resyncPms.type }
      });
    }
  };
};
