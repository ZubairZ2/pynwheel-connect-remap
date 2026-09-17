'use client';

import { TRANSCRIPTS } from '~/data/mock/core.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { AI_REVIEW_QUEUE } from '~/core/utils/generator/connect/admin.generator';

/** One flagged AI-concierge conversation, opened from the review queue. */
export const useTranscriptDialog = () => {
  const dispatch = useAppDispatch();
  const demo = useAppSelector((s) => s.demo);
  const queued = AI_REVIEW_QUEUE[demo.transcriptIdx] ?? { property: '—', reason: '—' };

  return {
    transcriptOpen: demo.transcriptOpen,
    transcript: {
      property: queued.property,
      reason: queued.reason,
      lines: (TRANSCRIPTS[demo.transcriptIdx] ?? []).map((line) => ({
        ...line,
        isVisitor: line.who === 'visitor',
        align: line.who === 'visitor' ? 'flex-start' : 'flex-end',
        bg: line.who === 'visitor' ? '#EEF0F4' : 'var(--bo-accent-soft)',
        color: line.who === 'visitor' ? 'var(--bo-ink)' : 'var(--bo-accent)',
        speaker: line.who === 'visitor' ? 'Visitor' : 'Concierge (planned)'
      }))
    },
    closeTranscript: () => dispatch(demoActions.closeTranscript()),
    clearTranscript: () => dispatch(demoActions.clearTranscript())
  };
};
