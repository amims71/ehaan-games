// PROTOTYPE audio feedback (web). Spoken names play PRE-RENDERED clips bundled under
// public/assets/audio/vo/<word>.m4a (generated with macOS `say` for now); WebAudio oscillators
// provide the chime / soft-tone SFX. This is the production-shaped approach — clips are bundled
// and offline (no runtime TTS, which the spec forbids and which is unreliable across platforms).
// M3 swaps the say-generated clips for the warm ElevenLabs narrator at the same paths.

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return undefined;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const voCache = new Map<string, HTMLAudioElement>();
let currentVo: HTMLAudioElement | undefined;

function slug(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Play the pre-rendered clip for a word/phrase (e.g. a colour or item name). */
export function speak(text: string): void {
  const key = slug(text);
  if (!key) return;
  try {
    let clip = voCache.get(key);
    if (!clip) {
      clip = new Audio(`assets/audio/vo/${key}.m4a`);
      clip.preload = 'auto';
      voCache.set(key, clip);
    }
    if (currentVo && currentVo !== clip) {
      currentVo.pause();
      currentVo.currentTime = 0;
    }
    clip.currentTime = 0;
    void clip.play();
    currentVo = clip;
  } catch {
    // Clip missing or playback blocked — silently skip.
  }
}

function tone(freq: number, startOffset: number, dur: number, gain: number): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Happy rising two-note ding for a correct action. */
export function chime(): void {
  tone(660, 0, 0.12, 0.18);
  tone(880, 0.1, 0.18, 0.18);
}

/** Soft, gentle "try again" tone — deliberately NOT a harsh buzzer (kinder for ages 2-5). */
export function buzz(): void {
  tone(300, 0, 0.16, 0.13);
  tone(220, 0.12, 0.2, 0.13);
}
