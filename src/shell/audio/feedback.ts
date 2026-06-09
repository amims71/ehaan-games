// PROTOTYPE audio feedback (web only). Uses the Web Speech API for spoken names and WebAudio
// oscillators for chimes, so the prototype is audible with NO bundled assets.
//
// PRODUCTION (M3): replace this with pre-rendered ElevenLabs voice clips + SFX played through the
// native-audio AudioService (fully offline / zero-network — the spec forbids runtime TTS, and iOS
// WKWebView WebAudio is unreliable). This module's call sites (speak / chime / buzz) stay the same.

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

/** Speak a short word/phrase in a friendly voice. */
export function speak(text: string): void {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // Speech synthesis unavailable — silently skip.
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
