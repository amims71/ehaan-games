// Tiny persisted settings, backed by localStorage. Currently just the global mute toggle.
// All access is guarded so it never throws if storage is unavailable (private mode, WebView, etc.).

const KEY_MUTED = 'ehaan.muted';

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
