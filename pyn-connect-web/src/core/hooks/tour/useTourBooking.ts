'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { Availability, BookingSettings, HoursLane, TourModuleMeta } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import {
  B,
  DAYS,
  WEEKDAYS,
  formChanged,
  formDraftOf,
  formPayload,
  generateGateRows,
  hoursChanged,
  hoursDraftOf,
  hoursErrors,
  hoursPayload,
  rulesChanged,
  rulesDraftOf,
  rulesPayload,
  rulesProblems,
  widgetState,
  type BookingSection,
  type ButtonDraft,
  type FormDraft,
  type HoursDraft,
  type RulesDraft
} from '~/core/utils/generator/tour/tourBooking.generator';
import { tourGet, tourPost } from '~/core/utils/tour/tourApi.client';
import { writeErrorText } from './useTourLocks';

const X = CORE_STRINGS.tourModules.common;
const E = CORE_STRINGS.tourModules.errors;

/**
 * The booking settings (`/connect/booking`): the rules, hours and form
 * drafts the Settings tab edits, each saved by its own CMS write, and the
 * availability the prospect preview shows. Every save replaces the settings
 * with the ones the CMS answers, so the drafts restart from what is stored.
 */
export const useTourBooking = (propertyId: number, enabled = true) => {
  const dispatch = useAppDispatch();
  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [meta, setMeta] = useState<TourModuleMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<BookingSection>('rules');
  const [rules, setRulesState] = useState<RulesDraft | null>(null);
  const [hours, setHoursState] = useState<HoursDraft | null>(null);
  const [form, setFormState] = useState<FormDraft | null>(null);
  const [saving, setSaving] = useState<'rules' | 'hours' | 'form' | null>(null);
  const [hoursEditor, setHoursEditor] = useState<{ lane: HoursLane; day: string } | null>(null);
  const [preview, setPreview] = useState<Availability | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);

  const adopt = useCallback((next: BookingSettings) => {
    setSettings(next);
    setRulesState(rulesDraftOf(next));
    setHoursState(hoursDraftOf(next));
    setFormState(formDraftOf(next));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await tourGet<BookingSettings>(propertyId, 'booking');
    if (result.ok) {
      adopt(result.data);
      setMeta(result.meta);
    } else {
      setError(result.error === 'unauthorized' ? i18n.t(E.unauthorized) : i18n.t(X.loadFailed));
    }
    setLoading(false);
  }, [adopt, propertyId]);

  useEffect(() => {
    if (!enabled || settings || loading) return;
    void load();
  }, [enabled, load, loading, settings]);

  const canEdit = !!meta?.canEdit && !!meta?.writesEnabled;
  const refuse = useCallback(() => toast(i18n.t(meta?.writesEnabled ? X.readOnly : X.writesOff)), [meta?.writesEnabled, toast]);

  const write = useCallback(
    async (kind: 'rules' | 'hours' | 'form', path: string, payload: unknown, success: string): Promise<boolean> => {
      setSaving(kind);
      const result = await tourPost<BookingSettings>(propertyId, path, payload);
      if (result.ok) {
        adopt(result.data);
        setMeta(result.meta);
        toast(success);
      } else {
        toast(writeErrorText(result));
      }
      setSaving(null);
      return result.ok;
    },
    [adopt, propertyId, toast]
  );

  /* ── rules ────────────────────────────────────────────────────────── */

  const baseRules = useMemo(() => (settings ? rulesDraftOf(settings) : null), [settings]);
  const setRules = useCallback((patch: Partial<RulesDraft>) => setRulesState((current) => (current ? { ...current, ...patch } : current)), []);
  const rulesDirty = !!rules && !!baseRules && rulesChanged(rules, baseRules);
  const ruleProblems = useMemo(() => (rules && baseRules ? rulesProblems(rules, baseRules) : {}), [rules, baseRules]);

  const saveRules = useCallback(async () => {
    if (!rules || !baseRules) return;
    if (!canEdit) return refuse();
    const payload = rulesPayload(rules, baseRules);
    if (!Object.keys(payload).length) return toast(i18n.t(X.nothingToSave));
    const problem = Object.values(ruleProblems)[0];
    if (problem) return toast(problem);
    await write('rules', 'booking/rules', payload, i18n.t(B.rules.saved));
  }, [baseRules, canEdit, refuse, ruleProblems, rules, toast, write]);

  /* ── hours ────────────────────────────────────────────────────────── */

  const hoursDirty = !!hours && !!settings && hoursChanged(hours, settings);
  const hourErrors = useMemo(() => (hours ? hoursErrors(hours) : {}), [hours]);

  const setRanges = useCallback(
    (lane: HoursLane, day: string, ranges: { open: string; close: string }[]) => setHoursState((current) => (current ? { ...current, [lane]: { ...current[lane], [day]: ranges } } : current)),
    []
  );
  const setRange = useCallback(
    (lane: HoursLane, day: string, index: number, patch: { open?: string; close?: string }) =>
      setHoursState((current) => {
        if (!current) return current;
        const ranges = (current[lane][day] ?? []).map((range, i) => (i === index ? { ...range, ...patch } : range));
        return { ...current, [lane]: { ...current[lane], [day]: ranges } };
      }),
    []
  );
  const addRange = useCallback(
    (lane: HoursLane, day: string) =>
      setHoursState((current) => {
        if (!current) return current;
        const ranges = current[lane][day] ?? [];
        const last = ranges[ranges.length - 1];
        const open = last ? last.close : '09:00';
        const close = last ? (last.close < '21:00' ? '21:00' : '23:00') : '17:00';
        return { ...current, [lane]: { ...current[lane], [day]: [...ranges, { open, close }] } };
      }),
    []
  );
  const removeRange = useCallback(
    (lane: HoursLane, day: string, index: number) =>
      setHoursState((current) => (current ? { ...current, [lane]: { ...current[lane], [day]: (current[lane][day] ?? []).filter((_, i) => i !== index) } } : current)),
    []
  );
  const applyWeekdays = useCallback(
    (lane: HoursLane, day: string) =>
      setHoursState((current) => {
        if (!current) return current;
        const ranges = (current[lane][day] ?? []).map((range) => ({ ...range }));
        const laneHours = { ...current[lane] };
        WEEKDAYS.forEach((weekday) => {
          laneHours[weekday] = ranges.map((range) => ({ ...range }));
        });
        return { ...current, [lane]: laneHours };
      }),
    []
  );

  const saveHours = useCallback(async () => {
    if (!hours) return;
    if (!canEdit) return refuse();
    const problem = Object.values(hourErrors)[0];
    if (problem) return toast(problem);
    if (!hoursDirty) return toast(i18n.t(X.nothingToSave));
    const ok = await write('hours', 'booking/hours', hoursPayload(hours), i18n.t(B.hours.saved));
    if (ok) setHoursEditor(null);
  }, [canEdit, hourErrors, hours, hoursDirty, refuse, toast, write]);

  /* ── form ─────────────────────────────────────────────────────────── */

  const baseForm = useMemo(() => (settings ? formDraftOf(settings) : null), [settings]);
  const setForm = useCallback((patch: Partial<Omit<FormDraft, 'button'>>) => setFormState((current) => (current ? { ...current, ...patch } : current)), []);
  const setFormAll = useCallback((next: FormDraft) => setFormState(next), []);
  const setButton = useCallback((patch: Partial<ButtonDraft>) => setFormState((current) => (current ? { ...current, button: { ...current.button, ...patch } } : current)), []);
  const formDirty = !!form && !!baseForm && formChanged(form, baseForm);

  const saveForm = useCallback(async () => {
    if (!form || !baseForm) return;
    if (!canEdit) return refuse();
    const payload = formPayload(form, baseForm);
    if (!Object.keys(payload).length) return toast(i18n.t(X.nothingToSave));
    await write('form', 'booking/form', payload, i18n.t(B.form.saved));
  }, [baseForm, canEdit, form, refuse, toast, write]);

  /* ── link, preview ────────────────────────────────────────────────── */

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast(i18n.t(B.link.copied));
      } catch {
        toast(i18n.t(X.loadFailed));
      }
    },
    [toast]
  );

  const loadPreview = useCallback(async () => {
    const result = await tourGet<Availability>(propertyId, 'booking/availability', { days: 7 });
    if (result.ok) {
      setPreview(result.data);
      setPreviewDate((current) => current ?? result.data.days.find((day) => !day.closed && day.slots.length)?.date ?? result.data.days[0]?.date ?? null);
    }
  }, [propertyId]);

  const widget = useMemo(() => (settings ? widgetState(settings) : null), [settings]);
  const gates = useMemo(() => (settings ? generateGateRows(settings) : []), [settings]);

  return {
    settings,
    meta,
    loading,
    error,
    reload: load,
    canEdit,
    section,
    setSection,
    widget,
    gates,
    rules,
    setRules,
    rulesDirty,
    ruleProblems,
    saveRules,
    hours,
    hoursDirty,
    hourErrors,
    hoursEditor,
    setHoursEditor,
    setRanges,
    setRange,
    addRange,
    removeRange,
    applyWeekdays,
    saveHours,
    form,
    setForm,
    setFormAll,
    setButton,
    formDirty,
    saveForm,
    saving,
    copy,
    preview,
    previewDate,
    setPreviewDate,
    loadPreview,
    days: DAYS
  };
};

export type TourBookingController = ReturnType<typeof useTourBooking>;
