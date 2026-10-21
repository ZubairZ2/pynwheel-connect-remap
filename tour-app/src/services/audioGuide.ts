/**
 * The audio guide: one speaker for the whole app over the web view's
 * SpeechSynthesis (the mechanism the Guided screen already used), with the
 * resume semantics the design's Play guide / Pause guide need.
 *
 *   - `speak(key, text)` reads one segment (a route step, a stop's "About
 *     this space"); a different key replaces what was playing.
 *   - `pause()` keeps the position of the current segment, `resume()`
 *     continues it; a paused segment is never restarted from the top unless
 *     `speak` is called for it again.
 *   - `status()` says which key is speaking / paused / done, so a screen can
 *     draw its button from the real state (and a screen that remounts finds
 *     the segment it left).
 *
 * Where the platform has no speech synthesis every call is a no-op and
 * `available` is false, so the screens can say so instead of pretending.
 * Nothing here is recorded audio: the text is the real route / stop data.
 */

export type AudioStatus = 'idle' | 'speaking' | 'paused' | 'done';

export interface AudioState {
  key: string | null;
  status: AudioStatus;
  /** When the current segment started (ms since the epoch), for progress estimates. */
  startedAt: number | null;
  /** Milliseconds already spoken before the last pause. */
  spokenMs: number;
  /** A rough length of the segment (ms), from its word count, for a progress bar. */
  estimatedMs: number;
}

type Listener = (state: AudioState) => void;

const WORDS_PER_SECOND = 2.6;

const synth = (): SpeechSynthesis | null => {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis ? window.speechSynthesis : null;
  } catch {
    return null;
  }
};

export const audioAvailable = (): boolean => synth() != null && typeof SpeechSynthesisUtterance !== 'undefined';

/** The length a text takes to read, estimated from its words (the browsers report no duration). */
export const estimateMs = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1200, Math.round((words / WORDS_PER_SECOND) * 1000));
};

const initial = (): AudioState => ({ key: null, status: 'idle', startedAt: null, spokenMs: 0, estimatedMs: 0 });

let state: AudioState = initial();
let utterance: SpeechSynthesisUtterance | null = null;
let pausedAt: number | null = null;
const listeners = new Set<Listener>();

const emit = (next: AudioState) => {
  state = next;
  listeners.forEach((l) => l(state));
};

export const audioGuide = {
  get available() {
    return audioAvailable();
  },
  status: (): AudioState => state,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Reads `text` for `key` from its start, replacing whatever was playing. */
  speak: (key: string, text: string): void => {
    const s = synth();
    const clean = text.replace(/ \*/g, '').trim();
    if (!s || !clean) {
      emit({ key, status: 'done', startedAt: null, spokenMs: 0, estimatedMs: 0 });
      return;
    }
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1;
      utterance = u;
      pausedAt = null;
      u.onend = () => {
        if (utterance !== u) return;
        emit({ ...state, status: 'done', startedAt: null, spokenMs: state.estimatedMs });
      };
      u.onerror = () => {
        if (utterance !== u) return;
        emit({ ...state, status: 'done', startedAt: null });
      };
      emit({ key, status: 'speaking', startedAt: Date.now(), spokenMs: 0, estimatedMs: estimateMs(clean) });
      s.speak(u);
    } catch {
      emit({ key, status: 'done', startedAt: null, spokenMs: 0, estimatedMs: 0 });
    }
  },

  /** Pauses the current segment where it is. */
  pause: (): void => {
    const s = synth();
    if (!s || state.status !== 'speaking') return;
    try {
      s.pause();
    } catch {
      /* nothing to pause */
    }
    pausedAt = Date.now();
    emit({ ...state, status: 'paused', spokenMs: state.spokenMs + (state.startedAt ? Date.now() - state.startedAt : 0), startedAt: null });
  },

  /** Continues a paused segment from where it stopped. */
  resume: (): boolean => {
    const s = synth();
    if (!s || state.status !== 'paused') return false;
    try {
      s.resume();
    } catch {
      return false;
    }
    pausedAt = null;
    emit({ ...state, status: 'speaking', startedAt: Date.now() });
    return true;
  },

  /** Stops and forgets the current segment (leaving a screen that owns the narration). */
  stop: (): void => {
    const s = synth();
    utterance = null;
    pausedAt = null;
    try {
      s?.cancel();
    } catch {
      /* nothing to stop */
    }
    emit(initial());
  },

  /** How far through the current segment the narration is, 0..1, from the estimate. */
  progress: (now = Date.now()): number => {
    if (!state.key || !state.estimatedMs) return state.status === 'done' ? 1 : 0;
    const spoken = state.spokenMs + (state.startedAt && state.status === 'speaking' ? now - state.startedAt : 0);
    return Math.max(0, Math.min(1, spoken / state.estimatedMs));
  },

  /** True while the key's segment is paused (a Play press resumes it instead of restarting it). */
  isPaused: (key: string): boolean => state.key === key && state.status === 'paused' && pausedAt != null
};
