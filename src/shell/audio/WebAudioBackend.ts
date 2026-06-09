// Implements the AudioBackend contract via Phaser's sound manager (ambient SFX + music).
// SPIKE-GRADE BODY — discarded at the start of Phase 1 (see plan Task 18). The production
// implementation is authored once in M1 Task 10. Only the AudioBackend interface survives.
// resume() re-acquires the WebAudio context (the iOS defect target for ambient channels).
import Phaser from 'phaser';
import type { AudioBackend } from './AudioService';
import type { AudioCue, AudioCueId } from '@/types';

export class WebAudioBackend implements AudioBackend {
  private readonly cues = new Map<string, AudioCue>();

  constructor(private readonly sound: Phaser.Sound.BaseSoundManager) {}

  async preload(cue: AudioCue): Promise<void> {
    // Cue metadata recorded so play() can honor loop + volume; the scene's Phaser loader
    // performs the actual decode via this.load.audio(cue.id, [`${cue.src}.m4a`, `${cue.src}.ogg`]).
    this.cues.set(cue.id, cue);
  }

  async play(id: AudioCueId): Promise<void> {
    const cue = this.cues.get(id);
    this.sound.play(id, { loop: cue?.loop ?? false, volume: cue?.volume ?? 1 });
  }

  async stop(id: AudioCueId): Promise<void> {
    const s = this.sound.get(id);
    if (s) s.stop();
  }

  async setVolume(id: AudioCueId, volume: number): Promise<void> {
    const s = this.sound.get(id) as (Phaser.Sound.BaseSound & { setVolume?: (v: number) => void }) | null;
    if (s && s.setVolume) s.setVolume(volume);
  }

  async resume(): Promise<boolean> {
    const mgr = this.sound as unknown as { context?: AudioContext };
    if (mgr.context && mgr.context.state !== 'running') {
      await mgr.context.resume();
    }
    return mgr.context ? mgr.context.state === 'running' : true;
  }
}
