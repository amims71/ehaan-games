// PURE — no phaser, no DOM, no capacitor. AudioService resume state machine + cue queue.
import type { AudioResumeState, AudioResumeTrigger, AudioCueId } from '@/types';

export interface QueuedCue {
  id: AudioCueId;
  critical: boolean;
}

export interface AudioQueueState {
  resume: AudioResumeState;
  /** Cues deferred while not 'running'. Critical cues are kept; non-critical may be dropped. */
  pending: QueuedCue[];
}

/** Initial state before any gesture. */
export function initialAudioState(): AudioQueueState {
  return { resume: 'uninitialized', pending: [] };
}

/**
 * Reduce a trigger against current state. Pure: returns the next state.
 * Transition table (LAW):
 *  - first-gesture | app-resume | visibility-visible  -> recovering (request audio; resolveRecovering confirms running)
 *  - manual                                            -> suspended  (explicit suspend, e.g. document hidden)
 * Nothing flushes on the trigger itself; flushing happens in resolveRecovering().
 */
export function reduceResume(
  state: AudioQueueState,
  trigger: AudioResumeTrigger,
): { next: AudioQueueState; flush: QueuedCue[] } {
  switch (trigger) {
    case 'first-gesture':
    case 'app-resume':
    case 'visibility-visible':
      return { next: { resume: 'recovering', pending: state.pending }, flush: [] };
    case 'manual':
      return { next: { resume: 'suspended', pending: state.pending }, flush: [] };
    default:
      return { next: state, flush: [] };
  }
}

/** Mark the in-flight resume as resolved (context.resume() succeeded): go running + flush pending. */
export function resolveRecovering(
  state: AudioQueueState,
): { next: AudioQueueState; flush: QueuedCue[] } {
  const flush = state.pending;
  return { next: { resume: 'running', pending: [] }, flush };
}

/** Enqueue a cue. Plays now if running; queues critical cues while not running; drops non-critical. */
export function enqueueCue(
  state: AudioQueueState,
  cue: QueuedCue,
): { next: AudioQueueState; playNow: QueuedCue | null } {
  if (state.resume === 'running') {
    return { next: state, playNow: cue };
  }
  if (cue.critical) {
    return { next: { ...state, pending: [...state.pending, cue] }, playNow: null };
  }
  return { next: state, playNow: null };
}
