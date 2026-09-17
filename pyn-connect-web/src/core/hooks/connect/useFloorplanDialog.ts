'use client';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';

import { useModalSave } from './useModalSave';

/** Add / edit a floor plan, including its CTA buttons and render images. */
export const useFloorplanDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const saveModal = useModalSave();

  const form = demo.form as Record<string, string>;
  const manual = form.fplOverride === 'Yes';

  const setField = (key: string, value: string) => dispatch(demoActions.setFormField({ key, value }));
  const onField = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setField(key, event.target.value);

  const pickImage = (key: 'primaryImg' | 'secondaryImg') => () => {
    const base =
      (form.name || 'floorplan')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'floorplan';
    setField(key, `${base}-${key === 'primaryImg' ? 'primary' : 'secondary'}.jpg`);
    dispatch(demoActions.showToast('Image selected — save the floor plan to apply it.'));
  };

  const toggleFlag = (key: string) => () => dispatch(demoActions.toggleFormFlag(key));
  const flagBg = (key: string) => (demo.form[key] ? 'var(--bo-accent)' : '#CDD2DB');
  const flagKnob = (key: string) => (demo.form[key] ? '21px' : '3px');

  return {
    fplModalOpen: demo.modal === 'floorplan',
    fplModalTitle: demo.editingId ? 'Edit Floor Plan' : 'Add Floor Plan',
    fplSaveLabel: demo.editingId ? 'Save Floor Plan' : 'Add Floor Plan',
    closeModal: () => dispatch(demoActions.closeModal()),
    saveModal,
    fplForm: {
      pickYes: () => setField('fplOverride', 'Yes'),
      pickNo: () => setField('fplOverride', 'No'),
      yesDot: manual ? 'var(--bo-accent)' : 'transparent',
      yesRing: manual ? 'var(--bo-accent)' : 'var(--bo-line)',
      noDot: manual ? 'transparent' : 'var(--bo-accent)',
      noRing: manual ? 'var(--bo-line)' : 'var(--bo-accent)',
      fieldBg: manual ? '#fff' : '#F4F5F7',
      fieldColor: manual ? 'var(--bo-ink)' : 'var(--bo-subtle)',
      name: form.name ?? '',
      onName: (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setField('name', value);
        if (!manual && value.trim()) {
          setField('fplOverride', 'Yes');
          dispatch(
            demoActions.showToast(
              'Manual Override switched on — these details are protected from the next PMS sync.'
            )
          );
        }
      },
      providerId: form.providerId ?? '',
      onProviderId: onField('providerId'),
      sqft: form.sqft ?? '',
      onSqft: onField('sqft'),
      beds: form.beds ?? '',
      onBeds: onField('beds'),
      baths: form.baths ?? '',
      onBaths: onField('baths'),
      price: form.price ?? '',
      onPrice: onField('price'),
      btnLabel: form.btnLabel ?? '',
      onBtnLabel: onField('btnLabel'),
      btnUrl: form.btnUrl ?? '',
      onBtnUrl: onField('btnUrl'),
      toggleBtnTab: toggleFlag('btnNewTab'),
      btnTabBg: flagBg('btnNewTab'),
      btnTabKnob: flagKnob('btnNewTab'),
      b2Label: form.b2Label ?? '',
      onB2Label: onField('b2Label'),
      b2Url: form.b2Url ?? '',
      onB2Url: onField('b2Url'),
      toggleB2Tab: toggleFlag('b2NewTab'),
      b2TabBg: flagBg('b2NewTab'),
      b2TabKnob: flagKnob('b2NewTab'),
      b3Label: form.b3Label ?? '',
      onB3Label: onField('b3Label'),
      b3Url: form.b3Url ?? '',
      onB3Url: onField('b3Url'),
      toggleB3Tab: toggleFlag('b3NewTab'),
      b3TabBg: flagBg('b3NewTab'),
      b3TabKnob: flagKnob('b3NewTab'),
      detailsTitle: form.detailsTitle ?? '',
      onDetailsTitle: onField('detailsTitle'),
      details: form.details ?? '',
      onDetails: onField('details'),
      primaryImg: form.primaryImg ?? '',
      hasPrimary: !!form.primaryImg,
      noPrimary: !form.primaryImg,
      pickPrimary: pickImage('primaryImg'),
      dropPrimary: () => setField('primaryImg', ''),
      secondaryImg: form.secondaryImg ?? '',
      hasSecondary: !!form.secondaryImg,
      noSecondary: !form.secondaryImg,
      pickSecondary: pickImage('secondaryImg'),
      dropSecondary: () => setField('secondaryImg', '')
    }
  };
};
