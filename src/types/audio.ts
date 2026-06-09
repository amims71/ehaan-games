/** Stable identifier for every voice prompt / SFX / music bed. */
export type AudioCueId = string & { readonly __brand: 'AudioCueId' };

/** Whether a cue is critical (voice — native on device) or ambient (SFX/music — web sound mgr). */
export type AudioChannel = 'voice' | 'sfx' | 'music';

/** A single playable audio asset, declared once and referenced by id. */
export interface AudioCue {
  id: AudioCueId;
  channel: AudioChannel;
  /** Base asset path WITHOUT extension; backends append .m4a/.ogg. e.g. "assets/audio/prompt-sort". */
  src: string;
  /** Loop the cue (music bed = true; voice/sfx = false). */
  loop: boolean;
  /** 0..1 playback volume. */
  volume: number;
  /**
   * CRITICAL voice prompts MUST be true so AudioService routes them through
   * NativeAudioBackend on device (bypasses the iOS WKWebView WebAudio defect).
   * Only meaningful when channel === 'voice'.
   */
  critical: boolean;
}

/** States of the AudioService resume state machine. */
export type AudioResumeState =
  | 'uninitialized' // before first user gesture; nothing decoded
  | 'suspended'     // context exists but is suspended (backgrounded; produced by the 'manual' suspend trigger)
  | 'running'       // context running; cues play immediately
  | 'recovering';   // resume() in flight after lifecycle event

/** Event that can drive a resume attempt. */
export type AudioResumeTrigger =
  | 'first-gesture'      // first tap unlocks audio
  | 'app-resume'         // Capacitor App 'resume'
  | 'visibility-visible' // document 'visibilitychange' → visible
  | 'manual';            // explicit suspend/resume request (e.g. document hidden → suspend)
