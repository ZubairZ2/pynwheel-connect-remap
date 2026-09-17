'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { curProp } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { rangeLabelOf } from '~/core/utils/generator/connect/inventory.generator';

import { useModalSave } from './useModalSave';

/** Add / edit a floorplate: its name or floor range, plus its two plan assets. */
export const useFloorplateDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const saveModal = useModalSave();

  const form = demo.form as Record<string, string>;
  const manual = form.fpOverride === 'Yes';
  const rangeLabel = rangeLabelOf(form.fpRange);

  const setField = (key: string, value: string | boolean) =>
    dispatch(demoActions.setFormField({ key, value }));

  /** Names a plan file after the floorplate, the way the design does. */
  const fileNameFor = (extension: string) => {
    const base =
      (form.fpName || form.fpRange || 'floorplate')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'floorplate';
    return `${base}${extension}`;
  };

  return {
    fpModalOpen: demo.modal === 'floorplate',
    fpModalTitle: demo.editingId ? 'Edit Floorplate' : 'Add Floorplate',
    closeModal: () => dispatch(demoActions.closeModal()),
    saveModal,
    fpForm: {
      overrideYes: manual,
      overrideNo: !manual,
      pickYes: () => setField('fpOverride', 'Yes'),
      pickNo: () => setField('fpOverride', 'No'),
      yesDot: manual ? 'var(--bo-accent)' : 'transparent',
      yesRing: manual ? 'var(--bo-accent)' : 'var(--bo-line)',
      noDot: manual ? 'transparent' : 'var(--bo-accent)',
      noRing: manual ? 'var(--bo-line)' : 'var(--bo-accent)',
      name: form.fpName ?? '',
      onName: (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setField('fpName', value);
        // Typing a name switches Manual Override on, as the design does.
        if (!manual && value.trim()) {
          setField('fpOverride', 'Yes');
          dispatch(
            demoActions.showToast('Manual Override switched on — this name is used instead of the range.')
          );
        }
      },
      nameBg: manual ? '#fff' : '#F4F5F7',
      nameColor: manual ? 'var(--bo-ink)' : 'var(--bo-subtle)',
      nameNote: manual
        ? 'Shown on the map and the floor stepper'
        : 'Typing here switches Manual Override on — otherwise the name comes from the range',
      building: form.fbuilding ?? '',
      onBuilding: (event: React.ChangeEvent<HTMLSelectElement>) => setField('fbuilding', event.target.value),
      buildingOptions: (curProp(demo)?.buildings ?? [{ name: 'Main', units: 0 }]).map((b) => b.name),
      range: form.fpRange ?? '',
      onRange: (event: React.ChangeEvent<HTMLInputElement>) => setField('fpRange', event.target.value),
      rangePreview: rangeLabel
        ? `Reads as “${rangeLabel}”`
        : manual
          ? "Optional when the floorplate is named manually · '3', '3-10', or '3,5,7'"
          : "Valid formats: '3' one floor, '3-10' range, '3,5,7' for specific floors",
      rangeColor: rangeLabel ? 'var(--bo-muted)' : 'var(--bo-subtle)',
      addName: !!demo.form.fpAddName,
      toggleAddName: () => dispatch(demoActions.toggleFormFlag('fpAddName')),
      addNameBg: demo.form.fpAddName ? 'var(--bo-accent)' : '#CDD2DB',
      addNameKnob: demo.form.fpAddName ? '21px' : '3px',
      img: form.fpImg ?? '',
      hasImg: !!form.fpImg,
      noImg: !form.fpImg,
      pickImg: () => {
        setField('fpImg', fileNameFor('-background.png'));
        dispatch(demoActions.showToast('Image selected — save the floorplate to apply it.'));
      },
      dropImg: () => setField('fpImg', ''),
      svg: form.fpSvg ?? '',
      hasSvg: !!form.fpSvg,
      noSvg: !form.fpSvg,
      pickSvg: () => {
        setField('fpSvg', fileNameFor('-floor.svg'));
        dispatch(demoActions.showToast('SVG selected — save the floorplate to apply it.'));
      },
      dropSvg: () => setField('fpSvg', '')
    }
  };
};
