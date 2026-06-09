// THROWAWAY SPIKE ENTRY — deleted at the start of Phase 1 (see plan Task 18).
import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { AudioService } from '@/shell/audio/AudioService';
import { NativeAudioBackend } from '@/shell/audio/NativeAudioBackend';
import { WebAudioBackend } from '@/shell/audio/WebAudioBackend';
import { AppLifecycle } from '@/shell/platform/AppLifecycle';
import { SpikeScene } from './SpikeScene';
import type { AudioCue, AudioCueId } from '@/types';

const cues: AudioCue[] = [
  { id: 'spike-prompt-sort' as AudioCueId, channel: 'voice', src: 'assets/audio/spike-prompt-sort', loop: false, volume: 1, critical: true },
  { id: 'spike-music-bed' as AudioCueId, channel: 'music', src: 'assets/audio/spike-music-bed', loop: true, volume: 0.5, critical: false },
];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#ffffff',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [],
});

game.events.once(Phaser.Core.Events.READY, async () => {
  const native = Capacitor.isNativePlatform();
  const webBackend = new WebAudioBackend(game.sound);
  const voiceBackend = native ? new NativeAudioBackend() : webBackend;
  const audio = new AudioService({ voiceBackend, ambientBackend: webBackend });

  // Preload only the native (critical) voice cue through the native backend;
  // the music cue is loaded by the scene's Phaser loader.
  await audio.registerCues(native ? cues.filter((c) => c.critical) : []);

  const lifecycle = new AppLifecycle(audio);
  lifecycle.start();

  // Gate first audio behind first tap (iOS autoplay + AudioContext unlock).
  const unlockOnce = async (): Promise<void> => {
    await audio.unlock();
    game.scene.add('Spike', SpikeScene, true, { audio });
    window.removeEventListener('pointerdown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce, { once: true });
});
