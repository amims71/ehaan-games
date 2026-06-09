// Implements the AudioBackend contract via @capacitor-community/native-audio.
// Used for CRITICAL voice prompts on device. NOT unit-tested (device-verified).
// CANONICAL assetPath convention (LAW, identical in M1): `public/${cue.src}.m4a`.
// AudioCue.src carries the web path "assets/audio/..."; the @capacitor-community/native-audio
// Android plugin (v7) opens assetPath via AssetManager relative to the assets root, where
// Capacitor places web assets under "public/". The `public/` prefix is REQUIRED — verified
// on-device in Phase 0 (see qa/device-matrix.md). This corrects the earlier no-prefix decision.
import { NativeAudio } from '@capacitor-community/native-audio';
import type { AudioBackend } from './AudioService';
import type { AudioCue, AudioCueId } from '@/types';

export class NativeAudioBackend implements AudioBackend {
  async preload(cue: AudioCue): Promise<void> {
    await NativeAudio.preload({
      assetId: cue.id,
      assetPath: `public/${cue.src}.m4a`,
      audioChannelNum: 1,
      isUrl: false,
    });
  }

  async play(id: AudioCueId): Promise<void> {
    await NativeAudio.play({ assetId: id });
  }

  async stop(id: AudioCueId): Promise<void> {
    await NativeAudio.stop({ assetId: id });
  }

  async setVolume(id: AudioCueId, volume: number): Promise<void> {
    await NativeAudio.setVolume({ assetId: id, volume });
  }

  async resume(): Promise<boolean> {
    // Native audio is not subject to the WebAudio context-suspend defect;
    // there is no shared context to re-acquire. Report ready.
    return true;
  }
}
