# Phase 1 — Shell Scenes & Bootstrap (M2) Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the reusable Phaser shell's scenes and bootstrap on top of the M1 services. Deliver `src/main.ts` (Phaser.Game config, scene registration, PWA service-worker registration stub), `BootScene` (loads shared atlas + audio manifest, inits platform services), `HubScene` (kid-friendly tile menu driven by `games/registry.ts`), `SettingsScene` (audio on/off + volume, gated by `ParentalGate`), `ParentalGate` (hold-to-continue + multiply-two-numbers with a spoken "ask a grown-up" cue), `BaseGameScene` (abstract lifecycle: open continuous play → completion → appreciation reward → reshuffle/continue, with shuffle-seed continuity read from `ProgressStore`), and `games/registry.ts`. All decidable logic is extracted into PURE, framework-free modules covered by Vitest TDD; the Phaser scenes are THIN wiring over those pure modules and over M1 services, and are covered by documented manual-QA checklists.

**Architecture:** Each scene is a thin Phaser wrapper. The decidable logic each scene needs already lives (or is added here) in pure modules: `hubLayout.ts` (tile math), `parentalChallenge.ts` (challenge gen/verify), and a NEW pure `gameLoop.ts` state machine that owns the play→complete→reward→reshuffle phase bookkeeping and `cyclesCompleted` counting. **`BaseGameScene` exposes EXACTLY the Shared Contracts §3.8 hook set** (`loadContent`/`buildLayout`/`reshuffle`/`onSetComplete`/`shutdown`); `onSetComplete()` is the SINGLE completion entry point that M4 game subclasses call directly when they detect their set is complete. `onSetComplete()` internally drives the pure `gameLoop` reducer for sequencing and cycle counting — there is no public `reportItemResolved` and no second wiring path. **Seed + layout contract (LAW):** Base owns the shuffle seed; it reads the persisted `shuffleSeed` from `ProgressStore.load()` in `create()` for relaunch continuity (Math.random only as a first-run fallback), calls `reshuffle(seed)` then `buildLayout()` exactly once; `onSetComplete()` advances the seed deterministically, persists it via `ProgressStore.patchGame`, then calls `reshuffle(seed)` then `buildLayout()` exactly once. `reshuffle(seed)` mutates content/card data ONLY and NEVER calls `buildLayout` — M4's three scenes must conform. Scenes import M1 services (`AudioService`, `DragDropController`, `RewardFx`, `ProgressStore`, `AppLifecycle`, `theme`/`color`, `Button`/`Dialog`). There is NO shared `contentLoader.ts`; content validation is done per-game by the M4 scenes' own `loadContent()` using their per-game validators (decision 9). No networking code anywhere; PWA SW registration is a guarded stub that only registers the locally-bundled `dist/sw.js` (no remote URL).

**Tech Stack:** Phaser 4.1.x (TypeScript, `strict: true`), Capacitor 8.3.x (`@capacitor/app`, `@capacitor/preferences`, `@capacitor-community/native-audio`), Vite 5.x + `vite-plugin-pwa` 0.20.x (configured + `public/manifest.webmanifest` present from M0/M1 scaffolding), Vitest 2.x (`environment: 'node'`, `@/` alias), `tsx` for tools. All paths/types/signatures per the canonical shared-contracts document.

---

## Prerequisites

- **M1 (Shell services) MUST be complete and merged.** This milestone is THIN wiring over M1. Specifically, these M1 deliverables must exist and pass their tests before starting M2:
  - All shared types under `src/types/` and the barrel `src/types/index.ts` (contracts §2).
  - `src/shell/audio/AudioService.ts` + `audioQueue.ts` + `NativeAudioBackend.ts` + `WebAudioBackend.ts` (contracts §3.1–3.2). Audio asset path is standardized as `${cue.src}.m4a` / `${cue.src}.ogg` (no extra `public/` prefix); the M0 spike bodies were discarded, keeping only the `AudioBackend` interface.
  - `src/shell/input/DragDropController.ts` + `dropValidation.ts` and `MIN_HIT_AREA_PX` (contracts §3.3). **M1 `DragDropController` MUST expose a mutable `events` field via a `setEvents(events: DragDropEvents): void` method** so `BaseGameScene` (and M4 subclasses) can supply events after construction (cross-cutting consistency fix). Constructor remains `constructor(scene, events)` and accepts an initial (possibly empty) `DragDropEvents`.
  - `src/shell/rewards/RewardFx.ts` (contracts §3.4): `constructor(scene: Phaser.Scene, audio: AudioService)`, `play(request: RewardRequest): Promise<void>`, `destroy(): void`.
  - `src/shell/storage/ProgressStore.ts` + `progressSerde.ts` + `PROGRESS_KEY` (contracts §3.5). `defaultSnapshot()` MUST set `audio.volume` in (0,1] (LAW value `0.8`) and `audio.muted = false`.
  - `src/shell/platform/AppLifecycle.ts` (contracts §3.6) and `src/shell/platform/parentalChallenge.ts` (contracts §3.7).
  - `src/shell/ui/theme.ts` (`OKABE_ITO`, `OkabeItoToken`, `APP_BG_TOKEN`, `MIN_CONTRAST_RATIO`, `FORBIDDEN_ADJACENT`), `src/shell/ui/color.ts`, `src/shell/ui/hubLayout.ts` (contracts §3.9, §5).
  - **`src/shell/ui/Button.ts` and `src/shell/ui/Dialog.ts` (created in M1 with the API below — see "Button/Dialog API" note).**
  - No shared `contentLoader.ts` exists (decision 9). M2 does not import or depend on one; per-game content validation lives in each M4 scene's `loadContent()` via its per-game validator.
  - Project scaffolding: `package.json` scripts (contracts §7.1) and pinned deps incl. `vite-plugin-pwa` (added in M0); `vitest.config.ts` with `@/`→`src/` alias, `include: ['src/**/*.test.ts','tests/**/*.test.ts','tools/**/*.test.ts']`, and `tests/setup.ts` no-network stub (contracts §6.4); `tsconfig.json` `strict: true` + `paths`; `vite.config.ts` with `base: './'` + `vite-plugin-pwa` configured; `public/manifest.webmanifest` present; `capacitor.config.ts` (no `server.url`).
- **`npm test` runs green on the M1 baseline** before any M2 commit. Confirm with: `npm test` → expect "Test Files … passed" and a non-zero number of passing tests, exit code 0.

> **Button/Dialog API (LAW — created in M1, consumed by M2).** `Button` constructor: `constructor(scene: Phaser.Scene, opts: { labelKey: string; minSize: number })`. Methods: `onTap(handler: () => void | Promise<void>): void`, `onHoldStart(handler: () => void): void`, `onHoldEnd(handler: () => void): void`, `setLabel(labelKey: string): void`, `setPosition(x: number, y: number): void`, and a `get gameObject(): Phaser.GameObjects.GameObject` accessor. `Dialog` constructor: `constructor(scene: Phaser.Scene, opts: { title: string })`. Methods: `clearBody(): void`, `addToBody(obj: Phaser.GameObjects.GameObject): void`, `setPrompt(text: string): void`, `addCancel(handler: () => void): void`, `destroy(): void`. If M1 shipped different names, this is a contract conflict — fix M1 to match this API; do NOT change the calls here.

> **BaseGameScene completion API (LAW — RECONCILED).** Per Shared Contracts §3.8, `BaseGameScene` exposes ONLY: `loadContent()`, `buildLayout()`, `reshuffle(seed)`, `onSetComplete()`, `shutdown()`. M4 game subclasses track their own placement/match state and call `this.onSetComplete()` directly when their set is complete. There is NO public `reportItemResolved`. The pure `gameLoop` reducer (Task 1) is an INTERNAL implementation detail of `onSetComplete()` (phase + `cyclesCompleted` bookkeeping); M4 never imports or calls it.

> **Seed + reshuffle/buildLayout contract (LAW — RECONCILED).** Base owns the seed. `reshuffle(seed)` mutates content/card data ONLY and NEVER calls `buildLayout`. Base calls `buildLayout()` exactly once after each `reshuffle()` (at startup and after each completion). M4's three scenes MUST conform: their `reshuffle` must not call `buildLayout`, and they MUST NOT define a private seed source (e.g. remove any `currentSeed()` returning a constant). Base reads the persisted `shuffleSeed` via `ProgressStore.load()` in `create()` for relaunch continuity.

> **Frame-key convention (LAW — RECONCILED).** The Phaser atlas frame name EQUALS the full `SpriteKey` string (`"<atlas>/<frame>"`, e.g. `"shared/tile-color-sort"`). M3's `pack-atlas.ts` emits frames keyed by the full `SpriteKey`, and an M3 test asserts the packed JSON frame keys equal the `SpriteKey`s. Therefore callers pass the FULL `SpriteKey` as the frame argument to `add.image`/`add.sprite` and MUST NOT strip the `"<atlas>/"` prefix. HubScene uses `add.image(x, y, atlasKey, spriteKeyString)` with the full key.

> Note: M2 depends on M1's `hubLayout.ts`, `parentalChallenge.ts`, `Button.ts`, `Dialog.ts` already existing and tested. There is NO shared `contentLoader.ts` (decision 9) — per-game content validation happens in M4 scenes' `loadContent()`, so M2 does not depend on a generic loader. M2 ADDS one new pure module (`gameLoop.ts`) and the four scenes + `main.ts` + `registry.ts`. If those M1 modules are not yet present, M2 is blocked — do not re-create them here.

## Files

**Create (pure logic — unit-tested):**
- `src/shell/scenes/gameLoop.ts` — PURE state machine for the BaseGameScene lifecycle (idle → playing → completing → rewarding → reshuffling → playing). No `phaser`. Exports `GameLoopState`, `GameLoopPhase`, `GameLoopEvent`, `initialGameLoop`, `reduceGameLoop`. Used ONLY internally by `BaseGameScene.onSetComplete`.
- `src/shell/scenes/gameLoop.test.ts` — Vitest tests for `gameLoop.ts`.
- `src/shell/audio/cueManifest.ts` — PURE shell-level `AudioCue[]` (`SHELL_CUES`) registered by BootScene.
- `src/shell/audio/cueManifest.test.ts` — Vitest tests for `cueManifest.ts`.
- `src/games/registry.ts` — `export const GAMES: readonly GameDef[]` with the three v1 entries. (M2 is the SOLE author of this file and its test; M4 only confirms/extends it.)
- `src/games/registry.test.ts` — Vitest tests for `registry.ts`.
- `src/main.pwa.ts` — guarded PWA service-worker registration stub (no remote URL; only the locally bundled SW). Exports `SW_URL`, `shouldRegisterServiceWorker`, `registerServiceWorker`.
- `src/main.pwa.test.ts` — Vitest tests for the PWA stub.

**Create (regression tests over already-built pure modules — green-on-first-run expected):**
- `src/shell/platform/parentalGateContract.test.ts` — pins the gate's contract over `parentalChallenge.ts` (no `phaser`).
- `src/shell/scenes/hubScene.layout.test.ts` — feeds `GAMES.length` into `computeTileLayout` (no `phaser`).
- `src/shell/scenes/settingsPersistence.test.ts` — round-trips `{ muted, volume }` through `progressSerde` (no `phaser`).

**Create (Phaser scenes/wiring — THIN, manual-QA only, NOT unit-tested):**
- `src/config/gameConfig.ts` — `Phaser.Types.Core.GameConfig` factory (WebGL, scale FIT, parent `#app`, low-power, idle-throttle hook).
- `src/shell/scenes/BootScene.ts` — loads `shared` atlas + registers `SHELL_CUES`, inits platform services, starts `HubScene`.
- `src/shell/scenes/HubScene.ts` — renders one tile per `GAMES` entry using `computeTileLayout`; tap launches a game scene; a gated gear opens `SettingsScene`.
- `src/shell/scenes/SettingsScene.ts` — audio on/off + volume; only reachable after `ParentalGate.present()` resolves `true`.
- `src/shell/scenes/BaseGameScene.ts` — abstract base; §3.8 hooks; `onSetComplete()` is the single completion entry point; drives `gameLoop.ts` internally; seed-continuity via `ProgressStore`.
- `src/shell/platform/ParentalGate.ts` — Phaser dialog wiring over `parentalChallenge.ts`; spoken "ask a grown-up" cue; `PARENTAL_GATE_HOLD_MS` default.
- `src/main.ts` — builds the `Phaser.Game` from `gameConfig.ts`, registers shell scenes (M3 insertion point documented), calls the PWA SW registration stub.

**Create (manual QA checklists):**
- `qa/checklists/hub-and-settings.md` — hub navigation + settings behavior steps + expected results.
- `qa/checklists/parental-gate.md` — parental gate behavior steps + expected results.

**Reference only (do NOT modify — from M1):**
- `src/shell/ui/hubLayout.ts`, `src/shell/platform/parentalChallenge.ts`, `src/shell/audio/AudioService.ts`, `src/shell/audio/NativeAudioBackend.ts`, `src/shell/audio/WebAudioBackend.ts`, `src/shell/input/DragDropController.ts`, `src/shell/rewards/RewardFx.ts`, `src/shell/storage/ProgressStore.ts`, `src/shell/storage/progressSerde.ts`, `src/shell/platform/AppLifecycle.ts`, `src/shell/ui/Button.ts`, `src/shell/ui/Dialog.ts`, `src/shell/ui/theme.ts` (no shared `contentLoader.ts` — decision 9; per-game validators in M4).

---

### Task 1: PURE game-loop state machine (`gameLoop.ts`)

This extracts the decidable part of `BaseGameScene`'s lifecycle (the part that would otherwise be untestable inside Phaser) into a pure reducer. `onSetComplete()` drives it internally; M4 never imports it. Phases map directly to the spec: open continuous play → set complete → appreciation reward → reshuffle → continue. NO scoring/levels.

**Files:**
- `src/shell/scenes/gameLoop.ts` (create)
- `src/shell/scenes/gameLoop.test.ts` (create)

- [ ] **Step 1 — Write the failing test file.** Create `src/shell/scenes/gameLoop.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    initialGameLoop,
    reduceGameLoop,
    type GameLoopState,
  } from './gameLoop';

  describe('initialGameLoop', () => {
    it('starts in the idle phase with cycles at zero', () => {
      const s = initialGameLoop();
      expect(s.phase).toBe('idle');
      expect(s.cyclesCompleted).toBe(0);
    });
  });

  describe('reduceGameLoop', () => {
    it('moves idle to playing on start', () => {
      const next = reduceGameLoop(initialGameLoop(), { type: 'start' });
      expect(next.phase).toBe('playing');
    });

    it('moves playing to completing only when the set is complete', () => {
      const playing = reduceGameLoop(initialGameLoop(), { type: 'start' });
      const incomplete = reduceGameLoop(playing, { type: 'set-resolved', complete: false });
      expect(incomplete.phase).toBe('playing');
      const complete = reduceGameLoop(playing, { type: 'set-resolved', complete: true });
      expect(complete.phase).toBe('completing');
    });

    it('moves completing to rewarding on reward-start', () => {
      let s: GameLoopState = reduceGameLoop(initialGameLoop(), { type: 'start' });
      s = reduceGameLoop(s, { type: 'set-resolved', complete: true });
      s = reduceGameLoop(s, { type: 'reward-start' });
      expect(s.phase).toBe('rewarding');
    });

    it('increments cyclesCompleted exactly once when entering rewarding', () => {
      let s: GameLoopState = reduceGameLoop(initialGameLoop(), { type: 'start' });
      s = reduceGameLoop(s, { type: 'set-resolved', complete: true });
      s = reduceGameLoop(s, { type: 'reward-start' });
      expect(s.cyclesCompleted).toBe(1);
    });

    it('moves rewarding to reshuffling on reward-done', () => {
      let s: GameLoopState = reduceGameLoop(initialGameLoop(), { type: 'start' });
      s = reduceGameLoop(s, { type: 'set-resolved', complete: true });
      s = reduceGameLoop(s, { type: 'reward-start' });
      s = reduceGameLoop(s, { type: 'reward-done' });
      expect(s.phase).toBe('reshuffling');
    });

    it('returns to playing after reshuffled (continuous play)', () => {
      let s: GameLoopState = reduceGameLoop(initialGameLoop(), { type: 'start' });
      s = reduceGameLoop(s, { type: 'set-resolved', complete: true });
      s = reduceGameLoop(s, { type: 'reward-start' });
      s = reduceGameLoop(s, { type: 'reward-done' });
      s = reduceGameLoop(s, { type: 'reshuffled' });
      expect(s.phase).toBe('playing');
      expect(s.cyclesCompleted).toBe(1);
    });

    it('ignores set-resolved while not playing (no spurious completes)', () => {
      let s: GameLoopState = reduceGameLoop(initialGameLoop(), { type: 'start' });
      s = reduceGameLoop(s, { type: 'set-resolved', complete: true });
      // now in 'completing'; another resolve must not double-advance or re-increment
      const again = reduceGameLoop(s, { type: 'set-resolved', complete: true });
      expect(again.phase).toBe('completing');
      expect(again.cyclesCompleted).toBe(0);
    });

    it('never decreases cyclesCompleted across a full second cycle', () => {
      let s: GameLoopState = reduceGameLoop(initialGameLoop(), { type: 'start' });
      const run = (st: GameLoopState): GameLoopState => {
        let x = reduceGameLoop(st, { type: 'set-resolved', complete: true });
        x = reduceGameLoop(x, { type: 'reward-start' });
        x = reduceGameLoop(x, { type: 'reward-done' });
        x = reduceGameLoop(x, { type: 'reshuffled' });
        return x;
      };
      s = run(s);
      expect(s.cyclesCompleted).toBe(1);
      s = run(s);
      expect(s.cyclesCompleted).toBe(2);
    });
  });
  ```

- [ ] **Step 2 — Run to see it fail.** Command: `npm test -- src/shell/scenes/gameLoop.test.ts`
  Expected failure: Vitest reports it cannot resolve `./gameLoop` (e.g. `Error: Failed to load url ./gameLoop` / "Cannot find module"), so the suite errors out with 0 passing tests, exit code 1.

- [ ] **Step 3 — Minimal implementation.** Create `src/shell/scenes/gameLoop.ts`:
  ```ts
  /**
   * PURE state machine for the BaseGameScene lifecycle (no phaser, no DOM).
   * INTERNAL to BaseGameScene.onSetComplete — M4 game subclasses NEVER import this.
   * Open continuous play: playing -> (set complete) -> completing -> rewarding
   * (appreciation only) -> reshuffling -> playing. NO scoring, NO levels.
   * cyclesCompleted is telemetry-free continuity, NEVER displayed as a score.
   */
  export type GameLoopPhase =
    | 'idle'
    | 'playing'
    | 'completing'
    | 'rewarding'
    | 'reshuffling';

  export interface GameLoopState {
    phase: GameLoopPhase;
    /** Completed content-set cycles this session. Never shown as a score. */
    cyclesCompleted: number;
  }

  export type GameLoopEvent =
    | { type: 'start' }
    | { type: 'set-resolved'; complete: boolean }
    | { type: 'reward-start' }
    | { type: 'reward-done' }
    | { type: 'reshuffled' };

  export function initialGameLoop(): GameLoopState {
    return { phase: 'idle', cyclesCompleted: 0 };
  }

  export function reduceGameLoop(
    state: GameLoopState,
    event: GameLoopEvent,
  ): GameLoopState {
    switch (state.phase) {
      case 'idle':
        if (event.type === 'start') return { ...state, phase: 'playing' };
        return state;
      case 'playing':
        if (event.type === 'set-resolved' && event.complete) {
          return { ...state, phase: 'completing' };
        }
        return state;
      case 'completing':
        if (event.type === 'reward-start') {
          return { phase: 'rewarding', cyclesCompleted: state.cyclesCompleted + 1 };
        }
        return state;
      case 'rewarding':
        if (event.type === 'reward-done') return { ...state, phase: 'reshuffling' };
        return state;
      case 'reshuffling':
        if (event.type === 'reshuffled') return { ...state, phase: 'playing' };
        return state;
      default:
        return state;
    }
  }
  ```

- [ ] **Step 4 — Run to pass.** Command: `npm test -- src/shell/scenes/gameLoop.test.ts`
  Expected output: `Test Files  1 passed (1)` and `Tests  9 passed (9)`, exit code 0.

- [ ] **Step 5 — Commit.** Command:
  `git add src/shell/scenes/gameLoop.ts src/shell/scenes/gameLoop.test.ts && git commit -m "feat: add pure game-loop state machine for BaseGameScene"`

---

### Task 2: Games registry (`games/registry.ts`)

M2 is the SOLE author of `registry.ts`. The Hub renders one tile per entry. Adding a game = adding one entry. Uses `GameDef` (contracts §2.1), `spriteKey` (§2.2), branded `AudioCueId`. **`tileVoiceCue` ids MUST equal registered `SHELL_CUES` ids** (`hub.tile.colorSort`/`hub.tile.itemSort`/`hub.tile.itemMatch` from Task 5) so every cue has a matching `AudioCue`; `titleKey` uses the `hub.title.*` namespace. M4 only confirms/extends this file — it MUST NOT rewrite `titleKey` or `tileVoiceCue` to ids lacking an `AudioCue`, and MUST NOT re-create `registry.test.ts`.

**Files:**
- `src/games/registry.ts` (create)
- `src/games/registry.test.ts` (create)

- [ ] **Step 1 — Write the failing test.** Create `src/games/registry.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { GAMES } from './registry';

  describe('GAMES registry', () => {
    it('declares exactly the three v1 games in catalog order', () => {
      expect(GAMES.map((g) => g.id)).toEqual(['color-sort', 'item-sort', 'item-match']);
    });

    it('maps each game id to its matching scene key', () => {
      const byId = Object.fromEntries(GAMES.map((g) => [g.id, g.sceneKey]));
      expect(byId['color-sort']).toBe('ColorSort');
      expect(byId['item-sort']).toBe('ItemSort');
      expect(byId['item-match']).toBe('ItemMatch');
    });

    it('uses a per-game atlas key equal to the game id', () => {
      for (const g of GAMES) expect(g.atlas).toBe(g.id);
    });

    it('points contentPath at the game folder content.json', () => {
      for (const g of GAMES) {
        expect(g.contentPath).toBe(`games/${g.id}/content.json`);
      }
    });

    it('uses the hub.title.* namespace for titleKey and hub.tile.* for tileVoiceCue', () => {
      const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
      expect(byId['color-sort'].titleKey).toBe('hub.title.colorSort');
      expect(byId['item-sort'].titleKey).toBe('hub.title.itemSort');
      expect(byId['item-match'].titleKey).toBe('hub.title.itemMatch');
      expect(byId['color-sort'].tileVoiceCue as unknown as string).toBe('hub.tile.colorSort');
      expect(byId['item-sort'].tileVoiceCue as unknown as string).toBe('hub.tile.itemSort');
      expect(byId['item-match'].tileVoiceCue as unknown as string).toBe('hub.tile.itemMatch');
    });

    it('gives every game a non-empty tile sprite key', () => {
      for (const g of GAMES) expect((g.tileSprite as unknown as string).length).toBeGreaterThan(0);
    });

    it('has unique ids and unique scene keys', () => {
      expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
      expect(new Set(GAMES.map((g) => g.sceneKey)).size).toBe(GAMES.length);
    });
  });
  ```

- [ ] **Step 2 — Run to see it fail.** Command: `npm test -- src/games/registry.test.ts`
  Expected failure: module resolution error for `./registry` ("Failed to load url ./registry" / "Cannot find module"), suite errors, exit code 1.

- [ ] **Step 3 — Minimal implementation.** Create `src/games/registry.ts`:
  ```ts
  import type { GameDef, AudioCueId } from '@/types';
  import { spriteKey } from '@/types';

  const cue = (id: string): AudioCueId => id as AudioCueId;

  /**
   * Ordered list rendered by HubScene. Add a game = add one entry.
   * tileVoiceCue ids MUST match a registered SHELL_CUES id (see cueManifest.ts).
   */
  export const GAMES: readonly GameDef[] = [
    {
      id: 'color-sort',
      sceneKey: 'ColorSort',
      titleKey: 'hub.title.colorSort',
      tileSprite: spriteKey('shared', 'tile-color-sort'),
      atlas: 'color-sort',
      tileVoiceCue: cue('hub.tile.colorSort'),
      contentPath: 'games/color-sort/content.json',
    },
    {
      id: 'item-sort',
      sceneKey: 'ItemSort',
      titleKey: 'hub.title.itemSort',
      tileSprite: spriteKey('shared', 'tile-item-sort'),
      atlas: 'item-sort',
      tileVoiceCue: cue('hub.tile.itemSort'),
      contentPath: 'games/item-sort/content.json',
    },
    {
      id: 'item-match',
      sceneKey: 'ItemMatch',
      titleKey: 'hub.title.itemMatch',
      tileSprite: spriteKey('shared', 'tile-item-match'),
      atlas: 'item-match',
      tileVoiceCue: cue('hub.tile.itemMatch'),
      contentPath: 'games/item-match/content.json',
    },
  ];
  ```

- [ ] **Step 4 — Run to pass.** Command: `npm test -- src/games/registry.test.ts`
  Expected output: `Test Files  1 passed (1)`, `Tests  7 passed (7)`, exit code 0.

- [ ] **Step 5 — Commit.** Command:
  `git add src/games/registry.ts src/games/registry.test.ts && git commit -m "feat: add games registry with the three v1 entries"`

---

### Task 3: Phaser game config factory (`config/gameConfig.ts`)

A factory returning a `Phaser.Types.Core.GameConfig`. It imports `phaser` (for the `Phaser.Scale`/`Phaser.AUTO` enums) so it is NOT unit-tested; it is verified via the bootstrap manual-QA checklist (Task 9). We keep the testable decisions elsewhere. This config sets WebGL preference, low-power, and wires **idle render-loop throttling** (spec §8 Android jank mitigation) by lowering FPS when the page is hidden / no input.

**Files:**
- `src/config/gameConfig.ts` (create)

- [ ] **Step 1 — Implement the config factory.** Create `src/config/gameConfig.ts`:
  ```ts
  import Phaser from 'phaser';
  import type { SceneKey } from '@/types';

  /** Active FPS while the child is playing. */
  export const ACTIVE_FPS = 60;
  /** Throttled FPS when the app is idle/backgrounded (spec §8 idle throttle). */
  export const IDLE_FPS = 10;

  /**
   * Phaser.Game config factory. WebGL (Phaser.AUTO falls back only if needed),
   * FIT scale for big tap targets on any device, parent '#app', white background.
   * Idle throttling is installed by installIdleThrottle(game) from main.ts after boot.
   */
  export function createGameConfig(
    scenes: Phaser.Types.Scenes.SceneType[],
  ): Phaser.Types.Core.GameConfig {
    return {
      type: Phaser.AUTO, // prefer WebGL (spec §8: target WebGL)
      parent: 'app',
      backgroundColor: '#FFFFFF', // APP_BG token (theme); contracts §5.1
      fps: {
        target: ACTIVE_FPS,
        min: IDLE_FPS,
        forceSetTimeOut: false,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
      },
      render: {
        antialias: true,
        powerPreference: 'low-power', // battery on Android (spec §8)
      },
      audio: {
        disableWebAudio: false, // WebAudioBackend uses it; critical voice goes native
      },
      scene: scenes,
    };
  }

  /**
   * Idle render-loop throttling (spec §8): drop to IDLE_FPS when the document is
   * hidden, restore ACTIVE_FPS when visible. Pure-ish DOM wiring; verified by QA.
   */
  export function installIdleThrottle(game: Phaser.Game): void {
    const apply = (): void => {
      const hidden =
        typeof document !== 'undefined' && document.visibilityState === 'hidden';
      game.loop.targetFps = hidden ? IDLE_FPS : ACTIVE_FPS;
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', apply);
      apply();
    }
  }

  /** Documented start scene (BootScene). Reference for main.ts + QA. */
  export const START_SCENE: SceneKey = 'Boot';

  /**
   * Max simultaneously-interactive sprites on screen (toddler-screen cap,
   * spec §8 jank mitigation; contracts §5.3). Per-game content sets MUST NOT exceed it.
   */
  export const MAX_INTERACTIVE_SPRITES = 24;

  /** PURE cap check (no phaser/DOM): true when `count` exceeds `cap`. Unit-tested. */
  export function exceedsSpriteCap(count: number, cap: number): boolean {
    return count > cap;
  }
  ```

- [ ] **Step 2 — Failing test for the pure cap-check helper.** Create `src/config/gameConfig.cap.test.ts` (tests ONLY the pure `exceedsSpriteCap`; does not exercise the phaser-importing factory):
  ```ts
  import { describe, it, expect } from 'vitest';
  import { exceedsSpriteCap, MAX_INTERACTIVE_SPRITES } from './gameConfig';

  describe('exceedsSpriteCap', () => {
    it('is false at or below the cap', () => {
      expect(exceedsSpriteCap(MAX_INTERACTIVE_SPRITES, MAX_INTERACTIVE_SPRITES)).toBe(false);
      expect(exceedsSpriteCap(0, MAX_INTERACTIVE_SPRITES)).toBe(false);
      expect(exceedsSpriteCap(MAX_INTERACTIVE_SPRITES - 1, MAX_INTERACTIVE_SPRITES)).toBe(false);
    });
    it('is true above the cap', () => {
      expect(exceedsSpriteCap(MAX_INTERACTIVE_SPRITES + 1, MAX_INTERACTIVE_SPRITES)).toBe(true);
    });
    it('pins the toddler-screen cap value at 24', () => {
      expect(MAX_INTERACTIVE_SPRITES).toBe(24);
    });
  });
  ```
  Run: `npx vitest run src/config/gameConfig.cap.test.ts` — Expected: FAILS (helper/constant not yet present).

- [ ] **Step 3 — Implement `MAX_INTERACTIVE_SPRITES` + `exceedsSpriteCap`** (the two exports added in Step 1) so the test passes.
  Run: `npx vitest run src/config/gameConfig.cap.test.ts` — Expected: PASS.

- [ ] **Step 4 — Type-check (no unit test for the factory; it imports phaser).** Command: `npx tsc --noEmit`
  Expected: 0 errors. (Full `vite build` confirmation is deferred to Task 9, after `main.ts` and `index.html` exist.)

- [ ] **Step 5 — Commit.** Command:
  `git add src/config/gameConfig.ts src/config/gameConfig.cap.test.ts && git commit -m "feat: add Phaser game config factory with idle render-loop throttle + MAX_INTERACTIVE_SPRITES cap"`

---

### Task 4: ParentalGate (Phaser wiring over pure `parentalChallenge.ts`)

`ParentalGate` is THIN wiring (contracts §3.7). The decidable logic (`generateChallenge` / `verifyChallenge`) is M1's pure `parentalChallenge.ts` and is already unit-tested. Here we add a focused contract test that pins the gate's `PARENTAL_GATE_HOLD_MS` plus its use of the pure module (deterministic via injected RNG), then implement the thin Phaser dialog. The gate plays a SPOKEN "ask a grown-up" cue, requires a hold-to-continue, then shows the multiply-two-numbers multiple choice.

**Files:**
- `src/shell/platform/ParentalGate.ts` (create)
- `src/shell/platform/parentalGateContract.test.ts` (create — regression over `parentalChallenge.ts` + `PARENTAL_GATE_HOLD_MS`; no `phaser` import)

- [ ] **Step 1 — Write the failing contract test.** Create `src/shell/platform/parentalGateContract.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    generateChallenge,
    verifyChallenge,
  } from './parentalChallenge';
  import { PARENTAL_GATE_HOLD_MS } from './ParentalGate';
  import type { AudioCueId } from '@/types';

  const VOICE = 'parental.askGrownup' as AudioCueId;

  describe('ParentalGate contract over parentalChallenge', () => {
    it('exposes the LAW default hold duration', () => {
      expect(PARENTAL_GATE_HOLD_MS).toBe(1500);
    });

    it('generates a 4-option challenge whose answer is among the options', () => {
      const seq = [0.1, 0.5, 0.2, 0.9, 0.3, 0.7];
      let i = 0;
      const rng = () => seq[i++ % seq.length];
      const c = generateChallenge(VOICE, rng);
      expect(c.options).toHaveLength(4);
      expect(c.options).toContain(c.answer);
      expect(c.answer).toBe(c.a * c.b);
      expect(c.voiceCue).toBe(VOICE);
    });

    it('passes verification only for the correct product', () => {
      const c = generateChallenge(VOICE, () => 0.42);
      expect(verifyChallenge(c, c.answer).passed).toBe(true);
      const wrong = c.options.find((o) => o !== c.answer)!;
      expect(verifyChallenge(c, wrong).passed).toBe(false);
    });

    it('returns the attempted challenge in the result for re-render', () => {
      const c = generateChallenge(VOICE, () => 0.42);
      const r = verifyChallenge(c, c.answer);
      expect(r.challenge).toEqual(c);
    });
  });
  ```

- [ ] **Step 2 — Run to see it fail.** Command: `npm test -- src/shell/platform/parentalGateContract.test.ts`
  Expected failure: import of `PARENTAL_GATE_HOLD_MS` from `./ParentalGate` fails because `ParentalGate.ts` does not exist yet ("Failed to load url ./ParentalGate"), suite errors, exit code 1.

- [ ] **Step 3 — Minimal implementation.** Create `src/shell/platform/ParentalGate.ts`:
  ```ts
  import type { AudioService } from '../audio/AudioService';
  import type { AudioCueId, ParentalChallenge } from '@/types';
  import { generateChallenge, verifyChallenge } from './parentalChallenge';
  import { Dialog } from '../ui/Dialog';
  import { Button } from '../ui/Button';
  import { MIN_HIT_AREA_PX } from '../input/DragDropController';

  export interface ParentalGateOptions {
    /** Required hold duration before the math step (ms). */
    holdMs: number;
  }

  /** LAW default hold duration. */
  export const PARENTAL_GATE_HOLD_MS = 1500;

  /** Spoken "ask a grown-up" cue for pre-literate kids (LAW cue id; in SHELL_CUES). */
  export const PARENTAL_VOICE_CUE = 'parental.askGrownup' as AudioCueId;

  /**
   * Thin Phaser wiring: hold-to-continue -> multiply-two-numbers multiple choice.
   * Resolves true ONLY on a correct answer. The decidable logic lives in
   * parentalChallenge.ts (unit-tested); this class only renders + sequences.
   */
  export class ParentalGate {
    private readonly scene: Phaser.Scene;
    private readonly audio: AudioService;
    private readonly opts: ParentalGateOptions;
    private dialog: Dialog | null = null;

    constructor(
      scene: Phaser.Scene,
      audio: AudioService,
      options?: Partial<ParentalGateOptions>,
    ) {
      this.scene = scene;
      this.audio = audio;
      this.opts = { holdMs: PARENTAL_GATE_HOLD_MS, ...options };
    }

    /** Present hold-to-continue -> math challenge. Resolves true on a correct answer. */
    present(): Promise<boolean> {
      void this.audio.play(PARENTAL_VOICE_CUE);
      return new Promise<boolean>((resolve) => {
        this.dialog = new Dialog(this.scene, { title: 'hub.parental.askGrownup' });
        this.renderHold(resolve);
      });
    }

    private renderHold(resolve: (ok: boolean) => void): void {
      const d = this.dialog!;
      d.clearBody();
      const hold = new Button(this.scene, {
        labelKey: 'hub.parental.hold',
        minSize: MIN_HIT_AREA_PX,
      });
      let timer: Phaser.Time.TimerEvent | null = null;
      hold.onHoldStart(() => {
        timer = this.scene.time.delayedCall(this.opts.holdMs, () => {
          this.renderChallenge(resolve);
        });
      });
      hold.onHoldEnd(() => {
        if (timer) {
          timer.remove(false);
          timer = null;
        }
      });
      d.addToBody(hold.gameObject);
      d.addCancel(() => {
        this.destroy();
        resolve(false);
      });
    }

    private renderChallenge(resolve: (ok: boolean) => void): void {
      const d = this.dialog!;
      d.clearBody();
      void this.audio.play(PARENTAL_VOICE_CUE);
      const challenge: ParentalChallenge = generateChallenge(PARENTAL_VOICE_CUE);
      d.setPrompt(`${challenge.a} × ${challenge.b}`);
      for (const option of challenge.options) {
        const btn = new Button(this.scene, {
          labelKey: String(option),
          minSize: MIN_HIT_AREA_PX,
        });
        btn.onTap(() => {
          const result = verifyChallenge(challenge, option);
          if (result.passed) {
            this.destroy();
            resolve(true);
          } else {
            // Wrong answer: re-render a NEW challenge (no scolding, no lockout).
            this.renderChallenge(resolve);
          }
        });
        d.addToBody(btn.gameObject);
      }
      d.addCancel(() => {
        this.destroy();
        resolve(false);
      });
    }

    destroy(): void {
      this.dialog?.destroy();
      this.dialog = null;
    }
  }
  ```

  > Note: `Dialog`/`Button` are the M1 UI primitives whose API is fixed by the "Button/Dialog API (LAW)" note in Prerequisites. These call sites match that API exactly (`new Dialog(scene, { title })`; `new Button(scene, { labelKey, minSize })`; `onTap`/`onHoldStart`/`onHoldEnd`/`gameObject`; `Dialog.clearBody`/`addToBody`/`setPrompt`/`addCancel`/`destroy`). Do NOT change the public `ParentalGate` interface or `PARENTAL_GATE_HOLD_MS`.

- [ ] **Step 4 — Run to pass.** Command: `npm test -- src/shell/platform/parentalGateContract.test.ts`
  Expected output: `Test Files  1 passed (1)`, `Tests  4 passed (4)`, exit code 0.

- [ ] **Step 5 — Type-check the wiring.** Command: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 6 — Commit.** Command:
  `git add src/shell/platform/ParentalGate.ts src/shell/platform/parentalGateContract.test.ts && git commit -m "feat: add ParentalGate Phaser wiring over pure challenge with spoken cue"`

---

### Task 5: Shell audio cue manifest (`cueManifest.ts`) + BootScene

THIN scene (manual-QA only) plus a PURE data manifest (unit-tested). BootScene loads the `shared` atlas, registers the shell's `SHELL_CUES` with `AudioService`, constructs `ProgressStore` + `AppLifecycle`, stores the services on the Phaser registry, gates first audio behind first tap, then starts `HubScene`.

**Files:**
- `src/shell/audio/cueManifest.ts` (create — PURE data)
- `src/shell/audio/cueManifest.test.ts` (create)
- `src/shell/scenes/BootScene.ts` (create)

- [ ] **Step 1 — Write the failing test for the cue manifest.** Create `src/shell/audio/cueManifest.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { SHELL_CUES } from './cueManifest';

  describe('SHELL_CUES manifest', () => {
    it('declares the spoken parental "ask a grown-up" voice cue as critical', () => {
      const c = SHELL_CUES.find((x) => (x.id as unknown as string) === 'parental.askGrownup');
      expect(c).toBeDefined();
      expect(c!.channel).toBe('voice');
      expect(c!.critical).toBe(true);
      expect(c!.loop).toBe(false);
    });

    it('declares all three hub tile voice cues (matching the registry)', () => {
      for (const id of ['hub.tile.colorSort', 'hub.tile.itemSort', 'hub.tile.itemMatch']) {
        const c = SHELL_CUES.find((x) => (x.id as unknown as string) === id);
        expect(c, id).toBeDefined();
        expect(c!.channel).toBe('voice');
      }
    });

    it('declares the appreciation cheer as a non-looping sfx', () => {
      const c = SHELL_CUES.find((x) => (x.id as unknown as string) === 'reward.cheer');
      expect(c).toBeDefined();
      expect(c!.channel).toBe('sfx');
      expect(c!.loop).toBe(false);
    });

    it('declares the music bed as a looping music cue', () => {
      const c = SHELL_CUES.find((x) => (x.id as unknown as string) === 'music.bed');
      expect(c).toBeDefined();
      expect(c!.channel).toBe('music');
      expect(c!.loop).toBe(true);
    });

    it('keeps every voice cue critical (must survive iOS WebAudio defect)', () => {
      for (const c of SHELL_CUES) {
        if (c.channel === 'voice') expect(c.critical).toBe(true);
      }
    });

    it('uses extensionless src paths under assets/audio', () => {
      for (const c of SHELL_CUES) {
        expect(c.src.startsWith('assets/audio/')).toBe(true);
        expect(/\.(m4a|ogg|mp3|wav)$/.test(c.src)).toBe(false);
      }
    });

    it('has unique cue ids', () => {
      const ids = SHELL_CUES.map((c) => c.id as unknown as string);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
  ```

- [ ] **Step 2 — Run to see it fail.** Command: `npm test -- src/shell/audio/cueManifest.test.ts`
  Expected failure: cannot resolve `./cueManifest`, suite errors, exit code 1.

- [ ] **Step 3 — Minimal implementation of the cue manifest.** Create `src/shell/audio/cueManifest.ts`:
  ```ts
  import type { AudioCue, AudioCueId } from '@/types';

  const id = (s: string): AudioCueId => s as AudioCueId;

  /**
   * Shell-level (shared/UI) audio cues, registered by BootScene.
   * Per-game intro/appreciation/label cues are declared in each game's content.json
   * and merged in by the game scene. Critical voice = native backend (iOS defect).
   * The looping music bed (music.bed) is produced + compressed in the asset pipeline (M3 / Phase 2).
   */
  export const SHELL_CUES: readonly AudioCue[] = [
    {
      id: id('parental.askGrownup'),
      channel: 'voice',
      src: 'assets/audio/parental-ask-grownup',
      loop: false,
      volume: 1,
      critical: true,
    },
    {
      id: id('hub.tile.colorSort'),
      channel: 'voice',
      src: 'assets/audio/hub-tile-color-sort',
      loop: false,
      volume: 1,
      critical: true,
    },
    {
      id: id('hub.tile.itemSort'),
      channel: 'voice',
      src: 'assets/audio/hub-tile-item-sort',
      loop: false,
      volume: 1,
      critical: true,
    },
    {
      id: id('hub.tile.itemMatch'),
      channel: 'voice',
      src: 'assets/audio/hub-tile-item-match',
      loop: false,
      volume: 1,
      critical: true,
    },
    {
      id: id('reward.snap'),
      channel: 'sfx',
      src: 'assets/audio/reward-snap',
      loop: false,
      volume: 0.9,
      critical: false,
    },
    {
      id: id('reward.cheer'),
      channel: 'sfx',
      src: 'assets/audio/reward-cheer',
      loop: false,
      volume: 1,
      critical: false,
    },
    {
      id: id('music.bed'),
      channel: 'music',
      src: 'assets/audio/music-bed',
      loop: true,
      volume: 0.35,
      critical: false,
    },
  ];
  ```

- [ ] **Step 4 — Run to pass.** Command: `npm test -- src/shell/audio/cueManifest.test.ts`
  Expected output: `Test Files  1 passed (1)`, `Tests  7 passed (7)`, exit code 0.

- [ ] **Step 5 — Implement BootScene (thin; manual-QA only).** Create `src/shell/scenes/BootScene.ts`:
  ```ts
  import Phaser from 'phaser';
  import type { SceneKey } from '@/types';
  import { AudioService } from '../audio/AudioService';
  import { NativeAudioBackend } from '../audio/NativeAudioBackend';
  import { WebAudioBackend } from '../audio/WebAudioBackend';
  import { AppLifecycle } from '../platform/AppLifecycle';
  import { ProgressStore } from '../storage/ProgressStore';
  import { SHELL_CUES } from '../audio/cueManifest';
  import { Capacitor } from '@capacitor/core';
  import { Preferences } from '@capacitor/preferences';

  /** Registry keys other scenes read services from (THIN coupling). */
  export const SVC = {
    audio: 'svc.audio',
    progress: 'svc.progress',
    lifecycle: 'svc.lifecycle',
  } as const;

  /** localStorage adapter implementing KeyValueStore for the web build. */
  class LocalStorageStore {
    async get(key: string): Promise<string | null> {
      return globalThis.localStorage.getItem(key);
    }
    async set(key: string, value: string): Promise<void> {
      globalThis.localStorage.setItem(key, value);
    }
  }

  /** Capacitor Preferences adapter implementing KeyValueStore for device builds. */
  class PreferencesStore {
    async get(key: string): Promise<string | null> {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    }
    async set(key: string, value: string): Promise<void> {
      await Preferences.set({ key, value });
    }
  }

  export class BootScene extends Phaser.Scene {
    constructor() {
      super({ key: 'Boot' satisfies SceneKey });
    }

    preload(): void {
      // Frame names in shared.json equal the full SpriteKey ("shared/<frame>") per LAW.
      this.load.atlas(
        'shared',
        'assets/atlases/shared.png',
        'assets/atlases/shared.json',
      );
    }

    async create(): Promise<void> {
      const isNative = Capacitor.isNativePlatform();

      const webBackend = new WebAudioBackend(this.sound);
      const audio = new AudioService({
        voiceBackend: isNative ? new NativeAudioBackend() : webBackend,
        ambientBackend: webBackend,
      });
      await audio.registerCues([...SHELL_CUES]);

      const progress = new ProgressStore(
        isNative ? new PreferencesStore() : new LocalStorageStore(),
      );
      const snapshot = await progress.load();
      audio.setMuted(snapshot.audio.muted);
      audio.setMasterVolume(snapshot.audio.volume);

      const lifecycle = new AppLifecycle(audio);
      lifecycle.start();

      this.registry.set(SVC.audio, audio);
      this.registry.set(SVC.progress, progress);
      this.registry.set(SVC.lifecycle, lifecycle);

      // Gate first audio behind the first tap (spec §8: iOS unlock on gesture).
      this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
        void audio.unlock();
      });

      this.scene.start('Hub' satisfies SceneKey);
    }
  }
  ```

- [ ] **Step 6 — Type-check.** Command: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 7 — Commit.** Command:
  `git add src/shell/audio/cueManifest.ts src/shell/audio/cueManifest.test.ts src/shell/scenes/BootScene.ts && git commit -m "feat: add BootScene + shell audio cue manifest with native voice routing"`

---

### Task 6: HubScene (tiles driven by registry; layout via pure `hubLayout.ts`)

THIN scene (manual-QA only). It reads `GAMES`, computes positions with the M1 pure `computeTileLayout`, draws one big tap-target tile per game (tile sprite + spoken `tileVoiceCue` on focus/launch), launches the game scene on tap, and shows a small gear that opens `SettingsScene` ONLY after the parental gate passes. The HubScene implementation and its regression test are committed TOGETHER. Per the frame-key LAW, tiles pass the FULL `SpriteKey` as the frame argument (no prefix stripping).

**Files:**
- `src/shell/scenes/HubScene.ts` (create)
- `src/shell/scenes/hubScene.layout.test.ts` (create — regression over `computeTileLayout` + `GAMES`; green-on-first-run expected; no `phaser`)

- [ ] **Step 1 — Write the layout-wiring regression test (green-on-first-run expected).** Create `src/shell/scenes/hubScene.layout.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { computeTileLayout } from '../ui/hubLayout';
  import { GAMES } from '@/games/registry';
  import { MIN_HIT_AREA_PX } from '../input/DragDropController';

  describe('HubScene tile layout wiring', () => {
    it('produces one rect per registered game', () => {
      const rects = computeTileLayout(GAMES.length, 1280, 720, { minTile: MIN_HIT_AREA_PX });
      expect(rects).toHaveLength(GAMES.length);
    });

    it('keeps every tile inside the canvas bounds', () => {
      const W = 1280;
      const H = 720;
      const rects = computeTileLayout(GAMES.length, W, H, { minTile: MIN_HIT_AREA_PX });
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(W);
        expect(r.y + r.h).toBeLessThanOrEqual(H);
      }
    });

    it('gives toddler-sized tiles (>= MIN_HIT_AREA_PX) for the three-game catalog', () => {
      const rects = computeTileLayout(GAMES.length, 1280, 720, { minTile: MIN_HIT_AREA_PX });
      for (const r of rects) {
        expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(MIN_HIT_AREA_PX);
      }
    });
  });
  ```

  > This is a regression test over already-built pure modules (`computeTileLayout` from M1, `GAMES` from Task 2). Green-on-first-run is EXPECTED and acceptable (the red-first discipline is satisfied by Tasks 1, 2, 4, 5). Do not fabricate a failure. If a tile falls out of bounds or under `MIN_HIT_AREA_PX`, that is a real M1 `hubLayout` bug — fix `hubLayout.ts` in M1 and re-run.

- [ ] **Step 2 — Implement HubScene (thin; manual-QA only).** Create `src/shell/scenes/HubScene.ts`:
  ```ts
  import Phaser from 'phaser';
  import type { SceneKey, GameDef } from '@/types';
  import { GAMES } from '@/games/registry';
  import { computeTileLayout } from '../ui/hubLayout';
  import { AudioService } from '../audio/AudioService';
  import { ParentalGate } from '../platform/ParentalGate';
  import { Button } from '../ui/Button';
  import { MIN_HIT_AREA_PX } from '../input/DragDropController';
  import { SVC } from './BootScene';

  export class HubScene extends Phaser.Scene {
    private audio!: AudioService;

    constructor() {
      super({ key: 'Hub' satisfies SceneKey });
    }

    create(): void {
      this.audio = this.registry.get(SVC.audio) as AudioService;

      const { width, height } = this.scale;
      const rects = computeTileLayout(GAMES.length, width, height, {
        minTile: MIN_HIT_AREA_PX,
      });

      GAMES.forEach((game: GameDef, i: number) => {
        const r = rects[i];
        // Frame name EQUALS the full SpriteKey ("shared/<frame>") — do NOT strip (LAW).
        const tile = this.add
          .image(r.x + r.w / 2, r.y + r.h / 2, 'shared', game.tileSprite as unknown as string)
          .setDisplaySize(r.w, r.h)
          .setInteractive({ useHandCursor: true });

        tile.on(Phaser.Input.Events.POINTER_OVER, () => {
          void this.audio.play(game.tileVoiceCue);
        });
        tile.on(Phaser.Input.Events.POINTER_DOWN, () => {
          void this.audio.play(game.tileVoiceCue);
          this.scene.start(game.sceneKey);
        });
      });

      this.buildSettingsGate();
    }

    /** Small gear in a corner; opens Settings ONLY after the parental gate passes. */
    private buildSettingsGate(): void {
      const gear = new Button(this, {
        labelKey: 'hub.settings.gear',
        minSize: MIN_HIT_AREA_PX,
      });
      gear.setPosition(this.scale.width - MIN_HIT_AREA_PX, MIN_HIT_AREA_PX);
      gear.onTap(async () => {
        const gate = new ParentalGate(this, this.audio);
        const passed = await gate.present();
        if (passed) this.scene.start('Settings' satisfies SceneKey);
      });
    }
  }
  ```

- [ ] **Step 3 — Run the regression test + type-check.** Commands:
  `npm test -- src/shell/scenes/hubScene.layout.test.ts` → expect `Tests  3 passed (3)`, exit 0.
  `npx tsc --noEmit` → expect 0 errors.

- [ ] **Step 4 — Commit HubScene and its regression test together.** Command:
  `git add src/shell/scenes/HubScene.ts src/shell/scenes/hubScene.layout.test.ts && git commit -m "feat: add HubScene tiles from registry with gated settings gear"`

---

### Task 7: SettingsScene (audio on/off + volume; behind ParentalGate)

THIN scene (manual-QA only). It is only ever started by `HubScene` AFTER `ParentalGate.present()` resolved `true`, so Settings itself does not re-gate; it provides mute toggle + volume steps, applies them live to `AudioService`, persists them through `ProgressStore`, exposes a privacy surface (text wired in M4), and returns to the Hub. The SettingsScene implementation and its regression test are committed TOGETHER.

**Files:**
- `src/shell/scenes/SettingsScene.ts` (create)
- `src/shell/scenes/settingsPersistence.test.ts` (create — regression over `progressSerde`; green-on-first-run expected; no `phaser`)

- [ ] **Step 1 — Write the persistence regression test (green-on-first-run expected).** Create `src/shell/scenes/settingsPersistence.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    defaultSnapshot,
    serialize,
    deserialize,
  } from '../storage/progressSerde';

  describe('Settings audio persistence contract', () => {
    it('round-trips a muted=true, volume=0.4 audio setting', () => {
      const snap = defaultSnapshot();
      snap.audio.muted = true;
      snap.audio.volume = 0.4;
      const restored = deserialize(serialize(snap));
      expect(restored.audio.muted).toBe(true);
      expect(restored.audio.volume).toBeCloseTo(0.4);
    });

    it('defaults to unmuted with a sane master volume in (0,1]', () => {
      const snap = defaultSnapshot();
      expect(snap.audio.muted).toBe(false);
      expect(snap.audio.volume).toBeGreaterThan(0);
      expect(snap.audio.volume).toBeLessThanOrEqual(1);
    });

    it('clamps a malformed restore back to a valid snapshot (never throws)', () => {
      const restored = deserialize('{ not valid json');
      expect(restored.version).toBe(1);
      expect(typeof restored.audio.muted).toBe('boolean');
    });
  });
  ```

  > Regression test over already-built M1 `progressSerde`. Green-on-first-run is EXPECTED and acceptable. If the second assertion goes red because `defaultSnapshot()` returns `audio.volume = 0`, that violates the M1 LAW (`defaultSnapshot` volume in (0,1], value `0.8`) — fix M1 `progressSerde.defaultSnapshot` and re-run.

- [ ] **Step 2 — Implement SettingsScene (thin; manual-QA only).** Create `src/shell/scenes/SettingsScene.ts`:
  ```ts
  import Phaser from 'phaser';
  import type { SceneKey, ProgressSnapshot } from '@/types';
  import { AudioService } from '../audio/AudioService';
  import { ProgressStore } from '../storage/ProgressStore';
  import { Button } from '../ui/Button';
  import { Dialog } from '../ui/Dialog';
  import { MIN_HIT_AREA_PX } from '../input/DragDropController';
  import { SVC } from './BootScene';

  export class SettingsScene extends Phaser.Scene {
    private audio!: AudioService;
    private progress!: ProgressStore;
    private snapshot!: ProgressSnapshot;

    constructor() {
      super({ key: 'Settings' satisfies SceneKey });
    }

    async create(): Promise<void> {
      // Reached ONLY via HubScene after ParentalGate passed (spec §7).
      this.audio = this.registry.get(SVC.audio) as AudioService;
      this.progress = this.registry.get(SVC.progress) as ProgressStore;
      this.snapshot = await this.progress.load();

      this.buildMuteToggle();
      this.buildVolumeSteps();
      this.buildPrivacyLink();
      this.buildBackButton();
    }

    private buildMuteToggle(): void {
      const toggle = new Button(this, {
        labelKey: this.snapshot.audio.muted ? 'settings.unmute' : 'settings.mute',
        minSize: MIN_HIT_AREA_PX,
      });
      toggle.setPosition(this.scale.width / 2, 200);
      toggle.onTap(async () => {
        this.snapshot.audio.muted = !this.snapshot.audio.muted;
        this.audio.setMuted(this.snapshot.audio.muted);
        toggle.setLabel(this.snapshot.audio.muted ? 'settings.unmute' : 'settings.mute');
        await this.persist();
      });
    }

    private buildVolumeSteps(): void {
      // Five discrete big-tap steps (0..1) instead of a fiddly slider for adults.
      const steps = [0, 0.25, 0.5, 0.75, 1];
      steps.forEach((v, i) => {
        const btn = new Button(this, { labelKey: `settings.vol.${i}`, minSize: MIN_HIT_AREA_PX });
        btn.setPosition(200 + i * (MIN_HIT_AREA_PX + 20), 360);
        btn.onTap(async () => {
          this.snapshot.audio.volume = v;
          this.audio.setMasterVolume(v);
          await this.persist();
        });
      });
    }

    private buildPrivacyLink(): void {
      // Privacy surface reachable ONLY behind the gate (spec §7). Inert overlay here;
      // the real privacy text from docs/privacy-policy.md is wired in M4 (compliance).
      const link = new Button(this, { labelKey: 'settings.privacy', minSize: MIN_HIT_AREA_PX });
      link.setPosition(this.scale.width / 2, 500);
      link.onTap(() => {
        // Inert placeholder overlay — does NOT launch any scene (no recursion).
        const overlay = new Dialog(this, { title: 'settings.privacy.title' });
        overlay.setPrompt('settings.privacy.placeholder'); // replaced with real copy in M4
        overlay.addCancel(() => overlay.destroy());
      });
    }

    private buildBackButton(): void {
      const back = new Button(this, { labelKey: 'settings.back', minSize: MIN_HIT_AREA_PX });
      back.setPosition(MIN_HIT_AREA_PX, MIN_HIT_AREA_PX);
      back.onTap(() => this.scene.start('Hub' satisfies SceneKey));
    }

    private async persist(): Promise<void> {
      await this.progress.save(this.snapshot);
    }
  }
  ```

  > Note: `buildPrivacyLink` opens an INERT `Dialog` overlay with placeholder copy — it does NOT call `scene.launch` (no recursive scene launch). M4 (compliance) replaces the placeholder `setPrompt('settings.privacy.placeholder')` with the real text sourced from `docs/privacy-policy.md`; this is tracked as an explicit M4 task (see Cross-reference index).

- [ ] **Step 3 — Type-check + run the persistence regression test.** Commands:
  `npx tsc --noEmit` → 0 errors.
  `npm test -- src/shell/scenes/settingsPersistence.test.ts` → `Tests  3 passed (3)`, exit 0.

- [ ] **Step 4 — Commit SettingsScene and its regression test together.** Command:
  `git add src/shell/scenes/SettingsScene.ts src/shell/scenes/settingsPersistence.test.ts && git commit -m "feat: add SettingsScene (mute/volume) persisted via ProgressStore"`

---

### Task 8: BaseGameScene (abstract; §3.8 hook set; `onSetComplete` single entry point)

Abstract scene (manual-QA only) exposing EXACTLY the Shared Contracts §3.8 hooks. `onSetComplete()` is the SINGLE completion entry point that M4 game subclasses call directly when they detect their set is complete. `onSetComplete()` internally drives the pure `gameLoop` reducer for sequencing + `cyclesCompleted`, plays the appreciation `RewardFx`, persists `shuffleSeed`/`cyclesCompleted` via `ProgressStore`, advances the seed deterministically, then calls `reshuffle(seed)` then `buildLayout()` exactly once. Seed continuity is read from `ProgressStore.load()` in `create()` so a relaunch resumes the prior arrangement. NO scoring/levels — `cyclesCompleted` is continuity only and is never rendered.

**Files:**
- `src/shell/scenes/BaseGameScene.ts` (create)

- [ ] **Step 1 — Implement BaseGameScene (abstract; §3.8 hooks; onSetComplete drives gameLoop internally).** Create `src/shell/scenes/BaseGameScene.ts`:
  ```ts
  import Phaser from 'phaser';
  import type { ContentConfig, GameId, GameProgress, AudioCueId } from '@/types';
  import { AudioService } from '../audio/AudioService';
  import { DragDropController } from '../input/DragDropController';
  import { RewardFx } from '../rewards/RewardFx';
  import { ProgressStore } from '../storage/ProgressStore';
  import { MAX_INTERACTIVE_SPRITES, exceedsSpriteCap } from '@/config/gameConfig';
  import {
    initialGameLoop,
    reduceGameLoop,
    type GameLoopState,
  } from './gameLoop';
  import { SVC } from './BootScene';

  export abstract class BaseGameScene extends Phaser.Scene {
    protected audio!: AudioService;
    protected drag!: DragDropController; // M1: constructor(scene, events); supports setEvents(events)
    protected rewards!: RewardFx;        // M1: constructor(scene, audio); play(req); destroy()
    protected progress!: ProgressStore;
    protected content!: ContentConfig;

    /** INTERNAL phase/cycle bookkeeping — never exposed to subclasses. */
    private loop: GameLoopState = initialGameLoop();
    /** Base OWNS the seed. Read from ProgressStore for relaunch continuity. */
    private currentSeed = 0;

    /** Phaser lifecycle: subclass overrides to load its atlas + content.json, then calls super.preload(). */
    preload(): void {
      this.audio = this.registry.get(SVC.audio) as AudioService;
      this.progress = this.registry.get(SVC.progress) as ProgressStore;
    }

    /**
     * Phaser lifecycle: build services, read persisted shuffle seed (relaunch continuity),
     * reshuffle(data only) then buildLayout() exactly once, then play introCue.
     */
    async create(): Promise<void> {
      this.content = this.loadContent();
      this.rewards = new RewardFx(this, this.audio);
      // DragDropController is constructed by the subclass in buildLayout via this.drag,
      // OR constructed here with empty events and configured via setEvents in buildLayout.
      this.drag = new DragDropController(this, {});

      // Relaunch continuity: resume the prior arrangement if persisted (contracts §2.6).
      const snapshot = await this.progress.load();
      const saved = snapshot.games[this.content.gameId as GameId];
      this.currentSeed =
        saved?.shuffleSeed ?? Math.floor(Math.random() * 2 ** 31); // Math.random ONLY as first-run fallback

      this.reshuffle(this.currentSeed); // data only; NEVER calls buildLayout (LAW)
      this.buildLayout();               // Base calls buildLayout exactly once after reshuffle
      this.assertSpriteCap();           // dev-time §8 jank guard (contracts §5.3)

      this.loop = reduceGameLoop(this.loop, { type: 'start' });
      void this.audio.play(this.content.introCue);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    }

    // --- Abstract hooks each game implements (THIN wiring over pure modules) ---

    /** Return the validated content for this scene (subclass supplies its typed cast). */
    protected abstract loadContent(): ContentConfig;

    /**
     * Build draggables, bins/grid, and register them with this.drag (via this.drag.setEvents + add*).
     * Build from the CURRENT (already-reshuffled) content/card state. MUST be idempotent-safe:
     * remove prior display objects at the top. MUST NOT call reshuffle.
     */
    protected abstract buildLayout(): void;

    /**
     * Mutate content/card DATA for the given seed ONLY. MUST NOT call buildLayout (LAW).
     * Base always calls buildLayout() itself immediately after reshuffle().
     */
    protected abstract reshuffle(seed: number): void;

    // --- Concrete shared completion entry point (SINGLE; §3.8) ---

    /**
     * SINGLE completion entry point. M4 subclasses call this directly when their set is complete.
     * Appreciation reward -> persist continuity -> advance seed -> reshuffle(data) -> buildLayout().
     * NO score UI. Internally sequences via the pure gameLoop reducer.
     */
    protected async onSetComplete(): Promise<void> {
      // Guard: only act once per completed set.
      this.loop = reduceGameLoop(this.loop, { type: 'set-resolved', complete: true });
      if (this.loop.phase !== 'completing') return;

      this.loop = reduceGameLoop(this.loop, { type: 'reward-start' }); // increments cyclesCompleted
      await this.rewards.play({
        kind: 'appreciation',
        x: this.scale.width / 2,
        y: this.scale.height / 2,
        cue: this.content.appreciationCue,
      });

      const patch: Partial<GameProgress> = {
        gameId: this.content.gameId as GameId,
        shuffleSeed: this.currentSeed,
        cyclesCompleted: this.loop.cyclesCompleted,
      };
      await this.progress.patchGame(this.content.gameId as GameId, patch);

      this.loop = reduceGameLoop(this.loop, { type: 'reward-done' });
      // Deterministic LCG advance so the persisted seed resumes the SAME next arrangement.
      this.currentSeed = (this.currentSeed * 1103515245 + 12345) & 0x7fffffff;
      await this.progress.patchGame(this.content.gameId as GameId, { shuffleSeed: this.currentSeed });

      this.reshuffle(this.currentSeed); // data only (LAW)
      this.buildLayout();               // Base calls buildLayout exactly once after reshuffle
      this.assertSpriteCap();           // dev-time §8 jank guard (contracts §5.3)
      this.loop = reduceGameLoop(this.loop, { type: 'reshuffled' });
    }

    /** Count the active interactive (draggable/tappable) display objects on screen. */
    protected interactiveCount(): number {
      return this.children.list.filter(
        (o) => (o as Phaser.GameObjects.GameObject).input?.enabled,
      ).length;
    }

    /** Dev-time guard: warn (never throw in prod) if interactive sprites exceed the cap (§8, contracts §5.3). */
    private assertSpriteCap(): void {
      if (import.meta.env.DEV && exceedsSpriteCap(this.interactiveCount(), MAX_INTERACTIVE_SPRITES)) {
        console.warn(
          `[BaseGameScene] interactive sprite count ${this.interactiveCount()} exceeds MAX_INTERACTIVE_SPRITES (${MAX_INTERACTIVE_SPRITES}) — spec §8 jank cap`,
        );
      }
    }

    /** Small positive confirm on a correct drop (no score). Subclasses may call. */
    protected playSnap(): void {
      void this.audio.play('reward.snap' as AudioCueId);
    }

    /** Standard teardown: stop audio-bound controllers, destroy. */
    shutdown(): void {
      this.drag?.destroy();
      this.rewards?.destroy();
    }
  }
  ```

  > Notes:
  > (1) **Single completion entry point.** `onSetComplete()` is what M4 subclasses call (matching §3.8). There is no `reportItemResolved`. The pure `gameLoop` reducer is internal sequencing only; M4 never imports it. The `set-resolved`+`completing` guard at the top makes a double-call from a subclass idempotent (the second call short-circuits).
  > (2) **Seed + layout LAW.** Base reads the persisted `shuffleSeed` in `create()` (relaunch continuity, contracts §2.6); `reshuffle(seed)` mutates DATA only and NEVER calls `buildLayout`; Base calls `buildLayout()` exactly once after each `reshuffle()`. M4's three scenes MUST conform (their `reshuffle` must not call `buildLayout`; no private `currentSeed()` constant).
  > (3) **M1 signatures (concrete).** `RewardFx`: `constructor(scene, audio)`, `play(req): Promise<void>`, `destroy()`. `DragDropController`: `constructor(scene, events)` plus `setEvents(events)`; M4 subclasses call `this.drag.setEvents({...})` in `buildLayout`. `ProgressStore.patchGame(gameId, patch)` and `load()` per contracts §3.5. These are fixed by Prerequisites; do not change them.
  > (4) **The cue cast** uses `as AudioCueId` directly (not `as never`).
  > (5) **Sprite cap guard (§8, contracts §5.3).** After each `buildLayout()`, Base calls `assertSpriteCap()`, which in `import.meta.env.DEV` only emits a `console.warn` when `exceedsSpriteCap(interactiveCount(), MAX_INTERACTIVE_SPRITES)`. It NEVER throws in production. The cap check is the pure `exceedsSpriteCap` helper (unit-tested in Task 3); per-game content sets are bounded by M4 content tests.

- [ ] **Step 2 — Type-check.** Command: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 3 — Re-run the gameLoop unit suite (the logic this scene wires) to confirm still green.** Command: `npm test -- src/shell/scenes/gameLoop.test.ts`
  Expected: `Tests  9 passed (9)`, exit 0.

- [ ] **Step 4 — Commit.** Command:
  `git add src/shell/scenes/BaseGameScene.ts && git commit -m "feat: add abstract BaseGameScene with onSetComplete as single completion entry point"`

---

### Task 9: Bootstrap (`main.ts`) + PWA SW registration stub

THIN bootstrap (manual-QA only). `main.ts` constructs the `Phaser.Game` via `createGameConfig` with the ordered scene list (Boot first), installs idle throttling, and calls the guarded PWA SW registration stub. The stub registers ONLY a locally bundled `sw.js` (no remote URL — honors "zero networking code / no server.url"); it is a no-op on native and when no SW file exists. M2 registers Boot/Hub/Settings now; the three game scene classes are appended in M3 at the documented insertion point. `vite-plugin-pwa` is already configured in M0/M1, so `vite build` emits `sw.js` + `manifest.webmanifest`.

**Files:**
- `src/main.pwa.ts` (create)
- `src/main.ts` (create)
- `src/main.pwa.test.ts` (create — pure: asserts the stub never references a remote URL; no `phaser`)

- [ ] **Step 1 — Write the failing PWA-stub test.** Create `src/main.pwa.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { SW_URL, shouldRegisterServiceWorker } from './main.pwa';

  describe('PWA service-worker registration stub', () => {
    it('targets a local, relative service worker (never a remote URL)', () => {
      expect(SW_URL).toBe('./sw.js');
      expect(SW_URL.startsWith('http')).toBe(false);
      expect(SW_URL.includes('//')).toBe(false);
    });

    it('does NOT register when serviceWorker is unavailable', () => {
      expect(shouldRegisterServiceWorker(undefined, false)).toBe(false);
    });

    it('does NOT register on a native Capacitor platform', () => {
      expect(shouldRegisterServiceWorker({} as ServiceWorkerContainer, true)).toBe(false);
    });

    it('registers only on web when serviceWorker exists', () => {
      expect(shouldRegisterServiceWorker({} as ServiceWorkerContainer, false)).toBe(true);
    });
  });
  ```

- [ ] **Step 2 — Run to see it fail.** Command: `npm test -- src/main.pwa.test.ts`
  Expected failure: cannot resolve `./main.pwa`, suite errors, exit code 1.

- [ ] **Step 3 — Implement the PWA stub.** Create `src/main.pwa.ts`:
  ```ts
  /**
   * Guarded PWA service-worker registration stub for the LATER bonus web build.
   * Registers ONLY the locally bundled, relative sw.js — never a remote URL.
   * No-op on native (Capacitor) and when serviceWorker is unavailable.
   * This file contains the ONLY navigator.serviceWorker reference in the app.
   */
  export const SW_URL = './sw.js';

  /** Pure decision: should we register the SW? (web only, SW API present). */
  export function shouldRegisterServiceWorker(
    container: ServiceWorkerContainer | undefined,
    isNative: boolean,
  ): boolean {
    return !isNative && container !== undefined;
  }

  /** Effectful registration; safe to call on any platform. */
  export async function registerServiceWorker(isNative: boolean): Promise<void> {
    const container =
      typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (!shouldRegisterServiceWorker(container, isNative)) return;
    try {
      await container!.register(SW_URL);
    } catch {
      // Offline-first app: SW registration failure is non-fatal and never reported.
    }
  }
  ```

- [ ] **Step 4 — Run to pass.** Command: `npm test -- src/main.pwa.test.ts`
  Expected output: `Test Files  1 passed (1)`, `Tests  4 passed (4)`, exit code 0.

- [ ] **Step 5 — Implement the bootstrap.** Create `src/main.ts`:
  ```ts
  import Phaser from 'phaser';
  import { Capacitor } from '@capacitor/core';
  import { createGameConfig, installIdleThrottle } from './config/gameConfig';
  import { BootScene } from './shell/scenes/BootScene';
  import { HubScene } from './shell/scenes/HubScene';
  import { SettingsScene } from './shell/scenes/SettingsScene';
  import { registerServiceWorker } from './main.pwa';

  /**
   * Scene registration order. Boot MUST be first (Phaser auto-starts scene[0]).
   * M3 INSERTION POINT: append ColorSortScene, ItemSortScene, ItemMatchScene here.
   */
  const SCENES: Phaser.Types.Scenes.SceneType[] = [
    BootScene,
    HubScene,
    SettingsScene,
  ];

  const game = new Phaser.Game(createGameConfig(SCENES));
  installIdleThrottle(game); // spec §8 Android idle render-loop throttle

  void registerServiceWorker(Capacitor.isNativePlatform());
  ```

- [ ] **Step 6 — Type-check + full build.** Commands:
  `npx tsc --noEmit` → expect 0 errors.
  `npm run build` → expect `tsc --noEmit` clean then `vite build` to emit `dist/` (including `index.html`, the Phaser bundle, `manifest.webmanifest`, and `sw.js` from the already-configured `vite-plugin-pwa`). Exit code 0.

  > If `vite build` fails because `index.html` does not load `/src/main.ts`, add `<script type="module" src="/src/main.ts"></script>` inside `<body>` of `index.html` (the single root with `<div id="app"></div>`), then re-run.

- [ ] **Step 7 — Commit.** Command:
  `git add src/main.pwa.ts src/main.pwa.test.ts src/main.ts && git commit -m "feat: add Phaser bootstrap with idle throttle and guarded local-only PWA SW registration"`

---

### Task 10: Manual-QA checklist — Hub & Settings

Documented manual QA (no unit tests). Concrete steps + expected results for the device/visual/interaction behavior the scenes own.

**Files:**
- `qa/checklists/hub-and-settings.md` (create)

- [ ] **Step 1 — Write the checklist.** Create `qa/checklists/hub-and-settings.md` with this exact content:
  ```md
  # Manual QA — Hub & Settings

  Prereqs: `npm run build && npx cap sync && npx cap run ios` (or `... run android`) on a CURRENT device (spec §10). Audio is unlocked by the first tap (BootScene).

  ## Hub navigation
  1. Launch the app from cold start.
     - Expected: native splash, then the Hub appears within ~2s with exactly THREE tiles (color sort, item sort, item match), each a large square tile (each tile's shorter edge >= 88px on screen).
  2. Tap once anywhere on the Hub (first gesture).
     - Expected: audio unlocks; no error; subsequent tile taps speak a voice cue.
  3. Hover/focus (or tap-and-hold without releasing) tile 1.
     - Expected: the tile's voice cue plays ("color sort" prompt).
  4. Tap tile 1 (color sort).
     - Expected: voice cue plays AND the ColorSort game scene starts (when M3 is present; in M2 the scene key is registered — confirm no crash and the scene transition is attempted).
  5. From a running game, trigger the in-game "home" affordance (M3) to return.
     - Expected: returns to Hub with all three tiles intact; music bed continues uninterrupted.
  6. Tap each of the three tiles in turn.
     - Expected: each launches its corresponding scene; no tile launches the wrong scene; no duplicate voice cues stack/overlap harshly.

  ## Settings gate (gear)
  7. Locate the small gear in the top-right corner.
     - Expected: gear hit area >= 88px; it does NOT open Settings directly.
  8. Tap the gear.
     - Expected: the Parental Gate appears (see parental-gate.md). Settings does NOT open until the gate passes.
  9. Pass the gate (hold + correct answer).
     - Expected: SettingsScene opens.
  10. Cancel the gate.
     - Expected: returns to Hub; Settings never opened.

  ## Settings behavior
  11. In Settings, tap the mute toggle.
     - Expected: label flips between "mute"/"unmute"; ALL audio (voice + sfx + music) goes silent when muted; resumes when unmuted.
  12. Tap each of the five volume steps (0, 25, 50, 75, 100%).
     - Expected: master volume changes audibly and immediately for the next cue; 0% is silent; 100% is loudest.
  13. Set mute ON, volume 25%, tap Back, re-open Settings via the gate.
     - Expected: mute still ON and volume still 25% (persisted via ProgressStore).
  14. Force-quit and relaunch the app, re-open Settings via the gate.
     - Expected: the mute + volume settings from step 13 are still applied (survives restart).
  15. Confirm there is NO score, level, progress bar, streak, or timer anywhere on Hub or Settings.
     - Expected: none present (spec §10: no levels/scoring; §7: no manipulative engagement).
  16. In Settings, tap the privacy link.
     - Expected: an inert in-app privacy overlay opens (placeholder copy in M2; real "we collect no data" text wired in M4). It does NOT relaunch Settings or navigate away. Cancel closes the overlay back to Settings. The privacy surface is reachable ONLY via Settings behind the gate.
  ```

- [ ] **Step 2 — Commit.** Command:
  `git add qa/checklists/hub-and-settings.md && git commit -m "docs: add hub and settings manual QA checklist"`

---

### Task 11: Manual-QA checklist — Parental Gate

Documented manual QA (no unit tests) for the gate's interaction/behavior. The challenge gen/verify is already unit-tested (Task 4 + M1).

**Files:**
- `qa/checklists/parental-gate.md` (create)

- [ ] **Step 1 — Write the checklist.** Create `qa/checklists/parental-gate.md` with this exact content:
  ```md
  # Manual QA — Parental Gate

  Prereqs: app running on a CURRENT device; audio unlocked (tap once on Hub first). The gate guards EVERY adult-facing surface (spec §7): Settings, privacy link, and any future store link.

  ## Spoken cue (pre-literate kids)
  1. Trigger the gate (tap the Settings gear).
     - Expected: a SPOKEN "ask a grown-up" voice cue plays immediately on open. It routes through the NATIVE audio backend on device (critical voice), so it must play even after the iOS audio-defect sequence (see phase0-ios-audio.md).
  2. Mute audio via the in-app mute toggle, then re-trigger the gate.
     - Expected: the gate still works without audio (visual hold + math); the spoken cue is the primary affordance for non-readers but is not required to operate the gate.

  ## Hold-to-continue
  3. Tap the hold button briefly (< 1.5s) and release.
     - Expected: the math challenge does NOT appear; nothing advances (PARENTAL_GATE_HOLD_MS = 1500ms must elapse while held).
  4. Press and HOLD the hold button continuously for >= 1.5s.
     - Expected: after ~1.5s the multiply-two-numbers challenge appears.
  5. Begin holding, then release before 1.5s, then start over.
     - Expected: the timer resets on release; only a continuous >=1.5s hold advances.

  ## Multiply-two-numbers challenge
  6. Read the prompt (e.g. "7 × 8").
     - Expected: both operands are in 2..9 (no 0 or 1); four answer options shown; one is correct.
  7. Tap a WRONG option.
     - Expected: gate does NOT pass; a NEW challenge is shown (no scolding text, no lockout, no timer pressure — spec §7 no guilt/urgency).
  8. Tap the CORRECT option.
     - Expected: gate passes; the guarded surface (Settings) opens.
  9. Cancel the gate at the hold step and again at the math step.
     - Expected: each cancel returns to the Hub; the guarded surface never opens.
  10. Pass the gate, return to Hub, trigger the gate again.
     - Expected: a freshly generated challenge appears (operands/options differ across attempts, not memorizable by a child).

  ## Reachability / coverage
  11. Confirm the gate is the ONLY route to Settings and to the privacy link.
     - Expected: there is no un-gated path to any adult surface.
  ```

- [ ] **Step 2 — Commit.** Command:
  `git add qa/checklists/parental-gate.md && git commit -m "docs: add parental gate manual QA checklist"`

---

### Task 12: Milestone verification — full suite + build + lint + zero-networking proof

Final gate for M2. Confirms all pure logic is green, the bundle builds, lint is clean, no Phaser leaked into pure modules, the SW reference is confined to `main.pwa.ts`, and the M1 compliance assertions still hold (no networking introduced by M2).

**Files:** none (verification only)

- [ ] **Step 1 — Run the full unit suite.** Command: `npm test`
  Expected: all M1 + M2 test files pass. M2 added suites: `gameLoop.test.ts` (9), `registry.test.ts` (7), `parentalGateContract.test.ts` (4), `cueManifest.test.ts` (7), `hubScene.layout.test.ts` (3), `settingsPersistence.test.ts` (3), `main.pwa.test.ts` (4). Expected `Test Files` count >= M1 count + 7, all passed, exit code 0.

- [ ] **Step 2 — Confirm no Phaser import leaked into a pure module.** Command:
  `grep -rln "from 'phaser'" src/shell/scenes/gameLoop.ts src/games/registry.ts src/shell/audio/cueManifest.ts src/main.pwa.ts; test $? -ne 0 && echo "OK: no phaser in pure modules"`
  Expected output: `OK: no phaser in pure modules` (grep finds nothing in those files).

- [ ] **Step 3 — Confirm the ONLY service-worker reference lives in `main.pwa.ts`.** Command:
  `grep -rln "serviceWorker" src | sort`
  Expected output: exactly `src/main.pwa.ts` (no other file references `serviceWorker`; honors zero-networking discipline — SW is the local-only PWA bonus).

- [ ] **Step 4 — Confirm BaseGameScene exposes only the §3.8 hook set (no reportItemResolved).** Command:
  `grep -rn "reportItemResolved" src; test $? -ne 0 && echo "OK: no reportItemResolved (onSetComplete is the single entry point)"`
  Expected output: `OK: no reportItemResolved (onSetComplete is the single entry point)`.

- [ ] **Step 5 — Run lint.** Command: `npm run lint`
  Expected: 0 errors (warnings acceptable only if M1's eslint config permits them). Exit code 0.

- [ ] **Step 6 — Full production build.** Command: `npm run build`
  Expected: `tsc --noEmit` clean, then `vite build` writes `dist/` with `index.html`, the Phaser bundle, `manifest.webmanifest`, and `sw.js`. Exit code 0.

- [ ] **Step 7 — Re-run compliance assertions (M1) to prove M2 introduced no networking.** Command: `npm test -- tests/compliance`
  Expected: `capacitorConfig.test.ts` asserts `hasNoServerUrl(config)` true; `androidManifest.test.ts` asserts `manifestExcludesAdId(xml)` true (or documented skip if `android/` not generated). All passed, exit code 0.

- [ ] **Step 8 — Commit the milestone marker.** Command:
  `git commit --allow-empty -m "chore: complete M2 shell scenes and bootstrap wiring"`

---

### Cross-reference index (for M3+)

- **M3 (games) attaches here via:** the SINGLE completion entry point `BaseGameScene.onSetComplete()` — M4 subclasses track their own placement/match and call `this.onSetComplete()` directly (there is NO `reportItemResolved`; the pure `gameLoop` reducer is internal to `onSetComplete`); the §3.8 abstract hooks `loadContent()`/`buildLayout()`/`reshuffle(seed)` (Task 8); the `SCENES` array M3-insertion-point in `src/main.ts` (Task 9); `GAMES` registry entries already declared (Task 2, M2 is sole author — M4 only confirms/extends and MUST keep `tileVoiceCue` ids equal to `SHELL_CUES` ids).
- **Seed + reshuffle/buildLayout LAW (M4 must conform):** `reshuffle(seed)` mutates DATA only and NEVER calls `buildLayout`; Base calls `buildLayout()` exactly once after each `reshuffle()`; Base owns the seed and reads the persisted `shuffleSeed` from `ProgressStore.load()` for relaunch continuity (no per-scene `currentSeed()` constant).
- **DragDropController events (M4 must conform):** subclasses call `this.drag.setEvents({...})` in `buildLayout` (the mutable-events method added to M1); the constructor takes `(scene, events)`.
- **Frame-key LAW (M3 must conform):** atlas frame names EQUAL the full `SpriteKey` string; `pack-atlas.ts` emits full-`SpriteKey` frame keys and an M3 test asserts this; callers (HubScene + M4 scenes) pass the full `SpriteKey` to `add.image`/`add.sprite` and never strip the prefix.
- **Settings privacy overlay text** is reserved here as an inert gated surface; the real "we collect no data" copy from `docs/privacy-policy.md` is wired in **M4 (compliance)** — add an explicit M4 task to replace `SettingsScene.buildPrivacyLink`'s `setPrompt('settings.privacy.placeholder')` with the real text and verify the surface is reachable only behind the gate.
- **Audio cue ids** introduced by M2 (`SHELL_CUES` in Task 5: `parental.askGrownup`, `hub.tile.colorSort`/`hub.tile.itemSort`/`hub.tile.itemMatch`, `reward.snap`, `reward.cheer`, `music.bed`) must have matching compressed assets produced in the asset pipeline (Phase 2 / M3) under `public/assets/audio/` with `.m4a` + `.ogg` (path = `${cue.src}.m4a` / `${cue.src}.ogg`); the looping `music.bed` must be produced + verified to loop via `WebAudioBackend`.
- **Idle render-loop throttling** (spec §8) is implemented here in `gameConfig.installIdleThrottle` (Task 3, Task 9) and re-verified in M5 device-matrix B6.
- **Device behavior** (iOS audio survival through call/lock, Android drag latency) is covered by Phase-0 checklists (`qa/checklists/phase0-*.md`) and re-verified in **M5**; M2's `qa/checklists/hub-and-settings.md` + `parental-gate.md` cover hub/settings/gate interaction.