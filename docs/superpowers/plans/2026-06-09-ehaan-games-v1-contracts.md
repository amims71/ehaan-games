# Ehaan Games — Shared Contracts (Canonical)

> **For agentic workers:** This is the **single source of truth** for file paths, TypeScript types, public interfaces, JSON schemas, palette tokens, the test strategy, and pinned dependency/script names. Every milestone plan (Phase 0–5) MUST reference these names and signatures verbatim. Do not redefine a type, interface, path, or script here in a milestone plan — import/reference it. If a milestone needs a new shared symbol, it is added **here first**, then referenced.

**Scope:** Ehaan Games v1 — Phaser 4.1.x (TypeScript) + Capacitor 8.3.x, bundled with Vite. Fully offline, zero data collection, zero networking code, no ads, no IAP. Audience 2–5. No levels, no scoring, appreciation-only rewards.

**Honors:** `docs/superpowers/specs/2026-06-09-kids-games-stack-and-architecture-design.md`.

> **RECONCILED FINAL DECISIONS (binding across all milestone plans).** These were settled by the revised milestone plans and are encoded throughout this doc:
> 1. **Completion API:** `BaseGameScene.onSetComplete()` is the SINGLE completion entry point. M4 game subclasses call `this.onSetComplete()` directly. There is NO `reportItemResolved`. The pure `gameLoop` reducer (`src/shell/scenes/gameLoop.ts`, M2) is an INTERNAL implementation detail of `onSetComplete()` — M4 never imports or calls it. (§3.8)
> 2. **Seed / reshuffle:** Base owns the seed, read from `ProgressStore` on `create()` for relaunch continuity (Math.random only as a first-run fallback). `reshuffle(seed)` mutates content/card data ONLY and NEVER calls `buildLayout`. Base calls `buildLayout()` exactly once after each `reshuffle()`. No scene defines a private `currentSeed()`. (§3.8)
> 3. **Frame-key convention:** the full `SpriteKey` string `"<atlas>/<frame>"` IS the Phaser frame name (free-tex-packer-core emits the provided name verbatim). Callers (HubScene `frameOf`, M4 scenes) pass the FULL `SpriteKey` as the frame argument and NEVER strip the `"<atlas>/"` prefix. (§2.2, §4)
> 4. **Color-sort palette:** the shipped color-sort bins are `oiBlue → oiBluishGreen → oiReddishPurple → oiVermillion` (blue/green/purple/red). All four clear ≥3:1 bare-token contrast on white and no adjacent pair is a forbidden-confusion pair. `oiYellow` and `oiOrange` are NOT valid color-sort bin tokens (they fail bare-token contrast on white). (§4.1, §5)
> 5. **Registry authorship:** M2 is the SOLE author of `src/games/registry.ts` and `src/games/registry.test.ts`. M4 only confirms/extends, never renames ids or recreates the test. `tileVoiceCue` ids equal registered `SHELL_CUES` ids (`hub.tile.colorSort/itemSort/itemMatch`); `titleKey` uses `hub.title.*`. (§3.10)
> 6. **vitest include + tools alias:** include globs cover `tools/**/*.test.ts` in addition to `src/**` and `tests/**`; `tsx` resolves the `@/` → `src/` tsconfig path alias natively (no extra runtime resolver). (§6.4, §7.2)
> 7. **Audio assetPath:** `NativeAudioBackend.preload` uses `${cue.src}.m4a` (`AudioCue.src` already carries the `assets/audio/...` path; NO extra `public/` prefix). `WebAudioBackend` uses ONE Phaser sound-manager call pattern. The M0 spike backend BODIES are discarded; only the `AudioBackend` interface + the assetPath convention survive M0. (§2.3, §3.2)
> 8. **Button / Dialog:** explicit signatures (§3.11/§3.12); both are CREATED in M1 and consumed by M2 Scenes.
> 9. **Content validation:** there is NO standalone `contentLoader.ts` module. The three PURE per-game validators (`validateColorSortContent`, `validateItemSortContent`, `validateItemMatchContent`, authored + unit-tested in M4) are the runtime source of truth; each scene calls its own validator in `loadContent()`. (§1, §4)
> 10. **Default audio volume:** pinned to `1` (full) in ONE place — `progressSerde.defaultSnapshot()` (M1). `SettingsScene` references but does not change the default. (§2.6, §3.5)

---

## 1. File / folder structure (source of truth for paths)

This refines the spec's §4.3. All paths below are **canonical**; milestone plans must use them exactly.

```
ehaan-games/                                  (repo root; npm workspace, Vite + TS + Capacitor)
├─ package.json                               (scripts + pinned deps — see §7)
├─ tsconfig.json                              (strict: true; bundler moduleResolution; paths {"@/*":["src/*"]}; include covers src + tools)
├─ vite.config.ts                             (bundles to /dist; base: './'; resolve.alias @→src; vite-plugin-pwa configured in M0)
├─ vitest.config.ts                           (test env: node; include src/** + tests/** + tools/**; @→src alias)
├─ capacitor.config.ts                        (appId 'com.telaeris.ehaangames'; NO server.url; SplashScreen/StatusBar config in M5)
├─ .eslintrc.cjs
├─ index.html                                 (single root; <div id="app">; no external <script src>)
├─ public/
│  ├─ manifest.webmanifest                    (PWA manifest; name "Ehaan Games"; present from M0)
│  ├─ icons/                                  (PWA + store icons: icon-192.png, icon-512.png, icon-512-maskable.png — generated by M3 tools/gen-icons.ts)
│  └─ assets/                                 (SHIPPED build artifacts: atlases + audio)
│     ├─ atlases/                             (packed atlas PNG + JSON per shared/game)
│     │  ├─ shared.png  shared.json           (UI/reward sprites)
│     │  ├─ color-sort.png  color-sort.json
│     │  ├─ item-sort.png   item-sort.json
│     │  └─ item-match.png  item-match.json
│     └─ audio/                               (compressed voice/SFX/music, .m4a + .ogg)
├─ src/
│  ├─ main.ts                                 (Phaser.Game bootstrap; register Scenes; PWA SW reg stub; native-shell signals in M5)
│  ├─ config/
│  │  └─ gameConfig.ts                         (Phaser.Types.Core.GameConfig factory; WebGL; low-power; installIdleThrottle — §8 jank mitigation)
│  ├─ types/                                   (ALL shared types — §2)
│  │  ├─ index.ts                              (barrel re-export of every type below)
│  │  ├─ game.ts                               (GameDef, GameId, SceneKey)
│  │  ├─ content.ts                            (ContentConfig + per-game variants)
│  │  ├─ audio.ts                              (AudioCue, AudioCueId, AudioResumeState)
│  │  ├─ sprites.ts                            (SpriteKey, AtlasKey)
│  │  ├─ rewards.ts                            (RewardKind, RewardRequest)
│  │  ├─ parental.ts                           (ParentalChallenge, ParentalResult)
│  │  └─ progress.ts                           (ProgressSnapshot, GameProgress)
│  ├─ shell/                                   (THE REUSABLE SHELL)
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts
│  │  │  ├─ HubScene.ts                        (frameOf does NOT strip the atlas prefix — §4 decision 3)
│  │  │  ├─ SettingsScene.ts
│  │  │  ├─ BaseGameScene.ts                   (abstract — §3.8)
│  │  │  ├─ gameLoop.ts                        (PURE play→complete→reward→reshuffle reducer; INTERNAL to onSetComplete — unit-tested)
│  │  │  └─ gameLoop.test.ts
│  │  ├─ audio/
│  │  │  ├─ AudioService.ts                    (facade + resume state machine — §3)
│  │  │  ├─ NativeAudioBackend.ts              (@capacitor-community/native-audio; assetPath = `${cue.src}.m4a`)
│  │  │  ├─ WebAudioBackend.ts                 (Phaser sound manager; ONE call pattern — §3.2)
│  │  │  ├─ audioQueue.ts                      (PURE queue/resume state machine — unit-tested)
│  │  │  └─ cueManifest.ts                     (PURE shell-level SHELL_CUES: AudioCue[] — M2)
│  │  ├─ input/
│  │  │  ├─ DragDropController.ts              (Phaser wiring — thin)
│  │  │  └─ dropValidation.ts                  (PURE drop/match/completion logic — unit-tested)
│  │  ├─ rewards/
│  │  │  └─ RewardFx.ts                        (tween pop + cheer; appreciation-only)
│  │  ├─ storage/
│  │  │  ├─ ProgressStore.ts                   (facade over Preferences/localStorage; shuffle-seed continuity)
│  │  │  └─ progressSerde.ts                   (PURE serialize/deserialize/validate + defaultSnapshot — unit-tested)
│  │  ├─ platform/
│  │  │  ├─ AppLifecycle.ts                    (resume listeners wiring — thin)
│  │  │  ├─ ParentalGate.ts                    (Phaser dialog wiring — thin)
│  │  │  └─ parentalChallenge.ts              (PURE challenge gen + verify — unit-tested)
│  │  └─ ui/
│  │     ├─ theme.ts                            (Okabe-Ito tokens — §5)
│  │     ├─ color.ts                            (PURE contrast/adjacency utils — §5, unit-tested)
│  │     ├─ Button.ts                           (big-tap-target button factory — §3.11; created in M1)
│  │     ├─ Dialog.ts                           (modal panel — §3.12; created in M1)
│  │     └─ hubLayout.ts                        (PURE tile layout math — unit-tested)
│  ├─ games/
│  │  ├─ registry.ts                           (GameDef[] for HubScene — §3.10; M2 sole author, M4 confirms/extends)
│  │  ├─ registry.test.ts                      (M2 sole author; M4 does NOT recreate)
│  │  ├─ color-sort/
│  │  │  ├─ ColorSortScene.ts                  (THIN; calls this.onSetComplete())
│  │  │  ├─ colorSortLogic.ts                  (PURE: shuffle + validateColorSortContent + completion — unit-tested)
│  │  │  └─ content.json                       (ColorSortContent — §4.1)
│  │  ├─ item-sort/
│  │  │  ├─ ItemSortScene.ts
│  │  │  ├─ itemSortLogic.ts                   (PURE: shuffle + validateItemSortContent + completion — unit-tested)
│  │  │  └─ content.json                       (ItemSortContent — §4.2)
│  │  └─ item-match/
│  │     ├─ ItemMatchScene.ts                  (taps not drag; getDragEvents() returns {})
│  │     ├─ itemMatchLogic.ts                  (PURE: shuffle + validateItemMatchContent + match/completion — unit-tested)
│  │     └─ content.json                       (ItemMatchContent — §4.3)
│  └─ compliance/
│     └─ assertions.ts                         (PURE compliance assertion helpers — §6)
├─ assets/                                     (build INPUT, not shipped raw)
│  ├─ style-guide.md                           (the ONE reusable prompt block + locked look rules + AI-copyright/human-edit hygiene)
│  ├─ generation-sop.md                        (operator procedure: Nano Banana Pro art + ElevenLabs audio; no-runtime-TTS rule; human-edit checkpoint; audio-license gate)
│  ├─ asset-manifest.json                      (provenance: model + prompt + date + license + humanEdited per asset)
│  ├─ icon-master.png                          (square master rasterized into public/icons/* by tools/gen-icons.ts)
│  ├─ references/                              (3–5 fixed reference images)
│  ├─ raw/                                     (generated art on opaque bg)
│  └─ audio-raw/                               (voice prompts + SFX + looping music bed: music-bed.wav)
├─ tools/                                      (AI-asset pipeline — TS, run via tsx; @/ alias resolves natively)
│  ├─ remove-bg.ts                             (batch rembg/BiRefNet → transparent PNG)
│  ├─ pack-atlas.ts                            (free-tex-packer-core → atlas PNG + JSON; frame keys = full SpriteKey)
│  ├─ compress-audio.ts                        (ffmpeg → .m4a + .ogg incl. looping music bed)
│  ├─ gen-icons.ts                             (sharp → public/icons/* PWA + store icon set)
│  ├─ asset-manifest.ts                        (provenance log + audio-license gate per asset)
│  └─ lib/                                     (PURE, unit-tested logic: fsScan, rembgCmd, atlasConfig, audioCmd, iconSpec, manifest, spriteName)
├─ tests/
│  ├─ setup.ts                                 (vitest global setup — §6; stubs globalThis.fetch to throw)
│  └─ compliance/
│     ├─ capacitorConfig.test.ts              (asserts NO server.url — §6)
│     └─ androidManifest.test.ts              (asserts AD_ID excluded — §6)
├─ dist/                                       (Vite output; Capacitor copies this; emits sw.js + manifest.webmanifest)
├─ ios/   android/                             (Capacitor native projects; android/variables.gradle target/compileSdk = 35 — M5)
├─ docs/
│  ├─ privacy-policy.md                        ("we collect no data")
│  ├─ compliance-checklist.md
│  └─ superpowers/specs/                       (the approved design spec)
└─ qa/
   ├─ device-matrix.md
   └─ checklists/                              (manual QA checklists — §6)
      ├─ phase0-ios-audio.md
      ├─ phase0-android-drag.md
      ├─ color-sort.md
      ├─ item-sort.md
      ├─ item-match.md
      ├─ hub-and-settings.md
      ├─ parental-gate.md
      └─ network-zero-outbound.md
```

**Path rules (LAW):**
- Pure, framework-free modules live next to their Phaser wrapper but are separate files (e.g. `dropValidation.ts` beside `DragDropController.ts`). Pure modules **never import `phaser`**.
- Every type is exported from `src/types/` and re-exported by `src/types/index.ts`. Game code imports from `@/types` (alias) or relative `../../types`.
- Shipped runtime assets live under `public/assets/` and `public/icons/`. Vite copies `public/` into `dist/` unchanged.
- Test files are co-located: `foo.ts` → `foo.test.ts` in the same folder. Cross-cutting compliance tests live under `tests/compliance/`. Tooling tests live under `tools/**` and are discovered by the vitest include (§6.4).
- **No standalone `contentLoader.ts`.** Content validation is per-game (`validate*Content()` — §4); each scene calls its own validator in `loadContent()`.

---

## 2. Shared TypeScript types (`src/types/`)

These are the **exact** definitions. Field names and types are LAW.

### 2.1 `src/types/game.ts`

```ts
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
  /** Spoken/displayed label key (hub.title.* namespace — §3.10). */
  titleKey: string;
  /** Atlas frame used for the hub tile icon (full SpriteKey; in the 'shared' atlas). */
  tileSprite: SpriteKey;
  /** Atlas the scene must load before starting (besides 'shared'). */
  atlas: AtlasKey;
  /** Voice cue announced when the tile is focused/launched. MUST equal a registered SHELL_CUES id (hub.tile.*). */
  tileVoiceCue: AudioCueId;
  /** Relative path (from src) to this game's content.json, used by the scene. */
  contentPath: string;
}

import type { SpriteKey, AtlasKey } from './sprites';
import type { AudioCueId } from './audio';
```

### 2.2 `src/types/sprites.ts`

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

> **Frame-key convention (LAW — decision 3).** The Phaser atlas frame name EQUALS the full `SpriteKey` string (`"<atlas>/<frame>"`). M3's `pack-atlas.ts` configures `free-tex-packer-core` (`removeFileExtension: true` + `prependFolderName: true` over folder-prefixed input) to emit each frame keyed by the full `SpriteKey`, and an M3 test asserts the packed JSON frame keys equal the `SpriteKey`s. Therefore ALL callers pass the FULL `SpriteKey` as the `frame` argument to `add.image`/`add.sprite` (e.g. `add.image(x, y, atlasKey, fullSpriteKey)`) and MUST NOT strip the `"<atlas>/"` prefix. `HubScene.frameOf` does NOT strip; M4 scenes pass the `SpriteKey` value directly (no `frame()` stripping helper).

### 2.3 `src/types/audio.ts`

```ts
/** Stable identifier for every voice prompt / SFX / music bed. */
export type AudioCueId = string & { readonly __brand: 'AudioCueId' };

/** Whether a cue is critical (voice — native on device) or ambient (SFX/music — web sound mgr). */
export type AudioChannel = 'voice' | 'sfx' | 'music';

/** A single playable audio asset, declared once and referenced by id. */
export interface AudioCue {
  id: AudioCueId;
  channel: AudioChannel;
  /**
   * Base asset path WITHOUT extension; backends append the extension.
   * e.g. "assets/audio/prompt-sort". NativeAudioBackend.preload uses `${cue.src}.m4a`
   * directly — NO extra "public/" prefix (the path already targets the shipped assets dir).
   */
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

### 2.4 `src/types/rewards.ts`

```ts
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

import type { AudioCueId } from './audio';
```

### 2.5 `src/types/parental.ts`

```ts
/** A generated adult-only challenge: multiply two numbers (after a hold-to-continue). */
export interface ParentalChallenge {
  /** Left operand (2..9, no trivial 0/1). */
  a: number;
  /** Right operand (2..9, no trivial 0/1). */
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

import type { AudioCueId } from './audio';
```

### 2.6 `src/types/progress.ts`

> Per spec: NO levels/scoring/progress bars. `ProgressStore` persists **only** local, non-PII preferences and lightweight "session continuity" (e.g. which content variant was last shuffled). It never holds points or completion counts used for ranking.

```ts
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
    /** 0..1 master volume. DEFAULT IS 1 (full) — pinned in progressSerde.defaultSnapshot() (§3.5). */
    volume: number;
  };
  /** Per-game continuity, keyed by GameId. */
  games: Partial<Record<GameId, GameProgress>>;
}

import type { GameId } from './game';
```

### 2.7 `src/types/content.ts`

```ts
import type { AudioCueId } from './audio';
import type { SpriteKey } from './sprites';
import type { GameId } from './game';

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

/** The discriminated union the per-game validators consume. */
export type ContentConfig = ColorSortContent | ItemSortContent | ItemMatchContent;

import type { OkabeItoToken } from '../shell/ui/theme';
```

---

## 3. Public interfaces + method signatures

All interfaces are LAW. Thin Phaser wrappers delegate to the pure modules named in §1.

### 3.1 AudioService + resume state machine

The resume state machine lives in **pure** `src/shell/audio/audioQueue.ts` and is unit-tested. `AudioService` wires it to the real backends.

```ts
// src/shell/audio/audioQueue.ts  (PURE — no phaser, no DOM, no capacitor)
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
export function initialAudioState(): AudioQueueState;

/**
 * Reduce a trigger against current state. Pure: returns the next state plus
 * the cues that should flush NOW (when transitioning into 'running').
 * Transition contract:
 *  uninitialized --first-gesture--> recovering --(resolved)--> running
 *  running --app-resume|visibility-visible--> recovering (re-acquire) --> running
 *  running --visibility-hidden(implied by 'manual' suspend)--> suspended
 */
export function reduceResume(
  state: AudioQueueState,
  trigger: AudioResumeTrigger,
): { next: AudioQueueState; flush: QueuedCue[] };

/** Mark the in-flight resume as resolved (context.resume() succeeded). */
export function resolveRecovering(
  state: AudioQueueState,
): { next: AudioQueueState; flush: QueuedCue[] };

/** Enqueue a cue. Critical cues queue while not running; non-critical are dropped if not running. */
export function enqueueCue(
  state: AudioQueueState,
  cue: QueuedCue,
): { next: AudioQueueState; playNow: QueuedCue | null };
```

```ts
// src/shell/audio/AudioService.ts  (facade)
import type { AudioCue, AudioCueId } from '@/types';

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
  constructor(options: AudioServiceOptions);

  /** Register all cues (BootScene) and preload them on the correct backend. */
  registerCues(cues: AudioCue[]): Promise<void>;

  /** Unlock audio on the first user gesture (drives 'first-gesture'). */
  unlock(): Promise<void>;

  /** Play a cue; routes critical voice → voiceBackend, else ambientBackend. */
  play(id: AudioCueId): Promise<void>;

  stop(id: AudioCueId): Promise<void>;

  setMuted(muted: boolean): void;
  setMasterVolume(volume: number): void;

  /** Called by AppLifecycle on App 'resume' and 'visibilitychange'→visible. */
  handleResume(trigger: 'app-resume' | 'visibility-visible'): Promise<void>;

  /** Current resume state (exposed for tests + diagnostics). */
  get resumeState(): import('@/types').AudioResumeState;
}
```

### 3.2 NativeAudioBackend / WebAudioBackend

> **Asset-path convention (LAW — decision 7).** `AudioCue.src` already carries the `assets/audio/...` path WITHOUT extension (§2.3). `NativeAudioBackend.preload` builds `assetPath: ${cue.src}.m4a` directly — NO extra `public/` prefix. `WebAudioBackend` uses ONE Phaser sound-manager call pattern (`sound.add` in `preload`, `sound.play(id)` in `play`, `sound.get(id)?.stop()` in `stop`, `context.resume()` in `resume`). The M0 spike backend BODIES are discarded at M0 close-out; only the `AudioBackend` interface shape and this assetPath convention carry forward. M1 Task 11 implements the canonical production bodies.

```ts
// src/shell/audio/NativeAudioBackend.ts  — implements AudioBackend via @capacitor-community/native-audio
import type { AudioBackend } from './AudioService';
export class NativeAudioBackend implements AudioBackend {
  preload(cue: import('@/types').AudioCue): Promise<void>; // assetPath: `${cue.src}.m4a` (no public/ prefix)
  play(id: import('@/types').AudioCueId): Promise<void>;
  stop(id: import('@/types').AudioCueId): Promise<void>;
  setVolume(id: import('@/types').AudioCueId, volume: number): Promise<void>;
  resume(): Promise<boolean>;
}

// src/shell/audio/WebAudioBackend.ts  — implements AudioBackend via Phaser sound manager (ONE call pattern)
import type { AudioBackend } from './AudioService';
export class WebAudioBackend implements AudioBackend {
  constructor(sound: Phaser.Sound.BaseSoundManager);
  preload(cue: import('@/types').AudioCue): Promise<void>; // sound.add(cue.id, { loop, volume }) if absent
  play(id: import('@/types').AudioCueId): Promise<void>;   // sound.play(id)
  stop(id: import('@/types').AudioCueId): Promise<void>;   // sound.get(id)?.stop()
  setVolume(id: import('@/types').AudioCueId, volume: number): Promise<void>;
  resume(): Promise<boolean>; // calls context.resume() on the WebAudio context
}
```

### 3.3 DragDropController + pure drop validation

```ts
// src/shell/input/dropValidation.ts  (PURE — no phaser)
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
export function isValidDrop(item: DraggableMeta, target: DropTarget): boolean;

/** Two items form a match if their pairId is equal and ids differ. */
export function isMatch(a: DraggableMeta, b: DraggableMeta): boolean;

/** True when EVERY item has been correctly placed/matched (triggers appreciation reward). */
export function isSetComplete(
  placed: ReadonlyArray<string>, // ids correctly resolved
  total: ReadonlyArray<string>,  // all item/pair ids
): boolean;
```

```ts
// src/shell/input/DragDropController.ts  (Phaser wiring — thin)
import type { DraggableMeta, DropTarget } from './dropValidation';

export interface DragDropEvents {
  onPickUp?(item: DraggableMeta): void;
  onValidDrop?(item: DraggableMeta, target: DropTarget): void;
  onInvalidDrop?(item: DraggableMeta, target: DropTarget): void;
  onMatch?(a: DraggableMeta, b: DraggableMeta): void;
}

export class DragDropController {
  /** Events are constructor-injected (BaseGameScene passes the result of the subclass getDragEvents()). */
  constructor(scene: Phaser.Scene, events: DragDropEvents);

  /** Register a draggable with a generous toddler-sized hit area (min 88px). */
  addDraggable(obj: Phaser.GameObjects.GameObject, meta: DraggableMeta): void;

  /** Register a snap-zone drop target. */
  addTarget(zone: Phaser.GameObjects.Zone, target: DropTarget): void;

  /** Snap an item back to its origin (invalid drop) with a tween. */
  returnToOrigin(obj: Phaser.GameObjects.GameObject): void;

  destroy(): void;
}

/** Minimum hit-area edge in px for ages 2–5 (LAW; referenced by QA + Button.minSize). */
export const MIN_HIT_AREA_PX = 88;
```

### 3.4 RewardFx

```ts
// src/shell/rewards/RewardFx.ts
import type { RewardRequest } from '@/types';

export class RewardFx {
  constructor(scene: Phaser.Scene, audio: import('../audio/AudioService').AudioService);

  /** Play a celebratory pop/scale/particles + optional cheer. Appreciation-only — NO score/streak UI. */
  play(request: RewardRequest): Promise<void>;

  destroy(): void;
}
```

### 3.5 ProgressStore + pure serde

```ts
// src/shell/storage/progressSerde.ts  (PURE — no capacitor)
import type { ProgressSnapshot } from '@/types';

/** Default snapshot. Audio default is { muted: false, volume: 1 } — volume default 1 is pinned HERE ONLY (decision 10). */
export function defaultSnapshot(): ProgressSnapshot;

/** Serialize to a compact JSON string. */
export function serialize(snapshot: ProgressSnapshot): string;

/** Parse + validate; returns defaultSnapshot() on any malformed/legacy input (never throws). */
export function deserialize(raw: string | null): ProgressSnapshot;

/** Type guard / validator used by tests and deserialize. */
export function isValidSnapshot(value: unknown): value is ProgressSnapshot;
```

```ts
// src/shell/storage/ProgressStore.ts  (facade over Preferences/localStorage)
import type { ProgressSnapshot } from '@/types';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class ProgressStore {
  /** backend = Capacitor Preferences adapter on device, localStorage adapter on web. */
  constructor(backend: KeyValueStore);
  load(): Promise<ProgressSnapshot>;
  save(snapshot: ProgressSnapshot): Promise<void>;
  /** Read-modify-write a single game's continuity. */
  patchGame(gameId: import('@/types').GameId, patch: Partial<import('@/types').GameProgress>): Promise<void>;
  /**
   * Return the persisted shuffleSeed for a game, or generate+persist a new one if absent.
   * Shuffle-seed continuity helper for relaunch (spec content-set continuity).
   */
  resolveSeed(gameId: import('@/types').GameId): Promise<number>;
}

/** Single storage key (no PII). */
export const PROGRESS_KEY = 'ehaan.progress.v1';
```

> **Seed continuity (LAW — decision 2).** `BaseGameScene.create()` reads the persisted `shuffleSeed` from `ProgressStore` for relaunch continuity (via `load()`, with `Math.random` ONLY as a first-run fallback). `ProgressStore.resolveSeed(gameId)` is available as the continuity helper; whichever read path is used, the persisted seed MUST drive the first `reshuffle(seed)` so a relaunch resumes the prior arrangement.

### 3.6 AppLifecycle

```ts
// src/shell/platform/AppLifecycle.ts  (thin wiring over Capacitor App + document events)
import type { AudioService } from '../audio/AudioService';

export class AppLifecycle {
  constructor(audio: AudioService);

  /**
   * Wire Capacitor App 'resume' → audio.handleResume('app-resume')
   * and document 'visibilitychange'→visible → audio.handleResume('visibility-visible').
   */
  start(): void;

  stop(): void;
}
```

### 3.7 ParentalGate + pure challenge

```ts
// src/shell/platform/parentalChallenge.ts  (PURE — no phaser)
import type { ParentalChallenge, ParentalResult } from '@/types';
import type { AudioCueId } from '@/types';

/**
 * Generate a challenge: two operands in [2..9]*[2..9] (no 0/1), 4 shuffled options.
 * `rng` defaults to Math.random; injected in tests for determinism.
 */
export function generateChallenge(voiceCue: AudioCueId, rng?: () => number): ParentalChallenge;

/** Verify a selected option against the challenge. */
export function verifyChallenge(challenge: ParentalChallenge, selected: number): ParentalResult;
```

```ts
// src/shell/platform/ParentalGate.ts  (Phaser dialog wiring — thin; uses Dialog + Button — §3.11/§3.12)
export interface ParentalGateOptions {
  /** Required hold duration before the math step (ms). */
  holdMs: number; // LAW default below
}

export class ParentalGate {
  constructor(scene: Phaser.Scene, audio: import('../audio/AudioService').AudioService, options?: Partial<ParentalGateOptions>);

  /** Present hold-to-continue → math challenge. Resolves true only on a correct answer. */
  present(): Promise<boolean>;

  destroy(): void;
}

/** LAW default hold duration. */
export const PARENTAL_GATE_HOLD_MS = 1500;
```

### 3.8 BaseGameScene (abstract)

> **Completion API + seed/layout contract (LAW — decisions 1 & 2).**
> - `onSetComplete()` is the SINGLE completion entry point. M4 game subclasses track their own placement/match state and call `this.onSetComplete()` directly when their set is complete. There is NO public `reportItemResolved`.
> - The pure `gameLoop` reducer (`src/shell/scenes/gameLoop.ts`) is an INTERNAL implementation detail of `onSetComplete()` (phase + `cyclesCompleted` bookkeeping). M4 NEVER imports or calls it. A `completing`-phase guard at the top of `onSetComplete()` makes a double-call idempotent.
> - Base OWNS the seed: `create()` reads the persisted `shuffleSeed` from `ProgressStore` (Math.random only as first-run fallback), then calls `reshuffle(seed)` ONCE and `buildLayout()` ONCE. `onSetComplete()` advances the seed deterministically, persists it via `ProgressStore.patchGame`, then calls `reshuffle(seed)` ONCE and `buildLayout()` ONCE.
> - `reshuffle(seed)` mutates content/card data ONLY and NEVER calls `buildLayout`. No subclass defines a private `currentSeed()`.
> - Drag events are supplied via the abstract `getDragEvents()` hook, which Base passes into the `DragDropController` constructor. Tap-only games (item-match) return `{}`.
> - After `buildLayout()`, Base runs a dev-time guard asserting the active interactive sprite count stays ≤ `MAX_INTERACTIVE_SPRITES` (§5.3) via the pure `exceedsSpriteCap(count, cap)` helper.

```ts
// src/shell/scenes/BaseGameScene.ts
import type { ContentConfig } from '@/types';
import type { DragDropEvents } from '../input/DragDropController';

export abstract class BaseGameScene extends Phaser.Scene {
  protected audio!: import('../audio/AudioService').AudioService;
  protected drag!: import('../input/DragDropController').DragDropController;
  protected rewards!: import('../rewards/RewardFx').RewardFx;
  protected progress!: import('../storage/ProgressStore').ProgressStore;
  protected content!: ContentConfig;

  /** Phaser lifecycle: load this game's atlas + content.json. */
  preload(): void;

  /**
   * Phaser lifecycle: read persisted seed from ProgressStore, reshuffle(seed) once,
   * build DragDropController from getDragEvents(), buildLayout() once, then play introCue.
   */
  create(): void;

  // --- Abstract hooks each game implements (THIN wiring over pure modules) ---

  /** Return the validated content for this scene (subclass calls its own validate*Content()). */
  protected abstract loadContent(): ContentConfig;

  /** Drag events injected into DragDropController. Tap-only games return {}. */
  protected abstract getDragEvents(): DragDropEvents;

  /** Build draggables, bins/grid, and register them with this.drag. Renders the latest reshuffle output. */
  protected abstract buildLayout(): void;

  /** Mutate the content/card set for the given seed ONLY (deterministic). MUST NOT call buildLayout(). */
  protected abstract reshuffle(seed: number): void;

  // --- Concrete shared lifecycle (subclasses CALL onSetComplete; do not override) ---

  /**
   * SINGLE completion entry point. Subclasses call this when their set is complete.
   * Internally drives the pure gameLoop reducer: appreciation reward → advance+persist seed →
   * reshuffle(seed) → buildLayout(). Increments cyclesCompleted exactly once. NO score UI.
   */
  protected onSetComplete(): Promise<void>;

  /** Standard teardown: stop audio, destroy controllers. */
  shutdown(): void;
}
```

### 3.9 Hub layout (pure)

```ts
// src/shell/ui/hubLayout.ts  (PURE — no phaser)
export interface TileRect { x: number; y: number; w: number; h: number; }

/** Lay out N tiles in a centered grid within (width × height) with gutters. Big tap targets. */
export function computeTileLayout(
  count: number,
  width: number,
  height: number,
  opts?: { minTile?: number; gutter?: number },
): TileRect[];
```

### 3.10 Games registry shape

> **Authorship (LAW — decision 5).** M2 is the SOLE author of `src/games/registry.ts` AND `src/games/registry.test.ts`. M4 only CONFIRMS/extends entries (filling any M2-left stub with the exact ids); M4 does NOT rename ids and does NOT recreate the test file. `tileVoiceCue` ids MUST equal registered `SHELL_CUES` ids: `hub.tile.colorSort` / `hub.tile.itemSort` / `hub.tile.itemMatch`. `titleKey` uses the `hub.title.*` namespace: `hub.title.colorSort` / `hub.title.itemSort` / `hub.title.itemMatch`. The forbidden short forms `cs.tile` / `is.tile` / `im.tile` MUST NOT appear.

```ts
// src/games/registry.ts
import type { GameDef } from '@/types';

/** Ordered list rendered by HubScene. Add a game = add one entry. */
export const GAMES: readonly GameDef[] = [/* color-sort, item-sort, item-match */];
```

### 3.11 Button (`src/shell/ui/Button.ts`) — thin Phaser wrapper (created in M1)

```ts
import type { SpriteKey, AudioCueId } from '@/types';

export interface ButtonOptions {
  /** Atlas frame for the button background (full SpriteKey; defaults to a shared frame). */
  frame?: SpriteKey;
  /** Optional text label drawn over the button. */
  label?: string;
  /** Minimum tap-target edge in px (LAW: never below MIN_HIT_AREA_PX = 88). */
  minSize?: number;
  /** Voice/sfx cue played on tap. */
  tapCue?: AudioCueId;
}

export class Button {
  constructor(scene: Phaser.Scene, x: number, y: number, options?: ButtonOptions);
  /** Register a tap (pointerup inside) handler. Chainable. */
  onTap(handler: () => void): this;
  /** Register a hold-start handler (pointerdown). Used by the parental-gate hold-to-continue. */
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

### 3.12 Dialog (`src/shell/ui/Dialog.ts`) — thin Phaser wrapper (created in M1)

```ts
export interface DialogOptions {
  /** Heading text. */
  title: string;
}

export class Dialog {
  constructor(scene: Phaser.Scene, options: DialogOptions);
  /** Remove all body children (re-render the math challenge on failure, etc.). Chainable. */
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

---

## 4. content.json JSON Schemas + examples

Runtime validation is performed by the **pure per-game validators** (decision 9): `validateColorSortContent`, `validateItemSortContent`, `validateItemMatchContent` (in `src/games/<game>/<game>Logic.ts`, authored + unit-tested in M4). There is NO standalone `contentLoader.ts`. Each scene calls its own validator in `loadContent()`. The JSON-Schema draft-07 vocabulary below documents the structural contract inline; the per-game validators enforce it plus the semantic rules.

### 4.1 color-sort (encodes the colorblind-safe redundant-cue requirement)

**Schema (required fields LAW):**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["schema", "gameId", "introCue", "appreciationCue", "categories", "items"],
  "properties": {
    "schema": { "const": 1 },
    "gameId": { "const": "color-sort" },
    "introCue": { "type": "string" },
    "appreciationCue": { "type": "string" },
    "categories": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "colorToken", "cue", "binSprite", "labelCue"],
        "properties": {
          "id": { "type": "string" },
          "colorToken": {
            "comment": "Any of the eight Okabe-Ito tokens is structurally valid, BUT the validator (rule 3) rejects any token under 3:1 bare-token contrast on the #FFFFFF background. oiYellow (1.32:1) and oiOrange (2.25:1) therefore CANNOT be used as color-sort bins. The shipped set is oiBlue / oiBluishGreen / oiReddishPurple / oiVermillion.",
            "enum": ["oiBlack","oiBlue","oiBluishGreen","oiReddishPurple","oiVermillion","oiSkyBlue","oiOrange","oiYellow"]
          },
          "cue": {
            "type": "object",
            "required": ["shape", "pattern", "icon"],
            "properties": {
              "shape":   { "enum": ["circle","square","triangle","star","hexagon","heart"] },
              "pattern": { "enum": ["solid","stripes","dots","grid","zigzag","checker"] },
              "icon":    { "type": "string" }
            }
          },
          "binSprite": { "type": "string" },
          "labelCue": { "type": "string" }
        }
      }
    },
    "items": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "categoryId", "sprite"],
        "properties": {
          "id": { "type": "string" },
          "categoryId": { "type": "string" },
          "sprite": { "type": "string" }
        }
      }
    }
  }
}
```

**Validator-enforced semantic rules (LAW — beyond JSON-Schema, tested in `colorSortLogic.test.ts`):**
1. Every `categories[].cue` is present (redundant non-color cue is mandatory).
2. `shape`, `pattern`, and `icon` are **unique across categories** (no two bins share any cue dimension).
3. Each `colorToken` clears `MIN_CONTRAST_RATIO` (≥3:1) under a **bare-token** `meetsContrast` check vs the app background `#FFFFFF`. (Measured: oiBlue 5.19, oiBluishGreen 3.42, oiReddishPurple 3.06, oiVermillion 3.87 — all pass; oiOrange 2.25 and oiYellow 1.32 FAIL and are rejected.)
4. The ORDERED bin token list has no forbidden colorblind-confusion pair in adjacent positions (`assertNoForbiddenAdjacency`, §5).
5. Every `items[].categoryId` references an existing `categories[].id`.

**Example (`src/games/color-sort/content.json`) — the shipped four-color set (decision 4):**
```json
{
  "schema": 1,
  "gameId": "color-sort",
  "introCue": "cs.intro",
  "appreciationCue": "cs.appreciation",
  "categories": [
    { "id": "blue",   "colorToken": "oiBlue",          "cue": { "shape": "circle",   "pattern": "solid",  "icon": "color-sort/icon-circle" },   "binSprite": "color-sort/bin-blue",   "labelCue": "cs.blue" },
    { "id": "green",  "colorToken": "oiBluishGreen",   "cue": { "shape": "triangle", "pattern": "dots",   "icon": "color-sort/icon-triangle" }, "binSprite": "color-sort/bin-green",  "labelCue": "cs.green" },
    { "id": "purple", "colorToken": "oiReddishPurple", "cue": { "shape": "heart",    "pattern": "zigzag", "icon": "color-sort/icon-heart" },    "binSprite": "color-sort/bin-purple", "labelCue": "cs.purple" },
    { "id": "red",    "colorToken": "oiVermillion",    "cue": { "shape": "star",     "pattern": "grid",   "icon": "color-sort/icon-star" },     "binSprite": "color-sort/bin-red",    "labelCue": "cs.red" }
  ],
  "items": [
    { "id": "i1", "categoryId": "blue",   "sprite": "color-sort/item-blue-1" },
    { "id": "i2", "categoryId": "green",  "sprite": "color-sort/item-green-1" },
    { "id": "i3", "categoryId": "purple", "sprite": "color-sort/item-purple-1" },
    { "id": "i4", "categoryId": "red",    "sprite": "color-sort/item-red-1" },
    { "id": "i5", "categoryId": "blue",   "sprite": "color-sort/item-blue-2" },
    { "id": "i6", "categoryId": "green",  "sprite": "color-sort/item-green-2" }
  ]
}
```

> **Adjacency check on the shipped order** `[oiBlue, oiBluishGreen, oiReddishPurple, oiVermillion]`: no adjacent pair is in `FORBIDDEN_ADJACENT` (§5.1). The only red/green pair (`oiBluishGreen`↔`oiVermillion`) and the only blue/purple pair (`oiBlue`↔`oiReddishPurple`) are NON-adjacent in this order. Passes `assertNoForbiddenAdjacency`.

### 4.2 item-sort

**Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["schema", "gameId", "introCue", "appreciationCue", "categories", "items"],
  "properties": {
    "schema": { "const": 1 },
    "gameId": { "const": "item-sort" },
    "introCue": { "type": "string" },
    "appreciationCue": { "type": "string" },
    "categories": {
      "type": "array", "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "binSprite", "labelCue"],
        "properties": {
          "id": { "type": "string" },
          "binSprite": { "type": "string" },
          "labelCue": { "type": "string" }
        }
      }
    },
    "items": {
      "type": "array", "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "categoryId", "sprite"],
        "properties": {
          "id": { "type": "string" },
          "categoryId": { "type": "string" },
          "sprite": { "type": "string" }
        }
      }
    }
  }
}
```
**Validator rule (`validateItemSortContent`):** every `items[].categoryId` references an existing `categories[].id`.

**Example (`src/games/item-sort/content.json`):**
```json
{
  "schema": 1,
  "gameId": "item-sort",
  "introCue": "is.intro",
  "appreciationCue": "is.appreciation",
  "categories": [
    { "id": "fruit",  "binSprite": "item-sort/bin-fruit",  "labelCue": "is.fruit" },
    { "id": "animal", "binSprite": "item-sort/bin-animal", "labelCue": "is.animal" }
  ],
  "items": [
    { "id": "apple",  "categoryId": "fruit",  "sprite": "item-sort/apple" },
    { "id": "banana", "categoryId": "fruit",  "sprite": "item-sort/banana" },
    { "id": "cat",    "categoryId": "animal", "sprite": "item-sort/cat" },
    { "id": "dog",    "categoryId": "animal", "sprite": "item-sort/dog" }
  ]
}
```

### 4.3 item-match

**Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["schema", "gameId", "introCue", "appreciationCue", "grid", "pairs"],
  "properties": {
    "schema": { "const": 1 },
    "gameId": { "const": "item-match" },
    "introCue": { "type": "string" },
    "appreciationCue": { "type": "string" },
    "grid": {
      "type": "object",
      "required": ["cols", "rows"],
      "properties": {
        "cols": { "type": "integer", "minimum": 1 },
        "rows": { "type": "integer", "minimum": 1 }
      }
    },
    "pairs": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "spriteA", "spriteB", "matchCue"],
        "properties": {
          "id": { "type": "string" },
          "spriteA": { "type": "string" },
          "spriteB": { "type": "string" },
          "matchCue": { "type": "string" }
        }
      }
    }
  }
}
```
**Validator rule (`validateItemMatchContent`, LAW):** `grid.cols * grid.rows === pairs.length * 2` and the product is even.

**Example (`src/games/item-match/content.json`):**
```json
{
  "schema": 1,
  "gameId": "item-match",
  "introCue": "im.intro",
  "appreciationCue": "im.appreciation",
  "grid": { "cols": 4, "rows": 2 },
  "pairs": [
    { "id": "sun",   "spriteA": "item-match/sun",   "spriteB": "item-match/sun",   "matchCue": "im.sun" },
    { "id": "moon",  "spriteA": "item-match/moon",  "spriteB": "item-match/moon",  "matchCue": "im.moon" },
    { "id": "star",  "spriteA": "item-match/star",  "spriteB": "item-match/star",  "matchCue": "im.star" },
    { "id": "cloud", "spriteA": "item-match/cloud", "spriteB": "item-match/cloud", "matchCue": "im.cloud" }
  ]
}
```

---

## 5. Okabe-Ito palette tokens + contrast/adjacency utilities

### 5.1 Tokens (`src/shell/ui/theme.ts`)

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

> **Color-sort usable bins (decision 4):** of the eight tokens, only those clearing ≥3:1 bare-token contrast on `#FFFFFF` may be a color-sort bin: `oiBlue`, `oiBluishGreen`, `oiReddishPurple`, `oiVermillion`, `oiBlack`, `oiSkyBlue` (`oiSkyBlue` 1.92 also fails — confirm per measurement). The shipped v1 set is `oiBlue → oiBluishGreen → oiReddishPurple → oiVermillion`. `oiYellow` (1.32) and `oiOrange` (2.25) are NOT valid color-sort bins.

### 5.2 Contrast / adjacency utilities (`src/shell/ui/color.ts`, PURE — unit-tested)

```ts
import type { OkabeItoToken } from './theme';

/** Parse a #RRGGBB string to [r,g,b] in 0..255. */
export function hexToRgb(hex: string): [number, number, number];

/** WCAG relative luminance (0..1). */
export function relativeLuminance(hex: string): number;

/** WCAG contrast ratio between two colors (1..21). */
export function contrastRatio(fgHex: string, bgHex: string): number;

/** True when a token's color has ≥ MIN_CONTRAST_RATIO against the background hex. */
export function meetsContrast(token: OkabeItoToken, bgHex: string): boolean;

/** True if the unordered pair {a,b} is in FORBIDDEN_ADJACENT. */
export function isForbiddenAdjacentPair(a: OkabeItoToken, b: OkabeItoToken): boolean;

/**
 * Assert an ORDERED bin token list has no forbidden pair in adjacent positions.
 * Throws Error with the offending pair if violated; used by validateColorSortContent.
 */
export function assertNoForbiddenAdjacency(orderedTokens: OkabeItoToken[]): void;
```

### 5.3 Interactive-sprite cap (§8 jank mitigation — LAW)

To bound on-screen draggable/tappable objects on low-power toddler devices (spec §8 "cap sprite counts"), a single constant is the source of truth:

```ts
// src/config/gameConfig.ts
/** Max simultaneously-interactive sprites on screen (toddler-screen cap, §8 jank mitigation). */
export const MAX_INTERACTIVE_SPRITES = 24;
```

- `BaseGameScene` asserts the active interactive sprite count stays ≤ `MAX_INTERACTIVE_SPRITES` as a dev-time guard (a `console.warn` in `import.meta.env.DEV` after `buildLayout()`; the pure check is `exceedsSpriteCap(count, cap)` so it is unit-testable). This is advisory in dev, never a production throw.
- Per-game `content.json` sets MUST NOT exceed the cap: color-sort/item-sort `items.length ≤ MAX_INTERACTIVE_SPRITES`, item-match `pairs.length * 2 ≤ MAX_INTERACTIVE_SPRITES`. Each game's content test asserts this (M4).

---

## 6. Test strategy contract

### 6.1 Pure (unit-tested with Vitest, strict TDD)

These modules are framework-free and **must not import `phaser`**. They carry the decidable logic and are covered by failing-test → impl → pass → commit:

| Module | What it owns |
|---|---|
| `src/shell/input/dropValidation.ts` | drop/match validity, `isSetComplete` |
| `src/shell/scenes/gameLoop.ts` | BaseGameScene play→complete→reward→reshuffle reducer + `cyclesCompleted` (internal to `onSetComplete`) |
| `src/shell/ui/color.ts` | contrast ratio, `meetsContrast`, adjacency assertions (§5) |
| `src/shell/audio/audioQueue.ts` | AudioService resume state machine + cue queue (§3.1) |
| `src/shell/storage/progressSerde.ts` | `ProgressSnapshot` (de)serialize + validation + `defaultSnapshot` (§3.5) |
| `src/shell/platform/parentalChallenge.ts` | challenge generation + verification (§3.7) |
| `src/shell/ui/hubLayout.ts` | tile layout math (§3.9) |
| `src/shell/audio/cueManifest.ts` | shell-level `SHELL_CUES` manifest (M2) |
| `src/games/color-sort/colorSortLogic.ts` | shuffle + `validateColorSortContent` + completion |
| `src/games/item-sort/itemSortLogic.ts` | shuffle + `validateItemSortContent` + completion |
| `src/games/item-match/itemMatchLogic.ts` | shuffle + `validateItemMatchContent` + match/completion |
| `src/games/registry.ts` (`registry.test.ts`) | registry integrity (ids, `hub.title.*`/`hub.tile.*`, contentPath/atlas) — M2 |
| `src/compliance/assertions.ts` | compliance assertion helpers (§6.3) |
| `tools/lib/*.ts` | AI-pipeline pure logic (fsScan, rembgCmd, atlasConfig, audioCmd, iconSpec, manifest, spriteName) — M3 |

### 6.2 Manual QA (documented checklists, NOT unit-tested)

Phaser Scenes are thin wiring; visual/interaction/device behavior is covered by checklists in `qa/checklists/` (exact steps + expected result). These include: iOS audio survival through call/lock (`phase0-ios-audio.md`), Android drag latency/battery + idle-throttle baseline (`phase0-android-drag.md`), each game's play loop, hub/settings, parental gate behavior, and the zero-outbound network trace (`network-zero-outbound.md`). Scene/wiring classes (`BootScene`, `HubScene`, `SettingsScene`, `BaseGameScene` subclasses, `DragDropController`, `RewardFx`, `AudioService`, `NativeAudioBackend`, `WebAudioBackend`, `AppLifecycle`, `ParentalGate`, `ProgressStore`, `Button`, `Dialog`, `gameConfig.ts`, the `tools/*.ts` entrypoints) are **not** unit-tested.

### 6.3 Compliance-assertion tests (automated where possible)

Live in `tests/compliance/`. Helpers in `src/compliance/assertions.ts`:

```ts
// src/compliance/assertions.ts  (PURE)
/** True if a capacitor.config object has NO server.url (bundled assets only). */
export function hasNoServerUrl(config: Record<string, unknown>): boolean;

/** True if an AndroidManifest.xml string does NOT request com.google.android.gms.permission.AD_ID. */
export function manifestExcludesAdId(manifestXml: string): boolean;

/** True if a package.json deps map contains no known analytics/ads/crash/font-CDN SDKs. */
export function hasNoForbiddenSdks(deps: Record<string, string>): boolean;
```

- `tests/compliance/capacitorConfig.test.ts` imports the actual `capacitor.config.ts` and asserts `hasNoServerUrl(config)`.
- `tests/compliance/androidManifest.test.ts` reads `android/app/src/main/AndroidManifest.xml` (when present) and asserts `manifestExcludesAdId(xml)`; skips with a documented note if `android/` not yet generated.

### 6.4 Vitest setup

- **Config:** `vitest.config.ts` with `test.environment: 'node'`, `globals: true`, `include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'tools/**/*.test.ts']`, `setupFiles: ['tests/setup.ts']`, and `coverage.provider: 'v8'`. The `tools/**/*.test.ts` glob (decision 6) ensures the plain milestone-wide `npm test` (`vitest run`, no path arg) discovers the M3 AI-pipeline tests. This config is created in M0.
- **`tests/setup.ts`:** no network, no Phaser. May seed deterministic RNG helpers. Asserts at import time that the test process performs no `fetch` (stubs `globalThis.fetch` to throw).
- **Path alias:** `@/` → `src/` (configured in both `vite.config.ts`/`vitest.config.ts` `resolve.alias` and `tsconfig.json` `paths`). See §7.2 for `tsx` alias resolution in `tools/`.

### 6.5 Naming conventions (LAW)

- Test file = sibling `<module>.test.ts` for pure modules; cross-cutting tests under `tests/`.
- `describe('<exportedFnOrClass>')`; `it('<behaviour in present tense>')`.
- One assertion concept per `it`. No snapshot tests for logic.
- TDD order per step: write failing test → `npm test` (see red) → minimal impl → `npm test` (green) → `git commit` with a `test:`/`feat:` conventional message.

---

## 7. Scripts + pinned dependency versions

### 7.1 npm scripts (`package.json` — names are LAW)

```json
{
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
    "assets:icons": "tsx tools/gen-icons.ts",
    "assets:manifest": "tsx tools/asset-manifest.ts",
    "lint": "eslint src tools tests --ext .ts"
  }
}
```

### 7.2 Pinned versions (LAW — pin exact; re-test on real devices at each bump)

| Dependency | Version | Notes |
|---|---|---|
| `phaser` | `4.1.x` | "Salusa"; NOT v3, NOT 4.0.0. Mobile shader opt + WebGL context recovery. |
| `@capacitor/core` | `8.3.x` | Stable; defer v9 alpha. |
| `@capacitor/cli` | `8.3.x` | |
| `@capacitor/ios` | `8.3.x` | |
| `@capacitor/android` | `8.3.x` | Target+compile API 35+ (set in `android/variables.gradle` by M5); ship `.aab`; exclude AD_ID. |
| `@capacitor/app` | `8.x` | App `resume` event for AudioContext re-acquire. |
| `@capacitor/preferences` | `8.x` | `ProgressStore` device backend (no PII). |
| `@capacitor-community/native-audio` | latest compatible with Cap 8 | Critical voice prompts on device (bypasses WKWebView WebAudio defect). |
| `@capacitor/splash-screen` | `8.x` | Native splash (configured in M5). |
| `@capacitor/status-bar` | `8.x` | Edge-to-edge / status-bar styling (M5). |
| `@capacitor/haptics` | `8.x` | First-tap haptic (M5). |
| `vite` | `5.x` | Bundler; `base: './'`. |
| `vite-plugin-pwa` | `0.20.x` | PWA manifest + SW; **configured in M0** so M2 onward sees `dist/sw.js` + `dist/manifest.webmanifest`. |
| `typescript` | `5.x` | `strict: true`. |
| `vitest` | `2.x` | Unit tests. |
| `@vitest/coverage-v8` | `2.x` | Coverage. |
| `tsx` | `4.x` | Run `tools/` scripts. **Resolves the `@/` → `src/` tsconfig path alias natively at runtime (CJS + ESM, incl. from a subdirectory) — NO extra runtime resolver (e.g. tsconfig-paths) needed.** Verified for tsx 4.x. |
| `free-tex-packer-core` | `0.3.8` | Atlas packing (build-time, `tools/pack-atlas.ts`; `packAsync` Promise API; `removeFileExtension: true` + `prependFolderName: true` → frame keys = full SpriteKey). |
| `sharp` | latest compatible | Icon rasterization (`tools/gen-icons.ts`); transitive of free-tex-packer-core, pinned explicitly. |
| `eslint` + `@typescript-eslint/*` | `8.x` | Lint. |

**Alias resolution (decision 6):** `@/` → `src/` is resolved in three places — `vite.config.ts`/`vitest.config.ts` `resolve.alias` (app + tests), `tsconfig.json` `paths` (`tsc --noEmit` + editor), and `tsx` natively at runtime for `tools/` (no extra resolver). `tsconfig.json` `include` MUST cover both `src` and `tools` so `tsc --noEmit` type-checks the pipeline.

**Hard rules carried from the spec:** no analytics/ads/crash/font-CDN SDKs (`hasNoForbiddenSdks` enforces); `capacitor.config.ts` has NO `server.url`; zero networking code; AndroidManifest excludes `com.google.android.gms.permission.AD_ID`. AI art carries a human-editing checkpoint (`humanEdited: true` in the provenance manifest) and shipped audio is gated on a confirmed paid-ElevenLabs license (manifest `audioLicenseGate`) — both enforced by the M3 pipeline. Idle render-loop throttling (`installIdleThrottle` in `gameConfig.ts`, M2) + atlasing + WebGL mitigate spec §8 jank.

---

### Cross-reference index for milestone plans

- **Phase 0 (de-risk + scaffold):** uses `AudioService`/`NativeAudioBackend`/`AppLifecycle` (§3.1–3.6), `DragDropController` (§3.3), `audioQueue`/`dropValidation` pure modules (§6.1), `qa/checklists/phase0-*.md` (§6.2), pinned versions (§7.2). Owns: project scaffold, `vitest.config.ts` include incl. `tools/**` (§6.4), `vite-plugin-pwa` + native-shell plugin deps, `public/manifest.webmanifest`. Spike backend BODIES discarded; `AudioBackend` interface + `${cue.src}.m4a` assetPath survive (decision 7).
- **Phase 1 (shell services + UI factories):** all of §2, §3 (incl. Button §3.11 + Dialog §3.12), §5; pure modules per §6.1; `progressSerde.defaultSnapshot()` pins `volume: 1` (decision 10); `ProgressStore.resolveSeed` continuity helper (§3.5). NO scenes, NO `contentLoader.ts`.
- **Phase 2 (shell scenes + bootstrap):** sole author of `registry.ts`/`registry.test.ts` (§3.10, decision 5), `gameLoop.ts` (internal to `onSetComplete`, decision 1), `BaseGameScene` (§3.8), `HubScene` (non-stripping `frameOf`, decision 3), `BootScene`/`SettingsScene`/`ParentalGate`, `cueManifest.ts` (`SHELL_CUES`), `gameConfig.ts` (`installIdleThrottle`), `main.ts`. Depends on M1 `Button`/`Dialog`/`hubLayout`/`parentalChallenge` (no `contentLoader.ts` — decision 9).
- **Phase 3 (asset pipeline):** `tools/*` + `tools/lib/*` (§1, §6.1), `assets:*` scripts incl. `assets:icons` (§7.1), `public/assets/` + `public/icons/` outputs (§1), packer emits full-`SpriteKey` frame keys (decision 3), `style-guide.md`/`generation-sop.md`, provenance manifest with human-edit checkpoint + audio-license gate.
- **Phase 4 (three games):** `BaseGameScene` subclasses calling `this.onSetComplete()` (decision 1), per-game `*Logic.ts` validators (decision 9, §4), content.json with the four-color color-sort set (decision 4), confirms/extends `registry.ts` (decision 5), full-`SpriteKey` frames (decision 3).
- **Phase 5 (compliance + store launch):** §6.3 assertions + `tests/compliance/*`, `docs/privacy-policy.md`, `capacitor.config.ts`/AndroidManifest rules (§7.2), generates icons referenced by manifest, native-shell hardening (splash/status-bar/edge-to-edge/haptics), EDITS `android/variables.gradle` to API 35+, zero-outbound network trace, PWA offline verify (plugin configured in M0).
