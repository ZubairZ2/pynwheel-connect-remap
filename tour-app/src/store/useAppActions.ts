import { useMemo } from 'react';
import { useRepository } from '~/repositories/repositoryContext';
import { success, tap } from '~/services/native';
import { useApp } from './appContext';
import { bestMatchUnit, currentStop, selectedNodes, tourStopViews } from './selectors';

/**
 * The async flows of the app: they call the repository and dispatch plain
 * actions as they progress. Screens call these, never the repository.
 */
export const useAppActions = () => {
  const { state, dispatch, data } = useApp();
  const repository = useRepository();

  return useMemo(() => {
    const bundle = data.bundle;
    const content = data.content;
    const fill = (template: string, params: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');
    const toast = (message: string) => dispatch({ type: 'toast', message });

    const runTour = async (mode: 'self' | 'ar') => {
      if (!bundle) return;
      const chosen = selectedNodes(state);
      const all = tourStopViews(bundle).map((v) => v.node);
      const nodes = chosen.length ? chosen : all;
      dispatch({ type: 'tourCalculating', mode });
      try {
        const result = await repository.getTourRoute(nodes);
        if (!result.ok) {
          dispatch({ type: 'tourFailed', message: result.error.message });
          return;
        }
        const order = result.tour.segments.map((s) => s.node);
        if (!order.length) {
          dispatch({ type: 'tourFailed', message: result.tour.route.warnings[0] ?? 'None of the chosen stops can be reached.' });
          return;
        }
        dispatch({ type: 'tourReady', tour: result.tour, order, mode });
        void success();
      } catch (error) {
        dispatch({ type: 'tourFailed', message: error instanceof Error ? error.message : 'The route could not be calculated.' });
      }
    };

    return {
      generateRoute: () => runTour('self'),
      launchArTour: () => runTour('ar'),

      nextStop: () => {
        if (!bundle) return;
        const names = state.tourOrder.map((n) => tourStopViews(bundle).find((v) => v.node === n)?.name ?? n);
        dispatch({ type: 'nextStop', propertyName: bundle.property.name, names });
        void tap();
      },

      findRoute: async () => {
        const { from, to, fromFloor, toFloor, stepFree, avoidBlockers } = state.wayfinding;
        if (!from || !to) {
          toast('Choose where you are and where you want to go.');
          return;
        }
        dispatch({ type: 'wfCalculating' });
        try {
          const result = await repository.findRoute(from, to, { stepFree, avoidBlockers, fromFloor, toFloor });
          dispatch({ type: 'wfResult', result });
          if (result.ok) void success();
        } catch (error) {
          dispatch({ type: 'wfResult', result: { ok: false, from, to, error: { code: 'no_path', message: error instanceof Error ? error.message : 'The route could not be calculated.' }, warnings: [] } });
        }
      },

      openAiChat: (context: 'stop' | 'general') => {
        if (!bundle || !content) return;
        const stop = currentStop(state, bundle);
        const params = { stop: stop?.name ?? 'this stop', property: bundle.property.name };
        const greeting = fill(context === 'stop' ? content.concierge.greetingStop : content.concierge.greetingGeneral, params);
        dispatch({ type: 'openAiChat', context, greeting });
      },

      askAi: async (text?: string) => {
        if (!bundle) return;
        const question = (text ?? state.ai.input).trim();
        if (!question) return;
        dispatch({ type: 'aiAsk', question });
        const stop = currentStop(state, bundle);
        try {
          const answer = await repository.askConcierge(question, { stopName: stop?.name ?? null });
          dispatch({ type: 'aiReply', text: answer });
        } catch {
          dispatch({ type: 'aiReply', text: 'I could not reach the concierge just now. Please try again. *' });
        }
      },

      talkToHuman: () => {
        if (!content) return;
        dispatch({ type: 'aiHuman', text: content.concierge.humanReply });
      },

      openBook: () => {
        if (!bundle || !content) return;
        const unit = bundle.units.find((u) => u.showInStopsList && u.available)?.name ?? 'No preference *';
        dispatch({ type: 'openBook', day: content.booking.days[0] ?? '', time: content.booking.times[2] ?? content.booking.times[0] ?? '', unit });
      },

      submitBooking: async () => {
        if (!content) return;
        dispatch({ type: 'bookSubmitting' });
        try {
          await repository.requestBooking({ day: state.book.day, time: state.book.time, unit: state.book.unit, name: content.visitor.name, phone: content.visitor.phone });
          dispatch({ type: 'bookDone' });
          void success();
        } catch {
          dispatch({ type: 'toast', message: 'The request could not be sent. Please try again. *' });
          dispatch({ type: 'bookDone' });
        }
      },

      openApply: (unitNode?: string) => {
        if (!bundle) return;
        const unit = unitNode ?? bestMatchUnit(state, bundle)?.node ?? null;
        if (!unit) return;
        dispatch({ type: 'openApply', unit });
      },

      submitApplication: async () => {
        if (!bundle || !state.applyUnit) return;
        const unit = bundle.units.find((u) => u.node === state.applyUnit);
        dispatch({ type: 'applySubmitting' });
        try {
          await repository.startApplication(state.applyUnit);
          dispatch({ type: 'applyDone', message: `Application started for ${unit?.name ?? 'your unit'} — check your email to finish. *` });
          void success();
        } catch {
          dispatch({ type: 'applyDone', message: 'The application could not be started. Please try again. *' });
        }
      },

      shareSummary: () => {
        if (!content) return;
        toast(`Summary emailed to ${content.visitor.email}`);
      },

      listingTap: (name: string) => toast(`${name} isn't tourable yet — we'll notify you when it opens.`),

      toast
    };
  }, [state, dispatch, data, repository]);
};
