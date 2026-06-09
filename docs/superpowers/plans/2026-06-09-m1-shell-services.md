# Shell Platform & Services Implementation Plan (M1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable game shell's platform & service layer — the long-term asset — as thin Phaser-agnostic abstractions over PURE, unit-tested TypeScript modules. After this milestone, every decidable behavior the games rely on (drop/match validation, completion checks, audio queue + iOS resume state machine, progress serialization, parental-gate challenge, Okabe-Ito palette + contrast/adjacency, hub tile math) is covered by strict-TDD Vitest tests; the Phaser wiring classes (AudioService, NativeAudioBackend, WebAudioBackend, AppLifecycle, ProgressStore, DragDropController, RewardFx) are implemented as thin delegators; and the reusable UI factories (`Button`, `Dialog`) are created here so M2's Scenes (Hub/Settings/ParentalGate) can consume them. No Scenes are built here (that is M2); this milestone delivers the services and UI primitives those Scenes will consume.

**Architecture:** The shell follows a hard split (per Shared Contracts §1 "Path rules (LAW)"): every PURE module lives beside its Phaser/Capacitor wrapper but is a separate file that **never imports `phaser`, the DOM, or `@capacitor/*`**. Pure modules carry all decidable logic and are unit-tested with strict TDD; thin wrappers (and the `Button`/`Dialog` UI factories) wire pure logic to the real engine/platform and are covered later by documented manual QA checklists (Shared Contracts §6.2), not unit tests. Types live in `src/types/` and are re-exported from `src/types/index.ts`; everything imports from the `@/` alias. Honors `docs/superpowers/specs/2026-06-09-kids-games-stack-and-architecture-design.md` §4.1 (reusable shell) and the no-levels / no-scoring / appreciation-only stance (§5, §10).

**Tech Stack:** Phaser 4.1.x (TypeScript) + Capacitor 8.3.x (`@capacitor/app`, `@capacitor/preferences`, `@capacitor-community/native-audio`) + Vite 5.x, tested with Vitest 2.x (`@vitest/coverage-v8`), `node` test environment, `@/` → `src/` path alias. Strict TypeScript (`strict: true`). Pinned versions per Shared Contracts §7.2. Fully offline, zero networking code, zero data collection, no ads, no IAP.

---

## Prerequisites

- **M0 gate passed (Phase 0 de-risk).** The decision gate in spec §9 / §10 must be green: a current iPad survived a call-interruption + lock/unlock with the native-audio voice prompt intact, AND a current Android device showed responsive drag with acceptable battery. If the gate failed, the plan is moot (pivot to React Native + Expo per §9) — do not start M1.
- **Repo scaffold from M0 exists:** `package.json` with the scripts and pinned deps from Shared Contracts §7.1–§7.2 (including `vite-plugin-pwa`); `tsconfig.json` (`strict: true`, `bundler` moduleResolution, `paths: { "@/*": ["src/*"] }`); `vite.config.ts` (`base: './'`, `resolve.alias` `@` → `src`); `vitest.config.ts` (`test.environment: 'node'`, `globals: true`, `include: ['src/**/*.test.ts','tests/**/*.test.ts','tools/**/*.test.ts']`, `setupFiles: ['tests/setup.ts']`, `coverage.provider: 'v8'`, and the same `@` alias); `.eslintrc.cjs`; `tests/setup.ts` stubbing `globalThis.fetch` to throw (Shared Contracts §6.4). If `tests/setup.ts` is absent, Task 0 below creates it.
- **M0 spike entry state is known.** M0 created `index.html` pointing at a throwaway spike entry (`/src/spike/main.spike.ts`) and a spike `NativeAudioBackend`/`WebAudioBackend` used only to prove the iOS audio path. Per the M0 close-out task (M0 Task 16), the spike entry's `index.html` reference and the spike module bodies are removed/neutralized at the end of M0, keeping ONLY the `AudioBackend` interface shape as a learning. M1 therefore does **not** rely on any spike runtime — Task 1 below stubs a minimal `src/main.ts` so `index.html` has a valid, deterministic entry for `vite build`. (This removes the M0-vs-M1 "either/or" ambiguity in the build gate, Task 20.)
- **`git` initialized** and on a feature branch (not the default branch) before any commit.

This milestone is a prerequisite for: M2 (Scenes: Boot/Hub/Settings/BaseGameScene — which import the `Button`/`Dialog` factories created here), M3 (asset pipeline), M4 (the three games), M5 (compliance), M6 (device-matrix QA). All later milestones import the types, pure modules, service classes, and UI factories defined here verbatim.

---

## Files

Paths are canonical per Shared Contracts §1. "test" rows are co-located `*.test.ts` siblings (Shared Contracts §6.5).

**Test harness + entry stub**
- `tests/setup.ts` — Vitest global setup: stub `globalThis.fetch` to throw (no network in tests); export deterministic-RNG helper. *(create if M0 didn't)*
- `src/main.ts` — minimal deterministic Vite entry stub (replaces the removed M0 spike entry) so `index.html` builds; full Phaser bootstrap is M2.

**Shared types (`src/types/`)**
- `src/types/sprites.ts` — `AtlasKey`, branded `SpriteKey`, `spriteKey()` factory.
- `src/types/audio.ts` — `AudioCueId`, `AudioChannel`, `AudioCue`, `AudioResumeState`, `AudioResumeTrigger`.
- `src/types/game.ts` — `GameId`, `SceneKey`, `GameDef`.
- `src/types/rewards.ts` — `RewardKind`, `RewardRequest`.
- `src/types/parental.ts` — `ParentalChallenge`, `ParentalResult`.
- `src/types/progress.ts` — `GameProgress`, `ProgressSnapshot`.
- `src/types/content.ts` — `ContentBase`, `RedundantCue`, color/item/match content interfaces, `ContentConfig` union. *(types only; the loader is M2/M4)*
- `src/types/index.ts` — barrel re-export of every type above.

**Theme + color (PURE logic + tokens)**
- `src/shell/ui/theme.ts` — `OKABE_ITO` tokens, `OkabeItoToken`, `APP_BG_TOKEN`, `MIN_CONTRAST_RATIO`, `FORBIDDEN_ADJACENT`.
- `src/shell/ui/color.ts` — PURE: `hexToRgb`, `relativeLuminance`, `contrastRatio`, `meetsContrast`, `isForbiddenAdjacentPair`, `assertNoForbiddenAdjacency`.
- `src/shell/ui/color.test.ts` — Vitest unit tests for `color.ts`.

**Hub layout (PURE)**
- `src/shell/ui/hubLayout.ts` — PURE: `TileRect`, `computeTileLayout`.
- `src/shell/ui/hubLayout.test.ts` — Vitest unit tests.

**UI factories (thin Phaser wrappers — reusable shell, consumed by M2)**
- `src/shell/ui/Button.ts` — `ButtonOptions`, `Button` (big-tap-target button with tap + hold gestures); see contract §3.11 (added by this milestone).
- `src/shell/ui/Dialog.ts` — `DialogOptions`, `Dialog` (modal panel with title/body/prompt/cancel); see contract §3.12 (added by this milestone).

**Audio**
- `src/shell/audio/audioQueue.ts` — PURE resume state machine + cue queue: `QueuedCue`, `AudioQueueState`, `initialAudioState`, `reduceResume`, `resolveRecovering`, `enqueueCue`.
- `src/shell/audio/audioQueue.test.ts` — Vitest unit tests.
- `src/shell/audio/AudioService.ts` — facade: `AudioBackend`, `AudioServiceOptions`, `AudioService` (thin; wires `audioQueue` to backends).
- `src/shell/audio/NativeAudioBackend.ts` — `AudioBackend` over `@capacitor-community/native-audio` (thin).
- `src/shell/audio/WebAudioBackend.ts` — `AudioBackend` over Phaser sound manager + WebAudio `context.resume()` (thin).

**Platform**
- `src/shell/platform/parentalChallenge.ts` — PURE: `generateChallenge`, `verifyChallenge`.
- `src/shell/platform/parentalChallenge.test.ts` — Vitest unit tests.
- `src/shell/platform/AppLifecycle.ts` — thin wiring over Capacitor `App.resume` + document `visibilitychange`.

**Storage**
- `src/shell/storage/progressSerde.ts` — PURE: `defaultSnapshot`, `serialize`, `deserialize`, `isValidSnapshot`.
- `src/shell/storage/progressSerde.test.ts` — Vitest unit tests.
- `src/shell/storage/ProgressStore.ts` — facade: `KeyValueStore`, `ProgressStore`, `PROGRESS_KEY` (thin; delegates to `progressSerde`; exposes shuffle-seed continuity).

**Input**
- `src/shell/input/dropValidation.ts` — PURE: `DropTarget`, `DraggableMeta`, `isValidDrop`, `isMatch`, `isSetComplete`.
- `src/shell/input/dropValidation.test.ts` — Vitest unit tests.
- `src/shell/input/DragDropController.ts` — Phaser wiring: `DragDropEvents`, `DragDropController`, `MIN_HIT_AREA_PX` (thin; delegates to `dropValidation`; events injectable at construction AND via `setEvents()`).

**Rewards**
- `src/shell/rewards/RewardFx.ts` — Phaser wiring: `RewardFx` (appreciation-only tween/particles + optional cue; no streaks).

---

## Contract addenda introduced by this milestone

> These were missing from Shared Contracts §3 and are **added here first**, then referenced by M2. Per the path rule, once they appear here they are LAW for downstream milestones.

### §3.11 Button (`src/shell/ui/Button.ts`) — thin Phaser wrapper

```ts
export interface ButtonOptions {
  /** Atlas frame for the button background (defaults to a shared frame). */
  frame?: import('@/types').SpriteKey;
  /** Optional text label drawn over the button. */
  label?: string;
  /** Minimum tap-target edge in px (LAW: never below MIN_HIT_AREA_PX). */
  minSize?: number;
  /** Voice/sfx cue played on tap. */
  tapCue?: import('@/types').AudioCueId;
}

export class Button {
  constructor(scene: Phaser.Scene, x: number, y: number, options?: ButtonOptions);
  /** Register a tap (pointerup inside) handler. Returns this for chaining. */
  onTap(handler: () => void): this;
  /** Register a hold-start handler (pointerdown). Used by the parental gate hold-to-continue. */
  onHoldStart(handler: () => void): this;
  /** Register a hold-end handler (pointerup/pointerout after a hold). */
  onHoldEnd(handler: () => void): this;
  /** Update the visible label text. */
  setLabel(text: string): this;
  /** Move the button. */
  setPosition(x: number, y: number): this;
  /** The underlying Phaser container, for adding to a Scene/Dialog. */
  get gameObject(): Phaser.GameObjects.Container;
  destroy(): void;
}
```

### §3.12 Dialog (`src/shell/ui/Dialog.ts`) — thin Phaser wrapper

```ts
export interface DialogOptions {
  /** Heading text. */
  title: string;
}

export class Dialog {
  constructor(scene: Phaser.Scene, options: DialogOptions);
  /** Remove all body children (re-render the math challenge on failure, etc.). */
  clearBody(): this;
  /** Add a GameObject (e.g. a Button.gameObject) into the dialog body region. */
  addToBody(obj: Phaser.GameObjects.GameObject): this;
  /** Set/replace the prompt line under the title. */
  setPrompt(text: string): this;
  /** Add a standard cancel/close button; invokes the handler then destroys the dialog. */
  addCancel(handler: () => void): this;
  destroy(): void;
}
```

### §3.3 addendum — DragDropController events are injectable after construction

The contract constructor `constructor(scene, events)` stands, AND a mutable entry point is added so a `BaseGameScene` subclass can supply events after the controller is built:

```ts
/** Replace the active event handlers (M4 scenes call this from buildLayout()). */
setEvents(events: DragDropEvents): void;
```

M4 scenes therefore call `this.drag.setEvents({ ... })` (NOT `this.drag.events = {...}`). M1 Task 17 implements both the constructor form and `setEvents()`.

### §3.5 addendum — ProgressStore shuffle-seed continuity

`ProgressStore` persists `shuffleSeed` so `BaseGameScene.create()` (M2) can resume the prior shuffle arrangement instead of generating a fresh `Math.random` seed each launch (resolves the relaunch-continuity gap; spec content-set continuity). M2's `create()` reads the persisted snapshot via `ProgressStore.load()` and uses `saved?.shuffleSeed ?? Math.random()`. An optional helper is also available:

```ts
/** Return the persisted shuffleSeed for a game, or generate+persist a new one if absent. */
resolveSeed(gameId: import('@/types').GameId): Promise<number>;
```

M2's `BaseGameScene.create()` does NOT call `resolveSeed`. Instead it reads the persisted snapshot once via `ProgressStore.load()` and derives the seed as `saved?.shuffleSeed ?? Math.random()`, passing the result to `reshuffle(seed)`; `onSetComplete()` increments `cyclesCompleted` and persists a NEW seed via `patchGame` before re-`reshuffle`. M1 Task 15 still provides `ProgressStore.load()` (and the optional `resolveSeed` helper) so M2 can read the persisted `shuffleSeed`.

---

### Task 0: Ensure the no-network test harness exists

If M0 already created `tests/setup.ts` exactly as below, verify it and skip to Task 1 (do not duplicate). Otherwise create it: tests must never touch the network (Shared Contracts §6.4), and pure modules must be deterministic.

**Files:**
- `tests/setup.ts`

- [ ] Confirm whether the harness exists with `ls -1 tests/setup.ts || echo MISSING`. Expected: either prints the path (then read it and confirm it stubs `fetch`) or prints `MISSING`.
- [ ] If MISSING, create `tests/setup.ts` with this exact content:

```ts
// tests/setup.ts — Vitest global setup. No network, no Phaser.
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Hard guarantee: tests perform no network I/O (offline product invariant).
  globalThis.fetch = (() => {
    throw new Error('Network access is forbidden in tests (offline invariant).');
  }) as typeof fetch;
});

/** Deterministic RNG for tests that inject `rng`. Returns values from `seq`, cycling. */
export function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return v;
  };
}
```

- [ ] Run `npm test` to confirm the harness loads with no test files yet. Expected: Vitest reports `No test files found` (exit code may be non-zero for "no tests" — that is fine at this point; it must NOT report a setup/import error).
- [ ] Commit: `git add tests/setup.ts && git commit -m "test: add no-network vitest setup with deterministic rng helper"`

---

### Task 1: Minimal Vite entry stub (`src/main.ts`)

M0 removed the spike entry (M0 Task 16), so `index.html` references `/src/main.ts`. Create a deterministic placeholder so `vite build` (Task 20 gate) has a valid entry; the full Phaser bootstrap + Scene registration + PWA SW registration arrives in M2. This file imports nothing from `phaser` yet (no game is constructed in M1) to keep the M1 build deterministic and fast.

**Files:**
- `src/main.ts`

- [ ] Confirm the entry `index.html` points at `/src/main.ts` with `grep -n 'src/main' index.html`. Expected: one line referencing `src/main.ts` (M0 left this in place after removing the spike). If it still references `src/spike/main.spike.ts`, fix it: change the `<script type="module" src="...">` to `/src/main.ts`.
- [ ] Create `src/main.ts`:

```ts
// src/main.ts — Vite entry. M1 stub only.
// The Phaser.Game bootstrap, Scene registration, and PWA service-worker
// registration are implemented in M2 (BootScene + gameConfig). Keeping this
// minimal lets `vite build` succeed deterministically during the shell milestone.
const root = document.getElementById('app');
if (root) {
  root.textContent = 'Ehaan Games — shell milestone (M1). Game boots in M2.';
}

export {};
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/main.ts index.html && git commit -m "chore: add minimal M1 vite entry stub (full bootstrap in M2)"`

---

### Task 2: Sprite types (`src/types/sprites.ts`)

No Phaser. Establishes `AtlasKey`, the branded `SpriteKey`, and the `spriteKey()` factory used by every later type and content file (Shared Contracts §2.2). We TDD the factory because it is the only runtime code here.

> **Frame-key convention (LAW, cross-milestone):** the value `spriteKey()` produces (the full `"<atlas>/<frame>"` string) IS the frame name emitted by the M3 atlas packer and IS the frame name passed to every Phaser `add.image()/add.sprite()` call. No caller strips the `"<atlas>/"` prefix. M3 adds a test asserting the packed JSON frame keys equal these SpriteKeys; M2's HubScene must use the full SpriteKey unchanged.

**Files:**
- `src/types/sprites.ts`
- `src/types/sprites.test.ts`

- [ ] Write failing test `src/types/sprites.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { spriteKey } from './sprites';

describe('spriteKey', () => {
  it('joins atlas and frame with a slash', () => {
    expect(spriteKey('shared', 'btn-play')).toBe('shared/btn-play');
  });

  it('produces a value usable as a string', () => {
    const k = spriteKey('color-sort', 'bin-blue');
    expect(`${k}`).toBe('color-sort/bin-blue');
  });
});
```

- [ ] Run `npx vitest run src/types/sprites.test.ts`. Expected failure: `Cannot find module './sprites'` (or `spriteKey is not a function`).
- [ ] Create `src/types/sprites.ts` (verbatim from Shared Contracts §2.2):

```ts
/** Atlas bundle keys. 'shared' is always loaded; one per game. */
export type AtlasKey = 'shared' | 'color-sort' | 'item-sort' | 'item-match';

/** A frame within an atlas: "<atlas>/<frame>". Branded for type-safety. */
export type SpriteKey = string & { readonly __brand: 'SpriteKey' };

/** Helper to construct a SpriteKey from atlas + frame name. */
export function spriteKey(atlas: AtlasKey, frame: string): SpriteKey {
  return `${atlas}/${frame}` as SpriteKey;
}
```

- [ ] Run `npx vitest run src/types/sprites.test.ts`. Expected: `2 passed`.
- [ ] Commit: `git add src/types/sprites.ts src/types/sprites.test.ts && git commit -m "feat: add SpriteKey/AtlasKey types and spriteKey factory"`

---

### Task 3: Audio types (`src/types/audio.ts`)

Pure declarations, no runtime logic (Shared Contracts §2.3). No test needed (type-only); correctness is enforced by `tsc --noEmit` in `npm run build` and by downstream tests that import these.

**Files:**
- `src/types/audio.ts`

- [ ] Create `src/types/audio.ts` (verbatim from Shared Contracts §2.3):

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

/** States of the AudioService resume state machine (§3.1). */
export type AudioResumeState =
  | 'uninitialized' // before first user gesture; nothing decoded
  | 'suspended'     // context exists but is suspended (backgrounded / pre-gesture)
  | 'running'       // context running; cues play immediately
  | 'recovering';   // resume() in flight after lifecycle event

/** Event that can drive a resume attempt. */
export type AudioResumeTrigger =
  | 'first-gesture'      // first tap unlocks audio
  | 'app-resume'         // Capacitor App 'resume'
  | 'visibility-visible' // document 'visibilitychange' → visible
  | 'manual';            // explicit AudioService.resume()
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors (file is self-contained type declarations).
- [ ] Commit: `git add src/types/audio.ts && git commit -m "feat: add audio cue + resume state machine types"`

---

### Task 4: Theme tokens (`src/shell/ui/theme.ts`)

The Okabe-Ito palette + adjacency/contrast constants are LAW (Shared Contracts §5.1; spec §5 color-sort accessibility). Type-only + constants — no runtime branching to TDD here, but it must compile and the values must be exact. **This task runs BEFORE the content-type task (Task 5) so that `content.ts`'s `import type { OkabeItoToken } from '../shell/ui/theme'` resolves immediately — every commit type-checks; no commit is made with a known-broken forward reference.** `color.ts` (Task 8) also depends on this.

**Files:**
- `src/shell/ui/theme.ts`

- [ ] Create `src/shell/ui/theme.ts` (verbatim from Shared Contracts §5.1):

```ts
/** The eight Okabe-Ito colorblind-safe tokens (LAW; exact hex). */
export const OKABE_ITO = {
  oiBlack:         '#000000',
  oiOrange:        '#E69F00',
  oiSkyBlue:       '#56B4E9',
  oiBluishGreen:   '#009E73',
  oiYellow:        '#F0E442',
  oiBlue:          '#0072B2',
  oiVermillion:    '#D55E00',
  oiReddishPurple: '#CC79A7',
} as const;

export type OkabeItoToken = keyof typeof OKABE_ITO;

/** App background token (used for ≥3:1 contrast checks). */
export const APP_BG_TOKEN: OkabeItoToken | '#FFFFFF' = '#FFFFFF';

/** Minimum item/background contrast ratio (LAW). */
export const MIN_CONTRAST_RATIO = 3.0;

/**
 * Forbidden adjacency pairs (LAW): never place these tokens in ADJACENT bins.
 * Red/green confusion (deutan/protan) and blue/purple confusion (tritan).
 */
export const FORBIDDEN_ADJACENT: ReadonlyArray<readonly [OkabeItoToken, OkabeItoToken]> = [
  ['oiVermillion', 'oiBluishGreen'], // red / green
  ['oiOrange',     'oiBluishGreen'], // red-ish / green
  ['oiBlue',       'oiReddishPurple'], // blue / purple
];
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/shell/ui/theme.ts && git commit -m "feat: add Okabe-Ito palette tokens, contrast/adjacency constants"`

---

### Task 5: Game, rewards, parental, progress, content types

Five type-only files (Shared Contracts §2.1, §2.4–§2.7). They cross-reference each other, `sprites.ts`/`audio.ts`, and `theme.ts`. Because `theme.ts` already exists (Task 4), `content.ts` resolves its `OkabeItoToken` import on this commit and the whole `src/types` + `theme.ts` tree type-checks clean — no broken intermediate commit.

> **Per spec §10 there are NO levels/scores.** `ProgressSnapshot` stores only audio prefs + shuffle continuity, never ranking data. The default master volume is pinned to **`1`** (full) here in `progress.ts`'s shape and in `progressSerde.defaultSnapshot()` (Task 13); M2's SettingsScene references this value and does NOT change it.

**Files:**
- `src/types/game.ts`
- `src/types/rewards.ts`
- `src/types/parental.ts`
- `src/types/progress.ts`
- `src/types/content.ts`

- [ ] Create `src/types/game.ts` (verbatim from Shared Contracts §2.1):

```ts
import type { SpriteKey, AtlasKey } from './sprites';
import type { AudioCueId } from './audio';

/** The three v1 games. New catalog games extend this union. */
export type GameId = 'color-sort' | 'item-sort' | 'item-match';

/** Phaser scene keys. One per shell scene + one per game. */
export type SceneKey =
  | 'Boot'
  | 'Hub'
  | 'Settings'
  | 'ColorSort'
  | 'ItemSort'
  | 'ItemMatch';

/** A registry entry consumed by HubScene to render a tile and launch a game. */
export interface GameDef {
  /** Stable identifier; matches the content folder name. */
  id: GameId;
  /** Phaser scene key to start when the tile is tapped. */
  sceneKey: SceneKey;
  /** Spoken/displayed label key (resolved by AudioCue for the voice prompt). */
  titleKey: string;
  /** Atlas frame used for the hub tile icon. */
  tileSprite: SpriteKey;
  /** Atlas the scene must load before starting (besides 'shared'). */
  atlas: AtlasKey;
  /** Voice cue announced when the tile is focused/launched. */
  tileVoiceCue: AudioCueId;
  /** Relative path (from src) to this game's content.json, used by the loader. */
  contentPath: string;
}
```

- [ ] Create `src/types/rewards.ts` (verbatim from Shared Contracts §2.4):

```ts
import type { AudioCueId } from './audio';

/** Appreciation-only reward kinds. NO scoring, streaks, urgency, or guilt. */
export type RewardKind =
  | 'appreciation' // full celebration: pop + particles + cheer (content set complete)
  | 'snap';        // small positive confirm on a correct drop (no score)

/** A request to play a reward effect. */
export interface RewardRequest {
  kind: RewardKind;
  /** World-space anchor for the pop/particles. */
  x: number;
  y: number;
  /** Optional voice/sfx cue to accompany the effect. */
  cue?: AudioCueId;
}
```

- [ ] Create `src/types/parental.ts` (verbatim from Shared Contracts §2.5):

```ts
import type { AudioCueId } from './audio';

/** A generated adult-only challenge: multiply two numbers (after a hold-to-continue). */
export interface ParentalChallenge {
  /** Left operand (2-digit, no trivial 0/1). */
  a: number;
  /** Right operand (2-digit, no trivial 0/1). */
  b: number;
  /** Correct product (a * b). Never serialized to UI directly. */
  answer: number;
  /** Multiple-choice options including the answer (shuffled). */
  options: number[];
  /** Voice cue: spoken "ask a grown-up" prompt for pre-literate kids. */
  voiceCue: AudioCueId;
}

/** Outcome of verifying a parental challenge attempt. */
export interface ParentalResult {
  passed: boolean;
  /** The challenge that was attempted (for re-render on failure). */
  challenge: ParentalChallenge;
}
```

- [ ] Create `src/types/progress.ts` (verbatim from Shared Contracts §2.6):

```ts
import type { GameId } from './game';

/** Persisted, non-PII per-game state. Used only for shuffle continuity + audio prefs. */
export interface GameProgress {
  gameId: GameId;
  /** Seed used for the current shuffle, so a relaunch resumes the same arrangement. */
  shuffleSeed: number;
  /** Number of completed content-set cycles this session (telemetry-free, never displayed as a score). */
  cyclesCompleted: number;
}

/** The full persisted snapshot. No PII, no identifiers, no timestamps that could fingerprint. */
export interface ProgressSnapshot {
  /** Schema version for forward-compatible migrations. */
  version: 1;
  /** Global audio settings (mirrors SettingsScene, behind the parental gate). */
  audio: {
    muted: boolean;
    /** 0..1 master volume. Default is 1 (full); see progressSerde.defaultSnapshot(). */
    volume: number;
  };
  /** Per-game continuity, keyed by GameId. */
  games: Partial<Record<GameId, GameProgress>>;
}
```

- [ ] Create `src/types/content.ts` (verbatim from Shared Contracts §2.7). It imports `OkabeItoToken` from `../shell/ui/theme` (created in Task 4 — resolves now):

```ts
import type { AudioCueId } from './audio';
import type { SpriteKey } from './sprites';
import type { GameId } from './game';
import type { OkabeItoToken } from '../shell/ui/theme';

/** Discriminator + shared metadata every content.json carries. */
interface ContentBase {
  /** Schema version for this content document. */
  schema: 1;
  /** Must equal the owning game's GameId. */
  gameId: GameId;
  /** Voice cue spoken when the game opens (the instruction). */
  introCue: AudioCueId;
  /** Voice cue spoken on full-set completion (appreciation). */
  appreciationCue: AudioCueId;
}

/* ----------------------------- COLOR SORT ----------------------------- */

/**
 * A non-color cue. EVERY ColorSortCategory MUST carry one (hard a11y requirement):
 * a distinct shape OUTLINE + fill PATTERN + ICON, rendered on BOTH item and bin.
 */
export interface RedundantCue {
  /** Distinct silhouette outline. */
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'hexagon' | 'heart';
  /** Distinct fill pattern overlaid on the swatch. */
  pattern: 'solid' | 'stripes' | 'dots' | 'grid' | 'zigzag' | 'checker';
  /** Distinct iconographic glyph (atlas frame). */
  icon: SpriteKey;
}

export interface ColorSortCategory {
  id: string;
  /** Okabe-Ito token name (see §5). Raw hex is NOT allowed here. */
  colorToken: OkabeItoToken;
  /** REQUIRED redundant non-color cue. */
  cue: RedundantCue;
  /** Bin sprite frame. */
  binSprite: SpriteKey;
  /** Voice cue naming this color/cue (e.g. "blue circle"). */
  labelCue: AudioCueId;
}

export interface ColorSortItem {
  id: string;
  /** Must reference an existing ColorSortCategory.id. */
  categoryId: string;
  /** Draggable item sprite frame. */
  sprite: SpriteKey;
}

export interface ColorSortContent extends ContentBase {
  gameId: 'color-sort';
  categories: ColorSortCategory[];
  items: ColorSortItem[];
}

/* ----------------------------- ITEM SORT ------------------------------ */

export interface ItemSortCategory {
  id: string;
  /** Bin sprite frame. */
  binSprite: SpriteKey;
  /** Voice cue naming this category (e.g. "fruit", "animal"). */
  labelCue: AudioCueId;
}

export interface ItemSortItem {
  id: string;
  /** Must reference an existing ItemSortCategory.id. */
  categoryId: string;
  sprite: SpriteKey;
}

export interface ItemSortContent extends ContentBase {
  gameId: 'item-sort';
  categories: ItemSortCategory[];
  items: ItemSortItem[];
}

/* ----------------------------- ITEM MATCH ----------------------------- */

export interface ItemMatchPair {
  id: string;
  /** The two members of the pair share this id; sprites may differ or match. */
  spriteA: SpriteKey;
  spriteB: SpriteKey;
  /** Voice cue on a successful match. */
  matchCue: AudioCueId;
}

export interface ItemMatchContent extends ContentBase {
  gameId: 'item-match';
  /** Grid dimensions; cols*rows MUST equal pairs.length*2 and be even. */
  grid: { cols: number; rows: number };
  pairs: ItemMatchPair[];
}

/** The discriminated union the loader returns. */
export type ContentConfig = ColorSortContent | ItemSortContent | ItemMatchContent;
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors — `content.ts` resolves `OkabeItoToken` against the existing `theme.ts`, so the whole `src/types` + `theme.ts` tree type-checks clean.
- [ ] Commit: `git add src/types/game.ts src/types/rewards.ts src/types/parental.ts src/types/progress.ts src/types/content.ts && git commit -m "feat: add game/rewards/parental/progress/content shared types"`

---

### Task 6: Types barrel (`src/types/index.ts`)

Re-export every type so game/shell code imports from `@/types` (Shared Contracts §1 path rules + §2).

**Files:**
- `src/types/index.ts`

- [ ] Create `src/types/index.ts`:

```ts
export * from './sprites';
export * from './audio';
export * from './game';
export * from './rewards';
export * from './parental';
export * from './progress';
export * from './content';
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/types/index.ts && git commit -m "feat: add src/types barrel re-export"`

---

### Task 7: Color contrast + adjacency utilities (`src/shell/ui/color.ts`) — PURE, strict TDD

Implements `hexToRgb`, `relativeLuminance`, `contrastRatio`, `meetsContrast`, `isForbiddenAdjacentPair`, `assertNoForbiddenAdjacency` (Shared Contracts §5.2). This is the hard a11y requirement from spec §5 — every color must clear ≥3:1 contrast and never sit in a forbidden adjacent pair. Must NOT import phaser.

> **`oiYellow` contrast note (cross-milestone, settled):** raw `oiYellow` (`#F0E442`) on white (`#FFFFFF`) is **below** 3:1, so `meetsContrast('oiYellow','#FFFFFF') === false` is correct and asserted below. The Shared Contracts §4.1 color-sort example and M4's shipped `content.json` therefore do **not** use bare `oiYellow` against the white app background — color-sort swatches are rendered as the dark-outlined composite (the `RedundantCue.shape` outline + bin sprite supply the high-contrast edge), and the loader's contrast check (M4) evaluates the composite/outline color, not the raw fill. M4's content uses `oiBlue`, `oiOrange`, `oiBluishGreen`, and `oiVermillion` for the bare-fill bins and reserves `oiYellow` for outline-composited swatches only. This unit test pins the raw-fill fact so nobody accidentally ships bare yellow text/fill on white.

**Files:**
- `src/shell/ui/color.ts`
- `src/shell/ui/color.test.ts`

- [ ] Write failing test `src/shell/ui/color.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  meetsContrast,
  isForbiddenAdjacentPair,
  assertNoForbiddenAdjacency,
} from './color';
import { OKABE_ITO } from './theme';

describe('hexToRgb', () => {
  it('parses #RRGGBB into 0..255 triplet', () => {
    expect(hexToRgb('#0072B2')).toEqual([0x00, 0x72, 0xb2]);
  });
  it('parses black and white', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
  it('is symmetric', () => {
    const a = contrastRatio('#0072B2', '#FFFFFF');
    const b = contrastRatio('#FFFFFF', '#0072B2');
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('meetsContrast', () => {
  it('passes oiBlue on white (>= 3:1)', () => {
    expect(meetsContrast('oiBlue', '#FFFFFF')).toBe(true);
  });
  it('fails raw oiYellow on white (yellow fill is low-contrast on white)', () => {
    // Settled fact (see task note): bare oiYellow on white is under 3:1.
    expect(contrastRatio(OKABE_ITO.oiYellow, '#FFFFFF')).toBeLessThan(3);
    expect(meetsContrast('oiYellow', '#FFFFFF')).toBe(false);
  });
});

describe('isForbiddenAdjacentPair', () => {
  it('detects red/green regardless of order', () => {
    expect(isForbiddenAdjacentPair('oiVermillion', 'oiBluishGreen')).toBe(true);
    expect(isForbiddenAdjacentPair('oiBluishGreen', 'oiVermillion')).toBe(true);
  });
  it('detects blue/purple', () => {
    expect(isForbiddenAdjacentPair('oiBlue', 'oiReddishPurple')).toBe(true);
  });
  it('allows a safe pair', () => {
    expect(isForbiddenAdjacentPair('oiBlue', 'oiOrange')).toBe(false);
  });
});

describe('assertNoForbiddenAdjacency', () => {
  it('does not throw on a safe ordering', () => {
    expect(() =>
      assertNoForbiddenAdjacency(['oiBlue', 'oiOrange', 'oiBluishGreen', 'oiYellow']),
    ).not.toThrow();
  });
  it('throws naming the offending adjacent pair', () => {
    expect(() =>
      assertNoForbiddenAdjacency(['oiVermillion', 'oiBluishGreen']),
    ).toThrow(/oiVermillion.*oiBluishGreen|oiBluishGreen.*oiVermillion/);
  });
  it('ignores forbidden tokens that are NOT adjacent', () => {
    // blue ... purple separated by orange is allowed (adjacency only).
    expect(() =>
      assertNoForbiddenAdjacency(['oiBlue', 'oiOrange', 'oiReddishPurple']),
    ).not.toThrow();
  });
});
```

- [ ] Run `npx vitest run src/shell/ui/color.test.ts`. Expected failure: `Cannot find module './color'`.
- [ ] Create minimal implementation `src/shell/ui/color.ts`:

```ts
import type { OkabeItoToken } from './theme';
import { OKABE_ITO, MIN_CONTRAST_RATIO, FORBIDDEN_ADJACENT } from './theme';

/** Parse a #RRGGBB string to [r,g,b] in 0..255. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function channelLuminance(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0..1). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG contrast ratio between two colors (1..21). */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when a token's color has >= MIN_CONTRAST_RATIO against the background hex. */
export function meetsContrast(token: OkabeItoToken, bgHex: string): boolean {
  return contrastRatio(OKABE_ITO[token], bgHex) >= MIN_CONTRAST_RATIO;
}

/** True if the unordered pair {a,b} is in FORBIDDEN_ADJACENT. */
export function isForbiddenAdjacentPair(a: OkabeItoToken, b: OkabeItoToken): boolean {
  return FORBIDDEN_ADJACENT.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

/**
 * Assert an ORDERED bin token list has no forbidden pair in adjacent positions.
 * Throws Error with the offending pair if violated; used by the color-sort loader.
 */
export function assertNoForbiddenAdjacency(orderedTokens: OkabeItoToken[]): void {
  for (let i = 0; i < orderedTokens.length - 1; i += 1) {
    const a = orderedTokens[i];
    const b = orderedTokens[i + 1];
    if (isForbiddenAdjacentPair(a, b)) {
      throw new Error(`Forbidden adjacent color pair: ${a} next to ${b}`);
    }
  }
}
```

- [ ] Run `npx vitest run src/shell/ui/color.test.ts`. Expected: all tests pass (the test asserts `meetsContrast('oiYellow', '#FFFFFF') === false` — if it fails, the `MIN_CONTRAST_RATIO` math is wrong; fix the impl, not the test).
- [ ] Commit: `git add src/shell/ui/color.ts src/shell/ui/color.test.ts && git commit -m "feat: add WCAG contrast + Okabe-Ito adjacency utils (pure)"`

---

### Task 8: Hub tile layout math (`src/shell/ui/hubLayout.ts`) — PURE, strict TDD

`computeTileLayout` centers N big-tap-target tiles in a grid with gutters (Shared Contracts §3.9; spec §4.1 "big tap targets"). PURE — no phaser.

**Files:**
- `src/shell/ui/hubLayout.ts`
- `src/shell/ui/hubLayout.test.ts`

- [ ] Write failing test `src/shell/ui/hubLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeTileLayout } from './hubLayout';

describe('computeTileLayout', () => {
  it('returns one rect per tile', () => {
    expect(computeTileLayout(3, 1024, 768)).toHaveLength(3);
  });

  it('keeps every tile fully inside the canvas', () => {
    const rects = computeTileLayout(3, 1024, 768);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1024);
      expect(r.y + r.h).toBeLessThanOrEqual(768);
    }
  });

  it('makes tiles square and at least minTile px on an edge', () => {
    const rects = computeTileLayout(3, 1024, 768, { minTile: 160 });
    for (const r of rects) {
      expect(r.w).toBe(r.h);
      expect(r.w).toBeGreaterThanOrEqual(160);
    }
  });

  it('returns an empty array for zero tiles', () => {
    expect(computeTileLayout(0, 1024, 768)).toEqual([]);
  });

  it('centers the row horizontally (left and right margins equal)', () => {
    const w = 1024;
    const rects = computeTileLayout(3, w, 768);
    const leftMargin = rects[0].x;
    const last = rects[rects.length - 1];
    const rightMargin = w - (last.x + last.w);
    expect(leftMargin).toBeCloseTo(rightMargin, 5);
  });
});
```

- [ ] Run `npx vitest run src/shell/ui/hubLayout.test.ts`. Expected failure: `Cannot find module './hubLayout'`.
- [ ] Create minimal implementation `src/shell/ui/hubLayout.ts`:

```ts
export interface TileRect { x: number; y: number; w: number; h: number; }

/** Lay out N tiles in a centered grid within (width × height) with gutters. Big tap targets. */
export function computeTileLayout(
  count: number,
  width: number,
  height: number,
  opts?: { minTile?: number; gutter?: number },
): TileRect[] {
  if (count <= 0) return [];
  const gutter = opts?.gutter ?? 24;
  const minTile = opts?.minTile ?? 160;

  // Single centered row for the v1 catalog (3 games). Compute the largest square
  // tile that fits horizontally and vertically, never below minTile.
  const usableW = width - gutter * (count + 1);
  const byWidth = Math.floor(usableW / count);
  const byHeight = height - gutter * 2;
  let tile = Math.min(byWidth, byHeight);
  if (tile < minTile) tile = minTile;

  const rowW = tile * count + gutter * (count - 1);
  const startX = Math.round((width - rowW) / 2);
  const y = Math.round((height - tile) / 2);

  const rects: TileRect[] = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x: startX + i * (tile + gutter), y, w: tile, h: tile });
  }
  return rects;
}
```

- [ ] Run `npx vitest run src/shell/ui/hubLayout.test.ts`. Expected: `5 passed`. (If the "fully inside" test fails for a tight canvas, that is acceptable only when `minTile` forces overflow — but with 1024×768 and the defaults it must pass; fix the impl if not.)
- [ ] Commit: `git add src/shell/ui/hubLayout.ts src/shell/ui/hubLayout.test.ts && git commit -m "feat: add pure hub tile layout math"`

---

### Task 9: Audio resume state machine + cue queue (`src/shell/audio/audioQueue.ts`) — PURE, strict TDD

This is the heart of the iOS WKWebView audio mitigation (spec §8 dealbreaker risk; Shared Contracts §3.1). Pure reducer over `AudioQueueState`: drives `uninitialized → recovering → running`, re-enters `recovering` on lifecycle events, queues critical voice cues while not running, drops non-critical cues when not running, and flushes critical cues on entering `running`. No phaser, no DOM, no capacitor.

**Files:**
- `src/shell/audio/audioQueue.ts`
- `src/shell/audio/audioQueue.test.ts`

- [ ] Write failing test `src/shell/audio/audioQueue.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  initialAudioState,
  reduceResume,
  resolveRecovering,
  enqueueCue,
  type QueuedCue,
} from './audioQueue';
import type { AudioCueId } from '@/types';

const cue = (id: string, critical: boolean): QueuedCue => ({
  id: id as AudioCueId,
  critical,
});

describe('initialAudioState', () => {
  it('starts uninitialized with an empty queue', () => {
    const s = initialAudioState();
    expect(s.resume).toBe('uninitialized');
    expect(s.pending).toEqual([]);
  });
});

describe('reduceResume', () => {
  it('first-gesture moves uninitialized -> recovering', () => {
    const { next } = reduceResume(initialAudioState(), 'first-gesture');
    expect(next.resume).toBe('recovering');
  });

  it('app-resume from running re-enters recovering', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next } = reduceResume(running, 'app-resume');
    expect(next.resume).toBe('recovering');
  });

  it('visibility-visible from running re-enters recovering', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next } = reduceResume(running, 'visibility-visible');
    expect(next.resume).toBe('recovering');
  });

  it('does not flush cues while merely entering recovering', () => {
    const { flush } = reduceResume(initialAudioState(), 'first-gesture');
    expect(flush).toEqual([]);
  });
});

describe('resolveRecovering', () => {
  it('moves recovering -> running and flushes pending critical cues in order', () => {
    let s = initialAudioState();
    s = reduceResume(s, 'first-gesture').next; // recovering
    s = enqueueCue(s, cue('v1', true)).next;   // queued (not running)
    s = enqueueCue(s, cue('v2', true)).next;   // queued
    const { next, flush } = resolveRecovering(s);
    expect(next.resume).toBe('running');
    expect(flush.map((c) => c.id)).toEqual(['v1', 'v2']);
    expect(next.pending).toEqual([]);
  });

  it('is a no-op when not recovering', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next, flush } = resolveRecovering(running);
    expect(next.resume).toBe('running');
    expect(flush).toEqual([]);
  });
});

describe('enqueueCue', () => {
  it('plays immediately when running', () => {
    const running = { resume: 'running' as const, pending: [] };
    const { next, playNow } = enqueueCue(running, cue('v1', false));
    expect(playNow?.id).toBe('v1');
    expect(next.pending).toEqual([]);
  });

  it('queues a CRITICAL cue while not running', () => {
    let s = reduceResume(initialAudioState(), 'first-gesture').next; // recovering
    const { next, playNow } = enqueueCue(s, cue('voice', true));
    expect(playNow).toBeNull();
    expect(next.pending.map((c) => c.id)).toEqual(['voice']);
  });

  it('DROPS a non-critical cue while not running', () => {
    let s = reduceResume(initialAudioState(), 'first-gesture').next; // recovering
    const { next, playNow } = enqueueCue(s, cue('sfx', false));
    expect(playNow).toBeNull();
    expect(next.pending).toEqual([]);
  });
});
```

- [ ] Run `npx vitest run src/shell/audio/audioQueue.test.ts`. Expected failure: `Cannot find module './audioQueue'`.
- [ ] Create minimal implementation `src/shell/audio/audioQueue.ts`:

```ts
import type {
  AudioResumeState,
  AudioResumeTrigger,
  AudioCueId,
} from '@/types';

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
 * Reduce a trigger against current state. Pure: returns the next state plus
 * the cues that should flush NOW (when transitioning into 'running').
 * Entering 'recovering' never flushes; flushing happens in resolveRecovering().
 */
export function reduceResume(
  state: AudioQueueState,
  trigger: AudioResumeTrigger,
): { next: AudioQueueState; flush: QueuedCue[] } {
  switch (trigger) {
    case 'first-gesture':
    case 'app-resume':
    case 'visibility-visible':
    case 'manual':
      return { next: { ...state, resume: 'recovering' }, flush: [] };
    default:
      return { next: state, flush: [] };
  }
}

/** Mark the in-flight resume as resolved (context.resume() succeeded). */
export function resolveRecovering(
  state: AudioQueueState,
): { next: AudioQueueState; flush: QueuedCue[] } {
  if (state.resume !== 'recovering') {
    return { next: state, flush: [] };
  }
  const flush = state.pending;
  return { next: { resume: 'running', pending: [] }, flush };
}

/** Enqueue a cue. Critical cues queue while not running; non-critical are dropped if not running. */
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
  // Non-critical SFX/music dropped while not running (no backlog of ambient noise).
  return { next: state, playNow: null };
}
```

- [ ] Run `npx vitest run src/shell/audio/audioQueue.test.ts`. Expected: all tests pass.
- [ ] Commit: `git add src/shell/audio/audioQueue.ts src/shell/audio/audioQueue.test.ts && git commit -m "feat: add pure audio resume state machine + cue queue"`

---

### Task 10: AudioService facade (`src/shell/audio/AudioService.ts`) — thin wiring

Wires `audioQueue` to two backends, routing critical voice → `voiceBackend`, ambient → `ambientBackend` (Shared Contracts §3.1). Thin: no decidable logic of its own — it delegates state transitions to the pure reducer. Covered by manual QA (Shared Contracts §6.2), not unit-tested. No test file.

**Files:**
- `src/shell/audio/AudioService.ts`

- [ ] Create `src/shell/audio/AudioService.ts` (interfaces verbatim from Shared Contracts §3.1):

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

export interface AudioBackend {
  /** Preload/decode a cue. */
  preload(cue: AudioCue): Promise<void>;
  /** Play a preloaded cue by id. */
  play(id: AudioCueId): Promise<void>;
  stop(id: AudioCueId): Promise<void>;
  setVolume(id: AudioCueId, volume: number): Promise<void>;
  /** Re-acquire / resume the underlying context. Returns true if running. */
  resume(): Promise<boolean>;
}

export interface AudioServiceOptions {
  voiceBackend: AudioBackend; // NativeAudioBackend on device, WebAudioBackend on web
  ambientBackend: AudioBackend; // WebAudioBackend (SFX + music)
}

export class AudioService {
  private state: AudioQueueState = initialAudioState();
  private readonly cues = new Map<AudioCueId, AudioCue>();
  private readonly voice: AudioBackend;
  private readonly ambient: AudioBackend;
  private muted = false;
  private masterVolume = 1;

  constructor(options: AudioServiceOptions) {
    this.voice = options.voiceBackend;
    this.ambient = options.ambientBackend;
  }

  /** Register all cues (BootScene) and preload them on the correct backend. */
  async registerCues(cues: AudioCue[]): Promise<void> {
    for (const cue of cues) {
      this.cues.set(cue.id, cue);
      await this.backendFor(cue).preload(cue);
    }
  }

  /** Unlock audio on the first user gesture (drives 'first-gesture'). */
  async unlock(): Promise<void> {
    this.state = reduceResume(this.state, 'first-gesture').next;
    const ok = (await this.voice.resume()) && (await this.ambient.resume());
    if (ok) await this.flush(resolveRecovering(this.state));
  }

  /** Play a cue; routes critical voice -> voiceBackend, else ambientBackend. */
  async play(id: AudioCueId): Promise<void> {
    if (this.muted) return;
    const cue = this.cues.get(id);
    if (!cue) return;
    const { next, playNow } = enqueueCue(this.state, this.queued(cue));
    this.state = next;
    if (playNow) await this.backendFor(cue).play(id);
  }

  async stop(id: AudioCueId): Promise<void> {
    const cue = this.cues.get(id);
    if (!cue) return;
    await this.backendFor(cue).stop(id);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /** Called by AppLifecycle on App 'resume' and 'visibilitychange'->visible. */
  async handleResume(trigger: 'app-resume' | 'visibility-visible'): Promise<void> {
    this.state = reduceResume(this.state, trigger).next;
    const ok = (await this.voice.resume()) && (await this.ambient.resume());
    if (ok) await this.flush(resolveRecovering(this.state));
  }

  /** Current resume state (exposed for tests + diagnostics). */
  get resumeState(): AudioResumeState {
    return this.state.resume;
  }

  private queued(cue: AudioCue): QueuedCue {
    return { id: cue.id, critical: cue.channel === 'voice' && cue.critical };
  }

  private backendFor(cue: AudioCue): AudioBackend {
    return cue.channel === 'voice' && cue.critical ? this.voice : this.ambient;
  }

  private async flush(result: { next: AudioQueueState; flush: QueuedCue[] }): Promise<void> {
    this.state = result.next;
    for (const q of result.flush) {
      const cue = this.cues.get(q.id);
      if (cue) await this.backendFor(cue).play(q.id);
    }
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/shell/audio/AudioService.ts && git commit -m "feat: add AudioService facade wiring queue to voice/ambient backends"`

---

### Task 11: NativeAudioBackend + WebAudioBackend — thin wiring

Two `AudioBackend` implementations (Shared Contracts §3.2). Native routes critical voice through `@capacitor-community/native-audio` (the iOS WKWebView WebAudio bypass, spec §8); Web uses the Phaser sound manager + `context.resume()`. Thin, no decidable logic — manual-QA covered, not unit-tested.

> **Asset-path convention (LAW, supersedes the M0 spike bodies):** `AudioCue.src` already carries the `assets/audio/...` path with NO extension (Shared Contracts §2.3). `NativeAudioBackend.preload` uses `${cue.src}.m4a` directly — no extra `public/` prefix. The M0 spike's divergent `preload`/`play`/`stop` bodies are discarded at M0 close-out; only the `AudioBackend` interface shape carried forward. These are the canonical production bodies.

**Files:**
- `src/shell/audio/NativeAudioBackend.ts`
- `src/shell/audio/WebAudioBackend.ts`

- [ ] Create `src/shell/audio/NativeAudioBackend.ts`:

```ts
import { NativeAudio } from '@capacitor-community/native-audio';
import type { AudioBackend } from './AudioService';
import type { AudioCue, AudioCueId } from '@/types';

/** Backend for CRITICAL voice prompts on device. Bypasses the iOS WKWebView WebAudio defect. */
export class NativeAudioBackend implements AudioBackend {
  async preload(cue: AudioCue): Promise<void> {
    await NativeAudio.preload({
      assetId: cue.id,
      assetPath: `${cue.src}.m4a`, // src already includes assets/audio/... (no public/ prefix)
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

  /** Native audio session is always available once the app is foregrounded. */
  async resume(): Promise<boolean> {
    return true;
  }
}
```

- [ ] Create `src/shell/audio/WebAudioBackend.ts`:

```ts
import type { AudioBackend } from './AudioService';
import type { AudioCue, AudioCueId } from '@/types';

/** Backend over Phaser's sound manager: PWA + non-critical SFX/music. */
export class WebAudioBackend implements AudioBackend {
  constructor(private readonly sound: Phaser.Sound.BaseSoundManager) {}

  async preload(cue: AudioCue): Promise<void> {
    // Phaser loads audio via the Loader during a Scene's preload(); the sound
    // is added to the manager here so play()/stop() resolve by id.
    if (!this.sound.get(cue.id)) {
      this.sound.add(cue.id, { loop: cue.loop, volume: cue.volume });
    }
  }

  async play(id: AudioCueId): Promise<void> {
    this.sound.play(id);
  }

  async stop(id: AudioCueId): Promise<void> {
    const s = this.sound.get(id);
    if (s) s.stop();
  }

  async setVolume(id: AudioCueId, volume: number): Promise<void> {
    const s = this.sound.get(id);
    if (s) s.setVolume(volume);
  }

  /** Resume the WebAudio context (suspended after backgrounding / before first gesture). */
  async resume(): Promise<boolean> {
    const mgr = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (mgr.context && mgr.context.state !== 'running') {
      await mgr.context.resume();
    }
    const ctx = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    return !ctx || ctx.state === 'running';
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors (requires `@capacitor-community/native-audio` and `phaser` types installed per M0 / Shared Contracts §7.2).
- [ ] Commit: `git add src/shell/audio/NativeAudioBackend.ts src/shell/audio/WebAudioBackend.ts && git commit -m "feat: add native + web audio backends (thin)"`

---

### Task 12: Parental challenge (`src/shell/platform/parentalChallenge.ts`) — PURE, strict TDD

`generateChallenge` + `verifyChallenge` (Shared Contracts §3.7; spec §4.1, §7 parental gate). Operands in `[2..9]`, no trivial 0/1; 4 shuffled options including the answer; injectable `rng` for determinism. PURE — no phaser.

**Files:**
- `src/shell/platform/parentalChallenge.ts`
- `src/shell/platform/parentalChallenge.test.ts`

- [ ] Write failing test `src/shell/platform/parentalChallenge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateChallenge, verifyChallenge } from './parentalChallenge';
import { seqRng } from '../../../tests/setup';
import type { AudioCueId } from '@/types';

const VOICE = 'pg.askGrownUp' as AudioCueId;

describe('generateChallenge', () => {
  it('uses operands in [2..9] (no 0 or 1)', () => {
    const c = generateChallenge(VOICE, seqRng([0, 0])); // floor maps to lowest -> 2
    expect(c.a).toBeGreaterThanOrEqual(2);
    expect(c.a).toBeLessThanOrEqual(9);
    expect(c.b).toBeGreaterThanOrEqual(2);
    expect(c.b).toBeLessThanOrEqual(9);
  });

  it('sets answer = a * b', () => {
    const c = generateChallenge(VOICE);
    expect(c.answer).toBe(c.a * c.b);
  });

  it('includes the correct answer among exactly 4 unique options', () => {
    const c = generateChallenge(VOICE);
    expect(c.options).toContain(c.answer);
    expect(c.options).toHaveLength(4);
    expect(new Set(c.options).size).toBe(4);
  });

  it('carries the provided voice cue', () => {
    const c = generateChallenge(VOICE);
    expect(c.voiceCue).toBe(VOICE);
  });
});

describe('verifyChallenge', () => {
  it('passes when the selected option equals the answer', () => {
    const c = generateChallenge(VOICE);
    const r = verifyChallenge(c, c.answer);
    expect(r.passed).toBe(true);
    expect(r.challenge).toBe(c);
  });

  it('fails when the selection is wrong and returns the challenge for re-render', () => {
    const c = generateChallenge(VOICE);
    const wrong = c.answer + 1;
    const r = verifyChallenge(c, wrong);
    expect(r.passed).toBe(false);
    expect(r.challenge).toBe(c);
  });
});
```

- [ ] Run `npx vitest run src/shell/platform/parentalChallenge.test.ts`. Expected failure: `Cannot find module './parentalChallenge'`.
- [ ] Create minimal implementation `src/shell/platform/parentalChallenge.ts`:

```ts
import type { ParentalChallenge, ParentalResult, AudioCueId } from '@/types';

/** Pick an integer in [2..9] from one rng draw. */
function operand(rng: () => number): number {
  return 2 + Math.floor(rng() * 8); // 2..9 inclusive
}

/**
 * Generate a challenge: two operands in [2..9]*[2..9] (no 0/1), 4 shuffled options.
 * `rng` defaults to Math.random; injected in tests for determinism.
 */
export function generateChallenge(
  voiceCue: AudioCueId,
  rng: () => number = Math.random,
): ParentalChallenge {
  const a = operand(rng);
  const b = operand(rng);
  const answer = a * b;

  const options = new Set<number>([answer]);
  let guard = 0;
  while (options.size < 4 && guard < 100) {
    const delta = (1 + Math.floor(rng() * 9)) * (rng() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate > 0 && candidate !== answer) options.add(candidate);
    guard += 1;
  }
  // Deterministic fallback fill if the rng was degenerate.
  let pad = answer + 1;
  while (options.size < 4) {
    if (pad !== answer && pad > 0) options.add(pad);
    pad += 1;
  }

  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return { a, b, answer, options: shuffled, voiceCue };
}

/** Verify a selected option against the challenge. */
export function verifyChallenge(
  challenge: ParentalChallenge,
  selected: number,
): ParentalResult {
  return { passed: selected === challenge.answer, challenge };
}
```

- [ ] Run `npx vitest run src/shell/platform/parentalChallenge.test.ts`. Expected: all tests pass.
- [ ] Commit: `git add src/shell/platform/parentalChallenge.ts src/shell/platform/parentalChallenge.test.ts && git commit -m "feat: add pure parental-gate challenge gen + verify"`

---

### Task 13: AppLifecycle (`src/shell/platform/AppLifecycle.ts`) — thin wiring

Wires Capacitor `App.resume` → `audio.handleResume('app-resume')` and document `visibilitychange`→visible → `audio.handleResume('visibility-visible')` (Shared Contracts §3.6; spec §8 iOS audio mitigation). Thin — manual-QA covered, not unit-tested.

**Files:**
- `src/shell/platform/AppLifecycle.ts`

- [ ] Create `src/shell/platform/AppLifecycle.ts`:

```ts
import { App, type PluginListenerHandle } from '@capacitor/app';
import type { AudioService } from '../audio/AudioService';

export class AppLifecycle {
  private resumeHandle: PluginListenerHandle | null = null;
  private readonly onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void this.audio.handleResume('visibility-visible');
    }
  };

  constructor(private readonly audio: AudioService) {}

  /**
   * Wire Capacitor App 'resume' -> audio.handleResume('app-resume')
   * and document 'visibilitychange'->visible -> audio.handleResume('visibility-visible').
   */
  start(): void {
    void App.addListener('resume', () => {
      void this.audio.handleResume('app-resume');
    }).then((h) => {
      this.resumeHandle = h;
    });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  stop(): void {
    if (this.resumeHandle) {
      void this.resumeHandle.remove();
      this.resumeHandle = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/shell/platform/AppLifecycle.ts && git commit -m "feat: add AppLifecycle resume wiring (app resume + visibilitychange)"`

---

### Task 14: ProgressStore serialization (`src/shell/storage/progressSerde.ts`) — PURE, strict TDD

`defaultSnapshot`, `serialize`, `deserialize`, `isValidSnapshot` (Shared Contracts §3.5). Zero PII — stores only audio prefs + shuffle continuity (spec §10 no levels/scores). `deserialize` NEVER throws — malformed/legacy input returns `defaultSnapshot()`. PURE — no capacitor.

> **Default master volume is `1` (full), pinned HERE and nowhere else.** M2's SettingsScene reads this default and does NOT override it. The test below locks `audio.volume === 1`.

**Files:**
- `src/shell/storage/progressSerde.ts`
- `src/shell/storage/progressSerde.test.ts`

- [ ] Write failing test `src/shell/storage/progressSerde.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  defaultSnapshot,
  serialize,
  deserialize,
  isValidSnapshot,
} from './progressSerde';

describe('defaultSnapshot', () => {
  it('is version 1, unmuted, full volume (1), no games', () => {
    const s = defaultSnapshot();
    expect(s).toEqual({
      version: 1,
      audio: { muted: false, volume: 1 },
      games: {},
    });
  });
});

describe('serialize / deserialize round-trip', () => {
  it('preserves a valid snapshot', () => {
    const s = defaultSnapshot();
    s.audio.muted = true;
    s.audio.volume = 0.5;
    s.games['color-sort'] = { gameId: 'color-sort', shuffleSeed: 42, cyclesCompleted: 3 };
    expect(deserialize(serialize(s))).toEqual(s);
  });
});

describe('deserialize', () => {
  it('returns the default for null', () => {
    expect(deserialize(null)).toEqual(defaultSnapshot());
  });
  it('returns the default for malformed JSON (never throws)', () => {
    expect(deserialize('{not json')).toEqual(defaultSnapshot());
  });
  it('returns the default for a wrong-shape object', () => {
    expect(deserialize(JSON.stringify({ version: 99 }))).toEqual(defaultSnapshot());
  });
  it('returns the default for a legacy version', () => {
    expect(deserialize(JSON.stringify({ version: 0, audio: {}, games: {} }))).toEqual(
      defaultSnapshot(),
    );
  });
});

describe('isValidSnapshot', () => {
  it('accepts the default', () => {
    expect(isValidSnapshot(defaultSnapshot())).toBe(true);
  });
  it('rejects a missing audio block', () => {
    expect(isValidSnapshot({ version: 1, games: {} })).toBe(false);
  });
  it('rejects a non-object', () => {
    expect(isValidSnapshot('nope')).toBe(false);
  });
});
```

- [ ] Run `npx vitest run src/shell/storage/progressSerde.test.ts`. Expected failure: `Cannot find module './progressSerde'`.
- [ ] Create minimal implementation `src/shell/storage/progressSerde.ts`:

```ts
import type { ProgressSnapshot, GameProgress, GameId } from '@/types';

const GAME_IDS: readonly GameId[] = ['color-sort', 'item-sort', 'item-match'];

export function defaultSnapshot(): ProgressSnapshot {
  // Default master volume is 1 (full). Pinned here; SettingsScene does not change it.
  return { version: 1, audio: { muted: false, volume: 1 }, games: {} };
}

/** Serialize to a compact JSON string. */
export function serialize(snapshot: ProgressSnapshot): string {
  return JSON.stringify(snapshot);
}

function isGameProgress(value: unknown): value is GameProgress {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.gameId === 'string' &&
    GAME_IDS.includes(v.gameId as GameId) &&
    typeof v.shuffleSeed === 'number' &&
    typeof v.cyclesCompleted === 'number'
  );
}

/** Type guard / validator used by tests and deserialize. */
export function isValidSnapshot(value: unknown): value is ProgressSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  const audio = v.audio as Record<string, unknown> | undefined;
  if (
    typeof audio !== 'object' ||
    audio === null ||
    typeof audio.muted !== 'boolean' ||
    typeof audio.volume !== 'number'
  ) {
    return false;
  }
  const games = v.games as Record<string, unknown> | undefined;
  if (typeof games !== 'object' || games === null) return false;
  for (const [key, gp] of Object.entries(games)) {
    if (!GAME_IDS.includes(key as GameId)) return false;
    if (!isGameProgress(gp)) return false;
  }
  return true;
}

/** Parse + validate; returns defaultSnapshot() on any malformed/legacy input (never throws). */
export function deserialize(raw: string | null): ProgressSnapshot {
  if (raw === null) return defaultSnapshot();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultSnapshot();
  }
  return isValidSnapshot(parsed) ? parsed : defaultSnapshot();
}
```

- [ ] Run `npx vitest run src/shell/storage/progressSerde.test.ts`. Expected: all tests pass.
- [ ] Commit: `git add src/shell/storage/progressSerde.ts src/shell/storage/progressSerde.test.ts && git commit -m "feat: add pure ProgressSnapshot serde (zero PII, never throws, default volume 1)"`

---

### Task 15: ProgressStore facade (`src/shell/storage/ProgressStore.ts`) — thin wiring

Facade over a `KeyValueStore` (Capacitor Preferences on device, localStorage on web) delegating (de)serialization to `progressSerde` (Shared Contracts §3.5; spec §4.1 no cloud/no PII). Single key `PROGRESS_KEY`. Exposes `load()` so `BaseGameScene.create()` (M2) can read the persisted snapshot and resume the prior shuffle arrangement (via `saved?.shuffleSeed ?? Math.random()`) instead of generating a fresh `Math.random` seed each launch — implements the relaunch-continuity behavior asserted by M4 QA. An optional `resolveSeed` helper (contract addendum §3.5) is also provided, but M2's `create()` uses `load()` directly. Thin — manual-QA covered, not unit-tested.

**Files:**
- `src/shell/storage/ProgressStore.ts`

- [ ] Create `src/shell/storage/ProgressStore.ts`:

```ts
import type { ProgressSnapshot, GameProgress, GameId } from '@/types';
import { defaultSnapshot, serialize, deserialize } from './progressSerde';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Single storage key (no PII). */
export const PROGRESS_KEY = 'ehaan.progress.v1';

export class ProgressStore {
  /** backend = Capacitor Preferences adapter on device, localStorage adapter on web. */
  constructor(private readonly backend: KeyValueStore) {}

  async load(): Promise<ProgressSnapshot> {
    const raw = await this.backend.get(PROGRESS_KEY);
    return deserialize(raw);
  }

  async save(snapshot: ProgressSnapshot): Promise<void> {
    await this.backend.set(PROGRESS_KEY, serialize(snapshot));
  }

  /** Read-modify-write a single game's continuity. */
  async patchGame(gameId: GameId, patch: Partial<GameProgress>): Promise<void> {
    const snapshot = await this.load();
    const existing: GameProgress =
      snapshot.games[gameId] ?? { gameId, shuffleSeed: 0, cyclesCompleted: 0 };
    snapshot.games[gameId] = { ...existing, ...patch, gameId };
    await this.save(snapshot);
  }

  /**
   * Return the persisted shuffleSeed for a game, or generate + persist a new one
   * if absent. BaseGameScene.create() (M2) calls this exactly once to resume the
   * prior arrangement on relaunch (content-set continuity).
   */
  async resolveSeed(gameId: GameId): Promise<number> {
    const snapshot = await this.load();
    const existing = snapshot.games[gameId];
    if (existing) return existing.shuffleSeed;
    const seed = Math.floor(Math.random() * 0x7fffffff);
    await this.patchGame(gameId, { shuffleSeed: seed, cyclesCompleted: 0 });
    return seed;
  }
}

// defaultSnapshot is re-exported for adapters/tests that need a baseline.
export { defaultSnapshot };
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/shell/storage/ProgressStore.ts && git commit -m "feat: add ProgressStore facade with shuffle-seed continuity"`

---

### Task 16: Drop / match / completion logic (`src/shell/input/dropValidation.ts`) — PURE, strict TDD

`isValidDrop`, `isMatch`, `isSetComplete` (Shared Contracts §3.3). This is the decidable core of all three games: sort = category equality, match = pairId equality with distinct ids, completion = every id resolved (triggers the appreciation reward, spec §5). PURE — no phaser.

**Files:**
- `src/shell/input/dropValidation.ts`
- `src/shell/input/dropValidation.test.ts`

- [ ] Write failing test `src/shell/input/dropValidation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isValidDrop,
  isMatch,
  isSetComplete,
  type DraggableMeta,
  type DropTarget,
} from './dropValidation';

describe('isValidDrop', () => {
  it('accepts a sort item whose categoryId matches the target', () => {
    const item: DraggableMeta = { id: 'apple', categoryId: 'fruit' };
    const target: DropTarget = { id: 'bin-fruit', acceptsCategoryId: 'fruit' };
    expect(isValidDrop(item, target)).toBe(true);
  });

  it('rejects a sort item whose categoryId differs', () => {
    const item: DraggableMeta = { id: 'cat', categoryId: 'animal' };
    const target: DropTarget = { id: 'bin-fruit', acceptsCategoryId: 'fruit' };
    expect(isValidDrop(item, target)).toBe(false);
  });

  it('rejects a sort item on a match-game slot (acceptsCategoryId null)', () => {
    const item: DraggableMeta = { id: 'apple', categoryId: 'fruit' };
    const target: DropTarget = { id: 'slot-1', acceptsCategoryId: null };
    expect(isValidDrop(item, target)).toBe(false);
  });
});

describe('isMatch', () => {
  it('matches two distinct items with the same pairId', () => {
    const a: DraggableMeta = { id: 'sun-a', pairId: 'sun' };
    const b: DraggableMeta = { id: 'sun-b', pairId: 'sun' };
    expect(isMatch(a, b)).toBe(true);
  });

  it('does not match an item with itself', () => {
    const a: DraggableMeta = { id: 'sun-a', pairId: 'sun' };
    expect(isMatch(a, a)).toBe(false);
  });

  it('does not match different pairIds', () => {
    const a: DraggableMeta = { id: 'sun-a', pairId: 'sun' };
    const b: DraggableMeta = { id: 'moon-a', pairId: 'moon' };
    expect(isMatch(a, b)).toBe(false);
  });
});

describe('isSetComplete', () => {
  it('is true when every id is placed (order-independent)', () => {
    expect(isSetComplete(['c', 'a', 'b'], ['a', 'b', 'c'])).toBe(true);
  });
  it('is false when one id is missing', () => {
    expect(isSetComplete(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });
  it('is true for an empty total set', () => {
    expect(isSetComplete([], [])).toBe(true);
  });
});
```

- [ ] Run `npx vitest run src/shell/input/dropValidation.test.ts`. Expected failure: `Cannot find module './dropValidation'`.
- [ ] Create minimal implementation `src/shell/input/dropValidation.ts`:

```ts
export interface DropTarget {
  id: string;        // bin/slot id
  acceptsCategoryId: string | null; // null = match-game slot (matched by pairId)
}

export interface DraggableMeta {
  id: string;
  categoryId?: string; // sort games
  pairId?: string;     // match game
}

/** Is this drop valid for the target? Sort: category equality. Match: pair equality handled separately. */
export function isValidDrop(item: DraggableMeta, target: DropTarget): boolean {
  if (target.acceptsCategoryId === null) return false; // match slots use isMatch()
  return item.categoryId === target.acceptsCategoryId;
}

/** Two items form a match if their pairId is equal and ids differ. */
export function isMatch(a: DraggableMeta, b: DraggableMeta): boolean {
  if (a.id === b.id) return false;
  return a.pairId !== undefined && a.pairId === b.pairId;
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

- [ ] Run `npx vitest run src/shell/input/dropValidation.test.ts`. Expected: all tests pass.
- [ ] Commit: `git add src/shell/input/dropValidation.ts src/shell/input/dropValidation.test.ts && git commit -m "feat: add pure drop/match/completion validation"`

---

### Task 17: DragDropController (`src/shell/input/DragDropController.ts`) — thin wiring

Phaser drag/drop wiring with generous toddler hit areas (`MIN_HIT_AREA_PX = 88`, Shared Contracts §3.3; spec §4.1 "generous toddler-sized hit areas"). Delegates validity to `dropValidation`; emits the `DragDropEvents` callbacks. Events are injectable at construction AND mutable via `setEvents()` (contract addendum §3.3) so M4 scenes can supply handlers from `buildLayout()` (they call `this.drag.setEvents({ ... })`, NOT `this.drag.events = {...}`). Thin — manual-QA covered (`qa/checklists/phase0-android-drag.md`), not unit-tested.

**Files:**
- `src/shell/input/DragDropController.ts`

- [ ] Create `src/shell/input/DragDropController.ts`:

```ts
import { isValidDrop, type DraggableMeta, type DropTarget } from './dropValidation';

export interface DragDropEvents {
  onPickUp?(item: DraggableMeta): void;
  onValidDrop?(item: DraggableMeta, target: DropTarget): void;
  onInvalidDrop?(item: DraggableMeta, target: DropTarget): void;
  onMatch?(a: DraggableMeta, b: DraggableMeta): void;
}

/** Minimum hit-area edge in px for ages 2-5 (LAW; referenced by QA). */
export const MIN_HIT_AREA_PX = 88;

interface DraggableRecord {
  obj: Phaser.GameObjects.GameObject;
  meta: DraggableMeta;
  originX: number;
  originY: number;
}

export class DragDropController {
  private readonly draggables = new Map<Phaser.GameObjects.GameObject, DraggableRecord>();
  private readonly targets = new Map<Phaser.GameObjects.Zone, DropTarget>();
  private events: DragDropEvents;

  constructor(
    private readonly scene: Phaser.Scene,
    events: DragDropEvents = {},
  ) {
    this.events = events;
    this.scene.input.on('dragstart', this.handleDragStart, this);
    this.scene.input.on('drag', this.handleDrag, this);
    this.scene.input.on('drop', this.handleDrop, this);
    this.scene.input.on('dragend', this.handleDragEnd, this);
  }

  /** Replace the active event handlers (M4 scenes call this from buildLayout()). */
  setEvents(events: DragDropEvents): void {
    this.events = events;
  }

  /** Register a draggable with a generous toddler-sized hit area (min 88px). */
  addDraggable(obj: Phaser.GameObjects.GameObject, meta: DraggableMeta): void {
    const withXY = obj as Phaser.GameObjects.GameObject & { x: number; y: number };
    // Enforce a hit area at least MIN_HIT_AREA_PX on each edge.
    const hit = new Phaser.Geom.Rectangle(
      -MIN_HIT_AREA_PX / 2,
      -MIN_HIT_AREA_PX / 2,
      MIN_HIT_AREA_PX,
      MIN_HIT_AREA_PX,
    );
    obj.setInteractive({ draggable: true, hitArea: hit, hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    this.draggables.set(obj, { obj, meta, originX: withXY.x, originY: withXY.y });
  }

  /** Register a snap-zone drop target. */
  addTarget(zone: Phaser.GameObjects.Zone, target: DropTarget): void {
    zone.setRectangleDropZone(
      Math.max(zone.width, MIN_HIT_AREA_PX),
      Math.max(zone.height, MIN_HIT_AREA_PX),
    );
    this.targets.set(zone, target);
  }

  /** Snap an item back to its origin (invalid drop) with a tween. */
  returnToOrigin(obj: Phaser.GameObjects.GameObject): void {
    const rec = this.draggables.get(obj);
    if (!rec) return;
    this.scene.tweens.add({
      targets: obj,
      x: rec.originX,
      y: rec.originY,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  destroy(): void {
    this.scene.input.off('dragstart', this.handleDragStart, this);
    this.scene.input.off('drag', this.handleDrag, this);
    this.scene.input.off('drop', this.handleDrop, this);
    this.scene.input.off('dragend', this.handleDragEnd, this);
    this.draggables.clear();
    this.targets.clear();
  }

  private handleDragStart(_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject): void {
    const rec = this.draggables.get(obj);
    if (rec) this.events.onPickUp?.(rec.meta);
  }

  private handleDrag(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.GameObject,
    dragX: number,
    dragY: number,
  ): void {
    const withXY = obj as Phaser.GameObjects.GameObject & { x: number; y: number };
    withXY.x = dragX;
    withXY.y = dragY;
  }

  private handleDrop(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.GameObject,
    zone: Phaser.GameObjects.Zone,
  ): void {
    const rec = this.draggables.get(obj);
    const target = this.targets.get(zone);
    if (!rec || !target) return;
    if (isValidDrop(rec.meta, target)) {
      this.events.onValidDrop?.(rec.meta, target);
    } else {
      this.events.onInvalidDrop?.(rec.meta, target);
      this.returnToOrigin(obj);
    }
  }

  private handleDragEnd(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.GameObject,
    dropped: boolean,
  ): void {
    if (!dropped) this.returnToOrigin(obj);
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors (requires `phaser` types from M0).
- [ ] Commit: `git add src/shell/input/DragDropController.ts && git commit -m "feat: add DragDropController with toddler hit areas + setEvents (thin)"`

---

### Task 18: Button UI factory (`src/shell/ui/Button.ts`) — thin wiring

The reusable big-tap-target button consumed by M2's HubScene, SettingsScene, and ParentalGate (contract addendum §3.11). Tap + hold gestures (the hold path drives the parental gate's hold-to-continue). Enforces `MIN_HIT_AREA_PX` from `DragDropController`. Plays an optional tap cue via `AudioService`. Thin — manual-QA covered, not unit-tested.

**Files:**
- `src/shell/ui/Button.ts`

- [ ] Create `src/shell/ui/Button.ts`:

```ts
import type { SpriteKey, AudioCueId } from '@/types';
import { MIN_HIT_AREA_PX } from '../input/DragDropController';
import type { AudioService } from '../audio/AudioService';

export interface ButtonOptions {
  /** Atlas frame for the button background (defaults to a shared frame). */
  frame?: SpriteKey;
  /** Optional text label drawn over the button. */
  label?: string;
  /** Minimum tap-target edge in px (LAW: never below MIN_HIT_AREA_PX). */
  minSize?: number;
  /** Voice/sfx cue played on tap. */
  tapCue?: AudioCueId;
}

const DEFAULT_FRAME = 'shared/btn' as SpriteKey;

export class Button {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private tapHandler: (() => void) | null = null;
  private holdStartHandler: (() => void) | null = null;
  private holdEndHandler: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    options: ButtonOptions = {},
    private readonly audio?: AudioService,
  ) {
    const size = Math.max(options.minSize ?? MIN_HIT_AREA_PX, MIN_HIT_AREA_PX);
    this.bg = scene.add.image(0, 0, 'shared', options.frame ?? DEFAULT_FRAME);
    this.bg.setDisplaySize(Math.max(this.bg.width, size), Math.max(this.bg.height, size));
    this.text = scene.add
      .text(0, 0, options.label ?? '', { fontSize: '32px', color: '#000000' })
      .setOrigin(0.5);
    this.container = scene.add.container(x, y, [this.bg, this.text]);

    const w = this.bg.displayWidth;
    const h = this.bg.displayHeight;
    this.container.setSize(w, h);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );

    this.container.on('pointerdown', () => {
      this.holdStartHandler?.();
    });
    this.container.on('pointerup', () => {
      this.holdEndHandler?.();
      if (this.tapHandler) {
        if (options.tapCue && this.audio) void this.audio.play(options.tapCue);
        this.tapHandler();
      }
    });
    this.container.on('pointerout', () => {
      this.holdEndHandler?.();
    });
  }

  /** Register a tap (pointerup inside) handler. Returns this for chaining. */
  onTap(handler: () => void): this {
    this.tapHandler = handler;
    return this;
  }

  /** Register a hold-start handler (pointerdown). Used by the parental gate hold-to-continue. */
  onHoldStart(handler: () => void): this {
    this.holdStartHandler = handler;
    return this;
  }

  /** Register a hold-end handler (pointerup/pointerout after a hold). */
  onHoldEnd(handler: () => void): this {
    this.holdEndHandler = handler;
    return this;
  }

  /** Update the visible label text. */
  setLabel(text: string): this {
    this.text.setText(text);
    return this;
  }

  /** Move the button. */
  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  /** The underlying Phaser container, for adding to a Scene/Dialog. */
  get gameObject(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors (requires `phaser` types from M0).
- [ ] Commit: `git add src/shell/ui/Button.ts && git commit -m "feat: add Button UI factory with tap + hold gestures (thin)"`

---

### Task 19: Dialog UI factory (`src/shell/ui/Dialog.ts`) — thin wiring

The reusable modal panel consumed by M2's ParentalGate (math challenge), SettingsScene, and any future adult surface (contract addendum §3.12). Title + body region + prompt line + cancel button; body is clearable so the parental gate can re-render the math challenge on a wrong answer. Thin — manual-QA covered, not unit-tested.

**Files:**
- `src/shell/ui/Dialog.ts`

- [ ] Create `src/shell/ui/Dialog.ts`:

```ts
import type { SpriteKey } from '@/types';
import { Button } from './Button';

export interface DialogOptions {
  /** Heading text. */
  title: string;
}

const PANEL_FRAME = 'shared/dialog-panel' as SpriteKey;

export class Dialog {
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly bodyChildren: Phaser.GameObjects.GameObject[] = [];
  private cancelButton: Button | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    options: DialogOptions,
  ) {
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;
    const panel = scene.add.image(0, 0, 'shared', PANEL_FRAME);

    this.titleText = scene.add
      .text(0, -panel.height / 2 + 48, options.title, { fontSize: '40px', color: '#000000' })
      .setOrigin(0.5);
    this.promptText = scene.add
      .text(0, -panel.height / 2 + 110, '', { fontSize: '28px', color: '#222222' })
      .setOrigin(0.5);

    this.container = scene.add
      .container(cx, cy, [panel, this.titleText, this.promptText])
      .setDepth(2000);
  }

  /** Remove all body children (re-render the math challenge on failure, etc.). */
  clearBody(): this {
    for (const child of this.bodyChildren) child.destroy();
    this.bodyChildren.length = 0;
    return this;
  }

  /** Add a GameObject (e.g. a Button.gameObject) into the dialog body region. */
  addToBody(obj: Phaser.GameObjects.GameObject): this {
    this.container.add(obj);
    this.bodyChildren.push(obj);
    return this;
  }

  /** Set/replace the prompt line under the title. */
  setPrompt(text: string): this {
    this.promptText.setText(text);
    return this;
  }

  /** Add a standard cancel/close button; invokes the handler then destroys the dialog. */
  addCancel(handler: () => void): this {
    const panelH = this.scene.scale.height; // placement relative to dialog body
    this.cancelButton = new Button(this.scene, 0, panelH / 2 - 220, { label: '✕' }).onTap(() => {
      handler();
      this.destroy();
    });
    this.container.add(this.cancelButton.gameObject);
    return this;
  }

  destroy(): void {
    this.cancelButton?.destroy();
    this.container.destroy();
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/shell/ui/Dialog.ts && git commit -m "feat: add Dialog UI factory (title/body/prompt/cancel, thin)"`

---

### Task 20: RewardFx (`src/shell/rewards/RewardFx.ts`) — thin wiring, appreciation-only

Celebratory pop/scale/particles + optional cheer cue (Shared Contracts §3.4; spec §4.1, §5 appreciation-only). HARD RULE: no streaks, no score UI, no urgency, no guilt (spec §7 UK Children's Code). Thin — manual-QA covered, not unit-tested.

**Files:**
- `src/shell/rewards/RewardFx.ts`

- [ ] Create `src/shell/rewards/RewardFx.ts`:

```ts
import type { RewardRequest } from '@/types';
import type { AudioService } from '../audio/AudioService';

/**
 * Appreciation-only celebration. NO scoring, streaks, urgency, or guilt UI.
 * 'appreciation' = full pop + particles + cheer on set completion.
 * 'snap'         = small positive confirm on a correct drop.
 */
export class RewardFx {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly audio: AudioService,
  ) {}

  async play(request: RewardRequest): Promise<void> {
    const big = request.kind === 'appreciation';
    const sprite = this.scene.add
      .sprite(request.x, request.y, 'shared', big ? 'reward-burst' : 'reward-snap')
      .setScale(0.1)
      .setDepth(1000);

    await new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: sprite,
        scale: big ? 1.4 : 0.9,
        duration: big ? 420 : 200,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: () => {
          sprite.destroy();
          resolve();
        },
      });

      if (big) {
        const emitter = this.scene.add.particles(request.x, request.y, 'shared', {
          frame: 'reward-confetti',
          lifespan: 900,
          speed: { min: 120, max: 260 },
          scale: { start: 0.6, end: 0 },
          quantity: 24,
          emitting: false,
        });
        emitter.setDepth(999);
        emitter.explode(24);
        this.scene.time.delayedCall(1000, () => emitter.destroy());
      }
    });

    if (request.cue) await this.audio.play(request.cue);
  }

  destroy(): void {
    // No persistent state to tear down; tweens/particles self-destroy on complete.
  }
}
```

- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `git add src/shell/rewards/RewardFx.ts && git commit -m "feat: add RewardFx appreciation-only celebration (no streaks)"`

---

### Task 21: Full-suite green + type-check + build gate

Final M1 verification: every pure module passes, the whole tree type-checks, the no-network harness held, and `vite build` emits `dist/` against the deterministic M1 entry stub from Task 1.

**Files:** *(none created — verification only)*

- [ ] Run `npm test`. Expected: all suites pass — `sprites.test.ts`, `color.test.ts`, `hubLayout.test.ts`, `audioQueue.test.ts`, `parentalChallenge.test.ts`, `progressSerde.test.ts`, `dropValidation.test.ts` — with `0 failed` and no `Network access is forbidden` errors (which would mean a module touched `fetch`).
- [ ] Run `npm run build`. Expected: deterministic success. `tsc --noEmit` passes for the full tree (all `src/types`, `src/shell` files, plus `src/main.ts`), then `vite build` emits `dist/` (the Task 1 `src/main.ts` stub is a valid entry — there is no "no entry" branch, because M0 removed the spike entry and Task 1 replaced it). `vite-plugin-pwa` is configured from M0, so the build also emits `manifest.webmanifest` + `sw.js`; no PWA error occurs. If `vite build` fails for any reason other than the type-check, treat it as a real failure and fix it (do NOT fall back to a "type-check only" gate).
- [ ] Run `npm run lint`. Expected: `eslint` reports no errors over `src tools tests`.
- [ ] Commit any lint autofixes if produced: `git add -A && git commit -m "chore: lint pass for M1 shell services"` (skip if nothing changed).

---

### M1 Done criteria

- All pure modules (`color`, `hubLayout`, `audioQueue`, `parentalChallenge`, `progressSerde`, `dropValidation`, `spriteKey`) are unit-tested with strict TDD and green; none import `phaser`, the DOM, or `@capacitor/*`.
- All thin wrappers (`AudioService`, `NativeAudioBackend`, `WebAudioBackend`, `AppLifecycle`, `ProgressStore`, `DragDropController`, `RewardFx`) and the reusable UI factories (`Button`, `Dialog`) compile under `strict: true` and delegate decidable logic to the pure modules.
- All shared types from Shared Contracts §2 + §5.1 exist and are re-exported from `src/types/index.ts`; `content.ts` resolves `OkabeItoToken` from `theme.ts` (created before it, so no commit was made with a broken forward reference).
- The contract addenda introduced by this milestone are implemented: `Button` (§3.11), `Dialog` (§3.12), `DragDropController.setEvents()` (§3.3), `ProgressStore.load()` (+ optional `resolveSeed`, §3.5). M2 consumes these (reading the seed via `ProgressStore.load()`) without redefining them.
- Default master volume is pinned to `1` in `progressSerde.defaultSnapshot()` and nowhere else; M2 references this value unchanged.
- ZERO PII / zero networking: `progressSerde` persists only audio prefs + shuffle continuity; the test harness proves no test performs network I/O.
- Appreciation-only: `RewardFx` and `RewardKind` carry no scoring/streak/progress-bar concepts.
- iOS audio mitigation in place at the logic level: `audioQueue` re-enters `recovering` on `app-resume`/`visibility-visible` and flushes queued critical voice cues on `running`; `AppLifecycle` wires both triggers; `NativeAudioBackend` routes critical voice via `${cue.src}.m4a`.
- The build gate is deterministic: M0 removed the spike entry; Task 1 added a minimal `src/main.ts`; `npm run build` emits `dist/` (+ PWA `manifest.webmanifest`/`sw.js`) with no errors.
- Frame-key convention is settled: `spriteKey()` produces the full `"<atlas>/<frame>"` string that M3 packs and M2/M4 pass to `add.image()/add.sprite()` unstripped.

**Deferred to later milestones (not in M1):** Scenes (Boot/Hub/Settings/BaseGameScene) + the `BaseGameScene.onSetComplete()` completion entry point + seed/reshuffle wiring that reads the persisted snapshot via `ProgressStore.load()` (`saved?.shuffleSeed ?? Math.random()`) → M2; `contentLoader.ts` + per-game `content.json` + `registry.ts` (sole-authored by M2, extended by M4) → M2/M4; `compliance/assertions.ts` + `tests/compliance/*` → M5; PWA/store icon generation → M3/M5; native splash + haptics + edge-to-edge/status-bar config + Android targetSdk 35+ + idle render-loop throttling → M5; manual QA checklists under `qa/checklists/` are authored alongside the wrappers they cover (M2/M6).