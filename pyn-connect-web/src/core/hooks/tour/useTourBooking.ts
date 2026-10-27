'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import type { Availability, BookingSettings, HoursLane, TourModuleMeta } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import {
  B,
  DAYS,
  WEEKDAYS,
  closuresChanged,
  closuresDraftOf,
  closuresErrors,
  closuresPayload,
  formChanged,
  formDiscard,
  formDraftOf,
  formPayload,
  formProblems,
  generateGateRows,
  hoursChanged,
  hoursDraftOf,
  hoursErrors,
  hoursPayload,
  RULE_CARDS,
  rulesChanged,
  rulesDiscard,
  rulesDraftOf,
  rulesPayload,
  rulesProblems,
  widgetState,
  type AppDraft,
  type ButtonDraft,
  type ClosureDraft,
  type FormDraft,
  type FormPart,
  type HoursDraft,
  type RulesCard,
  type RulesDraft
} from '~/core/utils/generator/tour/tourBooking.generator';
import { tourGet, tourPost } from '~/core/utils/tour/tourApi.client';
import { writeErrorText } from './useTourLocks';

const X = CORE_STRINGS.tourModules.common;
const E = CORE_STRINGS.tourModules.errors;

type Kind = 'rules' | 'hours' | 'form' | 'closures' | 'scheduler';

/** `into` with `part` taken from `from` (the inverse direction of `formDiscard`). */
const formDiscardInto = (into: FormDraft, from: FormDraft, part: FormPart): FormDraft => formDiscard(into, from, part);

/**
 * The booking settings (`/connect/booking`): the rules, hours, closures and
 * form drafts the Settings tab edits, each saved by its own CMS write, the
 * scheduler switch (a one-field rules write), and the availability the
 * prospect preview shows. Every save replaces the settings with the ones the
 * CMS answers, so the saved section's draft restarts from what is stored
 * while the other drafts keep their unsaved edits.
 *
 * A property change empties everything and bumps a request id, so a late
 * answer for the previous property is dropped instead of shown.
 */
export const useTourBooking = (propertyId: number, enabled = true) => {
  const dispatch = useAppDispatch();
  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [meta, setMeta] = useState<TourModuleMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRulesState] = useState<RulesDraft | null>(null);
  const [hours, setHoursState] = useState<HoursDraft | null>(null);
  const [closures, setClosuresState] = useState<ClosureDraft[] | null>(null);
  const [form, setFormState] = useState<FormDraft | null>(null);
  const [saving, setSaving] = useState<Kind | null>(null);
  const [hoursEditor, setHoursEditor] = useState<string | null>(null);
  const [preview, setPreview] = useState<Availability | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const requestId = useRef(0);
  const savingRef = useRef<Kind | null>(null);

  useEffect(() => {
    requestId.current += 1;
    savingRef.current = null;
    setSettings(null);
    setMeta(null);
    setLoading(false);
    setError(null);
    setRulesState(null);
    setHoursState(null);
    setClosuresState(null);
    setFormState(null);
    setSaving(null);
    setHoursEditor(null);
    setPreview(null);
    setPreviewDate(null);
  }, [propertyId]);

  const adopt = useCallback((next: BookingSettings, only: Kind | null = null) => {
    setSettings(next);
    if (!only || only === 'rules') setRulesState(rulesDraftOf(next));
    if (!only || only === 'hours') setHoursState(hoursDraftOf(next));
    if (!only || only === 'closures') setClosuresState(closuresDraftOf(next));
    if (!only || only === 'form') setFormState(formDraftOf(next));
  }, []);

  const load = useCallback(async () => {
    const id = requestId.current;
    setLoading(true);
    setError(null);
    const result = await tourGet<BookingSettings>(propertyId, 'booking');
    if (id !== requestId.current) return;
    if (result.ok) {
      adopt(result.data);
      setMeta(result.meta);
      setPreview(null);
    } else {
      setError(result.error === 'unauthorized' ? i18n.t(E.unauthorized) : i18n.t(X.loadFailed));
    }
    setLoading(false);
  }, [adopt, propertyId]);

  useEffect(() => {
    // A failed read keeps `settings` null: without the `error` guard the effect
    // would call load() again as soon as `loading` drops, without end.
    if (!enabled || settings || loading || error) return;
    void load();
  }, [enabled, error, load, loading, settings]);

  const canEdit = !!meta?.canEdit && !!meta?.writesEnabled;
  /** Why the settings are read-only, once the meta is known: the Connect writes switch (`PYN_CONNECT_WRITES`) or the signed-in user's role. */
  const readOnlyReason: 'writesOff' | 'role' | null = !meta ? null : !meta.writesEnabled ? 'writesOff' : !meta.canEdit ? 'role' : null;
  /** The hours and closures are the CRM's when it manages the calendar (Yardi, Knock, Funnel): shown as stored, edited in the CRM (design, Oct 27 2026). */
  const hoursEditable = canEdit && !settings?.crm.managedHours;
  const refuse = useCallback(() => toast(i18n.t(meta?.writesEnabled ? X.readOnly : X.writesOff)), [meta?.writesEnabled, toast]);

  const write = useCallback(
    async (kind: Kind, path: string, payload: unknown, success: string): Promise<boolean> => {
      if (savingRef.current) return false;
      const id = requestId.current;
      savingRef.current = kind;
      setSaving(kind);
      const result = await tourPost<BookingSettings>(propertyId, path, payload);
      if (id !== requestId.current) {
        savingRef.current = null;
        return false;
      }
      if (result.ok) {
        adopt(result.data, kind);
        setMeta(result.meta);
        setPreview(null);
        toast(success);
      } else {
        toast(writeErrorText(result));
      }
      savingRef.current = null;
      setSaving(null);
      return result.ok;
    },
    [adopt, propertyId, toast]
  );

  /* ── scheduler switch ─────────────────────────────────────────────── */

  const setSchedulerEnabled = useCallback(
    async (on: boolean) => {
      if (!canEdit) return refuse();
      await write('scheduler', 'booking/rules', { scheduler_enabled: on }, i18n.t(on ? B.header.turnedOn : B.header.turnedOff));
    },
    [canEdit, refuse, write]
  );

  /* ── rules ────────────────────────────────────────────────────────── */

  const baseRules = useMemo(() => (settings ? rulesDraftOf(settings) : null), [settings]);
  const setRules = useCallback((patch: Partial<RulesDraft>) => setRulesState((current) => (current ? { ...current, ...patch } : current)), []);
  const rulesDirty = !!rules && !!baseRules && rulesChanged(rules, baseRules);
  const ruleProblems = useMemo(() => (rules && baseRules ? rulesProblems(rules, baseRules) : {}), [rules, baseRules]);
  /** Dirty flag and problems of one design card. */
  const rulesDirtyFor = useCallback((card: RulesCard) => !!rules && !!baseRules && rulesChanged(rules, baseRules, RULE_CARDS[card]), [baseRules, rules]);
  const ruleProblemsFor = useCallback((card: RulesCard) => (rules && baseRules ? rulesProblems(rules, baseRules, RULE_CARDS[card]) : {}), [baseRules, rules]);
  const discardRules = useCallback((card: RulesCard) => setRulesState((current) => (current && baseRules ? rulesDiscard(current, baseRules, RULE_CARDS[card]) : current)), [baseRules]);

  /** Saves one card's changed keys; the other cards' unsaved edits survive the save. */
  const saveRules = useCallback(
    async (card: RulesCard) => {
      if (!rules || !baseRules) return;
      if (!canEdit) return refuse();
      const keys = RULE_CARDS[card];
      const payload = rulesPayload(rules, baseRules, keys);
      if (!Object.keys(payload).length) return toast(i18n.t(X.nothingToSave));
      const problem = Object.values(rulesProblems(rules, baseRules, keys))[0];
      if (problem) return toast(problem);
      const kept = rules;
      const ok = await write('rules', 'booking/rules', payload, i18n.t(B.rules.saved));
      if (ok) setRulesState((current) => (current ? rulesDiscard(kept, current, keys) : current));
    },
    [baseRules, canEdit, refuse, rules, toast, write]
  );

  /* ── hours ────────────────────────────────────────────────────────── */

  const hoursDirty = !!hours && !!settings && hoursChanged(hours, settings);
  const hourErrors = useMemo(() => (hours ? hoursErrors(hours) : {}), [hours]);
  const setHoursAll = useCallback((next: HoursDraft) => setHoursState(next), []);

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
    if (!hours || !settings) return;
    if (!canEdit) return refuse();
    if (!hoursEditable) return toast(t(B.hours.managedReadOnly, { crm: settings.crm.managedHours ?? '' }));
    const problem = Object.values(hourErrors)[0];
    if (problem) return toast(problem);
    if (!hoursDirty) return toast(i18n.t(X.nothingToSave));
    const ok = await write('hours', 'booking/hours', hoursPayload(hours, settings), i18n.t(B.hours.saved));
    if (ok) setHoursEditor(null);
  }, [canEdit, hourErrors, hours, hoursDirty, hoursEditable, refuse, settings, toast, write]);

  /* ── closures ─────────────────────────────────────────────────────── */

  const closuresDirty = !!closures && !!settings && closuresChanged(closures, settings);
  const closureErrors = useMemo(() => (closures ? closuresErrors(closures) : {}), [closures]);
  const setClosures = useCallback((next: ClosureDraft[]) => setClosuresState(next), []);
  const addClosure = useCallback((row: Omit<ClosureDraft, 'key'>) => setClosuresState((current) => [...(current ?? []), { ...row, key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]), []);
  const removeClosure = useCallback((key: string) => setClosuresState((current) => (current ? current.filter((row) => row.key !== key) : current)), []);

  const saveClosures = useCallback(async () => {
    if (!closures || !settings) return;
    if (!canEdit) return refuse();
    if (!hoursEditable) return toast(t(B.hours.managedReadOnly, { crm: settings.crm.managedHours ?? '' }));
    const problem = Object.values(closureErrors)[0];
    if (problem) return toast(problem);
    if (!closuresDirty) return toast(i18n.t(X.nothingToSave));
    await write('closures', 'booking/closures', closuresPayload(closures), i18n.t(B.closures.saved));
  }, [canEdit, closureErrors, closures, closuresDirty, hoursEditable, refuse, settings, toast, write]);

  /* ── form ─────────────────────────────────────────────────────────── */

  const baseForm = useMemo(() => (settings ? formDraftOf(settings) : null), [settings]);
  const setForm = useCallback((patch: Partial<Omit<FormDraft, 'button' | 'app'>>) => setFormState((current) => (current ? { ...current, ...patch } : current)), []);
  const setFormAll = useCallback((next: FormDraft) => setFormState(next), []);
  const setApp = useCallback((patch: Partial<AppDraft>) => setFormState((current) => (current ? { ...current, app: { ...current.app, ...patch } } : current)), []);
  const setButton = useCallback((patch: Partial<ButtonDraft>) => setFormState((current) => (current ? { ...current, button: { ...current.button, ...patch } } : current)), []);
  const formDirty = !!form && !!baseForm && formChanged(form, baseForm);
  /** Dirty flag and problems of one design card (fields, app options, button). */
  const formDirtyFor = useCallback((part: FormPart) => !!form && !!baseForm && formChanged(form, baseForm, part), [baseForm, form]);
  const formProblemsFor = useCallback((part: FormPart) => (form && baseForm ? formProblems(form, baseForm, part) : {}), [baseForm, form]);
  const discardForm = useCallback((part: FormPart) => setFormState((current) => (current && baseForm ? formDiscard(current, baseForm, part) : current)), [baseForm]);

  /** Saves one card through `booking/form`; the other cards' unsaved edits survive the save. */
  const saveForm = useCallback(
    async (part: FormPart) => {
      if (!form || !baseForm) return;
      if (!canEdit) return refuse();
      const payload = formPayload(form, baseForm, part);
      if (!Object.keys(payload).length) return toast(i18n.t(X.nothingToSave));
      const problem = Object.values(formProblems(form, baseForm, part))[0];
      if (problem) return toast(problem);
      const kept = form;
      const ok = await write('form', 'booking/form', payload, i18n.t(part === 'button' ? B.button.saved : B.form.saved));
      // The answer restarts every form draft; the parts that were not saved get their edits back.
      if (ok) setFormState((current) => (current ? (['fields', 'app', 'button'] as FormPart[]).filter((other) => other !== part).reduce((acc, other) => formDiscardInto(acc, kept, other), current) : current));
    },
    [baseForm, canEdit, form, refuse, toast, write]
  );

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
    const id = requestId.current;
    const result = await tourGet<Availability>(propertyId, 'booking/availability', { days: 7 });
    if (id !== requestId.current) return;
    if (result.ok) {
      setPreview(result.data);
      setPreviewDate((current) => (current && result.data.days.some((day) => day.date === current) ? current : (result.data.days.find((day) => !day.closed && day.slots.length)?.date ?? result.data.days[0]?.date ?? null)));
    }
  }, [propertyId]);

  const widget = useMemo(() => (settings ? widgetState(settings) : null), [settings]);
  const gates = useMemo(() => (settings ? generateGateRows(settings) : []), [settings]);
  const anyDirty = rulesDirty || hoursDirty || closuresDirty || formDirty;

  useEffect(() => {
    if (!anyDirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);

  return {
    settings,
    meta,
    loading,
    error,
    reload: load,
    canEdit,
    readOnlyReason,
    hoursEditable,
    widget,
    gates,
    setSchedulerEnabled,
    rules,
    setRules,
    rulesDirty,
    ruleProblems,
    rulesDirtyFor,
    ruleProblemsFor,
    discardRules,
    saveRules,
    hours,
    hoursDirty,
    hourErrors,
    hoursEditor,
    setHoursEditor,
    setHoursAll,
    setRanges,
    setRange,
    addRange,
    removeRange,
    applyWeekdays,
    saveHours,
    closures,
    closuresDirty,
    closureErrors,
    setClosures,
    addClosure,
    removeClosure,
    saveClosures,
    form,
    setForm,
    setFormAll,
    setApp,
    setButton,
    formDirty,
    formDirtyFor,
    formProblemsFor,
    discardForm,
    saveForm,
    anyDirty,
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
