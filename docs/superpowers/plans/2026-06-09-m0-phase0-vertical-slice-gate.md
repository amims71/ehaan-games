# Phase 0 — De-Risk Vertical Slice & GO/NO-GO Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Ehaan Games workspace (Vite + TypeScript + Phaser 4.1.x + Capacitor 8.3.x, pnpm, vitest) with the FULL pinned dependency set and ALL scripts declared LAW in Shared Contracts §7.1/§7.2 (so later milestones can rely on `tsx`, `free-tex-packer-core`, `vite-plugin-pwa`, `@capacitor/preferences`, eslint, and the `assets:*`/`lint` scripts already existing), and build ONE THROWAWAY color-sort vertical slice that proves the two dealbreaker-class technical risks are survivable on the team's CURRENT devices: (1) iOS WKWebView WebAudio defect — a critical voice prompt must SURVIVE an incoming-call interruption and a lock/unlock cycle by routing through `@capacitor-community/native-audio` and resuming the AudioContext on Capacitor App `resume` + document `visibilitychange`; (2) drag latency + battery on current Android feel acceptable. This milestone GATES ALL OTHERS: a documented GO/NO-GO decision is recorded, with an explicit PIVOT trigger to React Native + Expo (same TypeScript team, no language change) if the gate fails.

**Architecture:** A throwaway spike that exercises the real native-audio + AudioContext-resume approach end-to-end, plus a PURE, framework-free, unit-tested resume state machine (`audioQueue.ts`) and PURE drop-validation module (`dropValidation.ts`). The spike's Phaser scene (`SpikeScene`) is deliberately disposable — only the validated native-audio/resume approach, the pure modules, and the carried-forward `AudioBackend` interface survive into Phase 1; the spike scene and the spike-grade backend BODIES do NOT. The device-test protocol is recorded as concrete manual-QA checklists in `qa/device-matrix.md` plus `qa/checklists/phase0-ios-audio.md` and `qa/checklists/phase0-android-drag.md`.

**Tech Stack:** Phaser 4.1.x (TypeScript) + Capacitor 8.3.x (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/app`, `@capacitor/preferences`) + `@capacitor-community/native-audio`, bundled with Vite 5.x (+ `vite-plugin-pwa` 0.20.x), package manager pnpm, unit tests with Vitest 2.x (`@vitest/coverage-v8`), tooling deps `tsx` 4.x + `free-tex-packer-core`, lint via eslint 8.x + `@typescript-eslint/*`. All paths, types, and script names per the canonical Shared Contracts (§1, §2, §3.1, §3.3, §3.6, §6, §7).

---

## Prerequisites

- **None.** This is the FIRST milestone. It must complete with a recorded GO decision before Phase 1 (shell), Phase 2 (asset pipeline), Phase 3 (games), Phase 4 (compliance), or Phase 5 (device-matrix QA + launch) begin.
- A current iPad (current iOS) and a current Android device/tablet must be physically available for the device-test protocol (Tasks 14–16). Xcode (for iOS build) and Android Studio + SDK (API 35+) must be installed on the build machine. A signing-capable Apple developer account is NOT required for Phase 0 (a development build via Xcode to a tethered device suffices).
- `pnpm`, `node` (LTS), and (for the spike build) Xcode + Android Studio must be installed before Tasks 13–16.

**Throwaway boundary (LAW for this milestone):** The spike scene `src/spike/SpikeScene.ts`, the spike content/sprites, and `src/spike/main.spike.ts` are a SPIKE. They are explicitly carried forward as LEARNINGS ONLY. What survives into Phase 1 is: (a) the validated native-audio + AudioContext-resume approach, (b) the PURE unit-tested modules `src/shell/audio/audioQueue.ts` and `src/shell/input/dropValidation.ts`, (c) the `AudioBackend` interface (from `AudioService.ts`) plus the `AudioService`/`AppLifecycle`/`NativeAudioBackend`/`WebAudioBackend` class shells — but the spike-grade backend BODIES (`WebAudioBackend` play/stop call patterns especially) are DISCARDED and re-implemented as the single source of truth in Phase 1 Task 10; only the `AudioBackend` interface and the `NativeAudioBackend.preload` assetPath convention are authoritative, and (d) the recorded device-matrix results. Task 18 documents what to delete and what to keep.

**Canonical reconciliations introduced/honored by this milestone (LAW, carried forward):**
- `NativeAudioBackend.preload` uses `assetPath: \`${cue.src}.m4a\`` — NO `public/` prefix — because `AudioCue.src` already carries the `assets/audio/...` path (Shared Contracts §2.3). M1's production `NativeAudioBackend` uses the identical convention.
- The PURE `audioQueue` state machine implements an explicit `manual`→`suspended` transition so the declared `'suspended'` `AudioResumeState` is actually produced (resolves the contract docstring that previously described a transition no milestone implemented). Both M0 and M1 conform to this single transition table.
- `vitest.config.ts` `include` globs cover `src/**/*.test.ts`, `tests/**/*.test.ts`, AND `tools/**/*.test.ts` (so M3's tooling tests are picked up), and the `@` → `src` alias is configured for both Vite and Vitest.
- `vite-plugin-pwa` is added as a dependency and `public/manifest.webmanifest` exists from this milestone, so any later milestone that depends on SW/manifest output comes after the one that configures the dependency.

---

## Files

Paths are canonical per Shared Contracts §1. Files marked **(THROWAWAY)** are deleted at the start of Phase 1 (see Task 18); their learnings, the pure modules, and the `AudioBackend` interface are kept.

**Workspace scaffold**
- `package.json` — create — pnpm project; ALL scripts + the FULL pinned dependency set per Shared Contracts §7.1/§7.2.
- `tsconfig.json` — create — `strict: true`; bundler moduleResolution; `@/*` → `src/*` path alias.
- `vite.config.ts` — create — bundles to `/dist`; `base: './'`; `resolve.alias` `@` → `src`; `vite-plugin-pwa` configured.
- `vitest.config.ts` — create — `environment: 'node'`, `globals: true`, `include: ['src/**/*.test.ts','tests/**/*.test.ts','tools/**/*.test.ts']`, `setupFiles: ['tests/setup.ts']`, `@` alias.
- `.eslintrc.cjs` — create — eslint + `@typescript-eslint` config (listed in Shared Contracts §1; the `lint` script depends on it).
- `tests/setup.ts` — create — vitest global setup; stubs `globalThis.fetch` to throw (no network in tests).
- `index.html` — create — single root `<div id="app">`; for Phase 0 it loads the spike entry; no external `<script src>`.
- `.gitignore` — create — ignore `node_modules`, `dist`, `ios/App/Pods`, `android/.gradle`, `*.log`, native build artifacts.
- `capacitor.config.ts` — create — `appId 'com.telaeris.ehaangames'`, `appName 'Ehaan Games'`, `webDir 'dist'`, NO `server.url`.
- `public/manifest.webmanifest` — create — PWA manifest (name "Ehaan Games"); satisfies the `vite-plugin-pwa` config and lets later SW-dependent milestones follow this one.

**Pure, unit-tested modules (CARRY FORWARD)**
- `src/types/audio.ts` — create — `AudioCueId`, `AudioChannel`, `AudioCue`, `AudioResumeState`, `AudioResumeTrigger` (Shared Contracts §2.3).
- `src/types/index.ts` — create — barrel re-export (Phase 0 re-exports only the audio types it needs).
- `src/shell/audio/audioQueue.ts` — create — PURE resume state machine + cue queue, incl. the `manual`→`suspended` transition (Shared Contracts §3.1).
- `src/shell/audio/audioQueue.test.ts` — create — unit tests for the resume state machine, incl. suspend (TDD).
- `src/shell/input/dropValidation.ts` — create — PURE `DropTarget`, `DraggableMeta`, `isValidDrop`, `isMatch`, `isSetComplete` (Shared Contracts §3.3).
- `src/shell/input/dropValidation.test.ts` — create — unit tests for drop validation (TDD).

**Minimal runtime wiring (the `AudioBackend` interface + class shells CARRY FORWARD; spike-grade BODIES revisited in Phase 1)**
- `src/shell/audio/AudioService.ts` — create — minimal facade wiring `audioQueue` to backends; defines the canonical `AudioBackend` interface (subset of Shared Contracts §3.1).
- `src/shell/audio/NativeAudioBackend.ts` — create — minimal `@capacitor-community/native-audio` backend; canonical `assetPath` convention (Shared Contracts §3.2).
- `src/shell/audio/WebAudioBackend.ts` — create — minimal Phaser sound-manager backend (Shared Contracts §3.2). **Spike BODY discarded in Phase 1** — only the `AudioBackend` interface survives.
- `src/shell/platform/AppLifecycle.ts` — create — wires Capacitor App `resume` + document `visibilitychange` → `AudioService.handleResume` (Shared Contracts §3.6).

**Throwaway spike**
- `src/spike/SpikeScene.ts` — create — **(THROWAWAY)** Phaser scene: 3 draggable sprites → 2 color bins, looping music bed, one voice prompt via native audio.
- `src/spike/main.spike.ts` — create — **(THROWAWAY)** Phaser.Game bootstrap for the spike; unlocks audio on first tap; starts `AppLifecycle`.
- `public/assets/audio/spike-prompt-sort.m4a` — add (binary placeholder) — **(THROWAWAY)** the single critical voice prompt asset.
- `public/assets/audio/spike-music-bed.m4a` — add (binary placeholder) — **(THROWAWAY)** looping music bed asset.

**Device-test protocol (CARRY FORWARD as results)**
- `qa/device-matrix.md` — create — device list + GO/NO-GO gate + recorded results table + PIVOT trigger.
- `qa/checklists/phase0-ios-audio.md` — create — exact iOS call-interruption + lock/unlock steps + expected results.
- `qa/checklists/phase0-android-drag.md` — create — exact Android drag-latency + battery steps + expected results.

---

### Task 1: Scaffold the pnpm workspace (package.json with FULL deps + ALL scripts, .gitignore, git init)

**Files:** `package.json`, `.gitignore`

- [ ] Initialize git and verify it is a repo: run `git init /Users/shan/PhpstormProjects/ehaan-games && git -C /Users/shan/PhpstormProjects/ehaan-games rev-parse --is-inside-work-tree`. Expected output: `true`.
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/.gitignore` with this exact content:
```
node_modules/
dist/
*.log
.DS_Store

# Capacitor native build artifacts
ios/App/Pods/
ios/App/App/public/
ios/App/build/
android/.gradle/
android/app/build/
android/build/
android/app/src/main/assets/public/
.idea/
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/package.json` with this exact content. This includes ALL scripts from Shared Contracts §7.1 (incl. `assets:rembg`/`assets:atlas`/`assets:audio`/`assets:manifest`/`lint`) and the FULL pinned dependency set from §7.2 (incl. `@capacitor/preferences`, `vite-plugin-pwa`, `tsx`, `free-tex-packer-core`, eslint + `@typescript-eslint/*`, `@vitest/coverage-v8`) so later milestones can rely on them existing:
```json
{
  "name": "ehaan-games",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "sync": "cap sync",
    "ios": "cap run ios",
    "android": "cap run android",
    "assets:rembg": "tsx tools/remove-bg.ts",
    "assets:atlas": "tsx tools/pack-atlas.ts",
    "assets:audio": "tsx tools/compress-audio.ts",
    "assets:manifest": "tsx tools/asset-manifest.ts",
    "lint": "eslint src tools tests --ext .ts"
  },
  "dependencies": {
    "phaser": "4.1.0",
    "@capacitor/core": "8.3.0",
    "@capacitor/app": "8.0.0",
    "@capacitor/ios": "8.3.0",
    "@capacitor/android": "8.3.0",
    "@capacitor/preferences": "8.0.0",
    "@capacitor-community/native-audio": "7.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "8.3.0",
    "typescript": "5.6.3",
    "vite": "5.4.10",
    "vite-plugin-pwa": "0.20.5",
    "vitest": "2.1.4",
    "@vitest/coverage-v8": "2.1.4",
    "tsx": "4.19.2",
    "free-tex-packer-core": "0.3.4",
    "eslint": "8.57.1",
    "@typescript-eslint/eslint-plugin": "8.13.0",
    "@typescript-eslint/parser": "8.13.0"
  }
}
```
- [ ] Install dependencies: run `pnpm install --dir /Users/shan/PhpstormProjects/ehaan-games`. Expected: pnpm resolves and installs all listed packages with no peer-dep errors that block install; a `pnpm-lock.yaml` is created. If `phaser@4.1.0` / `@capacitor*@8.3.0` exact pins are unavailable, pin to the latest available `4.1.x` / `8.3.x` patch (LAW: stay within `4.1.x` and `8.3.x`) and record the resolved versions in the commit message. Likewise pin `vite-plugin-pwa` to the latest `0.20.x`, `tsx` to the latest `4.x`, `eslint` + `@typescript-eslint/*` to the latest `8.x`, `@vitest/coverage-v8` to match `vitest` `2.x`, and `free-tex-packer-core` to its latest published version if the exact patch above is unavailable.
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "chore: scaffold pnpm workspace with full pinned deps (phaser 4.1.x, capacitor 8.3.x, tooling) and all scripts"`. Expected: a commit listing `package.json`, `pnpm-lock.yaml`, `.gitignore`.

---

### Task 2: TypeScript + Vite (+ PWA) + Vitest config, eslint config, no-network test setup

**Files:** `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `tests/setup.ts`, `public/manifest.webmanifest`, `index.html`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vitest/globals"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "tests", "tools", "vite.config.ts", "vitest.config.ts", "capacitor.config.ts"]
}
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/vite.config.ts` (PWA plugin configured here so SW + manifest output exists for later milestones that depend on it; `registerType: 'autoUpdate'`, uses the static `public/manifest.webmanifest`):
```ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Use the static manifest in public/; do not inject a generated one.
      manifest: false,
      workbox: { globPatterns: ['**/*.{js,css,html,png,json,m4a,ogg}'] },
    }),
  ],
});
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/vitest.config.ts` (include globs cover `tools/` so M3 tooling tests are picked up; `@` alias mirrors Vite):
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'tools/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: { provider: 'v8' },
  },
});
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/.eslintrc.cjs` (satisfies the `lint` script + Shared Contracts §1; M1 Prerequisites assume this exists):
```js
/* eslint config for Ehaan Games (TypeScript). The `lint` script in package.json depends on this. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2022: true, node: true },
  ignorePatterns: ['dist/', 'node_modules/', 'ios/', 'android/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/tests/setup.ts` (no network in tests, per Shared Contracts §6.4):
```ts
// Vitest global setup: assert tests perform no network I/O.
// Pure modules under test never fetch; this catches accidental network use.
globalThis.fetch = (() => {
  throw new Error('Network access is forbidden in unit tests (no fetch).');
}) as typeof fetch;
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/public/manifest.webmanifest` (PWA manifest; icon references point at the `public/icons/` files the asset pipeline / icon-prep task will produce — establishing the SW/manifest base this and later milestones build on):
```json
{
  "name": "Ehaan Games",
  "short_name": "Ehaan",
  "description": "Gentle offline sorting and matching games for ages 2-5. No ads, no data collection.",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/index.html` (single root; Phase 0 loads the spike entry; no external script src):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>Ehaan Games</title>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #ffffff; overflow: hidden; }
      #app { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/spike/main.spike.ts"></script>
  </body>
</html>
```
- [ ] Verify the toolchain runs an empty test suite cleanly: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games test`. Expected: vitest exits non-zero with "No test files found" (acceptable at this point) OR exits 0; either way it must NOT throw a config/resolve error. If it errors on config resolution, fix the config before proceeding.
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "chore: add typescript/vite(+pwa)/vitest/eslint config, manifest, and no-network test setup"`. Expected: a commit with the seven config/setup/manifest/html files.

---

### Task 3: Capacitor config with NO server.url + appId `com.telaeris.ehaangames`

**Files:** `capacitor.config.ts`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/capacitor.config.ts` (Shared Contracts §1, §7.2 — NO `server.url`):
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telaeris.ehaangames',
  appName: 'Ehaan Games',
  webDir: 'dist',
  // INTENTIONALLY no `server.url`: all assets are bundled (kids-store thin-wrapper
  // avoidance, Guideline 4.2; zero networking). Do not add server.url.
};

export default config;
```
- [ ] Verify TypeScript accepts the config: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec tsc --noEmit`. Expected: exits 0 with no type errors (no source files yet besides config).
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "chore: add capacitor.config.ts (appId com.telaeris.ehaangames, no server.url)"`. Expected: a commit with `capacitor.config.ts`.

---

### Task 4: Shared audio types (`src/types/audio.ts` + barrel)

**Files:** `src/types/audio.ts`, `src/types/index.ts`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/types/audio.ts` (verbatim from Shared Contracts §2.3):
```ts
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
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/types/index.ts` (Phase 0 barrel — re-exports audio types; later phases extend this):
```ts
export type {
  AudioCueId,
  AudioChannel,
  AudioCue,
  AudioResumeState,
  AudioResumeTrigger,
} from './audio';
```
- [ ] Verify types compile: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec tsc --noEmit`. Expected: exits 0, no errors.
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "feat: add shared audio types (AudioCue, AudioResumeState, AudioResumeTrigger)"`. Expected: a commit with the two type files.

---

### Task 5: PURE drop-validation module — failing test (TDD red)

**Files:** `src/shell/input/dropValidation.test.ts`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/input/dropValidation.test.ts` (tests the contract from Shared Contracts §3.3 BEFORE the impl exists):
```ts
import { describe, it, expect } from 'vitest';
import { isValidDrop, isMatch, isSetComplete } from './dropValidation';
import type { DraggableMeta, DropTarget } from './dropValidation';

describe('isValidDrop', () => {
  it('accepts an item whose categoryId equals the target acceptsCategoryId', () => {
    const item: DraggableMeta = { id: 'i1', categoryId: 'blue' };
    const target: DropTarget = { id: 'bin-blue', acceptsCategoryId: 'blue' };
    expect(isValidDrop(item, target)).toBe(true);
  });

  it('rejects an item whose categoryId differs from the target', () => {
    const item: DraggableMeta = { id: 'i1', categoryId: 'blue' };
    const target: DropTarget = { id: 'bin-orange', acceptsCategoryId: 'orange' };
    expect(isValidDrop(item, target)).toBe(false);
  });

  it('rejects when the target is a match slot (acceptsCategoryId === null)', () => {
    const item: DraggableMeta = { id: 'i1', categoryId: 'blue' };
    const target: DropTarget = { id: 'slot-1', acceptsCategoryId: null };
    expect(isValidDrop(item, target)).toBe(false);
  });
});

describe('isMatch', () => {
  it('matches two distinct items that share a pairId', () => {
    const a: DraggableMeta = { id: 'a', pairId: 'sun' };
    const b: DraggableMeta = { id: 'b', pairId: 'sun' };
    expect(isMatch(a, b)).toBe(true);
  });

  it('does not match an item with itself', () => {
    const a: DraggableMeta = { id: 'a', pairId: 'sun' };
    expect(isMatch(a, a)).toBe(false);
  });

  it('does not match items with different pairIds', () => {
    const a: DraggableMeta = { id: 'a', pairId: 'sun' };
    const b: DraggableMeta = { id: 'b', pairId: 'moon' };
    expect(isMatch(a, b)).toBe(false);
  });
});

describe('isSetComplete', () => {
  it('is true when every total id has been placed', () => {
    expect(isSetComplete(['i1', 'i2', 'i3'], ['i1', 'i2', 'i3'])).toBe(true);
  });

  it('is false when some total id is still unplaced', () => {
    expect(isSetComplete(['i1', 'i2'], ['i1', 'i2', 'i3'])).toBe(false);
  });

  it('ignores order and duplicates in placed', () => {
    expect(isSetComplete(['i2', 'i1', 'i1'], ['i1', 'i2'])).toBe(true);
  });
});
```
- [ ] Run the test to see it fail (red): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec vitest run src/shell/input/dropValidation.test.ts`. Expected failure: vitest reports the module cannot be resolved — `Failed to resolve import "./dropValidation"` (the impl file does not exist yet). This confirms the test runs and fails for the right reason.

---

### Task 6: PURE drop-validation module — minimal implementation (TDD green) + commit

**Files:** `src/shell/input/dropValidation.ts`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/input/dropValidation.ts` (PURE — no phaser import; signatures verbatim from Shared Contracts §3.3):
```ts
// PURE — no phaser, no DOM. Decidable drop/match/completion logic.

export interface DropTarget {
  id: string; // bin/slot id
  acceptsCategoryId: string | null; // null = match-game slot (matched by pairId)
}

export interface DraggableMeta {
  id: string;
  categoryId?: string; // sort games
  pairId?: string;     // match game
}

/** Is this drop valid for the target? Sort: category equality. Match slots reject (handled by isMatch). */
export function isValidDrop(item: DraggableMeta, target: DropTarget): boolean {
  if (target.acceptsCategoryId === null) return false;
  return item.categoryId === target.acceptsCategoryId;
}

/** Two items form a match if their pairId is equal and ids differ. */
export function isMatch(a: DraggableMeta, b: DraggableMeta): boolean {
  if (a.id === b.id) return false;
  if (a.pairId === undefined || b.pairId === undefined) return false;
  return a.pairId === b.pairId;
}

/** True when EVERY item has been correctly placed/matched (triggers appreciation reward). */
export function isSetComplete(
  placed: ReadonlyArray<string>,
  total: ReadonlyArray<string>,
): boolean {
  const placedSet = new Set(placed);
  return total.every((id) => placedSet.has(id));
}
```
- [ ] Run the test to see it pass (green): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec vitest run src/shell/input/dropValidation.test.ts`. Expected output: all 9 tests pass — `Test Files 1 passed (1)`, `Tests 9 passed (9)`.
- [ ] Verify no phaser leak: run `grep -n "phaser" /Users/shan/PhpstormProjects/ehaan-games/src/shell/input/dropValidation.ts`. Expected: no output (the pure module must not import phaser).
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "feat: add pure drop-validation module (isValidDrop, isMatch, isSetComplete)"`. Expected: a commit with `dropValidation.ts` and `dropValidation.test.ts`.

---

### Task 7: PURE audio resume state machine — failing test (TDD red), incl. the `manual`→`suspended` transition

**Files:** `src/shell/audio/audioQueue.test.ts`

> This test encodes the FULL transition table the contract describes (§3.1), including the previously-unimplemented `manual` suspend trigger producing the `'suspended'` state. This resolves the cross-cutting inconsistency where `'suspended'` was declared but never produced.

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/audio/audioQueue.test.ts`:
```ts
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
```
- [ ] Run the test to see it fail (red): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec vitest run src/shell/audio/audioQueue.test.ts`. Expected failure: `Failed to resolve import "./audioQueue"` (the impl file does not exist yet). Confirms the test runs and fails for the right reason.

---

### Task 8: PURE audio resume state machine — minimal implementation (TDD green) + commit

**Files:** `src/shell/audio/audioQueue.ts`

> Implements the FULL transition table including `manual`→`suspended` so the declared `'suspended'` state is actually produced (LAW; M1 conforms to this same table).

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/audio/audioQueue.ts` (PURE — no phaser, DOM, or capacitor; signatures verbatim from Shared Contracts §3.1):
```ts
// PURE — no phaser, no DOM, no capacitor. AudioService resume state machine + cue queue.
import type { AudioResumeState, AudioResumeTrigger, AudioCueId } from '@/types';

export interface QueuedCue {
  id: AudioCueId;
  critical: boolean;
}

export interface AudioQueueState {
  resume: AudioResumeState;
  /** Cues deferred while not 'running'. Critical cues are kept; non-critical may be dropped. */
  pending: QueuedCue[];
}

/** Initial state before any gesture. */
export function initialAudioState(): AudioQueueState {
  return { resume: 'uninitialized', pending: [] };
}

/**
 * Reduce a trigger against current state. Pure: returns the next state.
 * Transition table (LAW):
 *  - first-gesture | app-resume | visibility-visible  -> recovering (request audio; resolveRecovering confirms running)
 *  - manual                                            -> suspended  (explicit suspend, e.g. document hidden)
 * Nothing flushes on the trigger itself; flushing happens in resolveRecovering().
 */
export function reduceResume(
  state: AudioQueueState,
  trigger: AudioResumeTrigger,
): { next: AudioQueueState; flush: QueuedCue[] } {
  switch (trigger) {
    case 'first-gesture':
    case 'app-resume':
    case 'visibility-visible':
      return { next: { resume: 'recovering', pending: state.pending }, flush: [] };
    case 'manual':
      return { next: { resume: 'suspended', pending: state.pending }, flush: [] };
    default:
      return { next: state, flush: [] };
  }
}

/** Mark the in-flight resume as resolved (context.resume() succeeded): go running + flush pending. */
export function resolveRecovering(
  state: AudioQueueState,
): { next: AudioQueueState; flush: QueuedCue[] } {
  const flush = state.pending;
  return { next: { resume: 'running', pending: [] }, flush };
}

/** Enqueue a cue. Plays now if running; queues critical cues while not running; drops non-critical. */
export function enqueueCue(
  state: AudioQueueState,
  cue: QueuedCue,
): { next: AudioQueueState; playNow: QueuedCue | null } {
  if (state.resume === 'running') {
    return { next: state, playNow: cue };
  }
  if (cue.critical) {
    return { next: { ...state, pending: [...state.pending, cue] }, playNow: null };
  }
  return { next: state, playNow: null };
}
```
- [ ] Run the test to see it pass (green): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec vitest run src/shell/audio/audioQueue.test.ts`. Expected output: all tests pass — `Test Files 1 passed (1)`, `Tests 13 passed (13)`.
- [ ] Verify no framework leak: run `grep -nE "phaser|@capacitor|document|window" /Users/shan/PhpstormProjects/ehaan-games/src/shell/audio/audioQueue.ts`. Expected: no output (the pure module is framework-free).
- [ ] Run the full suite to confirm everything is green: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games test`. Expected: `Test Files 2 passed (2)`, all tests passing.
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "feat: add pure audio resume state machine (audioQueue) with manual->suspended transition"`. Expected: a commit with `audioQueue.ts` and `audioQueue.test.ts`.

---

### Task 9: Minimal audio backends (Native + Web) — canonical `assetPath`; spike-grade Web body

**Files:** `src/shell/audio/NativeAudioBackend.ts`, `src/shell/audio/WebAudioBackend.ts`

> These are minimal implementations of the `AudioBackend` interface (Shared Contracts §3.2). They are NOT unit-tested (Phaser/Capacitor wiring per §6.2). The `AudioBackend` interface carries forward verbatim. `NativeAudioBackend.preload`'s `assetPath` convention — `` `${cue.src}.m4a` `` with NO `public/` prefix — is CANONICAL and identical in M1. The `WebAudioBackend` BODY here is spike-grade and is DISCARDED in Phase 1 (only the interface survives; M1 Task 10 is the single source of the production Web body).

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/audio/NativeAudioBackend.ts` (uses `@capacitor-community/native-audio` for critical voice; canonical `assetPath` per the reconciliation above):
```ts
// Implements the AudioBackend contract via @capacitor-community/native-audio.
// Used for CRITICAL voice prompts on device. NOT unit-tested (device-verified).
// CANONICAL assetPath convention (LAW, identical in M1): `${cue.src}.m4a` with NO public/ prefix,
// because AudioCue.src already carries the "assets/audio/..." path (Shared Contracts §2.3).
import { NativeAudio } from '@capacitor-community/native-audio';
import type { AudioBackend } from './AudioService';
import type { AudioCue, AudioCueId } from '@/types';

export class NativeAudioBackend implements AudioBackend {
  async preload(cue: AudioCue): Promise<void> {
    await NativeAudio.preload({
      assetId: cue.id,
      assetPath: `${cue.src}.m4a`,
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
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/audio/WebAudioBackend.ts` (SPIKE-GRADE Phaser sound-manager body for ambient SFX/music; resumes the WebAudio context). The body is intentionally minimal and is replaced wholesale in Phase 1 — only the `AudioBackend` interface it implements is carried forward:
```ts
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
    const s = this.sound.get(id);
    if (s) s.setVolume(volume);
  }

  async resume(): Promise<boolean> {
    const mgr = this.sound as unknown as { context?: AudioContext };
    if (mgr.context && mgr.context.state !== 'running') {
      await mgr.context.resume();
    }
    return mgr.context ? mgr.context.state === 'running' : true;
  }
}
```
- [ ] Verify it compiles (the `AudioBackend` interface is defined in Task 10; this step is re-run after Task 10): for now run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec tsc --noEmit`. Expected: errors only about the missing `./AudioService` import (resolved in Task 10). Do not commit yet — proceed to Task 10.

---

### Task 10: Minimal AudioService facade — defines the canonical `AudioBackend` interface

**Files:** `src/shell/audio/AudioService.ts`

> Minimal facade (subset of Shared Contracts §3.1). It owns the `audioQueue` state, defines the canonical `AudioBackend` interface (carried forward verbatim into Phase 1), routes critical voice → `voiceBackend` (Native on device) and ambient → `ambientBackend` (Web), and exposes `handleResume` + `resumeState`. NOT unit-tested itself; the pure state machine it wires IS (Task 8). Critical-cue classification matches the contract: `cue.channel === 'voice' && cue.critical`.

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/audio/AudioService.ts`:
```ts
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
  private masterVolume = 1;

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
    this.masterVolume = volume;
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
```
- [ ] Verify the audio module compiles end-to-end (resolves the Task 9 backends): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec tsc --noEmit`. Expected: exits 0, no errors.
- [ ] Run the full suite (unit tests still green, no regressions): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games test`. Expected: `Test Files 2 passed (2)`, all tests passing.
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "feat: add minimal AudioService facade (canonical AudioBackend interface) + native/web backends"`. Expected: a commit with `AudioService.ts`, `NativeAudioBackend.ts`, `WebAudioBackend.ts`.

---

### Task 11: AppLifecycle — resume AudioContext on Capacitor App `resume` + document `visibilitychange`

**Files:** `src/shell/platform/AppLifecycle.ts`

> Thin wiring over Capacitor `App` + the DOM `visibilitychange` event (Shared Contracts §3.6). NOT unit-tested (the pure state machine it ultimately drives IS, Task 8); its correctness is proven by the iOS device test (Task 14).

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/shell/platform/AppLifecycle.ts`:
```ts
// Thin wiring: Capacitor App 'resume' + document 'visibilitychange'→visible
// both drive AudioService.handleResume, re-acquiring audio after the WKWebView
// suspends the context (call interruption / lock-unlock).
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AudioService } from '../audio/AudioService';

export class AppLifecycle {
  private appResumeHandle: PluginListenerHandle | null = null;
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      void this.audio.handleResume('visibility-visible');
    }
  };

  constructor(private readonly audio: AudioService) {}

  start(): void {
    void App.addListener('resume', () => {
      void this.audio.handleResume('app-resume');
    }).then((handle) => {
      this.appResumeHandle = handle;
    });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  stop(): void {
    if (this.appResumeHandle) {
      void this.appResumeHandle.remove();
      this.appResumeHandle = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
```
- [ ] Verify it compiles: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec tsc --noEmit`. Expected: exits 0, no errors.
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "feat: add AppLifecycle wiring App resume + visibilitychange to AudioService.handleResume"`. Expected: a commit with `AppLifecycle.ts`.

---

### Task 12: Compliance assertion — capacitor.config has NO server.url (automated, TDD)

**Files:** `src/compliance/assertions.ts`, `tests/compliance/capacitorConfig.test.ts`

> Shared Contracts §6.3 places the compliance assertion helpers in M0's scaffold so later milestones (M4) can extend them. This task adds only the `hasNoServerUrl` helper and the test that imports the real `capacitor.config.ts` — the most relevant Phase-0 compliance guard. The remaining helpers (`manifestExcludesAdId`, `hasNoForbiddenSdks`) are added in M4.

- [ ] Create the failing test FIRST — `/Users/shan/PhpstormProjects/ehaan-games/tests/compliance/capacitorConfig.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hasNoServerUrl } from '@/compliance/assertions';
import capacitorConfig from '../../capacitor.config';

describe('hasNoServerUrl', () => {
  it('returns true for a config without server.url', () => {
    expect(hasNoServerUrl({ appId: 'x', appName: 'y', webDir: 'dist' })).toBe(true);
  });

  it('returns false when server.url is present', () => {
    expect(hasNoServerUrl({ server: { url: 'http://192.168.0.2' } })).toBe(false);
  });

  it('asserts the SHIPPED capacitor.config.ts has no server.url (kids-store thin-wrapper guard)', () => {
    expect(hasNoServerUrl(capacitorConfig as unknown as Record<string, unknown>)).toBe(true);
  });
});
```
- [ ] Run the test to see it fail (red): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec vitest run tests/compliance/capacitorConfig.test.ts`. Expected failure: `Failed to resolve import "@/compliance/assertions"` (the helper does not exist yet).
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/compliance/assertions.ts` (PURE; only the §6.3 helper needed for Phase 0):
```ts
// PURE compliance assertion helpers (Shared Contracts §6.3). M4 extends this file
// with manifestExcludesAdId() and hasNoForbiddenSdks().

/** True if a capacitor.config object has NO server.url (bundled assets only). */
export function hasNoServerUrl(config: Record<string, unknown>): boolean {
  const server = config['server'];
  if (server === undefined || server === null) return true;
  if (typeof server !== 'object') return true;
  return !('url' in (server as Record<string, unknown>));
}
```
- [ ] Run the test to see it pass (green): run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec vitest run tests/compliance/capacitorConfig.test.ts`. Expected output: all 3 tests pass — `Tests 3 passed (3)`.
- [ ] Run the full suite: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games test`. Expected: `Test Files 3 passed (3)`, all tests passing (`dropValidation`, `audioQueue`, `capacitorConfig`).
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "test: add compliance assertion that capacitor.config has no server.url"`. Expected: a commit with `assertions.ts` and `capacitorConfig.test.ts`.

---

### Task 13: Build the THROWAWAY spike scene + entry (drag 3 sprites → 2 bins, music bed, native voice prompt)

**Files:** `src/spike/SpikeScene.ts`, `src/spike/main.spike.ts`, `public/assets/audio/spike-prompt-sort.m4a`, `public/assets/audio/spike-music-bed.m4a`

> **(THROWAWAY)** This scene is a disposable spike to exercise the real drag + native-audio + resume path on devices. It uses the PURE `dropValidation` module (carried forward) and the minimal `AudioService`/`AppLifecycle` (interfaces carried forward). Sprites are generated programmatically (colored rectangles via Phaser Graphics) so NO art assets are needed for Phase 0.

- [ ] Place the two audio assets. If real ElevenLabs/Stable-Audio assets are not yet produced, generate short placeholder `.m4a` files so the device build has real audio to interrupt. Run:
```
mkdir -p /Users/shan/PhpstormProjects/ehaan-games/public/assets/audio
ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -c:a aac /Users/shan/PhpstormProjects/ehaan-games/public/assets/audio/spike-prompt-sort.m4a
ffmpeg -f lavfi -i "sine=frequency=220:duration=8" -c:a aac /Users/shan/PhpstormProjects/ehaan-games/public/assets/audio/spike-music-bed.m4a
```
Expected: two `.m4a` files exist. If `ffmpeg` is unavailable, copy any two short royalty-free `.m4a` clips to those exact paths — the spike only needs audible, loopable audio. (These are THROWAWAY placeholders, NOT shipping assets.)
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/spike/SpikeScene.ts` (**THROWAWAY**):
```ts
// THROWAWAY SPIKE SCENE — deleted at the start of Phase 1 (see plan Task 18).
// Purpose: exercise Phaser drag events + the PURE dropValidation module + the
// native-audio voice prompt + the looping music bed on REAL devices.
import Phaser from 'phaser';
import { isValidDrop, isSetComplete, type DraggableMeta, type DropTarget } from '@/shell/input/dropValidation';
import type { AudioService } from '@/shell/audio/AudioService';
import type { AudioCueId } from '@/types';

const PROMPT_CUE = 'spike-prompt-sort' as AudioCueId;
const MUSIC_CUE = 'spike-music-bed' as AudioCueId;

interface SpikeItem { obj: Phaser.GameObjects.Rectangle; meta: DraggableMeta; homeX: number; homeY: number; }

export class SpikeScene extends Phaser.Scene {
  private audio!: AudioService;
  private items: SpikeItem[] = [];
  private targets: { zone: Phaser.GameObjects.Zone; target: DropTarget }[] = [];
  private placed: string[] = [];

  constructor() { super('Spike'); }

  init(data: { audio: AudioService }): void { this.audio = data.audio; }

  preload(): void {
    // Ambient music via Phaser loader (WebAudio backend); voice is native (preloaded by AudioService).
    this.load.audio(MUSIC_CUE, ['assets/audio/spike-music-bed.m4a']);
  }

  create(): void {
    const { width, height } = this.scale;
    // Two bins (drop targets): blue (left), orange (right). Generous toddler hit areas.
    const binDefs = [
      { id: 'bin-blue', cat: 'blue', color: 0x0072b2, x: width * 0.25 },
      { id: 'bin-orange', cat: 'orange', color: 0xe69f00, x: width * 0.75 },
    ];
    for (const b of binDefs) {
      this.add.rectangle(b.x, height * 0.78, 220, 220, b.color, 0.35).setStrokeStyle(6, b.color);
      const zone = this.add.zone(b.x, height * 0.78, 220, 220).setRectangleDropZone(220, 220);
      this.targets.push({ zone, target: { id: b.id, acceptsCategoryId: b.cat } });
    }
    // Three draggable items: 2 blue, 1 orange.
    const itemDefs = [
      { id: 'i1', cat: 'blue', color: 0x0072b2, x: width * 0.3 },
      { id: 'i2', cat: 'orange', color: 0xe69f00, x: width * 0.5 },
      { id: 'i3', cat: 'blue', color: 0x0072b2, x: width * 0.7 },
    ];
    for (const it of itemDefs) {
      const r = this.add.rectangle(it.x, height * 0.3, 120, 120, it.color).setInteractive({ draggable: true });
      this.items.push({ obj: r, meta: { id: it.id, categoryId: it.cat }, homeX: it.x, homeY: height * 0.3 });
    }

    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dx: number, dy: number) => {
      obj.setPosition(dx, dy);
    });
    this.input.on('drop', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, zone: Phaser.GameObjects.Zone) => {
      const item = this.items.find((i) => i.obj === obj);
      const tgt = this.targets.find((t) => t.zone === zone);
      if (!item || !tgt) return;
      if (isValidDrop(item.meta, tgt.target)) {
        obj.setPosition(zone.x, zone.y);
        obj.disableInteractive();
        if (!this.placed.includes(item.meta.id)) this.placed.push(item.meta.id);
        if (isSetComplete(this.placed, this.items.map((i) => i.meta.id))) {
          // Appreciation: replay the voice prompt (cheer stand-in for the spike).
          void this.audio.play(PROMPT_CUE);
        }
      } else {
        obj.setPosition(item.homeX, item.homeY);
      }
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dropped: boolean) => {
      if (!dropped) {
        const item = this.items.find((i) => i.obj === obj);
        if (item) obj.setPosition(item.homeX, item.homeY);
      }
    });

    // Start the looping music bed and play the intro voice prompt (critical → native).
    void this.audio.play(MUSIC_CUE);
    void this.audio.play(PROMPT_CUE);

    // On-screen replay button so the device tester can re-trigger the voice prompt after interruptions.
    const replay = this.add.rectangle(width * 0.5, height * 0.06, 260, 70, 0x009e73).setInteractive();
    this.add.text(width * 0.5, height * 0.06, 'Replay voice', { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    replay.on('pointerup', () => { void this.audio.play(PROMPT_CUE); });
  }
}
```
- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/src/spike/main.spike.ts` (**THROWAWAY** bootstrap; unlocks audio on first tap; starts `AppLifecycle`):
```ts
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
```
- [ ] Verify the spike builds: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games build`. Expected: `tsc --noEmit` passes and `vite build` (with `vite-plugin-pwa`) writes `dist/index.html`, the bundled JS, the copied `manifest.webmanifest`, and a generated service worker (`sw.js` / `registerSW.js`) with no errors. If Phaser's `Phaser.Core.Events.READY` symbol differs in 4.1.x, substitute the 4.1.x ready event (consult `node_modules/phaser` typings) — the build must succeed. If the PWA plugin warns about missing `public/icons/*.png` (icons are produced by the icon-prep task in the asset milestone), the build must still SUCCEED (warnings are acceptable in Phase 0).
- [ ] Add iOS + Android native platforms and sync the bundled `dist/`:
```
pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec cap add ios
pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec cap add android
pnpm --dir /Users/shan/PhpstormProjects/ehaan-games exec cap sync
```
Expected: `ios/` and `android/` directories are created; `cap sync` copies `dist/` into both and installs the `@capacitor/app`, `@capacitor/preferences`, and `@capacitor-community/native-audio` plugins. Confirm the native-audio plugin appears in the sync output for both platforms.
- [ ] Confirm the native-audio voice asset is in the synced web assets at the CANONICAL path (`assets/audio/spike-prompt-sort.m4a`, matching `NativeAudioBackend.preload`'s `` `${cue.src}.m4a` ``). Run `ls -la /Users/shan/PhpstormProjects/ehaan-games/ios/App/App/public/assets/audio/`. Expected: both `.m4a` files listed at `.../public/assets/audio/`. (The native-audio plugin resolves `assetPath` relative to the web asset root, i.e. the synced `public/` folder, so `assets/audio/spike-prompt-sort.m4a` is correct WITHOUT a `public/` prefix. If your installed plugin version requires a different base, record the resolved path in the device-matrix notes — but do NOT reintroduce a `public/` prefix into `AudioCue.src`, which already carries `assets/audio/...`.)
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "feat: add throwaway color-sort spike scene + entry; add ios/android platforms"`. Expected: a commit including the spike files and the generated native projects (per `.gitignore`, build artifacts are excluded but project scaffolding is tracked).

---

### Task 14: Author the iOS audio-survival manual-QA checklist

**Files:** `qa/checklists/phase0-ios-audio.md`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/qa/checklists/phase0-ios-audio.md` with this exact content:
```markdown
# Phase 0 — iOS Audio Survival Checklist (current iPad)

**Target risk:** iOS WKWebView WebAudio defect — audio can go silent for the whole session after a
call or lock/unlock; unrecoverable by a pre-literate child. (Spec §8, §10.)

**Device:** Current iPad, current iOS (record exact model + iOS version in `qa/device-matrix.md`).
**Build:** Spike build (`SpikeScene`) installed via Xcode to a tethered iPad. Voice prompt
("spike-prompt-sort") routes through `@capacitor-community/native-audio` (assetPath `assets/audio/spike-prompt-sort.m4a`);
music bed loops via the Phaser WebAudio backend; `AppLifecycle` resumes on App `resume` + `visibilitychange`.

## Setup
1. In Xcode, open `ios/App/App.xcworkspace`, select the tethered iPad, set a development team, Run.
2. App launches to a white screen with two color bins (blue/orange) and three draggable squares,
   plus a green "Replay voice" button at the top.
3. Tap once anywhere to unlock audio. **Expected:** the voice prompt plays AND the music bed begins
   looping. (If silent, audio unlock failed — NO-GO indicator; record it.)

## Test A — Incoming-call interruption
1. With the app foregrounded and music looping, place a real incoming phone/FaceTime call to the iPad
   (or trigger a call from a second device). Let it ring ~5s. Decline/end the call.
2. **During the call:** music may duck/pause (expected; iOS owns the audio session).
3. **After ending the call:** return to the app. Tap "Replay voice".
   - **Expected (GO):** the voice prompt plays clearly within ~1s. Music resumes looping.
   - **Observed result:** _PASS / FAIL_ + notes (latency, distortion, silence). Record in device-matrix.
4. Repeat the call interruption 3 times. The voice prompt MUST play on all 3 post-call replays.

## Test B — Lock / unlock cycle
1. With music looping, press the iPad power button to LOCK the screen. Wait ~10s.
2. Unlock the iPad (Face ID / passcode) and return to the app.
3. Tap "Replay voice".
   - **Expected (GO):** the voice prompt plays clearly. Music bed resumes looping (AppLifecycle
     re-acquired the WebAudio context on `resume`/`visibilitychange`).
   - **Observed result:** _PASS / FAIL_ + notes. Record in device-matrix.
4. Repeat lock/unlock 3 times. The voice prompt MUST play on all 3 post-unlock replays.

## Test C — Background / foreground (control)
1. Press Home (or swipe up) to background the app for ~15s, then reopen.
2. Tap "Replay voice". **Expected (GO):** voice plays; music resumes.

## GO criteria (iOS)
- Voice prompt plays on EVERY post-interruption replay across Tests A, B, C (no session-long silence).
- Music bed resumes (or restarts) without requiring an app relaunch.

## NO-GO indicators (iOS)
- Voice prompt is silent after ANY call or lock/unlock and cannot recover without relaunch.
- AudioContext stays suspended (music never resumes) despite App `resume`/`visibilitychange`.

→ A NO-GO on iOS audio triggers the documented PIVOT (see `qa/device-matrix.md`).
```
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "docs: add phase0 iOS audio-survival manual QA checklist"`. Expected: a commit with the checklist.

---

### Task 15: Author the Android drag-latency + battery manual-QA checklist (incl. idle-throttle observation)

**Files:** `qa/checklists/phase0-android-drag.md`

> Test C explicitly records idle behavior. Phase 0 only OBSERVES idle drain (idle render-loop throttling is IMPLEMENTED in Phase 1's `gameConfig.ts`/scene wiring, where the spec §8 mitigation lives); this checklist establishes the baseline the Phase 1 throttle is measured against.

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/qa/checklists/phase0-android-drag.md` with this exact content:
```markdown
# Phase 0 — Android Drag Latency + Battery Checklist (current Android)

**Target risk:** Phaser's continuous JS render loop is the textbook jank pattern; drag must feel
responsive and battery drain must be acceptable. (Spec §8, §10. Note: §10 tests CURRENT hardware
only; residual low-end risk is accepted and mitigated via atlasing/WebGL/idle-throttling — the
idle throttle itself is BUILT in Phase 1, not Phase 0; here we only baseline idle drain.)

**Device:** Current Android phone/tablet (record exact model + Android version in `qa/device-matrix.md`).
**Build:** Spike build (`SpikeScene`) installed via Android Studio (or `pnpm android`) to the device.
WebGL renderer (`Phaser.AUTO`); three draggable squares; two bins.

## Setup
1. Build & install: `pnpm --dir <repo> android` (or open `android/` in Android Studio and Run).
2. Launch; tap once to unlock audio; confirm the three squares and two bins render.
3. Enable Developer Options → "Show taps" (optional) to visualize touch points.

## Test A — Drag latency / responsiveness (subjective + frame check)
1. Drag each square slowly, then quickly, into a bin. Repeat for ~60s of continuous dragging.
   - **Expected (GO):** the square tracks the finger with no perceptible lag; no stutter while
     dragging; valid drops snap into the bin; invalid drops snap back to home.
   - **Observed result:** _PASS / FAIL_ + notes (perceived lag, stutter). Record in device-matrix.
2. (Optional quantitative) In Chrome DevTools remote-inspect the WebView (chrome://inspect),
   record a Performance trace during dragging. **Expected:** sustained ~60fps (frame times ~16ms);
   no long tasks > 50ms during drag. Record the median fps.

## Test B — Battery / thermal over a sustained session
1. Note the starting battery %. Leave the spike foregrounded and actively drag for 15 minutes
   (music looping the whole time).
2. After 15 min, note the ending battery % and whether the device is warm/hot.
   - **Expected (GO):** battery drop is in line with a normal foregrounded game/video (rough guide:
     ≤ ~8–10% over 15 min on a current device) AND the device does not become uncomfortably hot.
   - **Observed result:** start% / end% / drop% / thermal note. Record in device-matrix.

## Test C — Idle behavior (baseline for the Phase 1 idle throttle)
1. Stop interacting for 60s while the scene is open. (Phase 1 ADDS idle render-loop throttling in
   `gameConfig.ts` / scene wiring per spec §8; for the spike, just record whether idle drain looks
   reasonable so the Phase 1 throttle has a baseline to beat.)
   - **Observed result:** notes (CPU/GPU feel, any continued battery drain while idle). Record in device-matrix.

## GO criteria (Android)
- Drag tracks the finger with no perceptible lag and sustains ~60fps during dragging.
- 15-minute active session battery drop is acceptable for a foregrounded game; no overheating.

## NO-GO indicators (Android)
- Visible, repeatable drag lag/stutter that a 2–5-year-old would find frustrating.
- Excessive battery drain or overheating during the 15-minute session.

→ A NO-GO on Android drag/battery triggers the documented PIVOT (see `qa/device-matrix.md`).
```
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "docs: add phase0 Android drag-latency + battery manual QA checklist"`. Expected: a commit with the checklist.

---

### Task 16: Author `qa/device-matrix.md` — device list, GO/NO-GO gate, results table, PIVOT trigger

**Files:** `qa/device-matrix.md`

- [ ] Create `/Users/shan/PhpstormProjects/ehaan-games/qa/device-matrix.md` with this exact content:
```markdown
# Ehaan Games — Device Matrix & Phase 0 GO/NO-GO Gate

This file is the AUTHORITATIVE record of the Phase 0 de-risk gate. **No other milestone (Phase 1–5)
may begin until this file records a GO decision.** (Spec §9 Phase 0; §10 resolved decisions.)

## Scope of Phase 0 (the gate)
Prove, on the team's CURRENT devices, that the two dealbreaker-class risks are survivable:
1. **iOS WKWebView WebAudio defect** — a critical voice prompt must SURVIVE a call interruption and a
   lock/unlock cycle (routed via `@capacitor-community/native-audio`, assetPath `assets/audio/<id>.m4a`;
   AudioContext resumed on Capacitor App `resume` + document `visibilitychange`).
2. **Android drag latency + battery** — drag must feel responsive and battery drain acceptable.

Per spec §10: CURRENT devices only — no old/legacy hardware. The iOS audio test still applies because
it targets a WebAudio defect present on CURRENT iOS. Residual low-end Android jank risk is accepted and
mitigated by default via atlasing / WebGL / idle-throttling (idle throttle built in Phase 1).

## Devices under test
| Role | Model | OS version | Owner | Date tested |
|---|---|---|---|---|
| iPad (current) | _fill in_ | _fill in_ | _fill in_ | _fill in_ |
| Android (current) | _fill in_ | _fill in_ | _fill in_ | _fill in_ |

## Test procedure
- iOS: follow `qa/checklists/phase0-ios-audio.md` (Tests A call-interruption, B lock/unlock, C bg/fg).
- Android: follow `qa/checklists/phase0-android-drag.md` (Tests A drag latency, B battery, C idle).

## Recorded results
### iOS — `phase0-ios-audio.md`
| Test | Result (PASS/FAIL) | Notes (latency, silence, recovery) |
|---|---|---|
| A — call interruption x3 | _fill in_ | _fill in_ |
| B — lock/unlock x3 | _fill in_ | _fill in_ |
| C — background/foreground | _fill in_ | _fill in_ |
| Native-audio assetPath used | _fill in_ | (record the resolved `assetPath`; default `assets/audio/<id>.m4a`, NO public/ prefix) |

### Android — `phase0-android-drag.md`
| Test | Result (PASS/FAIL) | Notes (fps, lag, battery start→end, thermal) |
|---|---|---|
| A — drag latency / fps | _fill in_ | _fill in_ |
| B — 15-min battery | _fill in_ | _fill in_ |
| C — idle (baseline) | _fill in_ | _fill in_ |

## GO / NO-GO criteria (LAW)
**GO (proceed to Phase 1 — build the reusable shell) requires ALL of:**
- iOS: voice prompt plays on EVERY post-interruption replay (Tests A, B, C) — no session-long silence;
  music resumes without an app relaunch.
- Android: drag tracks the finger with no perceptible lag, sustains ~60fps during dragging; 15-minute
  active session battery drop is acceptable and the device does not overheat.

**NO-GO (any one of):**
- iOS voice goes silent after a call or lock/unlock and cannot recover without relaunch, OR the
  AudioContext stays suspended despite App `resume`/`visibilitychange`.
- Android shows repeatable, frustrating drag lag/stutter, or excessive battery drain/overheating.

## Decision record
| Field | Value |
|---|---|
| Decision (GO / NO-GO) | _fill in_ |
| Decided by | _fill in_ |
| Date | _fill in_ |
| Evidence (links to traces/recordings) | _fill in_ |

## PIVOT trigger (documented fallback)
If the gate is **NO-GO on iOS audio OR on Android drag/battery**, pivot the stack to
**React Native + Expo** (Skia + Reanimated 4 + Gesture Handler / reanimated-dnd). This is the
designated runner-up in the spec's stack matrix (§3.2) and keeps the SAME TypeScript team with
**no new language** (no Dart/C#/Swift/Kotlin). (Spec §9 Phase 0 decision gate; §3.2; §8.)

**On PIVOT, carry forward (NOT the Phaser slice scenes):**
- The PURE, framework-free, unit-tested modules `src/shell/audio/audioQueue.ts` (resume state machine,
  incl. the manual→suspended transition) and `src/shell/input/dropValidation.ts` — they have no Phaser
  dependency and port directly.
- The canonical `AudioBackend` interface and the VALIDATED native-audio + AudioContext-resume APPROACH
  and its learnings (assetPath `assets/audio/<id>.m4a`, resume triggers, unlock-on-first-gesture),
  re-expressed against RN/Expo native-audio + AppState.
- The compliance assertion `hasNoServerUrl` and its test (stack-agnostic).
- These device-matrix results and the checklists (`phase0-ios-audio.md`, `phase0-android-drag.md`),
  which apply regardless of stack.

**Do NOT carry forward:** `src/spike/SpikeScene.ts`, `src/spike/main.spike.ts`, the placeholder
`public/assets/audio/spike-*.m4a`, and the SPIKE-GRADE `WebAudioBackend` BODY — they are throwaway.

## On GO — throwaway cleanup
When GO is recorded, Phase 1 begins by deleting the spike per the plan's Task 18 (the spike scene/entry,
placeholder audio, and the spike-grade WebAudioBackend body), keeping the pure modules, the AudioBackend
interface, the NativeAudioBackend assetPath convention, the compliance helper, and the matured shell.
```
- [ ] Commit: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "docs: add device-matrix with Phase 0 GO/NO-GO gate and React Native + Expo pivot trigger"`. Expected: a commit with `qa/device-matrix.md`.

---

### Task 17: Lint gate — confirm the `lint` script runs against the scaffold

**Files:** (no new files; verifies `.eslintrc.cjs` + `lint` script from Tasks 1–2)

> M1 Prerequisites assume `lint` works from the scaffold. This task proves it.

- [ ] Run the lint script: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games lint`. Expected: eslint runs over `src tools tests` and exits 0 (no errors). The `tools` directory may be empty in Phase 0 — eslint exits 0 when a glob matches nothing under these settings, OR emits a "no files matched the pattern 'tools'" warning that does NOT fail the run. If `tools` causes a hard failure because it is absent, create an empty `tools/.gitkeep` so the directory exists, then re-run. Fix any genuine lint errors in the spike/shell source before proceeding.
- [ ] If `tools/.gitkeep` was created, commit it: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "chore: ensure tools/ exists so lint script runs against the scaffold"`. Expected: a commit (skip this step if no file was added).

---

### Task 18: Execute the device-test protocol, record the decision, and document the throwaway cleanup

**Files:** `qa/device-matrix.md` (fill in results + decision)

- [ ] Run the iOS protocol on the current iPad following `qa/checklists/phase0-ios-audio.md`. Build via Xcode: open `/Users/shan/PhpstormProjects/ehaan-games/ios/App/App.xcworkspace`, select the tethered iPad, set a development team, and Run. Perform Tests A (call interruption ×3), B (lock/unlock ×3), C (background/foreground). Record each PASS/FAIL + notes in the iOS results table of `qa/device-matrix.md`, including the resolved native-audio `assetPath` (default `assets/audio/<id>.m4a`, NO `public/` prefix).
- [ ] Run the Android protocol on the current Android device following `qa/checklists/phase0-android-drag.md`. Build via `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games android` (or Android Studio). Perform Tests A (drag latency / fps), B (15-minute battery), C (idle baseline). Record each PASS/FAIL + notes (fps, battery start→end, thermal, idle baseline) in the Android results table of `qa/device-matrix.md`.
- [ ] Apply the GO/NO-GO criteria (LAW, in `qa/device-matrix.md`) to the recorded results and fill in the **Decision record** table (Decision, Decided by, Date, Evidence). This is the gate that unblocks all other milestones.
- [ ] **If GO:** in `qa/device-matrix.md`, under "On GO — throwaway cleanup", confirm the cleanup list. The throwaway deletion itself is performed at the START of Phase 1, not now — but verify the carry-forward boundary is unambiguous: KEEP `src/shell/audio/audioQueue.ts` (+test), `src/shell/input/dropValidation.ts` (+test), the canonical `AudioBackend` interface in `AudioService.ts`, `NativeAudioBackend.ts` (canonical `assetPath` convention), `AppLifecycle.ts`, `src/compliance/assertions.ts` + `tests/compliance/capacitorConfig.test.ts`, all config (`package.json`, `tsconfig.json`, `vite.config.ts` incl. PWA, `vitest.config.ts`, `.eslintrc.cjs`, `capacitor.config.ts`, `tests/setup.ts`, `public/manifest.webmanifest`), the native `ios/`+`android/` projects, and these QA docs; DELETE `src/spike/` and `public/assets/audio/spike-*.m4a`, and DISCARD the spike-grade `WebAudioBackend` BODY (M1 Task 10 re-authors it from the surviving interface). Also update `index.html`'s `<script src>` from `/src/spike/main.spike.ts` to `/src/main.ts` as the first Phase-1 step.
- [ ] **If NO-GO:** in `qa/device-matrix.md`, record the failing test(s) and invoke the PIVOT trigger section — Phase 1+ retarget to React Native + Expo, carrying forward ONLY the pure modules + the `AudioBackend` interface + the validated approach + the compliance helper + these results (NOT the Phaser spike scenes or the spike Web body). Do not proceed with the Phaser shell.
- [ ] Run the full unit suite one final time to confirm the carry-forward modules are green regardless of the gate outcome: run `pnpm --dir /Users/shan/PhpstormProjects/ehaan-games test`. Expected: `Test Files 3 passed (3)`, all tests passing (`audioQueue.test.ts` + `dropValidation.test.ts` + `capacitorConfig.test.ts`).
- [ ] Commit the recorded decision: run `git -C /Users/shan/PhpstormProjects/ehaan-games add -A && git -C /Users/shan/PhpstormProjects/ehaan-games commit -m "docs: record Phase 0 device-matrix results and GO/NO-GO decision"`. Expected: a commit capturing the filled-in `qa/device-matrix.md`. This commit is the gate artifact that authorizes (GO) or redirects (NO-GO → pivot) all subsequent milestones.