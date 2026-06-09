import type { AudioCue, AudioCueId, AudioResumeState } from '@/types';
import {
  initialAudioState,
  reduceResume,
  resolveRecovering,
  enqueueCue,
  type AudioQueueState,
  type QueuedCue,
} from './audioQueue';

/** CANONICAL audio backend interface (carried forward verbatim into Phase 1). */
export interface AudioBackend {
  preload(cue: AudioCue): Promise<void>;
  play(id: AudioCueId): Promise<void>;
  stop(id: AudioCueId): Promise<void>;
  setVolume(id: AudioCueId, volume: number): Promise<void>;
  resume(): Promise<boolean>;
}

export interface AudioServiceOptions {
  voiceBackend: AudioBackend;   // NativeAudioBackend on device, WebAudioBackend on web
  ambientBackend: AudioBackend; // WebAudioBackend (SFX + music)
}

export class AudioService {
  private state: AudioQueueState = initialAudioState();
  private readonly cues = new Map<string, AudioCue>();
  private muted = false;
  /** Master volume (0..1); applied to backends in production implementation. */
  private _masterVolume = 1;
  get masterVolume(): number { return this._masterVolume; }

  constructor(private readonly options: AudioServiceOptions) {}

  async registerCues(cues: AudioCue[]): Promise<void> {
    for (const cue of cues) {
      this.cues.set(cue.id, cue);
      const backend = this.backendFor(cue);
      await backend.preload(cue);
    }
  }

  /** First user gesture: drive the state machine then re-acquire both backends. */
  async unlock(): Promise<void> {
    this.state = reduceResume(this.state, 'first-gesture').next;
    await this.reacquire();
  }

  async play(id: AudioCueId): Promise<void> {
    if (this.muted) return;
    const cue = this.cues.get(id);
    if (!cue) return;
    const queued: QueuedCue = { id, critical: cue.channel === 'voice' && cue.critical };
    const { next, playNow } = enqueueCue(this.state, queued);
    this.state = next;
    if (playNow) await this.backendFor(cue).play(id);
  }

  async stop(id: AudioCueId): Promise<void> {
    const cue = this.cues.get(id);
    if (cue) await this.backendFor(cue).stop(id);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setMasterVolume(volume: number): void {
    this._masterVolume = volume;
  }

  /** Called by AppLifecycle on App 'resume' and 'visibilitychange'→visible. */
  async handleResume(trigger: 'app-resume' | 'visibility-visible'): Promise<void> {
    this.state = reduceResume(this.state, trigger).next;
    await this.reacquire();
  }

  get resumeState(): AudioResumeState {
    return this.state.resume;
  }

  private async reacquire(): Promise<void> {
    const voiceOk = await this.options.voiceBackend.resume();
    const ambientOk = await this.options.ambientBackend.resume();
    if (voiceOk && ambientOk) {
      const { next, flush } = resolveRecovering(this.state);
      this.state = next;
      for (const c of flush) {
        const cue = this.cues.get(c.id);
        if (cue && !this.muted) await this.backendFor(cue).play(c.id);
      }
    }
  }

  private backendFor(cue: AudioCue): AudioBackend {
    return cue.channel === 'voice' && cue.critical
      ? this.options.voiceBackend
      : this.options.ambientBackend;
  }
}
