// Tiny persisted settings, backed by localStorage. Currently just the global mute toggle.
// All access is guarded so it never throws if storage is unavailable (private mode, WebView, etc.).

const KEY_MUTED = 'ehaan.muted';
const KEY_YOUNGER = 'ehaan.younger';

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // storage unavailable — keep the in-memory value only
  }
}

let muted = readBool(KEY_MUTED);
let younger = readBool(KEY_YOUNGER);

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  writeBool(KEY_MUTED, value);
}

/** Flip the mute state and return the new value. */
export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

/** "Younger" mode: fewer items per round for the very youngest players. */
export function isYounger(): boolean {
  return younger;
}

export function setYounger(value: boolean): void {
  younger = value;
  writeBool(KEY_YOUNGER, value);
}

export function toggleYounger(): boolean {
  setYounger(!younger);
  return younger;
}

/** Pick a per-round count based on the mode. */
export function count(normal: number, young: number): number {
  return younger ? young : normal;
}
