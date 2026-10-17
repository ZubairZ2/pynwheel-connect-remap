'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { Availability, BookingSettings, TourModuleMeta, VisitorProfile, VisitorsList } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { V, generateBookingCards, generateOnSite, generateSessionView, generateSlotPicker, generateStatusChips, generateVisitorRows, selectableTypes } from '~/core/utils/generator/tour/tourVisitors.generator';
import { tourExportUrl, tourGet, tourPost } from '~/core/utils/tour/tourApi.client';
import { writeErrorText } from './useTourLocks';

const X = CORE_STRINGS.tourModules.common;

export interface VisitorFilters {
  status: string;
  type: string;
  range: string;
  q: string;
  page: number;
}

export type VisitorsDialog =
  | { kind: 'newBooking'; first: string; last: string; email: string; phone: string; tourType: string; scheduled: boolean; date: string | null; time: string | null; sms: boolean; busy: boolean }
  | { kind: 'reschedule'; bookingId: number; name: string; from: string; tourType: string; date: string | null; time: string | null; busy: boolean }
  | { kind: 'cancel'; bookingId: number; name: string; when: string; busy: boolean }
  | { kind: 'pii'; fields: Record<string, boolean>; input: string; busy: boolean }
  | { kind: 'delete'; input: string; busy: boolean }
  | { kind: 'idReview'; choice: 'match' | 'mismatch'; input: string; busy: boolean }
  | { kind: 'resetStops'; busy: boolean }
  | { kind: 'resetId'; busy: boolean }
  | { kind: 'chat' }
  | null;

/**
 * The Visitors tab: the list (filters, status chips, pages), one visitor's
 * profile, and the booking and privacy dialogs; every write replaces the
 * profile with the one the CMS answers and reloads the list.
 */
export const useTourVisitors = (propertyId: number, enabled = true, settings: BookingSettings | null = null) => {
  const dispatch = useAppDispatch();
  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const [filters, setFiltersState] = useState<VisitorFilters>({ status: 'all', type: 'all', range: 'all', q: '', page: 1 });
  const [list, setList] = useState<VisitorsList | null>(null);
  const [meta, setMeta] = useState<TourModuleMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<VisitorsDialog>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (next: VisitorFilters) => {
      const request = ++requestRef.current;
      setLoading(true);
      setError(null);
      const result = await tourGet<VisitorsList>(propertyId, 'visitors', { status: next.status, type: next.type, range: next.range, q: next.q, page: next.page });
      if (request !== requestRef.current) return;
      if (result.ok) {
        setList(result.data);
        setMeta(result.meta);
      } else {
        setError(result.error === 'unauthorized' ? i18n.t(CORE_STRINGS.tourModules.errors.unauthorized) : i18n.t(X.loadFailed));
      }
      setLoading(false);
    },
    [propertyId]
  );

  useEffect(() => {
    if (!enabled) return;
    void load(filters);
  }, [enabled, filters, load]);

  const setFilters = useCallback((patch: Partial<VisitorFilters>) => {
    setFiltersState((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }, []);

  const openProfile = useCallback(
    async (id: number) => {
      setProfileLoading(true);
      setSessionId(null);
      const result = await tourGet<VisitorProfile>(propertyId, `visitors/${id}`);
      if (result.ok) {
        setProfile(result.data);
        setMeta(result.meta);
        setSessionId(result.data.sessions[0]?.id ?? null);
      } else {
        toast(writeErrorText(result));
      }
      setProfileLoading(false);
    },
    [propertyId, toast]
  );

  const closeProfile = useCallback(() => {
    setProfile(null);
    setDialog(null);
  }, []);

  const canEdit = !!meta?.canEdit && !!meta?.writesEnabled;
  const refuse = useCallback(() => toast(i18n.t(meta?.writesEnabled ? X.readOnly : X.writesOff)), [meta?.writesEnabled, toast]);

  const loadAvailability = useCallback(
    async (date?: string) => {
      const result = await tourGet<Availability>(propertyId, 'booking/availability', { date, days: 7 });
      if (result.ok) setAvailability(result.data);
      else setAvailability(null);
    },
    [propertyId]
  );

  const types = useMemo(() => selectableTypes(settings?.tourTypes), [settings?.tourTypes]);

  const openNewBooking = useCallback(() => {
    if (!canEdit) return refuse();
    if (settings?.salesforce) return toast(i18n.t(V.salesforce));
    setAvailability(null);
    void loadAvailability();
    setDialog({ kind: 'newBooking', first: '', last: '', email: '', phone: '', tourType: types[0] ?? 'self_tour', scheduled: true, date: null, time: null, sms: true, busy: false });
  }, [canEdit, loadAvailability, refuse, settings, toast, types]);

  const submitBooking = useCallback(async () => {
    if (dialog?.kind !== 'newBooking' || dialog.busy) return;
    const digits = dialog.phone.replace(/\D/g, '');
    if (!dialog.first.trim() || !dialog.last.trim() || !/^\S+@\S+\.\S+$/.test(dialog.email) || digits.length < 10 || (dialog.scheduled && (!dialog.date || !dialog.time))) {
      toast(i18n.t(V.booking.incomplete));
      return;
    }
    setDialog({ ...dialog, busy: true });
    const result = await tourPost<{ booking: VisitorProfile; rescheduled: boolean; bookingId: number }>(propertyId, 'visitors/bookings', {
      first_name: dialog.first.trim(),
      last_name: dialog.last.trim(),
      email: dialog.email.trim(),
      phone_number: digits,
      country_code: 'US',
      tour_type: dialog.tourType,
      property_tour_type: dialog.scheduled ? 'scheduled_tour' : 'unscheduled_self_tour',
      tour_date: dialog.scheduled ? dialog.date : undefined,
      tour_time: dialog.scheduled ? dialog.time : undefined,
      is_sms_enabled: dialog.sms
    });
    if (!result.ok) {
      toast(writeErrorText(result));
      setDialog({ ...dialog, busy: false });
      return;
    }
    toast(i18n.t(result.data.rescheduled ? V.booking.replaced : V.booking.created));
    setDialog(null);
    setProfile(result.data.booking);
    setSessionId(result.data.booking.sessions[0]?.id ?? null);
    void load(filters);
  }, [dialog, filters, load, propertyId, toast]);

  const openReschedule = useCallback(
    (bookingId: number, name: string, from: string, tourType: string) => {
      if (!canEdit) return refuse();
      setAvailability(null);
      void loadAvailability();
      setDialog({ kind: 'reschedule', bookingId, name, from, tourType, date: null, time: null, busy: false });
    },
    [canEdit, loadAvailability, refuse]
  );

  const submitReschedule = useCallback(async () => {
    if (dialog?.kind !== 'reschedule' || dialog.busy) return;
    if (!dialog.date || !dialog.time) return toast(i18n.t(V.booking.pickTime));
    setDialog({ ...dialog, busy: true });
    const result = await tourPost<{ booking: VisitorProfile }>(propertyId, `visitors/bookings/${dialog.bookingId}/reschedule`, { tour_date: dialog.date, tour_time: dialog.time });
    if (!result.ok) {
      toast(writeErrorText(result));
      setDialog({ ...dialog, busy: false });
      return;
    }
    toast(i18n.t(V.booking.rescheduled));
    setDialog(null);
    setProfile(result.data.booking);
    void load(filters);
  }, [dialog, filters, load, propertyId, toast]);

  const openCancel = useCallback(
    (bookingId: number, name: string, when: string) => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'cancel', bookingId, name, when, busy: false });
    },
    [canEdit, refuse]
  );

  const submitCancel = useCallback(async () => {
    if (dialog?.kind !== 'cancel' || dialog.busy) return;
    setDialog({ ...dialog, busy: true });
    const result = await tourPost<{ booking: VisitorProfile | null }>(propertyId, `visitors/bookings/${dialog.bookingId}/cancel`, {});
    if (!result.ok) {
      toast(writeErrorText(result));
      setDialog({ ...dialog, busy: false });
      return;
    }
    toast(i18n.t(V.cancel.done));
    setDialog(null);
    if (result.data.booking) setProfile(result.data.booking);
    void load(filters);
  }, [dialog, filters, load, propertyId, toast]);

  const visitorAction = useCallback(
    async (action: string, payload: unknown, success: string) => {
      if (!profile) return false;
      const result = await tourPost<{ profile?: VisitorProfile; deleted?: number }>(propertyId, `visitors/${profile.visitor.id}/${action}`, payload);
      if (!result.ok) {
        toast(writeErrorText(result));
        return false;
      }
      toast(success);
      if (result.data.deleted) setProfile(null);
      else if (result.data.profile) setProfile(result.data.profile);
      void load(filters);
      return true;
    },
    [filters, load, profile, propertyId, toast]
  );

  const guarded = useCallback(
    (open: () => void, superOnly = false) => {
      if (!canEdit) return refuse();
      if (superOnly && !meta?.isSuperAdmin) return toast(i18n.t(CORE_STRINGS.tourModules.errors.forbidden));
      open();
    },
    [canEdit, meta?.isSuperAdmin, refuse, toast]
  );

  const submitDialog = useCallback(async () => {
    if (!dialog || !('busy' in dialog) || dialog.busy) return;
    const start = () => setDialog({ ...dialog, busy: true } as VisitorsDialog);
    const done = (ok: boolean) => setDialog(ok ? null : ({ ...dialog, busy: false } as VisitorsDialog));
    switch (dialog.kind) {
      case 'resetStops':
        start();
        done(await visitorAction('reset_stops', {}, i18n.t(V.resetStops.done)));
        break;
      case 'resetId':
        start();
        done(await visitorAction('reset_verification', {}, i18n.t(V.resetId.done)));
        break;
      case 'idReview':
        if (dialog.input.trim().toUpperCase() !== 'FLAG') return;
        start();
        done(await visitorAction('id_review', { mismatch: dialog.choice === 'mismatch' }, i18n.t(V.idReview.done)));
        break;
      case 'pii': {
        const fields = Object.keys(dialog.fields).filter((key) => dialog.fields[key]);
        if (!fields.length) return toast(i18n.t(V.pii.pick));
        if (dialog.input.trim().toUpperCase() !== 'REMOVE') return;
        start();
        done(await visitorAction('remove_pii', { fields }, i18n.t(V.pii.done)));
        break;
      }
      case 'delete':
        if (dialog.input.trim().toUpperCase() !== 'DELETE') return;
        start();
        done(await visitorAction('delete', {}, i18n.t(V.delete.done)));
        break;
      default:
        break;
    }
  }, [dialog, toast, visitorAction]);

  const exportUrl = useMemo(() => tourExportUrl(propertyId, { status: filters.status, type: filters.type, range: filters.range, q: filters.q || undefined }), [filters, propertyId]);

  const rows = useMemo(() => (list ? generateVisitorRows(list) : []), [list]);
  const chips = useMemo(() => (list ? generateStatusChips(list, filters.status) : []), [list, filters.status]);
  const onSite = useMemo(() => (list ? generateOnSite(list) : []), [list]);
  const bookingCards = useMemo(() => (profile ? generateBookingCards(profile) : []), [profile]);
  const session = useMemo(() => {
    if (!profile) return null;
    const found = profile.sessions.find((s) => s.id === sessionId) ?? profile.sessions[0] ?? null;
    return found ? generateSessionView(found, profile) : null;
  }, [profile, sessionId]);
  const picker = useMemo(() => {
    if (!availability || !dialog || (dialog.kind !== 'newBooking' && dialog.kind !== 'reschedule')) return null;
    return generateSlotPicker(availability.days, dialog.date, dialog.tourType);
  }, [availability, dialog]);

  return {
    list,
    meta,
    loading,
    error,
    reload: () => load(filters),
    filters,
    setFilters,
    rows,
    chips,
    onSite,
    exportUrl,
    profile,
    profileLoading,
    openProfile,
    closeProfile,
    bookingCards,
    session,
    sessionId,
    setSessionId,
    dialog,
    setDialog,
    availability,
    picker,
    types,
    canEdit,
    isSuperAdmin: !!meta?.isSuperAdmin,
    actions: {
      openNewBooking,
      submitBooking,
      openReschedule,
      submitReschedule,
      openCancel,
      submitCancel,
      openResetStops: () => guarded(() => setDialog({ kind: 'resetStops', busy: false })),
      openResetId: () => guarded(() => setDialog({ kind: 'resetId', busy: false }), true),
      openIdReview: () => guarded(() => setDialog({ kind: 'idReview', choice: profile?.visitor.idMismatch ? 'mismatch' : 'match', input: '', busy: false })),
      openPii: () => guarded(() => setDialog({ kind: 'pii', fields: {}, input: '', busy: false }), true),
      openDelete: () => guarded(() => setDialog({ kind: 'delete', input: '', busy: false }), true),
      openChat: () => setDialog({ kind: 'chat' }),
      submitDialog,
      pickDate: (date: string) => setDialog((current) => (current && (current.kind === 'newBooking' || current.kind === 'reschedule') ? { ...current, date, time: null } : current)),
      pickTime: (time: string) => setDialog((current) => (current && (current.kind === 'newBooking' || current.kind === 'reschedule') ? { ...current, time } : current)),
      closeDialog: () => setDialog(null)
    }
  };
};

export type TourVisitorsController = ReturnType<typeof useTourVisitors>;
