import { describe, it, expect } from 'vitest';
import {
  initialAudioState,
  reduceResume,
  resolveRecovering,
  enqueueCue,
} from './audioQueue';
import type { QueuedCue } from './audioQueue';
import type { AudioCueId } from '@/types';

const cueId = (s: string) => s as AudioCueId;
const voice = (id: string): QueuedCue => ({ id: cueId(id), critical: true });
const sfx = (id: string): QueuedCue => ({ id: cueId(id), critical: false });

describe('initialAudioState', () => {
  it('starts uninitialized with an empty pending queue', () => {
    const s = initialAudioState();
    expect(s.resume).toBe('uninitialized');
    expect(s.pending).toEqual([]);
  });
});

describe('reduceResume', () => {
  it('transitions uninitialized --first-gesture--> recovering', () => {
    const { next } = reduceResume(initialAudioState(), 'first-gesture');
    expect(next.resume).toBe('recovering');
  });

  it('transitions running --app-resume--> recovering (re-acquire)', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next } = reduceResume(running, 'app-resume');
    expect(next.resume).toBe('recovering');
  });

  it('transitions running --visibility-visible--> recovering', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next } = reduceResume(running, 'visibility-visible');
    expect(next.resume).toBe('recovering');
  });

  it('transitions running --manual(suspend)--> suspended', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next } = reduceResume(running, 'manual');
    expect(next.resume).toBe('suspended');
  });

  it('transitions suspended --app-resume--> recovering', () => {
    const suspended = { resume: 'suspended' as const, pending: [] };
    const { next } = reduceResume(suspended, 'app-resume');
    expect(next.resume).toBe('recovering');
  });

  it('transitions uninitialized --manual(suspend)--> suspended', () => {
    const { next } = reduceResume(initialAudioState(), 'manual');
    expect(next.resume).toBe('suspended');
  });
});

describe('resolveRecovering', () => {
  it('moves recovering --> running and flushes all pending critical cues in order', () => {
    let s = initialAudioState();
    s = reduceResume(s, 'first-gesture').next;
    s = enqueueCue(s, voice('v1')).next;
    s = enqueueCue(s, voice('v2')).next;
    const { next, flush } = resolveRecovering(s);
    expect(next.resume).toBe('running');
    expect(next.pending).toEqual([]);
    expect(flush.map((c) => c.id)).toEqual([cueId('v1'), cueId('v2')]);
  });
});

describe('pending survives suspend -> resume', () => {
  it('keeps queued critical cues across suspended --app-resume--> recovering, then flushes them', () => {
    let s: import('./audioQueue').AudioQueueState = { resume: 'suspended' as const, pending: [] };
    s = enqueueCue(s, voice('v1')).next;
    s = enqueueCue(s, voice('v2')).next;
    s = reduceResume(s, 'app-resume').next; // suspended -> recovering, pending preserved
    expect(s.resume).toBe('recovering');
    expect(s.pending.map((c) => c.id)).toEqual([cueId('v1'), cueId('v2')]);
    const { next, flush } = resolveRecovering(s);
    expect(next.resume).toBe('running');
    expect(flush.map((c) => c.id)).toEqual([cueId('v1'), cueId('v2')]);
  });
});

describe('enqueueCue', () => {
  it('plays a cue immediately when running (no queueing)', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next, playNow } = enqueueCue(running, voice('v1'));
    expect(playNow?.id).toBe(cueId('v1'));
    expect(next.pending).toEqual([]);
  });

  it('queues a critical cue while recovering (does not drop it)', () => {
    const s = reduceResume(initialAudioState(), 'first-gesture').next; // recovering
    const { next, playNow } = enqueueCue(s, voice('v1'));
    expect(playNow).toBeNull();
    expect(next.pending.map((c) => c.id)).toEqual([cueId('v1')]);
  });

  it('queues a critical cue while suspended (does not drop it)', () => {
    const s = { resume: 'suspended' as const, pending: [] };
    const { next, playNow } = enqueueCue(s, voice('v1'));
    expect(playNow).toBeNull();
    expect(next.pending.map((c) => c.id)).toEqual([cueId('v1')]);
  });

  it('drops a non-critical cue while not running', () => {
    const s = reduceResume(initialAudioState(), 'first-gesture').next; // recovering
    const { next, playNow } = enqueueCue(s, sfx('s1'));
    expect(playNow).toBeNull();
    expect(next.pending).toEqual([]);
  });
});
