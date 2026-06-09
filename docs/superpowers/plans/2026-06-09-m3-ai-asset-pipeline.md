# AI-Asset Pipeline (tools/) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the AI-asset pipeline as pure, unit-tested Node/TypeScript tooling (all run via `tsx`, never at app runtime). The pipeline turns AI-generated raw art + AI-generated raw audio into the **pre-baked, bundled** artifacts Phaser loads directly: transparent PNGs → per-game atlas PNG+JSON (frame keys equal to `SpriteKey` strings), compressed `.m4a`/`.ogg` audio (including the looping music bed), the PWA/store icon set, plus a per-asset provenance manifest with an enforced human-editing checkpoint and audio-license gate. It also commits the canonical look documentation: `assets/style-guide.md` (the ONE reusable prompt block + locked look rules) and the documented generation SOP for Nano Banana Pro (Gemini API) art + ElevenLabs audio (a manual/API procedure — NO runtime TTS, NO networking in the shipped app).

**Architecture:** Every script in `tools/` is split into (a) a **pure, framework-free** logic module (file discovery, command/arg construction, packer-config building, manifest read/write/merge/validation/license-gate, icon-spec building) that is unit-tested with Vitest under strict TDD, and (b) a **thin imperative shell** (the `tools/*.ts` entrypoint) that spawns the real CLI (`rembg`, `ffmpeg`), calls `free-tex-packer-core`, runs `sharp` for icons, and reads/writes the filesystem. Tests mock the CLI/child-process and filesystem boundaries; pure modules never spawn processes or touch real I/O. Outputs land under `public/assets/` (atlases + audio) and `public/icons/` per the canonical structure, and Phaser/PWA load them unchanged because Vite copies `public/` into `dist/`. The packer emits each frame keyed by the full `"<atlas>/<frame>"` SpriteKey (verified: `removeFileExtension: true` + `prependFolderName: true` over a folder-prefixed input path), so M4 scene `add.image(x, y, atlas, fullSpriteKey)` lookups match exactly.

**Tech Stack:** TypeScript 5.x (`strict: true`), `tsx` 4.x to run `tools/` (resolves the `@/` → `src/` tsconfig path alias natively — verified, no extra runtime resolver needed), Vitest 2.x (TDD), `free-tex-packer-core` **0.3.8** (atlas packing; `packAsync` Promise API), the `rembg` CLI (BiRefNet model, offline) for cutouts, `ffmpeg` for audio compression, and `sharp` (a transitive dependency of `free-tex-packer-core`, pinned explicitly here) for icon rasterization. AI generation is external/manual: Nano Banana Pro (Gemini 3 Pro Image) for art, ElevenLabs (PAID plan) for voice/SFX/music bed. No SDKs are added to the shipped app — all generation is operator-driven and documented in the SOP. References the canonical shared contracts (§1 paths, §2 types, §6.4 test include, §7 scripts/pins) verbatim.

---

## Prerequisites

- **M0 (repo scaffold + contracts):** required. This milestone consumes the canonical file structure (§1), the `SpriteKey`/`AtlasKey`/`AudioCue` types (§2.2–2.3), the `assets:*`/`lint`/`test` npm scripts (§7.1), the path alias `@/` → `src/`, and the Okabe-Ito tokens (§5.1) referenced by the color-sort art guidance.
- **Contract amendments this milestone depends on (must already be applied in M0 per the cross-cutting review):**
  - **§6.4 vitest include** MUST be `['src/**/*.test.ts', 'tests/**/*.test.ts', 'tools/**/*.test.ts']` so the standard `npm test` (`vitest run`) discovers the pipeline tests. M0's `vitest.config.ts` MUST include this third glob.
  - **§7.2 dependency pins** MUST list `free-tex-packer-core` as **`0.3.8`** (exact, not `latest` — its default export callback is `cb(result, error)` and the safer `packAsync(images, options)` Promise API is used here) and MUST add **`sharp`** (icon rasterization; `^0.34.x`).
  - **tsconfig `include`** MUST cover `tools` and define `paths: { "@/*": ["src/*"] }` so both `tsc --noEmit` and `tsx` resolve `@/`. (Verified: tsx 4.x resolves this alias at runtime with no extra resolver, in both CJS and ESM, including from a subdirectory.)
- **No hard dependency on M1 (shell) or later game milestones:** this milestone may run **in parallel**. It produces inputs the games consume but imports no Phaser shell code. The `@/types` import is type-only (`AtlasKey`/`SpriteKey`), which exists after M0.
- **External prerequisites (operator machine, documented in the SOP — NOT installed or required by the test suite):** `rembg` CLI with the BiRefNet model, `ffmpeg` on `PATH`, a Gemini API key for Nano Banana Pro, an ElevenLabs **paid** plan key. None are needed to run Vitest — all CLI/network boundaries are mocked or absent in tests.

---

## Files

Pure logic modules (unit-tested, strict TDD), thin entrypoints, docs, and tests. All paths canonical per §1.

**Pure logic modules (framework-free; no `phaser`, no real I/O, no `child_process`):**
- `tools/lib/spriteName.ts` — pure: derive atlas key + frame name + the full `SpriteKey` (`"<atlas>/<frame>"`) and the packer key-path (`"<atlas>/<frame>.png"`) from a disk path. (create)
- `tools/lib/fsScan.ts` — pure file-discovery: filter dirent names to source images/audio by extension; derive cutout/audio output paths. (create)
- `tools/lib/rembgCmd.ts` — pure builder: given an input image path + options, return the `rembg` argv array and output path. (create)
- `tools/lib/atlasConfig.ts` — pure builder: given an `AtlasKey` + input disk paths, return the `free-tex-packer-core` `packAsync` options object, the per-file `{ diskPath, keyPath }` list (keyPath = `<atlas>/<frame>.png`), and the expected output filenames; emitted frame keys equal SpriteKeys. (create)
- `tools/lib/audioCmd.ts` — pure builder: given an input audio path + codec opts, return the `ffmpeg` argv for `.m4a` and `.ogg` encodes + output paths. (create)
- `tools/lib/iconSpec.ts` — pure builder: given a source square master path, return the list of `{ size, maskable, outputPath, sharpResize }` icon specs for the PWA/store set. (create)
- `tools/lib/manifest.ts` — pure: `AssetProvenance` type, `emptyManifest`, `parseManifest`, `serializeManifest`, `mergeManifest`, `upsertEntry`, `validateManifest`, `audioLicenseGate`. (create)

**Thin imperative entrypoints (NOT unit-tested; covered by SOP + manual run + `tsc --noEmit`):**
- `tools/remove-bg.ts` — scans `assets/raw/`, spawns `rembg` per file, writes transparent PNGs to `assets/cutouts/`. (create)
- `tools/pack-atlas.ts` — packs `assets/cutouts/<atlas>/` into `public/assets/atlases/<atlas>.png` + `.json` via `free-tex-packer-core` `packAsync`. (create)
- `tools/compress-audio.ts` — scans `assets/audio-raw/`, spawns `ffmpeg`, writes `.m4a` + `.ogg` to `public/assets/audio/`. (create)
- `tools/gen-icons.ts` — rasterizes `assets/icon-master.png` into the PWA/store icon set under `public/icons/` via `sharp`. (create)
- `tools/asset-manifest.ts` — reads/merges/writes the provenance manifest at `assets/asset-manifest.json`; enforces the audio-license gate. (create)

**Docs (canonical look + SOP):**
- `assets/style-guide.md` — the ONE reusable prompt block, locked look rules, colorblind-safe color-sort guidance, AI-copyright/human-editing hygiene. (create)
- `assets/generation-sop.md` — step-by-step manual/API procedure for Nano Banana Pro art + ElevenLabs audio (incl. music bed + icons); the "no runtime TTS / no network in app" rule; the human-editing checkpoint; the audio-license gate. (create)

**Tests (co-located per §6.5; discovered by the `tools/**/*.test.ts` include in §6.4):**
- `tools/lib/spriteName.test.ts`, `tools/lib/fsScan.test.ts`, `tools/lib/rembgCmd.test.ts`, `tools/lib/atlasConfig.test.ts`, `tools/lib/audioCmd.test.ts`, `tools/lib/iconSpec.test.ts`, `tools/lib/manifest.test.ts`. (create)

---

### Task 1: `assets/style-guide.md` — the ONE reusable prompt block + locked look rules

**Files:** `assets/style-guide.md` (create)

- [ ] **Create `assets/style-guide.md`** with the exact content below. This is the canonical, committed look document referenced by every art batch (spec §6.1, §5). No code; concrete content.

````markdown
# Ehaan Games — Visual Style Guide (LOCKED)

> This is the single source of truth for the visual look of every asset in the
> catalog. It prevents drift across batches and games. Do not deviate without
> updating this file first. Audience: children aged 2–5. App is fully offline,
> no ads, no IAP, zero data collection.

## 1. The ONE reusable prompt block (paste verbatim into Nano Banana Pro)

Use this EXACT block as the prefix of every art-generation prompt. Append only
the subject (e.g. "a red apple", "a friendly cat") after it.

```
flat vector children's-book illustration, thick rounded outlines, soft pastel
palette, simple bold shapes, single centered subject, plain opaque off-white
background (#F7F4EC), no text, no letters, no watermark, no shadow on the
background, friendly and calm, gentle and non-scary, symmetrical and clear
silhouette, high readability at small size — subject:
```

## 2. Locked look rules (LAW)

- Single centered subject, square frame (1:1), subject fills ~70% of frame.
- Plain OPAQUE background (#F7F4EC) — never transparent at generation time;
  transparency is added later by `tools/remove-bg.ts`.
- Thick rounded outlines; no thin hairline features that a cutout would lose.
- Soft pastel palette; no harsh neon; no photorealism; no 3D render look.
- No text, letters, numbers, logos, or watermarks anywhere in the image.
- Friendly, calm, non-scary. No teeth, no aggressive poses, no fear cues.
- Clear, simple silhouette that reads at ~96px on a small screen.
- Generate at ~2× the maximum on-screen size, then downscale during packing.

## 3. Reference set

Commit 3–5 fixed reference images under `assets/references/` and pass them to
Nano Banana Pro (supports up to 14 reference images) on EVERY generation so
subject identity + style stay locked across the catalog. Never regenerate the
reference set casually; treat it as a versioned contract.

## 4. Color-sort assets — colorblind-safe guidance (HARD REQUIREMENT)

Color-sort accessibility is a requirement, not polish. For every color category:

- Color comes from the Okabe-Ito colorblind-safe palette ONLY. The eight tokens
  (see `src/shell/ui/theme.ts`, §5.1 of the shared contracts):
  oiBlack #000000, oiOrange #E69F00, oiSkyBlue #56B4E9, oiBluishGreen #009E73,
  oiYellow #F0E442, oiBlue #0072B2, oiVermillion #D55E00, oiReddishPurple #CC79A7.
- EVERY color is paired with a REDUNDANT non-color cue, rendered on BOTH the
  item and its bin: a distinct shape OUTLINE + a distinct fill PATTERN + a
  distinct ICON glyph. No two categories may share any cue dimension.
- Keep ≥3:1 contrast between subject and the app background. Light tokens like
  oiYellow MUST carry a thick dark outline so the COMPOSITE (outline + fill)
  meets contrast; the contrast utility in `src/shell/ui/color.ts` evaluates the
  dark-outline composite per the shared contract §4.1 resolution.
- Never place adjacent red/green or blue/purple bins (forbidden adjacency pairs
  enforced by `assertNoForbiddenAdjacency`, §5.2).
- This serves colorblind children AND the ~8% of fathers who are colorblind
  playing alongside them.

When generating color-sort art, the prompt subject MUST name the shape, pattern,
and icon explicitly, e.g.:
"a blue circle bin with a solid fill, a thick dark outline, and a small circle icon".

## 5. AI-copyright & human-editing hygiene (LAW)

- Purely AI-generated art is NOT copyrightable in the US (SCOTUS denied cert,
  Mar 2, 2026). Add MEANINGFUL human editing/compositing to every final art
  asset (recolor, recompose, hand-tweak outlines, combine elements) so a
  human-authored work exists. This is a REQUIRED pipeline checkpoint, not a
  manifest formality: the human-edit step happens AFTER cutout and BEFORE
  packing, and is recorded in the provenance manifest (`humanEdited: true` + a
  one-line note describing the edit). `npm run assets:manifest` fails if any
  art entry has `humanEdited: false`.
- Treat the SHELL + CATALOG + BRAND as the protectable value, not individual
  sprites.
- Static, pre-baked assets sit outside Google Play's runtime-AI-content policy
  — correct for an offline Families app. NEVER call an AI model at app runtime.
- Confirm a PAID ElevenLabs plan (royalty-free, no attribution) before shipping
  any voice/SFX/music. The manifest license gate blocks shipping audio without a
  confirmed paid-plan license string (see `tools/lib/manifest.ts` audioLicenseGate).
- Log model + prompt + date + license per asset (see `tools/asset-manifest.ts`).
````

- [ ] **Commit.** `git add assets/style-guide.md && git commit -m "docs: add locked visual style guide with one reusable prompt block and colorblind-safe color-sort guidance"`
  - Expected: one file committed; `git status` shows the path clean.

---

### Task 2: `assets/generation-sop.md` — manual/API generation procedure (Nano Banana Pro + ElevenLabs + icons)

**Files:** `assets/generation-sop.md` (create)

- [ ] **Create `assets/generation-sop.md`** with the exact content below. This documents the OPERATOR procedure (manual/API, never run by the app or the test suite). It pins the "no runtime TTS, no network" rule, the human-editing checkpoint, the music-bed asset, the icon set, and the audio-license gate, and feeds the pipeline scripts.

````markdown
# Ehaan Games — Asset Generation SOP (operator procedure)

> This is a MANUAL / API procedure run by a human operator on a workstation. It
> is NOT executed at app runtime and NOT executed by the Vitest suite. The
> shipped app bundles ONLY pre-baked files. There is NO runtime TTS and NO
> networking code in the app. (Spec §6, §7.)

## 0. One-time setup (operator machine only)

- Install `rembg` CLI with the BiRefNet model (offline, no per-image cost).
- Install `ffmpeg` on PATH.
- Obtain a Gemini API key (Nano Banana Pro / Gemini 3 Pro Image).
- Obtain a PAID ElevenLabs plan API key (royalty-free, no attribution).
- These secrets live ONLY on the operator machine / in Vaultwarden. They are
  NEVER committed and NEVER shipped in the app bundle.

## 1. Lock the look (once per catalog; re-confirm per batch)

- Read `assets/style-guide.md`. Use the ONE reusable prompt block verbatim.
- Confirm `assets/references/` holds the 3–5 fixed reference images.

## 2. Generate art — Nano Banana Pro (Gemini 3 Pro Image), via Gemini API

For each subject:
1. Prompt = the reusable block (style-guide §1) + the subject.
2. Attach ALL committed reference images (up to 14) to lock identity + style.
3. Request a square, opaque-background image at ~2× max on-screen size.
4. Record the seed/reference set used.
5. Save the raw PNG to `assets/raw/<atlas>/<frame>.png`, where `<atlas>` is one
   of `shared | color-sort | item-sort | item-match` and `<frame>` is the
   sprite frame name. The resulting SpriteKey will be `"<atlas>/<frame>"`.
6. Color-sort subjects MUST name shape + pattern + icon explicitly, use only
   Okabe-Ito colors, and give light tokens a thick dark outline (style-guide §4).

## 3. Cut out backgrounds — `npm run assets:rembg`

Runs `tools/remove-bg.ts`: scans `assets/raw/`, calls the `rembg` CLI
(BiRefNet) per file, writes transparent PNGs to `assets/cutouts/<atlas>/`.
Visually QA every cutout for halos / lost thin features; re-generate art if a
thin feature was lost (style-guide §2).

## 4. HUMAN-EDITING CHECKPOINT (REQUIRED — legal hygiene)

Before packing, apply MEANINGFUL human editing/compositing to every final art
cutout (recolor, recompose, hand-tweak outlines, combine elements) so a
human-authored work exists (style-guide §5). For EACH art asset, stage a
provenance entry with `humanEdited: true` and a one-line note in
`assets/asset-manifest.staged.json`. `npm run assets:manifest` FAILS if any art
entry has `humanEdited: false`, so this checkpoint cannot be skipped silently.

## 5. Pack atlases — `npm run assets:atlas`

Runs `tools/pack-atlas.ts`: packs `assets/cutouts/<atlas>/` into
`public/assets/atlases/<atlas>.png` + `<atlas>.json` via
`free-tex-packer-core`. The packed JSON `frames` keys are the FULL
`"<atlas>/<frame>"` SpriteKey strings (Phaser scenes look up frames by the full
SpriteKey). Run once; the tool packs every atlas with cutouts.

## 6. Generate audio — ElevenLabs (voice + SFX + music bed)

- ONE warm, youthful/playful ADULT narrator (NOT a synthetic-child voice) for
  every voice prompt. AudioCue ids and `src` paths come from the shared AudioCue
  declarations (§2.3); voice prompts are `critical: true`.
- Short SFX: pickup / snap / correct / wrong.
- A low-key LOOPING music bed (ElevenLabs music, or Stable Audio for cleanest
  license). Author it to loop seamlessly (no click at the loop point); it plays
  via WebAudioBackend with `loop: true`.
- Save raw audio to `assets/audio-raw/<name>.wav` (or source format). The music
  bed source is `assets/audio-raw/music-bed.wav`.
- LICENSE GATE: every audio provenance entry MUST carry a license string that
  contains "paid" (e.g. "ElevenLabs paid plan, royalty-free"). The manifest tool
  blocks the manifest write if any audio entry lacks a paid-plan license.

## 7. Compress audio — `npm run assets:audio`

Runs `tools/compress-audio.ts`: scans `assets/audio-raw/`, calls `ffmpeg` to
encode small `.m4a` (AAC) AND `.ogg` (Vorbis) per file, writes to
`public/assets/audio/<name>.m4a` + `.ogg`. The AudioCue `src` is the base path
WITHOUT extension; backends append `.m4a` / `.ogg` (§2.3).

## 8. Generate PWA/store icons — `npm run assets:icons`

1. Produce ONE square master icon at ≥1024×1024 with safe margins, save it to
   `assets/icon-master.png` (run it through the human-editing checkpoint too).
2. Run `npm run assets:icons`: `tools/gen-icons.ts` rasterizes the master into
   `public/icons/icon-192.png`, `icon-512.png`, and `icon-512-maskable.png`
   (maskable variant padded into the safe zone) via `sharp`. The PWA manifest
   (`public/manifest.webmanifest`) references these exact filenames.

## 9. Record provenance — `npm run assets:manifest`

Runs `tools/asset-manifest.ts`: merges `assets/asset-manifest.staged.json` into
`assets/asset-manifest.json` with model + prompt + date + license + humanEdited
note per asset. ENFORCES: every art entry `humanEdited: true`; every audio entry
license contains "paid". Fails the run otherwise. This is the legal hygiene log.

## 10. Hard rules carried from the spec (LAW)

- No runtime TTS. No network calls in the app. Bundle pre-baked files only.
- No analytics/ads/crash/font-CDN SDKs are added to the app for any of this.
- Generation secrets never enter the repo or the app bundle.
````

- [ ] **Commit.** `git add assets/generation-sop.md && git commit -m "docs: add asset-generation SOP for Nano Banana Pro art and ElevenLabs audio with no-runtime-TTS rule, human-edit checkpoint, music bed, icons, and audio-license gate"`
  - Expected: one file committed.

---

### Task 3: `tools/lib/spriteName.ts` — pure frame-name + SpriteKey + packer key-path derivation

**Files:** `tools/lib/spriteName.ts` (create), `tools/lib/spriteName.test.ts` (create)

- [ ] **Write the failing test** `tools/lib/spriteName.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  frameNameFromPath,
  atlasFromPath,
  spriteKeyFromPath,
  packerKeyPathFromPath,
} from './spriteName';

describe('frameNameFromPath', () => {
  it('returns the basename without extension', () => {
    expect(frameNameFromPath('assets/cutouts/item-sort/apple.png')).toBe('apple');
  });
  it('preserves hyphenated frame names', () => {
    expect(frameNameFromPath('assets/cutouts/color-sort/bin-blue.png')).toBe('bin-blue');
  });
});

describe('atlasFromPath', () => {
  it('reads the atlas key from the parent directory', () => {
    expect(atlasFromPath('assets/cutouts/item-match/sun.png')).toBe('item-match');
  });
  it('throws on an unknown atlas directory', () => {
    expect(() => atlasFromPath('assets/cutouts/nope/x.png')).toThrow(/unknown atlas/i);
  });
});

describe('spriteKeyFromPath', () => {
  it('builds the full "<atlas>/<frame>" SpriteKey', () => {
    expect(spriteKeyFromPath('assets/cutouts/shared/btn-back.png')).toBe('shared/btn-back');
  });
});

describe('packerKeyPathFromPath', () => {
  it('builds "<atlas>/<frame>.png" for the free-tex-packer input path', () => {
    expect(packerKeyPathFromPath('assets/cutouts/item-sort/apple.png')).toBe('item-sort/apple.png');
  });
  it('always uses a .png extension regardless of the source extension', () => {
    expect(packerKeyPathFromPath('assets/cutouts/shared/logo.jpg')).toBe('shared/logo.png');
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/spriteName.test.ts`
  - Expected failure: `Failed to resolve import "./spriteName"` — the module does not exist yet (suite reports the file as failed to collect).

- [ ] **Write the minimal implementation** `tools/lib/spriteName.ts`:

```ts
import type { AtlasKey, SpriteKey } from '@/types';

const ATLASES: readonly AtlasKey[] = ['shared', 'color-sort', 'item-sort', 'item-match'];

/** Basename without extension. */
export function frameNameFromPath(filePath: string): string {
  const base = filePath.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot === -1 ? base : base.slice(0, dot);
}

/** Atlas key from the parent directory name. */
export function atlasFromPath(filePath: string): AtlasKey {
  const parts = filePath.split('/');
  const dir = parts[parts.length - 2];
  if (!ATLASES.includes(dir as AtlasKey)) {
    throw new Error(`unknown atlas directory: "${dir}" in ${filePath}`);
  }
  return dir as AtlasKey;
}

/** Full "<atlas>/<frame>" SpriteKey (the exact key Phaser looks up). */
export function spriteKeyFromPath(filePath: string): SpriteKey {
  return `${atlasFromPath(filePath)}/${frameNameFromPath(filePath)}` as SpriteKey;
}

/**
 * Path handed to free-tex-packer-core as the per-file `path`. With
 * removeFileExtension:true + prependFolderName:true, the packer emits the
 * frame key "<atlas>/<frame>" (== SpriteKey), so the input must be
 * "<atlas>/<frame>.png".
 */
export function packerKeyPathFromPath(filePath: string): string {
  return `${atlasFromPath(filePath)}/${frameNameFromPath(filePath)}.png`;
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/spriteName.test.ts`
  - Expected: `Test Files 1 passed`, `Tests 7 passed`.

- [ ] **Commit.** `git add tools/lib/spriteName.ts tools/lib/spriteName.test.ts && git commit -m "feat: add pure sprite-key and packer-key-path derivation for asset pipeline"`

---

### Task 4: `tools/lib/fsScan.ts` — pure file discovery + output-path derivation

**Files:** `tools/lib/fsScan.ts` (create), `tools/lib/fsScan.test.ts` (create)

- [ ] **Write the failing test** `tools/lib/fsScan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterImages, filterAudio, cutoutOutputPath, audioOutputBase } from './fsScan';

describe('filterImages', () => {
  it('keeps .png and .jpg, drops everything else, sorted', () => {
    const input = ['b.png', 'note.txt', 'a.PNG', 'c.jpg', '.DS_Store'];
    expect(filterImages(input)).toEqual(['a.PNG', 'b.png', 'c.jpg']);
  });
  it('returns an empty array for no matches', () => {
    expect(filterImages(['readme.md'])).toEqual([]);
  });
});

describe('filterAudio', () => {
  it('keeps .wav/.mp3/.m4a source audio, sorted', () => {
    expect(filterAudio(['s.mp3', 'x.png', 'a.wav', 'b.M4A'])).toEqual(['a.wav', 'b.M4A', 's.mp3']);
  });
});

describe('cutoutOutputPath', () => {
  it('maps assets/raw/<atlas>/<f>.jpg to assets/cutouts/<atlas>/<f>.png', () => {
    expect(cutoutOutputPath('assets/raw/item-sort/apple.jpg')).toBe('assets/cutouts/item-sort/apple.png');
  });
});

describe('audioOutputBase', () => {
  it('maps assets/audio-raw/<n>.wav to public/assets/audio/<n> (no ext)', () => {
    expect(audioOutputBase('assets/audio-raw/cs-intro.wav')).toBe('public/assets/audio/cs-intro');
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/fsScan.test.ts`
  - Expected failure: `Failed to resolve import "./fsScan"` — module missing.

- [ ] **Write the minimal implementation** `tools/lib/fsScan.ts`:

```ts
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);
const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.flac']);

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/** Keep only image files (case-insensitive), sorted ascending. */
export function filterImages(names: readonly string[]): string[] {
  return names.filter((n) => IMAGE_EXT.has(extOf(n))).sort();
}

/** Keep only source-audio files (case-insensitive), sorted ascending. */
export function filterAudio(names: readonly string[]): string[] {
  return names.filter((n) => AUDIO_EXT.has(extOf(n))).sort();
}

/** assets/raw/<atlas>/<frame>.<ext> -> assets/cutouts/<atlas>/<frame>.png */
export function cutoutOutputPath(rawPath: string): string {
  const noExt = rawPath.replace(/\.[^./]+$/, '');
  return noExt.replace(/^assets\/raw\//, 'assets/cutouts/') + '.png';
}

/** assets/audio-raw/<name>.<ext> -> public/assets/audio/<name> (extension-less base) */
export function audioOutputBase(rawPath: string): string {
  const noExt = rawPath.replace(/\.[^./]+$/, '');
  return noExt.replace(/^assets\/audio-raw\//, 'public/assets/audio/');
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/fsScan.test.ts`
  - Expected: `Tests 5 passed`.

- [ ] **Commit.** `git add tools/lib/fsScan.ts tools/lib/fsScan.test.ts && git commit -m "feat: add pure file-discovery and output-path derivation for asset pipeline"`

---

### Task 5: `tools/lib/rembgCmd.ts` — pure `rembg` argv builder

**Files:** `tools/lib/rembgCmd.ts` (create), `tools/lib/rembgCmd.test.ts` (create)

- [ ] **Write the failing test** `tools/lib/rembgCmd.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRembgCommand } from './rembgCmd';

describe('buildRembgCommand', () => {
  it('builds rembg argv with the BiRefNet model and post-process alpha', () => {
    const cmd = buildRembgCommand('assets/raw/item-sort/apple.png');
    expect(cmd.bin).toBe('rembg');
    expect(cmd.args).toEqual([
      'i',
      '-m', 'birefnet-general',
      '-a',
      'assets/raw/item-sort/apple.png',
      'assets/cutouts/item-sort/apple.png',
    ]);
    expect(cmd.outputPath).toBe('assets/cutouts/item-sort/apple.png');
  });

  it('honors a custom model name', () => {
    const cmd = buildRembgCommand('assets/raw/shared/x.png', { model: 'birefnet-portrait' });
    expect(cmd.args).toContain('birefnet-portrait');
  });

  it('omits the alpha-matting flag when disabled', () => {
    const cmd = buildRembgCommand('assets/raw/shared/x.png', { alphaMatting: false });
    expect(cmd.args).not.toContain('-a');
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/rembgCmd.test.ts`
  - Expected failure: `Failed to resolve import "./rembgCmd"`.

- [ ] **Write the minimal implementation** `tools/lib/rembgCmd.ts`:

```ts
import { cutoutOutputPath } from './fsScan';

export interface RembgOptions {
  /** BiRefNet model name (offline). */
  model?: string;
  /** Alpha-matting post-process for clean edges. */
  alphaMatting?: boolean;
}

export interface RembgCommand {
  bin: 'rembg';
  args: string[];
  outputPath: string;
}

/** Build the rembg CLI invocation for a single raw image (pure; no spawning). */
export function buildRembgCommand(rawPath: string, opts: RembgOptions = {}): RembgCommand {
  const model = opts.model ?? 'birefnet-general';
  const alphaMatting = opts.alphaMatting ?? true;
  const outputPath = cutoutOutputPath(rawPath);
  const args = ['i', '-m', model];
  if (alphaMatting) args.push('-a');
  args.push(rawPath, outputPath);
  return { bin: 'rembg', args, outputPath };
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/rembgCmd.test.ts`
  - Expected: `Tests 3 passed`.

- [ ] **Commit.** `git add tools/lib/rembgCmd.ts tools/lib/rembgCmd.test.ts && git commit -m "feat: add pure rembg command builder for background removal"`

---

### Task 6: `tools/lib/atlasConfig.ts` — pure `free-tex-packer-core` config builder (frame keys == SpriteKeys)

**Files:** `tools/lib/atlasConfig.ts` (create), `tools/lib/atlasConfig.test.ts` (create)

> The packer (`free-tex-packer-core@0.3.8`, JsonHash exporter) derives each frame key from the per-file `path` after applying `removeFileExtension` + `prependFolderName`. **Verified empirically:** with `path: '<atlas>/<frame>.png'`, `removeFileExtension: true`, `prependFolderName: true`, the emitted `frames` keys are exactly `"<atlas>/<frame>"` (== SpriteKey). Any `name` field on the input object is ignored. So this builder produces `path` (the key-path) separately from the on-disk read path the entrypoint uses.

- [ ] **Write the failing test** `tools/lib/atlasConfig.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAtlasConfig, atlasOutputPaths } from './atlasConfig';

describe('atlasOutputPaths', () => {
  it('writes <atlas>.png + <atlas>.json under public/assets/atlases', () => {
    expect(atlasOutputPaths('color-sort')).toEqual({
      png: 'public/assets/atlases/color-sort.png',
      json: 'public/assets/atlases/color-sort.json',
    });
  });
});

describe('buildAtlasConfig', () => {
  const frames = [
    'assets/cutouts/item-sort/apple.png',
    'assets/cutouts/item-sort/cat.png',
  ];

  it('targets the Phaser JsonHash exporter with trim + padding + full-key options', () => {
    const cfg = buildAtlasConfig('item-sort', frames);
    expect(cfg.options.textureName).toBe('item-sort');
    expect(cfg.options.exporter).toBe('JsonHash');
    expect(cfg.options.allowTrim).toBe(true);
    expect(cfg.options.trimMode).toBe('trim');
    expect(cfg.options.padding).toBe(2);
    expect(cfg.options.extrude).toBe(1);
    expect(cfg.options.powerOfTwo).toBe(true);
    // These two together make the emitted frame key equal the full SpriteKey:
    expect(cfg.options.removeFileExtension).toBe(true);
    expect(cfg.options.prependFolderName).toBe(true);
  });

  it('pairs each cutout disk path with a packer key-path "<atlas>/<frame>.png"', () => {
    const cfg = buildAtlasConfig('item-sort', frames);
    expect(cfg.files.map((f) => f.diskPath)).toEqual(frames);
    expect(cfg.files.map((f) => f.keyPath)).toEqual(['item-sort/apple.png', 'item-sort/cat.png']);
    // The eventual frame keys (== SpriteKey) the packer will emit:
    expect(cfg.files.map((f) => f.spriteKey)).toEqual(['item-sort/apple', 'item-sort/cat']);
  });

  it('throws when no frames are provided', () => {
    expect(() => buildAtlasConfig('shared', [])).toThrow(/no frames/i);
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/atlasConfig.test.ts`
  - Expected failure: `Failed to resolve import "./atlasConfig"`.

- [ ] **Write the minimal implementation** `tools/lib/atlasConfig.ts`:

```ts
import type { AtlasKey, SpriteKey } from '@/types';
import { packerKeyPathFromPath, spriteKeyFromPath } from './spriteName';

export interface AtlasFileInput {
  /** On-disk path the entrypoint reads bytes from. */
  diskPath: string;
  /** Path handed to the packer as `path`; with the options below -> frame key. */
  keyPath: string;
  /** The frame key the packer will emit (== SpriteKey) — for assertions. */
  spriteKey: SpriteKey;
}

export interface AtlasPackerOptions {
  textureName: AtlasKey;
  exporter: 'JsonHash';
  allowTrim: boolean;
  trimMode: 'trim';
  padding: number;
  extrude: number;
  powerOfTwo: boolean;
  /** true: drop ".png" from the emitted key. */
  removeFileExtension: boolean;
  /** true: keep the "<atlas>/" folder in the emitted key (full SpriteKey). */
  prependFolderName: boolean;
}

export interface AtlasConfig {
  files: AtlasFileInput[];
  options: AtlasPackerOptions;
}

export function atlasOutputPaths(atlas: AtlasKey): { png: string; json: string } {
  return {
    png: `public/assets/atlases/${atlas}.png`,
    json: `public/assets/atlases/${atlas}.json`,
  };
}

/** Build the free-tex-packer-core packAsync input (pure; does not pack). */
export function buildAtlasConfig(atlas: AtlasKey, framePaths: readonly string[]): AtlasConfig {
  if (framePaths.length === 0) {
    throw new Error(`no frames to pack for atlas "${atlas}"`);
  }
  const files: AtlasFileInput[] = framePaths.map((diskPath) => ({
    diskPath,
    keyPath: packerKeyPathFromPath(diskPath),
    spriteKey: spriteKeyFromPath(diskPath),
  }));
  const options: AtlasPackerOptions = {
    textureName: atlas,
    exporter: 'JsonHash',
    allowTrim: true,
    trimMode: 'trim',
    padding: 2,
    extrude: 1,
    powerOfTwo: true,
    removeFileExtension: true,
    prependFolderName: true,
  };
  return { files, options };
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/atlasConfig.test.ts`
  - Expected: `Tests 4 passed`.

- [ ] **Commit.** `git add tools/lib/atlasConfig.ts tools/lib/atlasConfig.test.ts && git commit -m "feat: add pure free-tex-packer config builder emitting full SpriteKey frame keys"`

---

### Task 7: `tools/lib/audioCmd.ts` — pure `ffmpeg` argv builder (.m4a + .ogg)

**Files:** `tools/lib/audioCmd.ts` (create), `tools/lib/audioCmd.test.ts` (create)

- [ ] **Write the failing test** `tools/lib/audioCmd.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAudioCommands } from './audioCmd';

describe('buildAudioCommands', () => {
  it('produces an AAC .m4a and a Vorbis .ogg encode for one source', () => {
    const cmds = buildAudioCommands('assets/audio-raw/cs-intro.wav');
    expect(cmds).toHaveLength(2);

    const m4a = cmds.find((c) => c.outputPath.endsWith('.m4a'))!;
    expect(m4a.bin).toBe('ffmpeg');
    expect(m4a.outputPath).toBe('public/assets/audio/cs-intro.m4a');
    expect(m4a.args).toEqual([
      '-y',
      '-i', 'assets/audio-raw/cs-intro.wav',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ar', '44100',
      'public/assets/audio/cs-intro.m4a',
    ]);

    const ogg = cmds.find((c) => c.outputPath.endsWith('.ogg'))!;
    expect(ogg.args).toEqual([
      '-y',
      '-i', 'assets/audio-raw/cs-intro.wav',
      '-c:a', 'libvorbis',
      '-qscale:a', '4',
      '-ar', '44100',
      'public/assets/audio/cs-intro.ogg',
    ]);
  });

  it('honors a custom AAC bitrate', () => {
    const cmds = buildAudioCommands('assets/audio-raw/sfx-snap.wav', { aacBitrate: '64k' });
    const m4a = cmds.find((c) => c.outputPath.endsWith('.m4a'))!;
    expect(m4a.args).toContain('64k');
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/audioCmd.test.ts`
  - Expected failure: `Failed to resolve import "./audioCmd"`.

- [ ] **Write the minimal implementation** `tools/lib/audioCmd.ts`:

```ts
import { audioOutputBase } from './fsScan';

export interface AudioOptions {
  /** AAC bitrate for the .m4a encode. */
  aacBitrate?: string;
  /** Vorbis quality scale (0..10) for the .ogg encode. */
  vorbisQuality?: string;
  /** Output sample rate in Hz. */
  sampleRate?: string;
}

export interface AudioCommand {
  bin: 'ffmpeg';
  args: string[];
  outputPath: string;
}

/** Build the ffmpeg invocations (.m4a + .ogg) for one source file (pure; no spawning). */
export function buildAudioCommands(rawPath: string, opts: AudioOptions = {}): AudioCommand[] {
  const aacBitrate = opts.aacBitrate ?? '96k';
  const vorbisQuality = opts.vorbisQuality ?? '4';
  const sampleRate = opts.sampleRate ?? '44100';
  const base = audioOutputBase(rawPath);

  const m4a: AudioCommand = {
    bin: 'ffmpeg',
    outputPath: `${base}.m4a`,
    args: ['-y', '-i', rawPath, '-c:a', 'aac', '-b:a', aacBitrate, '-ar', sampleRate, `${base}.m4a`],
  };
  const ogg: AudioCommand = {
    bin: 'ffmpeg',
    outputPath: `${base}.ogg`,
    args: ['-y', '-i', rawPath, '-c:a', 'libvorbis', '-qscale:a', vorbisQuality, '-ar', sampleRate, `${base}.ogg`],
  };
  return [m4a, ogg];
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/audioCmd.test.ts`
  - Expected: `Tests 2 passed`.

- [ ] **Commit.** `git add tools/lib/audioCmd.ts tools/lib/audioCmd.test.ts && git commit -m "feat: add pure ffmpeg command builder for dual-codec audio encoding"`

---

### Task 8: `tools/lib/iconSpec.ts` — pure PWA/store icon spec builder

**Files:** `tools/lib/iconSpec.ts` (create), `tools/lib/iconSpec.test.ts` (create)

> Closes the spec §4.3 icon gap. The PWA manifest (`public/manifest.webmanifest`, authored in M1) references `icons/icon-192.png`, `icons/icon-512.png`, and `icons/icon-512-maskable.png`. This pure builder yields the exact size/output/resize spec the entrypoint feeds to `sharp`.

- [ ] **Write the failing test** `tools/lib/iconSpec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildIconSpecs } from './iconSpec';

describe('buildIconSpecs', () => {
  const specs = buildIconSpecs('assets/icon-master.png');

  it('emits the 192, 512, and 512-maskable PWA icons under public/icons', () => {
    expect(specs.map((s) => s.outputPath)).toEqual([
      'public/icons/icon-192.png',
      'public/icons/icon-512.png',
      'public/icons/icon-512-maskable.png',
    ]);
  });

  it('resizes square to the target size for non-maskable icons', () => {
    const i192 = specs.find((s) => s.outputPath.endsWith('icon-192.png'))!;
    expect(i192.size).toBe(192);
    expect(i192.maskable).toBe(false);
    expect(i192.resize).toEqual({ width: 192, height: 192, fit: 'contain' });
  });

  it('pads the maskable icon into the ~80% safe zone', () => {
    const mask = specs.find((s) => s.maskable)!;
    expect(mask.size).toBe(512);
    // 512 * 0.8 = 410 (rounded) inner content, centered.
    expect(mask.resize.width).toBe(410);
    expect(mask.resize.height).toBe(410);
    expect(mask.extendToCanvas).toBe(512);
  });

  it('reads from the provided master path', () => {
    expect(specs.every((s) => s.sourcePath === 'assets/icon-master.png')).toBe(true);
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/iconSpec.test.ts`
  - Expected failure: `Failed to resolve import "./iconSpec"`.

- [ ] **Write the minimal implementation** `tools/lib/iconSpec.ts`:

```ts
export interface IconResize {
  width: number;
  height: number;
  fit: 'contain';
}

export interface IconSpec {
  sourcePath: string;
  size: number;
  maskable: boolean;
  /** Inner content resize (smaller than `size` for maskable safe zone). */
  resize: IconResize;
  /** If set, the inner content is centered on a transparent canvas of this edge. */
  extendToCanvas?: number;
  outputPath: string;
}

/** Maskable safe-zone fraction (content occupies ~80% of the canvas). */
const MASKABLE_SAFE = 0.8;

/** Build the icon raster specs for the PWA/store set (pure; no I/O). */
export function buildIconSpecs(masterPath: string): IconSpec[] {
  const inner = Math.round(512 * MASKABLE_SAFE); // 410
  return [
    {
      sourcePath: masterPath,
      size: 192,
      maskable: false,
      resize: { width: 192, height: 192, fit: 'contain' },
      outputPath: 'public/icons/icon-192.png',
    },
    {
      sourcePath: masterPath,
      size: 512,
      maskable: false,
      resize: { width: 512, height: 512, fit: 'contain' },
      outputPath: 'public/icons/icon-512.png',
    },
    {
      sourcePath: masterPath,
      size: 512,
      maskable: true,
      resize: { width: inner, height: inner, fit: 'contain' },
      extendToCanvas: 512,
      outputPath: 'public/icons/icon-512-maskable.png',
    },
  ];
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/iconSpec.test.ts`
  - Expected: `Tests 4 passed`.

- [ ] **Commit.** `git add tools/lib/iconSpec.ts tools/lib/iconSpec.test.ts && git commit -m "feat: add pure PWA/store icon spec builder"`

---

### Task 9: `tools/lib/manifest.ts` — pure provenance manifest + human-edit + audio-license gate

**Files:** `tools/lib/manifest.ts` (create), `tools/lib/manifest.test.ts` (create)

- [ ] **Write the failing test** `tools/lib/manifest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  emptyManifest,
  serializeManifest,
  parseManifest,
  upsertEntry,
  mergeManifest,
  validateManifest,
  audioLicenseGate,
  type AssetProvenance,
} from './manifest';

const apple: AssetProvenance = {
  asset: 'item-sort/apple',
  kind: 'art',
  model: 'nano-banana-pro',
  prompt: 'flat vector ... a red apple',
  date: '2026-06-09',
  license: 'AI-generated; human-edited',
  humanEdited: true,
  note: 'recolored + reshaped outline',
};

const introVoice: AssetProvenance = {
  asset: 'cs.intro',
  kind: 'audio',
  model: 'elevenlabs',
  prompt: 'warm adult narrator: "let’s sort the colors"',
  date: '2026-06-09',
  license: 'ElevenLabs paid plan, royalty-free',
  humanEdited: false,
  note: 'voice prompt, critical:true',
};

describe('emptyManifest', () => {
  it('starts at version 1 with no entries', () => {
    expect(emptyManifest()).toEqual({ version: 1, assets: {} });
  });
});

describe('serializeManifest / parseManifest', () => {
  it('round-trips a manifest', () => {
    const m = upsertEntry(emptyManifest(), apple);
    expect(parseManifest(serializeManifest(m))).toEqual(m);
  });
  it('parseManifest returns emptyManifest for null/garbage (never throws)', () => {
    expect(parseManifest(null)).toEqual(emptyManifest());
    expect(parseManifest('{not json')).toEqual(emptyManifest());
    expect(parseManifest('{"version":2}')).toEqual(emptyManifest());
  });
});

describe('upsertEntry', () => {
  it('adds a new entry keyed by asset', () => {
    const m = upsertEntry(emptyManifest(), apple);
    expect(m.assets['item-sort/apple']).toEqual(apple);
  });
  it('overwrites an existing entry in place', () => {
    const m1 = upsertEntry(emptyManifest(), apple);
    const m2 = upsertEntry(m1, { ...apple, prompt: 'updated' });
    expect(Object.keys(m2.assets)).toHaveLength(1);
    expect(m2.assets['item-sort/apple'].prompt).toBe('updated');
  });
  it('does not mutate the input manifest', () => {
    const m1 = emptyManifest();
    upsertEntry(m1, apple);
    expect(m1.assets).toEqual({});
  });
});

describe('mergeManifest', () => {
  it('overlays incoming entries onto the base, incoming wins on conflict', () => {
    const base = upsertEntry(emptyManifest(), apple);
    const cat: AssetProvenance = { ...apple, asset: 'item-sort/cat', prompt: 'a friendly cat' };
    const incoming = upsertEntry(upsertEntry(emptyManifest(), cat), { ...apple, note: 'newer' });
    const merged = mergeManifest(base, incoming);
    expect(Object.keys(merged.assets).sort()).toEqual(['item-sort/apple', 'item-sort/cat']);
    expect(merged.assets['item-sort/apple'].note).toBe('newer');
  });
});

describe('validateManifest', () => {
  it('rejects entries missing required provenance fields', () => {
    const bad = { version: 1, assets: { x: { asset: 'x', model: 'm' } } };
    expect(validateManifest(bad)).toBe(false);
  });
  it('accepts a fully-formed manifest', () => {
    expect(validateManifest(upsertEntry(emptyManifest(), apple))).toBe(true);
  });
});

describe('audioLicenseGate', () => {
  it('passes when every art entry is human-edited and every audio entry has a paid license', () => {
    const m = upsertEntry(upsertEntry(emptyManifest(), apple), introVoice);
    expect(audioLicenseGate(m)).toEqual({ ok: true, problems: [] });
  });
  it('fails an art entry that was not human-edited', () => {
    const m = upsertEntry(emptyManifest(), { ...apple, humanEdited: false });
    const res = audioLicenseGate(m);
    expect(res.ok).toBe(false);
    expect(res.problems[0]).toMatch(/item-sort\/apple.*humanEdited/i);
  });
  it('fails an audio entry whose license is not a confirmed paid plan', () => {
    const m = upsertEntry(emptyManifest(), { ...introVoice, license: 'free tier' });
    const res = audioLicenseGate(m);
    expect(res.ok).toBe(false);
    expect(res.problems[0]).toMatch(/cs\.intro.*paid/i);
  });
});
```

- [ ] **Run to see it fail.** `npm test -- tools/lib/manifest.test.ts`
  - Expected failure: `Failed to resolve import "./manifest"`.

- [ ] **Write the minimal implementation** `tools/lib/manifest.ts`:

```ts
/** Whether an asset is visual art or audio (drives the legal gate). */
export type AssetKind = 'art' | 'audio' | 'icon';

/** Per-asset provenance for legal hygiene (model + prompt + date + license). */
export interface AssetProvenance {
  /** SpriteKey-style id "<atlas>/<frame>", an AudioCue id, or an icon path. */
  asset: string;
  kind: AssetKind;
  /** Generator model, e.g. "nano-banana-pro", "elevenlabs", "stable-audio". */
  model: string;
  /** Exact prompt used (art) or voice/script note (audio). */
  prompt: string;
  /** ISO date (YYYY-MM-DD) of generation. */
  date: string;
  /** License string, e.g. "AI-generated; human-edited" / "ElevenLabs paid plan, royalty-free". */
  license: string;
  /** True once meaningful human editing was applied (AI-copyright hygiene; required for art). */
  humanEdited: boolean;
  /** One-line human-edit / source note. */
  note: string;
}

export interface AssetManifest {
  version: 1;
  assets: Record<string, AssetProvenance>;
}

export interface GateResult {
  ok: boolean;
  problems: string[];
}

const REQUIRED: ReadonlyArray<keyof AssetProvenance> = [
  'asset', 'kind', 'model', 'prompt', 'date', 'license', 'humanEdited', 'note',
];

export function emptyManifest(): AssetManifest {
  return { version: 1, assets: {} };
}

function isProvenance(v: unknown): v is AssetProvenance {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  for (const k of REQUIRED) {
    if (!(k in o)) return false;
  }
  return typeof o.humanEdited === 'boolean'
    && typeof o.asset === 'string'
    && (o.kind === 'art' || o.kind === 'audio' || o.kind === 'icon')
    && typeof o.model === 'string'
    && typeof o.prompt === 'string'
    && typeof o.date === 'string'
    && typeof o.license === 'string'
    && typeof o.note === 'string';
}

export function validateManifest(value: unknown): value is AssetManifest {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (typeof o.assets !== 'object' || o.assets === null) return false;
  return Object.values(o.assets as Record<string, unknown>).every(isProvenance);
}

export function serializeManifest(m: AssetManifest): string {
  return JSON.stringify(m, null, 2);
}

/** Parse; returns emptyManifest() on null / malformed / wrong-version input (never throws). */
export function parseManifest(raw: string | null): AssetManifest {
  if (raw === null) return emptyManifest();
  try {
    const parsed: unknown = JSON.parse(raw);
    return validateManifest(parsed) ? parsed : emptyManifest();
  } catch {
    return emptyManifest();
  }
}

/** Add or replace one entry, keyed by asset id. Pure (does not mutate input). */
export function upsertEntry(m: AssetManifest, entry: AssetProvenance): AssetManifest {
  return { version: 1, assets: { ...m.assets, [entry.asset]: entry } };
}

/** Overlay `incoming` onto `base`; incoming entries win on conflict. Pure. */
export function mergeManifest(base: AssetManifest, incoming: AssetManifest): AssetManifest {
  return { version: 1, assets: { ...base.assets, ...incoming.assets } };
}

/**
 * Legal-hygiene gate (spec §6):
 *  - every 'art' entry MUST have humanEdited === true,
 *  - every 'audio' entry's license MUST mention "paid" (confirmed paid plan).
 */
export function audioLicenseGate(m: AssetManifest): GateResult {
  const problems: string[] = [];
  for (const e of Object.values(m.assets)) {
    if (e.kind === 'art' && !e.humanEdited) {
      problems.push(`${e.asset}: art asset must have humanEdited:true (AI-copyright hygiene)`);
    }
    if (e.kind === 'audio' && !/paid/i.test(e.license)) {
      problems.push(`${e.asset}: audio license must confirm a paid plan (license="${e.license}")`);
    }
  }
  return { ok: problems.length === 0, problems };
}
```

- [ ] **Run to pass.** `npm test -- tools/lib/manifest.test.ts`
  - Expected: `Tests 13 passed`.

- [ ] **Commit.** `git add tools/lib/manifest.ts tools/lib/manifest.test.ts && git commit -m "feat: add pure provenance manifest with human-edit and audio-paid-license gate"`

---

### Task 10: `tools/remove-bg.ts` — thin batch entrypoint (also proves tsx resolves `@/`)

**Files:** `tools/remove-bg.ts` (create)

> Thin imperative shell. NOT unit-tested (covered by the SOP + Task 16 manual run). All decidable logic was tested in Tasks 4 (`fsScan`) + 5 (`rembgCmd`). This entrypoint imports `@/types` transitively (via `tools/lib/*`) and directly, so running it under `tsx` exercises the `@/` alias at runtime (review fix #2).

- [ ] **Write the entrypoint** `tools/remove-bg.ts`:

```ts
/**
 * Batch background removal: assets/raw/<atlas>/*.png -> assets/cutouts/<atlas>/*.png
 * via the rembg CLI (BiRefNet, offline). Run: `npm run assets:rembg`.
 * Decidable logic is unit-tested in tools/lib/fsScan + tools/lib/rembgCmd.
 * Imports @/types directly to exercise the tsconfig path alias under tsx.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { filterImages } from './lib/fsScan';
import { buildRembgCommand } from './lib/rembgCmd';
import type { AtlasKey } from '@/types';

const ATLASES: readonly AtlasKey[] = ['shared', 'color-sort', 'item-sort', 'item-match'];
const RAW_ROOT = 'assets/raw';

function main(): void {
  let count = 0;
  for (const atlas of ATLASES) {
    const dir = join(RAW_ROOT, atlas);
    if (!existsSync(dir)) continue;
    for (const file of filterImages(readdirSync(dir))) {
      const cmd = buildRembgCommand(join(dir, file));
      mkdirSync(dirname(cmd.outputPath), { recursive: true });
      console.log(`rembg ${cmd.args.join(' ')}`);
      const res = spawnSync(cmd.bin, cmd.args, { stdio: 'inherit' });
      if (res.status !== 0) {
        throw new Error(`rembg failed for ${file} (exit ${res.status ?? 'null'})`);
      }
      count += 1;
    }
  }
  console.log(`Done. Cut out ${count} image(s) to assets/cutouts/. Next: apply the human-editing checkpoint (SOP §4), then QA every cutout for halos / lost thin features.`);
}

main();
```

- [ ] **Verify it type-checks AND tsx resolves the `@/` alias at runtime.** Run: `npx tsc --noEmit && npx tsx tools/remove-bg.ts && echo OK`
  - Expected: `tsc` passes (the `@/types` import resolves via tsconfig `paths`). `tsx` runs the script with NO `assets/raw/` present, so it skips every atlas and prints `Done. Cut out 0 image(s) ...` followed by `OK`. This proves tsx resolves `@/` at runtime with no extra resolver (verified behavior for tsx 4.x). The `rembg` CLI is never invoked because the loop finds no files.

- [ ] **Commit.** `git add tools/remove-bg.ts && git commit -m "feat: add batch rembg background-removal entrypoint"`

---

### Task 11: `tools/pack-atlas.ts` — thin packing entrypoint over `free-tex-packer-core@0.3.8` (`packAsync`)

**Files:** `tools/pack-atlas.ts` (create)

> Thin imperative shell. NOT unit-tested (the config builder is tested in Task 6; the emitted-key contract is asserted in Task 16). Uses the **Promise** API `packAsync(images, options)` from `free-tex-packer-core@0.3.8` (verified export), avoiding any callback-order ambiguity. Each input object is `{ path: keyPath, contents: <bytes read from diskPath> }` — `path` is the key-path (`<atlas>/<frame>.png`), NOT the disk path.

- [ ] **Write the entrypoint** `tools/pack-atlas.ts`:

```ts
/**
 * Pack cutouts into per-game atlases that Phaser loads directly:
 *   assets/cutouts/<atlas>/*.png -> public/assets/atlases/<atlas>.png + <atlas>.json
 * via free-tex-packer-core@0.3.8 (packAsync). Run: `npm run assets:atlas`.
 * Decidable logic is unit-tested in tools/lib/atlasConfig + tools/lib/spriteName.
 * Emitted JSON frame keys equal the full "<atlas>/<frame>" SpriteKey strings.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
// free-tex-packer-core@0.3.8: module.exports = pack(images, options, cb);
// module.exports.packAsync(images, options) -> Promise<PackedFile[]>. Use the Promise API.
// @ts-expect-error — package ships .d.ts without a typed `packAsync` named export
import { packAsync } from 'free-tex-packer-core';
import { filterImages } from './lib/fsScan';
import { buildAtlasConfig, atlasOutputPaths } from './lib/atlasConfig';
import type { AtlasKey } from '@/types';

const ATLASES: readonly AtlasKey[] = ['shared', 'color-sort', 'item-sort', 'item-match'];
const CUTOUT_ROOT = 'assets/cutouts';

interface PackedFile { name: string; buffer: Buffer; }

async function packOne(atlas: AtlasKey): Promise<boolean> {
  const dir = join(CUTOUT_ROOT, atlas);
  if (!existsSync(dir)) return false;
  const framePaths = filterImages(readdirSync(dir)).map((f) => join(dir, f));
  if (framePaths.length === 0) return false;

  const cfg = buildAtlasConfig(atlas, framePaths);
  // path = keyPath (-> frame key); contents read from diskPath.
  const images = cfg.files.map((f) => ({ path: f.keyPath, contents: readFileSync(f.diskPath) }));

  const out = atlasOutputPaths(atlas);
  mkdirSync(dirname(out.png), { recursive: true });

  const files: PackedFile[] = await packAsync(images, cfg.options);
  for (const file of files) {
    const target = file.name.endsWith('.json') ? out.json : out.png;
    writeFileSync(target, file.buffer);
  }
  console.log(`Packed ${framePaths.length} frame(s) -> ${out.png} + ${out.json} (keys: ${cfg.files.map((f) => f.spriteKey).join(', ')})`);
  return true;
}

async function main(): Promise<void> {
  let packed = 0;
  for (const atlas of ATLASES) {
    if (await packOne(atlas)) packed += 1;
  }
  console.log(`Done. Packed ${packed} atlas(es) into public/assets/atlases/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Verify it type-checks and runs with no cutouts present.** Run: `npx tsc --noEmit && npx tsx tools/pack-atlas.ts && echo OK`
  - Expected: `tsc` passes; with no `assets/cutouts/` present, the script prints `Done. Packed 0 atlas(es) ...` then `OK`. (A real pack with frames is exercised in Task 16, which also asserts the emitted frame keys equal the SpriteKeys.)

- [ ] **Commit.** `git add tools/pack-atlas.ts && git commit -m "feat: add free-tex-packer atlas-packing entrypoint using packAsync"`

---

### Task 12: `tools/compress-audio.ts` — thin audio-encode entrypoint over `ffmpeg` (incl. music bed)

**Files:** `tools/compress-audio.ts` (create)

> Thin imperative shell. NOT unit-tested (the arg builder is tested in Task 7). The looping music bed source (`assets/audio-raw/music-bed.wav`) is just another file the scan picks up; it is encoded to `public/assets/audio/music-bed.{m4a,ogg}` and played by WebAudioBackend with `loop: true` (no special handling here — looping is a playback flag on the AudioCue, §2.3).

- [ ] **Write the entrypoint** `tools/compress-audio.ts`:

```ts
/**
 * Compress bundled audio: assets/audio-raw/*.wav -> public/assets/audio/<n>.m4a + .ogg
 * via ffmpeg (small AAC + Vorbis). Includes the looping music bed (music-bed.wav).
 * Run: `npm run assets:audio`.
 * Decidable logic is unit-tested in tools/lib/audioCmd + tools/lib/fsScan.
 * NOTE: this produces pre-baked files. The app NEVER does runtime TTS or network audio.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { filterAudio } from './lib/fsScan';
import { buildAudioCommands } from './lib/audioCmd';

const RAW_ROOT = 'assets/audio-raw';

function main(): void {
  if (!existsSync(RAW_ROOT)) {
    console.log(`No ${RAW_ROOT}/ directory — nothing to compress.`);
    return;
  }
  let count = 0;
  for (const file of filterAudio(readdirSync(RAW_ROOT))) {
    for (const cmd of buildAudioCommands(join(RAW_ROOT, file))) {
      mkdirSync(dirname(cmd.outputPath), { recursive: true });
      console.log(`ffmpeg ${cmd.args.join(' ')}`);
      const res = spawnSync(cmd.bin, cmd.args, { stdio: 'inherit' });
      if (res.status !== 0) {
        throw new Error(`ffmpeg failed for ${file} -> ${cmd.outputPath} (exit ${res.status ?? 'null'})`);
      }
      count += 1;
    }
  }
  console.log(`Done. Wrote ${count} encoded file(s) to public/assets/audio/ (.m4a + .ogg per source).`);
}

main();
```

- [ ] **Verify it type-checks and runs with no source audio present.** Run: `npx tsc --noEmit && npx tsx tools/compress-audio.ts && echo OK`
  - Expected: `tsc` passes; with no `assets/audio-raw/` present, prints `No assets/audio-raw/ directory — nothing to compress.` then `OK`. (Real encodes need `ffmpeg`, exercised in Task 16.)

- [ ] **Commit.** `git add tools/compress-audio.ts && git commit -m "feat: add ffmpeg dual-codec audio-compression entrypoint covering the looping music bed"`

---

### Task 13: `tools/gen-icons.ts` — thin PWA/store icon entrypoint over `sharp`

**Files:** `tools/gen-icons.ts` (create)

> Thin imperative shell. NOT unit-tested (the spec builder is tested in Task 8). Closes the spec §4.3 / M5-manifest icon gap. Uses `sharp` (pinned in §7.2; a direct dependency added in M0). Emits `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` referenced by `public/manifest.webmanifest`.

- [ ] **Write the entrypoint** `tools/gen-icons.ts`:

```ts
/**
 * Rasterize the square master icon into the PWA/store icon set:
 *   assets/icon-master.png -> public/icons/icon-192.png, icon-512.png,
 *   icon-512-maskable.png (maskable padded into the ~80% safe zone).
 * via sharp. Run: `npm run assets:icons`.
 * Decidable logic (sizes/paths/safe-zone) is unit-tested in tools/lib/iconSpec.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { buildIconSpecs } from './lib/iconSpec';

const MASTER = 'assets/icon-master.png';

async function main(): Promise<void> {
  if (!existsSync(MASTER)) {
    console.log(`No ${MASTER} — provide a >=1024x1024 square master icon (SOP §8), then re-run.`);
    return;
  }
  for (const spec of buildIconSpecs(MASTER)) {
    mkdirSync(dirname(spec.outputPath), { recursive: true });
    const resized = sharp(spec.sourcePath).resize(spec.resize.width, spec.resize.height, {
      fit: spec.resize.fit,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    if (spec.extendToCanvas) {
      const pad = Math.round((spec.extendToCanvas - spec.resize.width) / 2);
      await resized
        .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(spec.outputPath);
    } else {
      await resized.png().toFile(spec.outputPath);
    }
    console.log(`Wrote ${spec.outputPath} (${spec.size}px${spec.maskable ? ', maskable' : ''})`);
  }
  console.log('Done. Icons in public/icons/ match the PWA manifest references.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Verify it type-checks and runs with no master present.** Run: `npx tsc --noEmit && npx tsx tools/gen-icons.ts && echo OK`
  - Expected: `tsc` passes; with no `assets/icon-master.png`, prints `No assets/icon-master.png — provide a >=1024x1024 square master icon (SOP §8), then re-run.` then `OK`. (Real rasterization is exercised in Task 16.)

- [ ] **Commit.** `git add tools/gen-icons.ts && git commit -m "feat: add sharp PWA/store icon generation entrypoint"`

---

### Task 14: `tools/asset-manifest.ts` — thin provenance read/merge/write entrypoint with the legal gate

**Files:** `tools/asset-manifest.ts` (create)

> Thin imperative shell. NOT unit-tested (read/write/merge/gate logic is tested in Task 9). Reads the existing manifest, merges the staged-entries file if present, runs the human-edit + audio-paid-license gate, and only then writes back.

- [ ] **Write the entrypoint** `tools/asset-manifest.ts`:

```ts
/**
 * Maintain the per-asset provenance log (model + prompt + date + license).
 * Reads assets/asset-manifest.json, merges assets/asset-manifest.staged.json
 * (operator-edited new entries) if present, enforces the legal gate
 * (art humanEdited:true; audio license mentions "paid"), validates, writes back.
 * Idempotent. Run: `npm run assets:manifest`.
 * Decidable logic is unit-tested in tools/lib/manifest.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  parseManifest,
  mergeManifest,
  serializeManifest,
  validateManifest,
  audioLicenseGate,
} from './lib/manifest';

const MANIFEST_PATH = 'assets/asset-manifest.json';
const STAGED_PATH = 'assets/asset-manifest.staged.json';

function readOrEmpty(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function main(): void {
  const base = parseManifest(readOrEmpty(MANIFEST_PATH));
  const staged = parseManifest(readOrEmpty(STAGED_PATH));
  const merged = mergeManifest(base, staged);

  if (!validateManifest(merged)) {
    throw new Error('merged manifest failed validation — check required provenance fields');
  }
  const gate = audioLicenseGate(merged);
  if (!gate.ok) {
    throw new Error(`legal gate failed:\n - ${gate.problems.join('\n - ')}`);
  }
  writeFileSync(MANIFEST_PATH, serializeManifest(merged));
  const count = Object.keys(merged.assets).length;
  console.log(`Wrote ${MANIFEST_PATH} with ${count} provenance entr${count === 1 ? 'y' : 'ies'} (legal gate passed).`);
  if (count === 0) {
    console.log('Tip: add new entries to assets/asset-manifest.staged.json, then re-run.');
  }
}

main();
```

- [ ] **Verify it type-checks and runs against an empty repo state.** Run: `npx tsc --noEmit && npx tsx tools/asset-manifest.ts`
  - Expected: type-check passes; the script prints `Wrote assets/asset-manifest.json with 0 provenance entries (legal gate passed).` and the tip line, and creates `assets/asset-manifest.json` containing `{ "version": 1, "assets": {} }`.

- [ ] **Commit.** `git add tools/asset-manifest.ts assets/asset-manifest.json && git commit -m "feat: add provenance-manifest read/merge/write entrypoint with legal gate"`

---

### Task 15: Wire `assets:*` scripts, ignore intermediates, and prove the standard `npm test` covers the pipeline

**Files:** `package.json` (modify), `.gitignore` (modify)

> The `assets:*` script names are LAW (§7.1). Confirm/extend them (`assets:icons` is added by this milestone), ignore generated intermediates, and prove the plain milestone-wide `npm test` (`vitest run`, no path arg) discovers every `tools/**/*.test.ts` — this is only true because §6.4's include now contains `'tools/**/*.test.ts'` (applied in M0).

- [ ] **Confirm/extend the pipeline scripts** in `package.json`. The first four are added in M0 per §7.1 (verify, do not rename); add the `assets:icons` line:

```json
"assets:rembg": "tsx tools/remove-bg.ts",
"assets:atlas": "tsx tools/pack-atlas.ts",
"assets:audio": "tsx tools/compress-audio.ts",
"assets:icons": "tsx tools/gen-icons.ts",
"assets:manifest": "tsx tools/asset-manifest.ts",
```

- [ ] **Ignore generated pipeline intermediates** (cutouts + staged manifest are regenerated/ephemeral; raw art/audio + master icon + final atlases/audio/icons ARE committed). Add to `.gitignore`:

```
# Asset pipeline intermediates (regenerated by tools/)
/assets/cutouts/
/assets/asset-manifest.staged.json
```

- [ ] **Prove the standard `npm test` discovers the pipeline tests (no path arg).** Run: `npm test`
  - Expected: among the suite, `Test Files` includes all seven pipeline files and reports `tools/lib/spriteName.test.ts (7)`, `tools/lib/fsScan.test.ts (5)`, `tools/lib/rembgCmd.test.ts (3)`, `tools/lib/atlasConfig.test.ts (4)`, `tools/lib/audioCmd.test.ts (2)`, `tools/lib/iconSpec.test.ts (4)`, `tools/lib/manifest.test.ts (13)` — 38 pipeline tests, all passing. (If the `tools/` files are NOT listed, the §6.4 include is missing `'tools/**/*.test.ts'` — fix `vitest.config.ts` in M0 before proceeding.)

- [ ] **Lint the tooling.** Run: `npm run lint`
  - Expected: no errors for `tools/` (pure modules import only from `@/types` + sibling pure modules; entrypoints import `node:*` + pure modules + `free-tex-packer-core`/`sharp`; no `phaser` import anywhere in `tools/`).

- [ ] **Commit.** `git add package.json .gitignore && git commit -m "chore: wire assets:* pipeline scripts (incl. assets:icons) and ignore generated intermediates"`

---

### Task 16: Documented manual run-through + emitted-frame-key smoke assertion (operator gate, no app runtime)

**Files:** none (verification only; result captured by the operator per the SOP)

> This task documents the one-time end-to-end operator verification of the pipeline on a workstation with `rembg` + `ffmpeg` installed. It is NOT part of the automated suite and NEVER runs in the app. It includes the load-bearing assertion that the packed JSON `frames` keys equal the full SpriteKey strings (the contract M4 scenes rely on for `add.image(x, y, atlas, fullSpriteKey)`).

- [ ] **Drop one sample raw image** at `assets/raw/shared/sample.png` (any opaque-background PNG from a Nano Banana Pro generation per the SOP). Run `npm run assets:rembg`.
  - Expected: console prints the `rembg i -m birefnet-general -a assets/raw/shared/sample.png assets/cutouts/shared/sample.png` invocation; `assets/cutouts/shared/sample.png` exists with a transparent background; operator QAs it for halos.

- [ ] **Apply the human-editing checkpoint** to `assets/cutouts/shared/sample.png` (a meaningful edit per style-guide §5) so a human-authored work exists before packing.
  - Expected: the cutout reflects a deliberate human edit; the operator notes the edit for the staged manifest entry.

- [ ] **Pack the atlas AND assert the emitted frame key equals the SpriteKey.** Run `npm run assets:atlas`, then assert the JSON parses and contains the full key:
  - Run: `node -e "const j=require('./public/assets/atlases/shared.json'); const keys=Object.keys(j.frames); console.log(keys); if(!keys.includes('shared/sample')) { console.error('FRAME KEY MISMATCH'); process.exit(1);} console.log('FRAME-KEY OK');"`
  - Expected: `public/assets/atlases/shared.png` + `shared.json` exist; the printed keys array contains `shared/sample`; final line is `FRAME-KEY OK`. This proves `free-tex-packer-core@0.3.8` (JsonHash, `removeFileExtension:true` + `prependFolderName:true`) emits the full `<atlas>/<frame>` SpriteKey that M4 looks up.

- [ ] **Compress one sample audio + the music bed.** Drop `assets/audio-raw/sample.wav` and `assets/audio-raw/music-bed.wav`, run `npm run assets:audio`.
  - Expected: `public/assets/audio/sample.m4a`, `sample.ogg`, `music-bed.m4a`, `music-bed.ogg` exist and are small; all play; `music-bed` loops seamlessly when played with `loop: true` in a quick WebAudio check.

- [ ] **Generate icons.** Drop `assets/icon-master.png` (≥1024×1024 square), run `npm run assets:icons`.
  - Expected: `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` exist; the maskable variant keeps content inside the ~80% safe zone; filenames match `public/manifest.webmanifest`.

- [ ] **Record provenance + exercise the legal gate.** Add staged entries to `assets/asset-manifest.staged.json` for `shared/sample` (`kind:"art"`, `humanEdited:true`, note), `cs.intro`-style audio if applicable (`kind:"audio"`, license containing "paid"), and the icon (`kind:"icon"`). Run `npm run assets:manifest`.
  - Expected: `assets/asset-manifest.json` contains the entries; re-running is idempotent (no duplicates). Then flip the sample art entry to `humanEdited:false` and re-run: the tool exits non-zero with `legal gate failed: ... shared/sample: art asset must have humanEdited:true`. Restore it to `true`.

- [ ] **Confirm the no-runtime / no-network invariant.** Run: `grep -rE "elevenlabs|gemini|nano-banana|fetch\(|XMLHttpRequest|TextToSpeech" src && echo FOUND || echo CLEAN`
  - Expected: `CLEAN` — the pipeline lives only in `tools/`; the app bundles pre-baked files only, with zero networking code (spec §6, §7).

- [ ] **Clean up the samples** so they don't ship as real content: delete `assets/raw/shared/sample.png`, `assets/audio-raw/sample.wav`, the `shared/sample` + sample-audio + icon manifest entries (or leave the real icon entry if `icon-master.png` is real), and the generated `public/assets/atlases/shared.*` + `public/assets/audio/sample.*` placeholders. Keep `music-bed.*` and the icon set if they are real shipping assets. No commit — this is operator verification, not a code change.