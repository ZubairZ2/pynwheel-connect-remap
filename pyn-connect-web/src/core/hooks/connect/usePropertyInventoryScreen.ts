'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { plural } from '~/core/utils/connect/format';
import { AMENITY_CATEGORIES } from '~/data/mock/core.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curInv, curProp, curTour, levels } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';
import {
  generateFloorplateSummary,
  generateFloorplates,
  generateInvAmenities,
  generateInvFloorplans,
  generateInvUnits,
  generateTcTabs,
  generateUnplotted,
  rangeLabelOf
} from '~/core/utils/generator/connect/inventory.generator';

import { useFloorplanForms } from './useFloorplanForms';

export const usePropertyInventoryScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const inv = curInv(demo);
  const prop = curProp(demo);
  const forms = useFloorplanForms();

  const tcTabs = useMemo(
    () =>
      generateTcTabs(demo).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setTab({ key: 'tcTab', value: tab.id }))
      })),
    [demo, dispatch]
  );

  const invFloorplans = useMemo(
    () =>
      generateInvFloorplans(demo).map((plan) => ({
        ...plan,
        termRows: plan.termRows.map((row) => ({
          ...row,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            dispatch(
              demoActions.setTermRate({
                fpId: plan.id,
                term: row.termKey,
                value: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0
              })
            )
        })),
        srcRows: plan.srcRows.map((row) => ({
          ...row,
          toggle: () => dispatch(demoActions.toggleFpSrc({ id: plan.id, field: row.key }))
        })),
        addPhoto: () => dispatch(demoActions.addGalleryPhoto({ kind: 'floorplans', id: plan.id })),
        photos: plan.photos.map((photo) => ({
          ...photo,
          up: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'floorplans', id: plan.id, index: photo.index, dir: -1 })),
          down: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'floorplans', id: plan.id, index: photo.index, dir: 1 })),
          drop: () =>
            actions.confirm({
              title: 'Remove this photo?',
              msg: 'It is deleted from the gallery on the kiosk, the web embed, and the emailed brochure.',
              label: 'Remove Photo',
              action: {
                type: demoActions.removeGalleryPhoto.type,
                payload: { kind: 'floorplans', id: plan.id, index: photo.index }
              }
            })
        })),
        edit: () => forms.editFloorplan(plan.id),
        remove: () =>
          actions.confirm({
            title: `Delete ${plan.name}?`,
            msg: `This removes the floorplan, its lease-term pricing, and its gallery. ${plural(
              inv.units.filter((u) => u.fpId === plan.id).length,
              'unit'
            )} currently reference it and will show no floorplan until reassigned.`,
            label: 'Delete Floorplan',
            action: { type: demoActions.removeFloorplan.type, payload: plan.id }
          })
      })),
    [demo, dispatch, actions, forms, inv]
  );

  const editUnitForm = (id: string) => {
    const unit = inv.units.find((u) => u.id === id);
    if (!unit) return;
    const level = levels(demo).find((l) => l.id === (unit.plevel ?? unit.level)) ?? levels(demo)[0];
    dispatch(
      demoActions.openModal({
        kind: 'unit',
        editingId: id,
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
  };

  const invUnits = useMemo(
    () =>
      generateInvUnits(demo).map((unit) => ({
        ...unit,
        fields: unit.fields.map((field) => ({
          ...field,
          toggle: () => dispatch(demoActions.toggleUnitSrc({ id: unit.id, field: field.key }))
        })),
        open: () => actions.openUnit(unit.id),
        manageImages: () => actions.openUnit(unit.id),
        edit: () => editUnitForm(unit.id),
        remove: () =>
          actions.confirm({
            title: `Delete ${unit.name}?`,
            msg: `The unit, its pin on the site plan, and its gallery are removed${
              curTour(demo).stops.some((s) => s.name === unit.name)
                ? ', and the tour stop promoted from it is deleted with its pathway connections.'
                : '.'
            }`,
            label: 'Delete Unit',
            action: { type: demoActions.removeUnit.type, payload: unit.id }
          })
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demo, dispatch, actions]
  );

  const invAmenities = useMemo(
    () =>
      generateInvAmenities(demo).map((amenity) => ({
        ...amenity,
        onCat: (e: React.ChangeEvent<HTMLSelectElement>) =>
          dispatch(demoActions.setAmenityCategory({ id: amenity.id, value: e.target.value })),
        addPhoto: () => dispatch(demoActions.addGalleryPhoto({ kind: 'amenities', id: amenity.id })),
        photos: amenity.photos.map((photo) => ({
          ...photo,
          up: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'amenities', id: amenity.id, index: photo.index, dir: -1 })),
          down: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'amenities', id: amenity.id, index: photo.index, dir: 1 })),
          drop: () =>
            actions.confirm({
              title: 'Remove this photo?',
              msg: 'It is deleted from the gallery on the kiosk, the web embed, and the emailed brochure.',
              label: 'Remove Photo',
              action: {
                type: demoActions.removeGalleryPhoto.type,
                payload: { kind: 'amenities', id: amenity.id, index: photo.index }
              }
            })
        })),
        edit: () => {
          const level =
            levels(demo).find((l) => l.id === (amenity.plevel ?? amenity.level)) ?? levels(demo)[0];
          dispatch(
            demoActions.openModal({
              kind: 'amenity',
              editingId: amenity.id,
              form: {
                name: amenity.name,
                acat: amenity.category,
                alevel: level ? `${level.floor} · ${level.building}` : ''
              }
            })
          );
        },
        remove: () =>
          actions.confirm({
            title: `Delete ${amenity.name}?`,
            msg: `The amenity, its pin on the site plan, and its photo gallery are removed${
              curTour(demo).stops.some((s) => s.name === amenity.name)
                ? ', and the tour stop promoted from it is deleted with its pathway connections.'
                : '.'
            }`,
            label: 'Delete Amenity',
            action: { type: demoActions.removeAmenity.type, payload: amenity.id }
          })
      })),
    [demo, dispatch, actions]
  );

  const floorplates = useMemo(
    () =>
      generateFloorplates(demo).map((plate) => ({
        ...plate,
        open: () => {
          dispatch(demoActions.pickLevel(plate.id));
          actions.goMapEditor();
        },
        uploadSvg: () => {
          dispatch(demoActions.applyPlanUpload({ levelId: plate.id, slot: 'svg' }));
          actions.goMapEditor();
        },
        uploadRaster: () => {
          dispatch(demoActions.applyPlanUpload({ levelId: plate.id, slot: 'bg' }));
          actions.goMapEditor();
        },
        uploadBg: () => dispatch(demoActions.applyPlanUpload({ levelId: plate.id, slot: 'bg' })),
        uploadSvgFile: () => dispatch(demoActions.applyPlanUpload({ levelId: plate.id, slot: 'svg' })),
        dropBg: () =>
          actions.confirm({
            title: 'Remove the background image?',
            msg: 'The floorplate loses its background context layer. The floor SVG and every pin stay in place.',
            label: 'Remove',
            action: { type: demoActions.removePlanAsset.type, payload: { levelId: plate.id, slot: 'bg' } }
          }),
        dropSvg: () =>
          actions.confirm({
            title: 'Remove the floor SVG?',
            msg: 'Room geometry stops rendering on this floorplate. Pins keep their coordinates and reappear when a new SVG is uploaded.',
            label: 'Remove',
            action: { type: demoActions.removePlanAsset.type, payload: { levelId: plate.id, slot: 'svg' } }
          }),
        optimizeSvg: () => actions.optimizeSvg(plate.id),
        edit: () => {
          const level = levels(demo).find((l) => l.id === plate.id);
          if (!level) return;
          const extended = level as typeof level & { range?: string; manualName?: boolean; showFloorName?: boolean };
          const derived = (level.floor.match(/\d+(\s*[-,]\s*\d+)*/) ?? [''])[0].replace(/\s+/g, '');
          const named = !!extended.manualName || !derived;
          dispatch(
            demoActions.openModal({
              kind: 'floorplate',
              editingId: plate.id,
              form: {
                fbuilding: level.building,
                fpOverride: named ? 'Yes' : 'No',
                fpName: named ? level.floor : '',
                fpRange: extended.range ?? derived,
                fpAddName: !!extended.showFloorName,
                fpImg: demo.lvBg[plate.id] ?? (level.plan === 'Raster' ? level.file : ''),
                fpSvg: demo.lvSvg[plate.id] ?? (level.plan === 'SVG' ? level.file : '')
              }
            })
          );
        },
        remove: () => {
          const affected = [...inv.units, ...inv.amenities].filter(
            (o) => (o.plevel ?? o.level) === plate.id
          ).length;
          actions.confirm({
            title: `Delete the ${plate.floor} floorplate?`,
            msg: `Its background image and floor SVG are deleted. ${plural(
              affected,
              'item'
            )} assigned to this floor return to the unplotted list.`,
            label: 'Delete Floorplate',
            action: { type: demoActions.removeFloorplate.type, payload: plate.id }
          });
        }
      })),
    [demo, dispatch, actions, inv]
  );

  const unplotted = generateUnplotted(demo);

  return {
    prop: generatePropertyView(demo),
    tcTabs,
    isTcFloorplates: demo.tcTab === 'floorplates',
    isTcFloorplans: demo.tcTab === 'floorplans',
    isTcUnits: demo.tcTab === 'units',
    isTcAmenities: demo.tcTab === 'amenities',
    isTcUnplotted: demo.tcTab === 'unplotted',
    lastSync: demo.lastSync,
    floorplates,
    floorplateSummary: generateFloorplateSummary(demo),
    addFloorplate: () =>
      dispatch(
        demoActions.openModal({
          kind: 'floorplate',
          form: {
            fbuilding: prop.buildings[0]?.name ?? 'Main',
            fpOverride: 'No',
            fpName: '',
            fpRange: '',
            fpAddName: false,
            fpImg: '',
            fpSvg: ''
          }
        })
      ),
    invFloorplans,
    invHasFloorplans: inv.floorplans.length > 0,
    addFloorplan: forms.addFloorplan,
    invUnits,
    invHasUnits: inv.units.length > 0,
    addUnit: () => {
      const level = levels(demo)[0];
      dispatch(
        demoActions.openModal({
          kind: 'unit',
          form: {
            name: '',
            ufp: inv.floorplans[0]?.name ?? '—',
            price: '2000',
            sqft: '800',
            ufloor: level?.floor ?? 'Floor 1',
            ubuilding: level?.building ?? 'Main',
            uavail: 'available',
            ulevel: level ? `${level.floor} · ${level.building}` : ''
          }
        })
      );
    },
    invAmenities,
    invHasAmenities: inv.amenities.length > 0,
    addAmenity: () => {
      const level = levels(demo)[0];
      dispatch(
        demoActions.openModal({
          kind: 'amenity',
          form: {
            name: '',
            acat: AMENITY_CATEGORIES[0],
            alevel: level ? `${level.floor} · ${level.building}` : ''
          }
        })
      );
    },
    ...unplotted,
    unplottedUnits: unplotted.unplottedUnits.map((unit) => ({
      ...unit,
      plot: () => actions.plotItem({ kind: 'unit', id: unit.id }, 'plot')
    })),
    unplottedAmenities: unplotted.unplottedAmenities.map((amenity) => ({
      ...amenity,
      plot: () => actions.plotItem({ kind: 'amenity', id: amenity.id }, 'plot')
    })),
    plotAllUnits: actions.autoPlot,
    puMassOverride: () =>
      inv.units.length
        ? dispatch(demoActions.openModal({ kind: 'pumass', form: { action: 'protect' } }))
        : dispatch(demoActions.showToast('No units match the current search.')),
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
    },
    publishTour: actions.publishTour,
    goMapEditor: actions.goMapEditor,
    goTourSetup: actions.goTourSetup,
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties),
    rangeLabelOf
  };
};
