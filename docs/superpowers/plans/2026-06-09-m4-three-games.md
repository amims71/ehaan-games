# M4: The 3 v1 Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three v1 games — **color-sort**, **item-sort**, **item-match** — each as a THIN Phaser Scene extending `BaseGameScene`, a `content.json` validated by a PURE per-game validator, and a PURE framework-free game-logic module unit-tested under strict TDD. Wire all three into `src/games/registry.ts` (extending the registry M2 authored) so `HubScene` renders and launches them. Each completed content set triggers a `RewardFx` **appreciation** reward (celebratory pop + cheer) then a deterministic reshuffle — NO levels, NO scoring, NO progress bars, NO urgency/guilt. Color-sort enforces the hard accessibility requirement: every color carries a REDUNDANT non-color cue (shape outline + fill pattern + icon), an Okabe-Ito colorblind-safe palette, no adjacent red/green or blue/purple bins, and ≥3:1 contrast against the app background.

**Architecture:** Per the canonical shared contracts. Each game is `content.json` (data) + a PURE logic module (`*Logic.ts`, no `phaser` import, unit-tested with Vitest) + a THIN Scene (`*Scene.ts`, wiring only, covered by manual QA). Scenes delegate ALL decidable logic to the pure modules and to the shell's pure modules (`dropValidation`, `color`, `hubLayout`, `progressSerde`, `audioQueue`, `parentalChallenge`). Completion flows through the SINGLE shared entry point `BaseGameScene.onSetComplete()`, which subclasses call directly when their set is complete (M2's pure `gameLoop` reducer is an INTERNAL detail of `onSetComplete()` that owns `cyclesCompleted` increment + reward sequencing + reshuffle; subclasses never import or call it). Drag events are supplied to `BaseGameScene` via the abstract `getDragEvents()` hook, which Base passes into the `DragDropController` constructor. Games register one `GameDef` each in the M2-authored `GAMES` list.

**Tech Stack:** Phaser 4.1.x (TypeScript, `strict: true`) + Capacitor 8.3.x + Vite 5.x; Vitest 2.x for pure-module unit tests; manual QA checklists in `qa/checklists/`. Path alias `@/` → `src/`. Conventional commits.

---

## Canonical decisions resolved during review (LAW for this milestone)

These resolve cross-cutting inconsistencies the reviewer flagged. They are stated here so M4 is internally consistent; they reflect the agreed contract that M1/M2 also conform to. M4 references — never redefines — the M1/M2 symbols below.

1. **Completion entry point (single):** `BaseGameScene` exposes the concrete method `protected onSetComplete(): Promise<void>`. Subclasses track their own placement/match state and call `this.onSetComplete()` directly when (and only when) their set is complete — this is the single completion entry point. There is NO `reportItemResolved`. Internally `onSetComplete()` drives M2's PURE `gameLoop` reducer, which increments `cyclesCompleted` exactly once, plays the appreciation `RewardFx`, then calls `reshuffle(nextSeed)` followed by exactly one `buildLayout()`. Subclasses **never** sequence the reward/reshuffle themselves.

2. **DragDropController events (constructor-injected):** `DragDropController` takes events in its constructor (`constructor(scene, events)`) per Shared Contracts §3.3 — there is NO mutable public `events` field. `BaseGameScene` declares `protected abstract getDragEvents(): DragDropEvents;` and constructs the controller with the subclass's events during `create()`. M4 scenes implement `getDragEvents()` and **never** assign `this.drag.events = ...`.

3. **Phaser frame-key convention (full SpriteKey):** `free-tex-packer-core` is configured (M3) to emit frame names equal to the full `SpriteKey` string `"atlas/frame"` (e.g. `"color-sort/bin-blue"`). Therefore every `add.image()/add.sprite()` call passes the texture (atlas key) plus the FULL `SpriteKey` as the frame name. `HubScene.frameOf` does NOT strip the prefix. M4 scenes pass the `SpriteKey` value directly — there is no `frame()` stripping helper.

4. **Seed ownership (Base owns it; reshuffle never builds):** `BaseGameScene` owns the active seed. On `create()`, Base reads the persisted `shuffleSeed` from `ProgressStore.load()` (resuming the prior arrangement; falls back to a fresh seed when none is stored), calls `reshuffle(seed)` ONCE, then `buildLayout()` ONCE. `reshuffle(seed)` mutates content/cards on the instance ONLY and never calls `buildLayout()`. `buildLayout()` renders whatever the latest `reshuffle` produced. There is no per-scene `currentSeed()`.

5. **Color-sort palette/contrast (settled, no branch):** the shipped color-sort bins are `oiBlue → oiBluishGreen → oiReddishPurple → oiVermillion` (blue, green, purple, red). All four clear ≥3:1 against the app background `#FFFFFF` under a bare-token `meetsContrast` check (measured: oiBlue 5.19, oiBluishGreen 3.42, oiReddishPurple 3.06, oiVermillion 3.87), and no adjacent pair is a forbidden colorblind-confusion pair. This replaces the `oiYellow`/`oiOrange` tokens from the Shared Contracts §4.1 *illustrative* example (which fail bare-token contrast on white: oiOrange 2.25, oiYellow 1.32). The shipped file therefore passes `validateColorSortContent` deterministically.

6. **Registry authorship (M2 authors; M4 extends):** `src/games/registry.ts` and `src/games/registry.test.ts` are AUTHORED in M2 with `titleKey` values `hub.title.colorSort/itemSort/itemMatch` and `tileVoiceCue` values `hub.tile.colorSort/itemSort/itemMatch` (matching the `SHELL_CUES` ids M2 registers). M4 does NOT rename these and does NOT recreate the test file at the same path. M4 only CONFIRMS the registry is complete and correct (via the existing M2 test) and asserts the integration. If M2 left any of the three entries as a stub, M4 fills it using these exact ids.

7. **Per-game validators are the runtime source of truth:** the Shared Contracts §4 `contentLoader.ts` is realized as the three PURE per-game validators (`validateColorSortContent`, `validateItemSortContent`, `validateItemMatchContent`) created in this milestone. Each scene calls its own validator in `loadContent()`. (If M1/M2 shipped a generic `contentLoader.ts` wrapper, these validators are the functions it dispatches to; M4 owns and tests them here.)

---

## Prerequisites

These must be complete before M4 starts:

- **M1 (shared contracts + scaffold)** — `src/types/` complete (`game.ts`, `content.ts`, `audio.ts`, `sprites.ts`, `rewards.ts`, `parental.ts`, `progress.ts`, `index.ts`); `vitest.config.ts`, `tests/setup.ts`, path alias `@/`→`src/`, npm scripts (`test`, `build`, `lint`); `tsconfig.json` with `resolveJsonModule: true` and `strict: true`.
- **M2 (reusable shell + shell services)** — `BaseGameScene` (abstract, §3.8) providing: concrete `onSetComplete()` (the SINGLE completion entry point subclasses call directly) which internally drives the PURE `gameLoop` reducer (owns `cyclesCompleted` increment + reward + reshuffle; there is NO `reportItemResolved`), the seed-ownership flow in `create()` (reads persisted `shuffleSeed`, calls `reshuffle(seed)` once then `buildLayout()` once), `protected abstract getDragEvents(): DragDropEvents`, and `protected abstract buildLayout()`/`reshuffle(seed)`/`loadContent()` hooks; `AudioService` (§3.1); `DragDropController` with `constructor(scene, events)` + PURE `dropValidation.ts` (§3.3) exporting `isValidDrop`, `isMatch`, `isSetComplete`, `MIN_HIT_AREA_PX`, `DraggableMeta`, `DropTarget`, `DragDropEvents`; `RewardFx` (§3.4); `ProgressStore` + `progressSerde` (§3.5); `theme.ts` (Okabe-Ito tokens, §5.1) + PURE `color.ts` (§5.2) exporting `meetsContrast`, `assertNoForbiddenAdjacency`, `isForbiddenAdjacentPair`, `MIN_CONTRAST_RATIO`; `hubLayout.ts` (§3.9); `HubScene` (with non-stripping `frameOf`), `BootScene`, `SettingsScene`; `src/games/registry.ts` + `src/games/registry.test.ts` authored with `hub.title.*` / `hub.tile.*` ids matching `SHELL_CUES`.
- **M3 (asset pipeline) — IDEAL, not blocking.** A **placeholder atlas** per game (`public/assets/atlases/{color-sort,item-sort,item-match}.{png,json}` + `shared.{png,json}`) and placeholder audio (`public/assets/audio/*.m4a` + `.ogg`) are acceptable to build and run against. Frame names referenced by each `content.json` (e.g. `color-sort/bin-blue`, `item-sort/apple`, `item-match/sun`) MUST exist in the corresponding atlas JSON as the FULL `"atlas/frame"` key (decision 3), even if every frame points at the same placeholder rectangle. If M3 is not done, generate placeholder atlases in Task 0.

**M4 depends on these shared symbols (reference, do not redefine):**
- Types: `GameId`, `SceneKey`, `GameDef`, `SpriteKey`, `spriteKey`, `AtlasKey`, `AudioCueId`, `RewardRequest`, `ContentConfig`, `ColorSortContent`, `ColorSortCategory`, `ColorSortItem`, `RedundantCue`, `ItemSortContent`, `ItemSortCategory`, `ItemSortItem`, `ItemMatchContent`, `ItemMatchPair`, `OkabeItoToken`.
- Pure shell fns/types: `isValidDrop`, `isMatch`, `isSetComplete`, `DraggableMeta`, `DropTarget`, `DragDropEvents`, `MIN_HIT_AREA_PX` (`@/shell/input/dropValidation`); `assertNoForbiddenAdjacency`, `isForbiddenAdjacentPair`, `meetsContrast`, `MIN_CONTRAST_RATIO` (`@/shell/ui/color`); `OKABE_ITO`, `APP_BG_TOKEN`, `FORBIDDEN_ADJACENT` (`@/shell/ui/theme`).
- Shell classes: `BaseGameScene` (`@/shell/scenes/BaseGameScene`) with `onSetComplete` (single completion entry point), `getDragEvents`, `loadContent`, `buildLayout`, `reshuffle`; `AudioService`, `DragDropController`, `RewardFx`, `ProgressStore`.

---

## Files

Create/modify exactly these paths (one-line responsibility each):

**color-sort**
- `src/games/color-sort/colorSortLogic.ts` — CREATE. PURE: validate color-sort content (redundant cue presence, cue uniqueness, adjacency-safety, contrast, category refs), drop correctness, completion, deterministic shuffle.
- `src/games/color-sort/colorSortLogic.test.ts` — CREATE. Vitest unit tests for the above (TDD).
- `src/games/color-sort/content.json` — CREATE. `ColorSortContent` (decision 5 palette: blue/green/purple/red, Okabe-Ito + redundant cues).
- `src/games/color-sort/ColorSortScene.ts` — CREATE. THIN Scene extending `BaseGameScene`; supplies drag events via `getDragEvents()`, signals completion by calling `this.onSetComplete()` (the single completion entry point).

**item-sort**
- `src/games/item-sort/itemSortLogic.ts` — CREATE. PURE: validate item-sort content (category refs), categorization correctness, completion, deterministic shuffle.
- `src/games/item-sort/itemSortLogic.test.ts` — CREATE. Vitest unit tests (TDD).
- `src/games/item-sort/content.json` — CREATE. `ItemSortContent` (§4.2 example).
- `src/games/item-sort/ItemSortScene.ts` — CREATE. THIN Scene extending `BaseGameScene`.

**item-match**
- `src/games/item-match/itemMatchLogic.ts` — CREATE. PURE: validate item-match content (grid product rule), pair-matching, completion, grid-cell layout math, deterministic shuffle.
- `src/games/item-match/itemMatchLogic.test.ts` — CREATE. Vitest unit tests (TDD).
- `src/games/item-match/content.json` — CREATE. `ItemMatchContent` (§4.3 example).
- `src/games/item-match/ItemMatchScene.ts` — CREATE. THIN Scene extending `BaseGameScene`.

**registry + bootstrap**
- `src/games/registry.ts` — MODIFY (authored in M2). Confirm/complete the three `GameDef` entries using the M2 `hub.title.*` / `hub.tile.*` ids. No renames.
- `src/main.ts` — MODIFY. Register `ColorSortScene`, `ItemSortScene`, `ItemMatchScene` with the Phaser game at the M2-defined scene-array insertion point.

**manual QA**
- `qa/checklists/color-sort.md` — CREATE. Manual QA checklist (steps + expected results), incl. colorblind-cue verification.
- `qa/checklists/item-sort.md` — CREATE. Manual QA checklist.
- `qa/checklists/item-match.md` — CREATE. Manual QA checklist.

**placeholder atlases (only if M3 incomplete)**
- `public/assets/atlases/color-sort.json`, `public/assets/atlases/item-sort.json`, `public/assets/atlases/item-match.json` — CREATE if absent (placeholder frame maps, full-SpriteKey frame names).
- `public/assets/atlases/color-sort.png`, `item-sort.png`, `item-match.png` — CREATE if absent (single shared 64×64 square).

> **Not modified by M4:** `src/games/registry.test.ts` is owned by M2 (decision 6). M4 references it; it is NOT recreated here to avoid a path collision.

---

### Task 0: Placeholder atlases (only if M3 assets are not present)

> Skip this entire task if M3 has shipped real atlases AND every frame referenced by the three `content.json` files already exists in the atlas JSON as the FULL `"atlas/frame"` key (decision 3). Otherwise create minimal placeholder atlases so the build and manual QA can run. The PNG is a single 64×64 opaque square reused by every frame; the JSON maps each full-SpriteKey frame name to that rect.

**Files:**
- `public/assets/atlases/color-sort.json`, `public/assets/atlases/item-sort.json`, `public/assets/atlases/item-match.json`
- `public/assets/atlases/color-sort.png`, `item-sort.png`, `item-match.png` (single shared 64×64 square)

Steps:

- [ ] Generate one 64×64 opaque PNG and copy it to all three atlas PNG paths.
  Command:
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && mkdir -p public/assets/atlases && \
  python3 -c "import struct,zlib;w=h=64;raw=b''.join(b'\x00'+b'\xcc\xcc\xcc'*w for _ in range(h));png=b'\x89PNG\r\n\x1a\n'+b''.join((lambda d:struct.pack('>I',len(d[1]))+d[0]+d[1]+struct.pack('>I',zlib.crc32(d[0]+d[1])))(p) for p in [(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0)),(b'IDAT',zlib.compress(raw,9)),(b'IEND',b'')]);open('/tmp/ph.png','wb').write(png)" && \
  cp /tmp/ph.png public/assets/atlases/color-sort.png && \
  cp /tmp/ph.png public/assets/atlases/item-sort.png && \
  cp /tmp/ph.png public/assets/atlases/item-match.png
  ```
  Expected result: three identical 64×64 PNG files exist under `public/assets/atlases/`.

- [ ] Write `public/assets/atlases/color-sort.json` mapping every frame referenced by color-sort `content.json` (full-SpriteKey frame names) to the single placeholder rect (Phaser JSON-Hash format).
  File `public/assets/atlases/color-sort.json`:
  ```json
  {
    "frames": {
      "color-sort/bin-blue":      { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/bin-green":     { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/bin-purple":    { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/bin-red":       { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/icon-circle":   { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/icon-triangle": { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/icon-star":     { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/icon-heart":    { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/item-blue-1":   { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/item-blue-2":   { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/item-green-1":  { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/item-purple-1": { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/item-red-1":    { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "color-sort/item-red-2":    { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } }
    },
    "meta": { "image": "color-sort.png", "size": { "w": 64, "h": 64 }, "scale": "1" }
  }
  ```
  Expected result: file parses as valid JSON; every color-sort frame name is present.

- [ ] Write `public/assets/atlases/item-sort.json`.
  File `public/assets/atlases/item-sort.json`:
  ```json
  {
    "frames": {
      "item-sort/bin-fruit":  { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-sort/bin-animal": { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-sort/apple":      { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-sort/banana":     { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-sort/cat":        { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-sort/dog":        { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } }
    },
    "meta": { "image": "item-sort.png", "size": { "w": 64, "h": 64 }, "scale": "1" }
  }
  ```
  Expected result: file parses; all item-sort frames present.

- [ ] Write `public/assets/atlases/item-match.json`.
  File `public/assets/atlases/item-match.json`:
  ```json
  {
    "frames": {
      "item-match/sun":   { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-match/moon":  { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-match/star":  { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } },
      "item-match/cloud": { "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }, "sourceSize": { "w": 64, "h": 64 }, "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 } }
    },
    "meta": { "image": "item-match.png", "size": { "w": 64, "h": 64 }, "scale": "1" }
  }
  ```
  Expected result: file parses; all item-match frames present.

- [ ] Commit the placeholder atlases.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add public/assets/atlases && \
  git commit -m "chore: add placeholder atlases for the three v1 games"
  ```
  Expected output: commit created listing the 6 atlas files.

---

### Task 1: color-sort PURE logic — content validation (redundant cue presence)

**Files:**
- `src/games/color-sort/colorSortLogic.test.ts` (create)
- `src/games/color-sort/colorSortLogic.ts` (create)

- [ ] Write the failing test for `validateColorSortContent` rejecting a missing redundant cue.
  File `src/games/color-sort/colorSortLogic.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { validateColorSortContent } from './colorSortLogic';
  import type { ColorSortContent } from '@/types';

  function baseContent(): ColorSortContent {
    return {
      schema: 1,
      gameId: 'color-sort',
      introCue: 'cs.intro' as never,
      appreciationCue: 'cs.appreciation' as never,
      categories: [
        { id: 'blue',  colorToken: 'oiBlue',          cue: { shape: 'circle',   pattern: 'solid', icon: 'color-sort/icon-circle' as never },   binSprite: 'color-sort/bin-blue' as never,  labelCue: 'cs.blue' as never },
        { id: 'green', colorToken: 'oiBluishGreen',    cue: { shape: 'triangle', pattern: 'dots',  icon: 'color-sort/icon-triangle' as never }, binSprite: 'color-sort/bin-green' as never, labelCue: 'cs.green' as never },
      ],
      items: [
        { id: 'i1', categoryId: 'blue',  sprite: 'color-sort/item-blue-1' as never },
        { id: 'i2', categoryId: 'green', sprite: 'color-sort/item-green-1' as never },
      ],
    };
  }

  describe('validateColorSortContent', () => {
    it('accepts content where every category carries a redundant cue', () => {
      expect(() => validateColorSortContent(baseContent())).not.toThrow();
    });

    it('throws when a category is missing its redundant cue', () => {
      const c = baseContent();
      // simulate malformed input from disk
      delete (c.categories[0] as { cue?: unknown }).cue;
      expect(() => validateColorSortContent(c)).toThrow(/redundant cue/i);
    });
  });
  ```

- [ ] Run the test to see it fail.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected failure: `Error: Failed to resolve import "./colorSortLogic"` (module does not exist yet) → all tests error/fail.

- [ ] Create the module with the minimal implementation for cue presence.
  File `src/games/color-sort/colorSortLogic.ts`:
  ```ts
  import type { ColorSortContent } from '@/types';

  /**
   * Validate a color-sort content document beyond JSON-Schema (semantic rules, §4.1).
   * Rule 1 (this step): every category MUST carry a redundant non-color cue
   * (shape + pattern + icon all present). Throws on violation.
   */
  export function validateColorSortContent(content: ColorSortContent): void {
    for (const cat of content.categories) {
      const cue = cat.cue;
      if (!cue || !cue.shape || !cue.pattern || !cue.icon) {
        throw new Error(
          `color-sort: category "${cat.id}" is missing a redundant cue (shape+pattern+icon required)`,
        );
      }
    }
  }
  ```

- [ ] Run the test to see it pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected output: `2 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/color-sort/colorSortLogic.ts src/games/color-sort/colorSortLogic.test.ts && \
  git commit -m "feat: validate color-sort redundant cue presence (a11y)"
  ```
  Expected output: commit created with the two files.

---

### Task 2: color-sort PURE logic — cue uniqueness across categories

**Files:**
- `src/games/color-sort/colorSortLogic.test.ts` (modify)
- `src/games/color-sort/colorSortLogic.ts` (modify)

- [ ] Add a failing test: duplicate shape (or pattern, or icon) across two categories must throw.
  Append to `src/games/color-sort/colorSortLogic.test.ts` inside the `describe('validateColorSortContent', ...)` block:
  ```ts
    it('throws when two categories share a shape', () => {
      const c = baseContent();
      c.categories[1].cue.shape = c.categories[0].cue.shape; // both 'circle'
      expect(() => validateColorSortContent(c)).toThrow(/shape/i);
    });

    it('throws when two categories share a fill pattern', () => {
      const c = baseContent();
      c.categories[1].cue.pattern = c.categories[0].cue.pattern; // both 'solid'
      expect(() => validateColorSortContent(c)).toThrow(/pattern/i);
    });

    it('throws when two categories share an icon', () => {
      const c = baseContent();
      c.categories[1].cue.icon = c.categories[0].cue.icon;
      expect(() => validateColorSortContent(c)).toThrow(/icon/i);
    });
  ```

- [ ] Run to see the three new tests fail.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected failure: the three new cases fail (`expected function to throw` — no uniqueness check yet); the original 2 still pass.

- [ ] Add uniqueness checks to `validateColorSortContent`.
  In `src/games/color-sort/colorSortLogic.ts`, replace the body of `validateColorSortContent` with:
  ```ts
  export function validateColorSortContent(content: ColorSortContent): void {
    const seenShape = new Set<string>();
    const seenPattern = new Set<string>();
    const seenIcon = new Set<string>();

    for (const cat of content.categories) {
      const cue = cat.cue;
      if (!cue || !cue.shape || !cue.pattern || !cue.icon) {
        throw new Error(
          `color-sort: category "${cat.id}" is missing a redundant cue (shape+pattern+icon required)`,
        );
      }
      if (seenShape.has(cue.shape)) {
        throw new Error(`color-sort: duplicate cue shape "${cue.shape}" across categories`);
      }
      if (seenPattern.has(cue.pattern)) {
        throw new Error(`color-sort: duplicate cue pattern "${cue.pattern}" across categories`);
      }
      if (seenIcon.has(cue.icon)) {
        throw new Error(`color-sort: duplicate cue icon "${cue.icon}" across categories`);
      }
      seenShape.add(cue.shape);
      seenPattern.add(cue.pattern);
      seenIcon.add(cue.icon);
    }
  }
  ```

- [ ] Run to see all pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected output: `5 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/color-sort/colorSortLogic.ts src/games/color-sort/colorSortLogic.test.ts && \
  git commit -m "feat: enforce color-sort cue uniqueness across categories"
  ```
  Expected output: commit created.

---

### Task 3: color-sort PURE logic — colorblind safety (adjacency + contrast + category refs)

**Files:**
- `src/games/color-sort/colorSortLogic.test.ts` (modify)
- `src/games/color-sort/colorSortLogic.ts` (modify)

- [ ] Add failing tests for adjacency, contrast, and dangling category refs. These delegate to the shared pure utils `assertNoForbiddenAdjacency` and `meetsContrast` from `@/shell/ui/color`. (Per decision 5, the bare-token contrast check rejects `oiOrange` on white at 2.25:1 < 3:1.)
  Append to the `describe('validateColorSortContent', ...)` block:
  ```ts
    it('throws when adjacent bins are a forbidden colorblind pair (blue/purple)', () => {
      const c = baseContent();
      c.categories = [
        { id: 'blue',   colorToken: 'oiBlue',          cue: { shape: 'circle', pattern: 'solid', icon: 'color-sort/icon-circle' as never }, binSprite: 'color-sort/bin-blue' as never,   labelCue: 'cs.blue' as never },
        { id: 'purple', colorToken: 'oiReddishPurple', cue: { shape: 'star',   pattern: 'grid',  icon: 'color-sort/icon-star' as never },   binSprite: 'color-sort/bin-purple' as never, labelCue: 'cs.purple' as never },
      ];
      expect(() => validateColorSortContent(c)).toThrow();
    });

    it('throws when a color token fails the 3:1 contrast rule vs the app background', () => {
      const c = baseContent();
      // oiOrange (#E69F00) on white background is 2.25:1 (< 3:1) — must be rejected.
      c.categories = [
        { id: 'orange', colorToken: 'oiOrange', cue: { shape: 'square', pattern: 'stripes', icon: 'color-sort/icon-square' as never }, binSprite: 'color-sort/bin-orange' as never, labelCue: 'cs.orange' as never },
        { id: 'blue',   colorToken: 'oiBlue',   cue: { shape: 'circle', pattern: 'solid',   icon: 'color-sort/icon-circle' as never }, binSprite: 'color-sort/bin-blue' as never,   labelCue: 'cs.blue' as never },
      ];
      expect(() => validateColorSortContent(c)).toThrow(/contrast/i);
    });

    it('throws when an item references a non-existent category', () => {
      const c = baseContent();
      c.items[0].categoryId = 'nope';
      expect(() => validateColorSortContent(c)).toThrow(/categor/i);
    });
  ```

- [ ] Run to see the new tests fail.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected failure: adjacency/contrast/ref cases fail (`expected function to throw`); the earlier 5 still pass.

- [ ] Extend `validateColorSortContent` with adjacency, contrast, and ref checks (import shared utils).
  Replace the entire contents of `src/games/color-sort/colorSortLogic.ts` with:
  ```ts
  import type { ColorSortContent, OkabeItoToken } from '@/types';
  import { assertNoForbiddenAdjacency, meetsContrast } from '@/shell/ui/color';
  import { APP_BG_TOKEN, OKABE_ITO } from '@/shell/ui/theme';

  /** Resolve the app background to a #RRGGBB string for contrast checks. */
  function backgroundHex(): string {
    return APP_BG_TOKEN in OKABE_ITO
      ? OKABE_ITO[APP_BG_TOKEN as keyof typeof OKABE_ITO]
      : (APP_BG_TOKEN as string);
  }

  /**
   * Validate a color-sort content document beyond JSON-Schema (semantic rules, §4.1):
   *  1. every category carries a redundant cue (shape+pattern+icon);
   *  2. shape/pattern/icon are unique across categories;
   *  3. each colorToken clears MIN_CONTRAST_RATIO vs the background, and the ORDERED
   *     bin tokens contain no forbidden colorblind-confusion pair in adjacent positions;
   *  4. every item.categoryId references an existing category.
   */
  export function validateColorSortContent(content: ColorSortContent): void {
    const seenShape = new Set<string>();
    const seenPattern = new Set<string>();
    const seenIcon = new Set<string>();
    const orderedTokens: OkabeItoToken[] = [];
    const categoryIds = new Set<string>();
    const bgHex = backgroundHex();

    for (const cat of content.categories) {
      const cue = cat.cue;
      if (!cue || !cue.shape || !cue.pattern || !cue.icon) {
        throw new Error(
          `color-sort: category "${cat.id}" is missing a redundant cue (shape+pattern+icon required)`,
        );
      }
      if (seenShape.has(cue.shape)) {
        throw new Error(`color-sort: duplicate cue shape "${cue.shape}" across categories`);
      }
      if (seenPattern.has(cue.pattern)) {
        throw new Error(`color-sort: duplicate cue pattern "${cue.pattern}" across categories`);
      }
      if (seenIcon.has(cue.icon)) {
        throw new Error(`color-sort: duplicate cue icon "${cue.icon}" across categories`);
      }
      seenShape.add(cue.shape);
      seenPattern.add(cue.pattern);
      seenIcon.add(cue.icon);

      if (!meetsContrast(cat.colorToken, bgHex)) {
        throw new Error(
          `color-sort: color token "${cat.colorToken}" fails the minimum contrast ratio vs background`,
        );
      }

      orderedTokens.push(cat.colorToken);
      categoryIds.add(cat.id);
    }

    // Adjacency: throws on a forbidden pair in adjacent bin positions.
    assertNoForbiddenAdjacency(orderedTokens);

    for (const item of content.items) {
      if (!categoryIds.has(item.categoryId)) {
        throw new Error(
          `color-sort: item "${item.id}" references unknown categoryId "${item.categoryId}"`,
        );
      }
    }
  }
  ```

- [ ] Run to see all pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected output: `8 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/color-sort/colorSortLogic.ts src/games/color-sort/colorSortLogic.test.ts && \
  git commit -m "feat: enforce color-sort colorblind safety (adjacency, contrast, refs)"
  ```
  Expected output: commit created.

---

### Task 4: color-sort PURE logic — drop correctness, completion, deterministic shuffle

**Files:**
- `src/games/color-sort/colorSortLogic.test.ts` (modify)
- `src/games/color-sort/colorSortLogic.ts` (modify)

- [ ] Add failing tests for `isCorrectColorDrop`, `colorSortComplete`, and `shuffleColorSort` (deterministic by seed). Drop/completion delegate to shared `dropValidation`.
  Append to `src/games/color-sort/colorSortLogic.test.ts`:
  ```ts
  import {
    isCorrectColorDrop,
    colorSortComplete,
    shuffleColorSort,
  } from './colorSortLogic';

  describe('isCorrectColorDrop', () => {
    it('is true when the item category matches the bin it accepts', () => {
      expect(
        isCorrectColorDrop({ id: 'i1', categoryId: 'blue' }, { id: 'bin-blue', acceptsCategoryId: 'blue' }),
      ).toBe(true);
    });
    it('is false when the item category differs from the bin', () => {
      expect(
        isCorrectColorDrop({ id: 'i1', categoryId: 'blue' }, { id: 'bin-green', acceptsCategoryId: 'green' }),
      ).toBe(false);
    });
  });

  describe('colorSortComplete', () => {
    it('is true only when every item id has been placed', () => {
      expect(colorSortComplete(['i1', 'i2'], ['i1', 'i2'])).toBe(true);
      expect(colorSortComplete(['i1'], ['i1', 'i2'])).toBe(false);
    });
  });

  describe('shuffleColorSort', () => {
    it('is deterministic for a given seed', () => {
      const c = baseContent();
      const a = shuffleColorSort(c, 42).items.map((i) => i.id);
      const b = shuffleColorSort(c, 42).items.map((i) => i.id);
      expect(a).toEqual(b);
    });
    it('preserves the item set (only reorders)', () => {
      const c = baseContent();
      const out = shuffleColorSort(c, 7).items.map((i) => i.id).sort();
      expect(out).toEqual(c.items.map((i) => i.id).sort());
    });
  });
  ```

- [ ] Run to see them fail.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected failure: `isCorrectColorDrop`, `colorSortComplete`, `shuffleColorSort` are not exported → import/reference errors.

- [ ] Implement the three functions, reusing shared `dropValidation` and a small seeded RNG. Append to `src/games/color-sort/colorSortLogic.ts` (add the new imports at the top alongside the existing ones):
  ```ts
  import {
    isValidDrop,
    isSetComplete,
    type DraggableMeta,
    type DropTarget,
  } from '@/shell/input/dropValidation';

  /** Deterministic mulberry32 PRNG. Pure; identical seed → identical sequence. */
  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Pure Fisher-Yates using a seeded RNG. Returns a new array. */
  function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
    const out = arr.slice();
    const rng = mulberry32(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** A correct color drop = item.categoryId matches the bin's acceptsCategoryId. */
  export function isCorrectColorDrop(item: DraggableMeta, target: DropTarget): boolean {
    return isValidDrop(item, target);
  }

  /** Set is complete when every item id has been correctly placed. */
  export function colorSortComplete(
    placed: ReadonlyArray<string>,
    total: ReadonlyArray<string>,
  ): boolean {
    return isSetComplete(placed, total);
  }

  /** Deterministic reshuffle of items by seed. Categories keep their fixed bin order. */
  export function shuffleColorSort(content: ColorSortContent, seed: number): ColorSortContent {
    return { ...content, items: seededShuffle(content.items, seed) };
  }
  ```

- [ ] Run to see all pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected output: `14 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/color-sort/colorSortLogic.ts src/games/color-sort/colorSortLogic.test.ts && \
  git commit -m "feat: add color-sort drop correctness, completion, deterministic shuffle"
  ```
  Expected output: commit created.

---

### Task 5: color-sort content.json + a test that validates the SHIPPED content

**Files:**
- `src/games/color-sort/content.json` (create)
- `src/games/color-sort/colorSortLogic.test.ts` (modify — add a test against the real file)

- [ ] Create the shipped content.json using the decision-5 palette (blue, green, purple, red — all clear ≥3:1 on white; bin order blue→green→purple→red is adjacency-safe). Every category carries a unique redundant cue; items reference valid categories.
  File `src/games/color-sort/content.json`:
  ```json
  {
    "schema": 1,
    "gameId": "color-sort",
    "introCue": "cs.intro",
    "appreciationCue": "cs.appreciation",
    "categories": [
      { "id": "blue",   "colorToken": "oiBlue",          "cue": { "shape": "circle",   "pattern": "solid",   "icon": "color-sort/icon-circle" },   "binSprite": "color-sort/bin-blue",   "labelCue": "cs.blue" },
      { "id": "green",  "colorToken": "oiBluishGreen",   "cue": { "shape": "triangle", "pattern": "dots",    "icon": "color-sort/icon-triangle" }, "binSprite": "color-sort/bin-green",  "labelCue": "cs.green" },
      { "id": "purple", "colorToken": "oiReddishPurple", "cue": { "shape": "heart",    "pattern": "zigzag",  "icon": "color-sort/icon-heart" },    "binSprite": "color-sort/bin-purple", "labelCue": "cs.purple" },
      { "id": "red",    "colorToken": "oiVermillion",    "cue": { "shape": "star",     "pattern": "grid",    "icon": "color-sort/icon-star" },     "binSprite": "color-sort/bin-red",    "labelCue": "cs.red" }
    ],
    "items": [
      { "id": "i1", "categoryId": "blue",   "sprite": "color-sort/item-blue-1" },
      { "id": "i2", "categoryId": "green",  "sprite": "color-sort/item-green-1" },
      { "id": "i3", "categoryId": "purple", "sprite": "color-sort/item-purple-1" },
      { "id": "i4", "categoryId": "red",    "sprite": "color-sort/item-red-1" },
      { "id": "i5", "categoryId": "blue",   "sprite": "color-sort/item-blue-2" },
      { "id": "i6", "categoryId": "red",    "sprite": "color-sort/item-red-2" }
    ]
  }
  ```

- [ ] Add a test asserting the SHIPPED `content.json` passes `validateColorSortContent` (import the JSON directly). This test is deterministic — there is no "pick one" branch; the palette in decision 5 passes the bare-token contrast check.
  Append to `src/games/color-sort/colorSortLogic.test.ts`:
  ```ts
  import shipped from './content.json';

  describe('shipped color-sort content.json', () => {
    it('passes the colorblind-safety validator', () => {
      expect(() => validateColorSortContent(shipped as unknown as ColorSortContent)).not.toThrow();
    });
    it('has gameId "color-sort" and schema 1', () => {
      expect(shipped.gameId).toBe('color-sort');
      expect(shipped.schema).toBe(1);
    });
    it('declares four colorblind-safe bins in an adjacency-safe order', () => {
      const tokens = shipped.categories.map((c) => c.colorToken);
      expect(tokens).toEqual(['oiBlue', 'oiBluishGreen', 'oiReddishPurple', 'oiVermillion']);
    });
    it('keeps interactive item count within MAX_INTERACTIVE_SPRITES (§8 jank cap)', () => {
      expect(shipped.items.length).toBeLessThanOrEqual(MAX_INTERACTIVE_SPRITES);
    });
  });
  ```
  > Add `import { MAX_INTERACTIVE_SPRITES } from '@/config/gameConfig';` to the test's imports. Requires `resolveJsonModule: true` in `tsconfig.json` (set in M1).

- [ ] Run to see the shipped-content tests pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/color-sort/colorSortLogic.test.ts
  ```
  Expected output: `18 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/color-sort/content.json src/games/color-sort/colorSortLogic.test.ts && \
  git commit -m "feat: add color-sort content.json and validate shipped content"
  ```
  Expected output: commit created.

---

### Task 6: ColorSortScene (THIN wiring — no unit tests; covered by manual QA)

**Files:**
- `src/games/color-sort/ColorSortScene.ts` (create)

- [ ] Create the scene. It is wiring only: validate content in `loadContent()`, build bins + draggable items in `buildLayout()` (rendering the latest `reshuffle` output), supply drag events via `getDragEvents()`, and on a correct drop that completes the set call `this.onSetComplete()` (the single completion entry point; decision 1). `reshuffle(seed)` mutates `csContent` only (decision 4). Frame names are passed as full SpriteKeys (decision 3).
  File `src/games/color-sort/ColorSortScene.ts`:
  ```ts
  import { BaseGameScene } from '@/shell/scenes/BaseGameScene';
  import {
    MIN_HIT_AREA_PX,
    type DraggableMeta,
    type DropTarget,
    type DragDropEvents,
  } from '@/shell/input/dropValidation';
  import type { ContentConfig, ColorSortContent } from '@/types';
  import {
    validateColorSortContent,
    isCorrectColorDrop,
    colorSortComplete,
    shuffleColorSort,
  } from './colorSortLogic';
  import contentJson from './content.json';

  export class ColorSortScene extends BaseGameScene {
    private csContent!: ColorSortContent;
    private placed = new Set<string>();

    constructor() {
      super('ColorSort');
    }

    protected loadContent(): ContentConfig {
      const c = contentJson as unknown as ColorSortContent;
      validateColorSortContent(c);
      this.csContent = c;
      return c;
    }

    /** Mutate content for the given seed ONLY. Base calls buildLayout() afterward (decision 4). */
    protected reshuffle(seed: number): void {
      this.csContent = shuffleColorSort(this.csContent, seed);
    }

    protected getDragEvents(): DragDropEvents {
      return {
        onValidDrop: (item, target) => this.handleDrop(item, target),
      };
    }

    protected buildLayout(): void {
      const { width, height } = this.scale;
      this.placed.clear();
      this.children.removeAll();

      // Bins across the top, evenly spaced (fixed order = adjacency-safe order).
      const bins = this.csContent.categories;
      const binGap = width / (bins.length + 1);
      bins.forEach((cat, idx) => {
        const bx = binGap * (idx + 1);
        const by = height * 0.25;
        this.add.image(bx, by, 'color-sort', cat.binSprite).setDisplaySize(MIN_HIT_AREA_PX * 1.4, MIN_HIT_AREA_PX * 1.4);
        const zone = this.add.zone(bx, by, MIN_HIT_AREA_PX * 1.6, MIN_HIT_AREA_PX * 1.6);
        const target: DropTarget = { id: cat.id, acceptsCategoryId: cat.id };
        this.drag.addTarget(zone, target);
      });

      // Items along the bottom.
      const itemGap = width / (this.csContent.items.length + 1);
      this.csContent.items.forEach((item, idx) => {
        const ix = itemGap * (idx + 1);
        const iy = height * 0.75;
        const img = this.add.image(ix, iy, 'color-sort', item.sprite).setDisplaySize(MIN_HIT_AREA_PX, MIN_HIT_AREA_PX);
        const meta: DraggableMeta = { id: item.id, categoryId: item.categoryId };
        this.drag.addDraggable(img, meta);
      });
    }

    private handleDrop(item: DraggableMeta, target: DropTarget): void {
      if (!isCorrectColorDrop(item, target)) return;
      this.placed.add(item.id);
      void this.rewards.play({ kind: 'snap', x: this.scale.width / 2, y: this.scale.height / 2 });
      const allItemIds = this.csContent.items.map((i) => i.id);
      if (colorSortComplete([...this.placed], allItemIds)) { void this.onSetComplete(); }
    }
  }
  ```

- [ ] Type-check (no test for the scene — it is thin wiring).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npx tsc --noEmit
  ```
  Expected output: no type errors. (`getDragEvents` returns `DragDropEvents`; Base consumes it in the `DragDropController` constructor. There is no `this.drag.events` assignment.)

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/color-sort/ColorSortScene.ts && \
  git commit -m "feat: add ColorSortScene (thin wiring over color-sort logic)"
  ```
  Expected output: commit created.

---

### Task 7: item-sort PURE logic — categorization correctness, completion, content validation, shuffle

**Files:**
- `src/games/item-sort/itemSortLogic.test.ts` (create)
- `src/games/item-sort/itemSortLogic.ts` (create)

- [ ] Write failing tests for `validateItemSortContent`, `isCorrectCategoryDrop`, `itemSortComplete`, `shuffleItemSort`.
  File `src/games/item-sort/itemSortLogic.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    validateItemSortContent,
    isCorrectCategoryDrop,
    itemSortComplete,
    shuffleItemSort,
  } from './itemSortLogic';
  import type { ItemSortContent } from '@/types';

  function base(): ItemSortContent {
    return {
      schema: 1,
      gameId: 'item-sort',
      introCue: 'is.intro' as never,
      appreciationCue: 'is.appreciation' as never,
      categories: [
        { id: 'fruit',  binSprite: 'item-sort/bin-fruit' as never,  labelCue: 'is.fruit' as never },
        { id: 'animal', binSprite: 'item-sort/bin-animal' as never, labelCue: 'is.animal' as never },
      ],
      items: [
        { id: 'apple', categoryId: 'fruit',  sprite: 'item-sort/apple' as never },
        { id: 'cat',   categoryId: 'animal', sprite: 'item-sort/cat' as never },
      ],
    };
  }

  describe('validateItemSortContent', () => {
    it('accepts well-formed content', () => {
      expect(() => validateItemSortContent(base())).not.toThrow();
    });
    it('throws when an item references an unknown category', () => {
      const c = base();
      c.items[0].categoryId = 'nope';
      expect(() => validateItemSortContent(c)).toThrow(/categor/i);
    });
  });

  describe('isCorrectCategoryDrop', () => {
    it('is true when item category matches the bin category', () => {
      expect(isCorrectCategoryDrop({ id: 'apple', categoryId: 'fruit' }, { id: 'bin-fruit', acceptsCategoryId: 'fruit' })).toBe(true);
    });
    it('is false when categories differ', () => {
      expect(isCorrectCategoryDrop({ id: 'apple', categoryId: 'fruit' }, { id: 'bin-animal', acceptsCategoryId: 'animal' })).toBe(false);
    });
  });

  describe('itemSortComplete', () => {
    it('is true only when all items are placed', () => {
      expect(itemSortComplete(['apple', 'cat'], ['apple', 'cat'])).toBe(true);
      expect(itemSortComplete(['apple'], ['apple', 'cat'])).toBe(false);
    });
  });

  describe('shuffleItemSort', () => {
    it('is deterministic by seed and preserves the item set', () => {
      const c = base();
      expect(shuffleItemSort(c, 9).items.map((i) => i.id)).toEqual(shuffleItemSort(c, 9).items.map((i) => i.id));
      expect(shuffleItemSort(c, 9).items.map((i) => i.id).sort()).toEqual(c.items.map((i) => i.id).sort());
    });
  });
  ```

- [ ] Run to see them fail.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/item-sort/itemSortLogic.test.ts
  ```
  Expected failure: `Failed to resolve import "./itemSortLogic"`.

- [ ] Implement the module (reuse shared `dropValidation` and the seeded shuffle helper).
  File `src/games/item-sort/itemSortLogic.ts`:
  ```ts
  import type { ItemSortContent } from '@/types';
  import {
    isValidDrop,
    isSetComplete,
    type DraggableMeta,
    type DropTarget,
  } from '@/shell/input/dropValidation';

  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
    const out = arr.slice();
    const rng = mulberry32(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Beyond JSON-Schema: every item.categoryId must reference an existing category. */
  export function validateItemSortContent(content: ItemSortContent): void {
    const ids = new Set(content.categories.map((c) => c.id));
    for (const item of content.items) {
      if (!ids.has(item.categoryId)) {
        throw new Error(`item-sort: item "${item.id}" references unknown categoryId "${item.categoryId}"`);
      }
    }
  }

  export function isCorrectCategoryDrop(item: DraggableMeta, target: DropTarget): boolean {
    return isValidDrop(item, target);
  }

  export function itemSortComplete(placed: ReadonlyArray<string>, total: ReadonlyArray<string>): boolean {
    return isSetComplete(placed, total);
  }

  export function shuffleItemSort(content: ItemSortContent, seed: number): ItemSortContent {
    return { ...content, items: seededShuffle(content.items, seed) };
  }
  ```

- [ ] Run to see all pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/item-sort/itemSortLogic.test.ts
  ```
  Expected output: `7 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/item-sort/itemSortLogic.ts src/games/item-sort/itemSortLogic.test.ts && \
  git commit -m "feat: add item-sort logic (categorization, completion, validation, shuffle)"
  ```
  Expected output: commit created.

---

### Task 8: item-sort content.json + shipped-content test

**Files:**
- `src/games/item-sort/content.json` (create)
- `src/games/item-sort/itemSortLogic.test.ts` (modify)

- [ ] Create the shipped content.json (verbatim from §4.2 example).
  File `src/games/item-sort/content.json`:
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

- [ ] Add a shipped-content test.
  Append to `src/games/item-sort/itemSortLogic.test.ts`:
  ```ts
  import shipped from './content.json';
  import { MAX_INTERACTIVE_SPRITES } from '@/config/gameConfig';

  describe('shipped item-sort content.json', () => {
    it('passes the validator and has gameId "item-sort"', () => {
      expect(() => validateItemSortContent(shipped as unknown as ItemSortContent)).not.toThrow();
      expect(shipped.gameId).toBe('item-sort');
      expect(shipped.schema).toBe(1);
    });
    it('keeps interactive item count within MAX_INTERACTIVE_SPRITES (§8 jank cap)', () => {
      expect(shipped.items.length).toBeLessThanOrEqual(MAX_INTERACTIVE_SPRITES);
    });
  });
  ```

- [ ] Run to see it pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/item-sort/itemSortLogic.test.ts
  ```
  Expected output: `9 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/item-sort/content.json src/games/item-sort/itemSortLogic.test.ts && \
  git commit -m "feat: add item-sort content.json and validate shipped content"
  ```
  Expected output: commit created.

---

### Task 9: ItemSortScene (THIN wiring)

**Files:**
- `src/games/item-sort/ItemSortScene.ts` (create)

- [ ] Create the scene (mirror ColorSortScene structure; bins per category, draggable items; correct drop that completes the set → `this.onSetComplete()` (single completion entry point); events via `getDragEvents()`; `reshuffle` mutates content only; full-SpriteKey frame names).
  File `src/games/item-sort/ItemSortScene.ts`:
  ```ts
  import { BaseGameScene } from '@/shell/scenes/BaseGameScene';
  import {
    MIN_HIT_AREA_PX,
    type DraggableMeta,
    type DropTarget,
    type DragDropEvents,
  } from '@/shell/input/dropValidation';
  import type { ContentConfig, ItemSortContent } from '@/types';
  import {
    validateItemSortContent,
    isCorrectCategoryDrop,
    itemSortComplete,
    shuffleItemSort,
  } from './itemSortLogic';
  import contentJson from './content.json';

  export class ItemSortScene extends BaseGameScene {
    private isContent!: ItemSortContent;
    private placed = new Set<string>();

    constructor() {
      super('ItemSort');
    }

    protected loadContent(): ContentConfig {
      const c = contentJson as unknown as ItemSortContent;
      validateItemSortContent(c);
      this.isContent = c;
      return c;
    }

    protected reshuffle(seed: number): void {
      this.isContent = shuffleItemSort(this.isContent, seed);
    }

    protected getDragEvents(): DragDropEvents {
      return {
        onValidDrop: (item, target) => this.handleDrop(item, target),
      };
    }

    protected buildLayout(): void {
      const { width, height } = this.scale;
      this.placed.clear();
      this.children.removeAll();

      const bins = this.isContent.categories;
      const binGap = width / (bins.length + 1);
      bins.forEach((cat, idx) => {
        const bx = binGap * (idx + 1);
        const by = height * 0.25;
        this.add.image(bx, by, 'item-sort', cat.binSprite).setDisplaySize(MIN_HIT_AREA_PX * 1.4, MIN_HIT_AREA_PX * 1.4);
        const zone = this.add.zone(bx, by, MIN_HIT_AREA_PX * 1.6, MIN_HIT_AREA_PX * 1.6);
        const target: DropTarget = { id: cat.id, acceptsCategoryId: cat.id };
        this.drag.addTarget(zone, target);
      });

      const itemGap = width / (this.isContent.items.length + 1);
      this.isContent.items.forEach((item, idx) => {
        const ix = itemGap * (idx + 1);
        const iy = height * 0.75;
        const img = this.add.image(ix, iy, 'item-sort', item.sprite).setDisplaySize(MIN_HIT_AREA_PX, MIN_HIT_AREA_PX);
        const meta: DraggableMeta = { id: item.id, categoryId: item.categoryId };
        this.drag.addDraggable(img, meta);
      });
    }

    private handleDrop(item: DraggableMeta, target: DropTarget): void {
      if (!isCorrectCategoryDrop(item, target)) return;
      this.placed.add(item.id);
      void this.rewards.play({ kind: 'snap', x: this.scale.width / 2, y: this.scale.height / 2 });
      const allItemIds = this.isContent.items.map((i) => i.id);
      if (itemSortComplete([...this.placed], allItemIds)) { void this.onSetComplete(); }
    }
  }
  ```

- [ ] Type-check.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npx tsc --noEmit
  ```
  Expected output: no type errors.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/item-sort/ItemSortScene.ts && \
  git commit -m "feat: add ItemSortScene (thin wiring over item-sort logic)"
  ```
  Expected output: commit created.

---

### Task 10: item-match PURE logic — pair matching, completion, grid layout, validation, shuffle

**Files:**
- `src/games/item-match/itemMatchLogic.test.ts` (create)
- `src/games/item-match/itemMatchLogic.ts` (create)

- [ ] Write failing tests for `validateItemMatchContent` (grid product rule + even), `isPairMatch`, `itemMatchComplete`, `cellCenters` (grid layout math), `shuffleItemMatch`.
  File `src/games/item-match/itemMatchLogic.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    validateItemMatchContent,
    isPairMatch,
    itemMatchComplete,
    cellCenters,
    shuffleItemMatch,
  } from './itemMatchLogic';
  import type { ItemMatchContent } from '@/types';

  function base(): ItemMatchContent {
    return {
      schema: 1,
      gameId: 'item-match',
      introCue: 'im.intro' as never,
      appreciationCue: 'im.appreciation' as never,
      grid: { cols: 4, rows: 2 },
      pairs: [
        { id: 'sun',   spriteA: 'item-match/sun' as never,   spriteB: 'item-match/sun' as never,   matchCue: 'im.sun' as never },
        { id: 'moon',  spriteA: 'item-match/moon' as never,  spriteB: 'item-match/moon' as never,  matchCue: 'im.moon' as never },
        { id: 'star',  spriteA: 'item-match/star' as never,  spriteB: 'item-match/star' as never,  matchCue: 'im.star' as never },
        { id: 'cloud', spriteA: 'item-match/cloud' as never, spriteB: 'item-match/cloud' as never, matchCue: 'im.cloud' as never },
      ],
    };
  }

  describe('validateItemMatchContent', () => {
    it('accepts content where cols*rows === pairs*2', () => {
      expect(() => validateItemMatchContent(base())).not.toThrow();
    });
    it('throws when grid cells != pairs*2', () => {
      const c = base();
      c.grid = { cols: 3, rows: 2 }; // 6 cells, but 4 pairs need 8
      expect(() => validateItemMatchContent(c)).toThrow(/grid/i);
    });
    it('throws when the grid product is odd', () => {
      const c = base();
      c.grid = { cols: 3, rows: 3 }; // 9 cells, odd
      expect(() => validateItemMatchContent(c)).toThrow(/even/i);
    });
  });

  describe('isPairMatch', () => {
    it('is true when two distinct cards share a pairId', () => {
      expect(isPairMatch({ id: 'sun#A', pairId: 'sun' }, { id: 'sun#B', pairId: 'sun' })).toBe(true);
    });
    it('is false for different pairIds', () => {
      expect(isPairMatch({ id: 'sun#A', pairId: 'sun' }, { id: 'moon#A', pairId: 'moon' })).toBe(false);
    });
    it('is false when the same card is selected twice', () => {
      expect(isPairMatch({ id: 'sun#A', pairId: 'sun' }, { id: 'sun#A', pairId: 'sun' })).toBe(false);
    });
  });

  describe('itemMatchComplete', () => {
    it('is true only when every pair id is matched', () => {
      expect(itemMatchComplete(['sun', 'moon', 'star', 'cloud'], ['sun', 'moon', 'star', 'cloud'])).toBe(true);
      expect(itemMatchComplete(['sun'], ['sun', 'moon'])).toBe(false);
    });
  });

  describe('cellCenters', () => {
    it('returns cols*rows centers in row-major order within the bounds', () => {
      const centers = cellCenters({ cols: 2, rows: 2 }, 400, 400);
      expect(centers).toHaveLength(4);
      // first cell center is inside the top-left quadrant
      expect(centers[0].x).toBeGreaterThan(0);
      expect(centers[0].x).toBeLessThan(200);
      expect(centers[0].y).toBeGreaterThan(0);
      expect(centers[0].y).toBeLessThan(200);
      // last cell center is in the bottom-right quadrant
      expect(centers[3].x).toBeGreaterThan(200);
      expect(centers[3].y).toBeGreaterThan(200);
    });
  });

  describe('shuffleItemMatch', () => {
    it('is deterministic by seed and yields pairs*2 cards', () => {
      const c = base();
      const a = shuffleItemMatch(c, 5).map((card) => card.pairId);
      const b = shuffleItemMatch(c, 5).map((card) => card.pairId);
      expect(a).toEqual(b);
      expect(a).toHaveLength(c.pairs.length * 2);
    });
    it('contains exactly two cards per pair', () => {
      const c = base();
      const counts: Record<string, number> = {};
      for (const card of shuffleItemMatch(c, 1)) counts[card.pairId] = (counts[card.pairId] ?? 0) + 1;
      for (const p of c.pairs) expect(counts[p.id]).toBe(2);
    });
  });
  ```

- [ ] Run to see them fail.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/item-match/itemMatchLogic.test.ts
  ```
  Expected failure: `Failed to resolve import "./itemMatchLogic"`.

- [ ] Implement the module. `isPairMatch` delegates to shared `isMatch` (plus a same-card guard); completion to shared `isSetComplete`; layout is pure math; `shuffleItemMatch` expands pairs into two cards and seed-shuffles.
  File `src/games/item-match/itemMatchLogic.ts`:
  ```ts
  import type { ItemMatchContent, SpriteKey } from '@/types';
  import { isMatch, isSetComplete, type DraggableMeta } from '@/shell/input/dropValidation';

  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
    const out = arr.slice();
    const rng = mulberry32(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Beyond JSON-Schema (§4.3): grid product must be even AND equal pairs*2. */
  export function validateItemMatchContent(content: ItemMatchContent): void {
    const cells = content.grid.cols * content.grid.rows;
    if (cells % 2 !== 0) {
      throw new Error(`item-match: grid product ${cells} must be even`);
    }
    if (cells !== content.pairs.length * 2) {
      throw new Error(
        `item-match: grid cells (${cells}) must equal pairs*2 (${content.pairs.length * 2})`,
      );
    }
  }

  /** Two cards match when they share a pairId and are different cards. */
  export function isPairMatch(a: DraggableMeta, b: DraggableMeta): boolean {
    if (a.id === b.id) return false;
    return isMatch(a, b);
  }

  /** Set complete when every pair id is in the matched list. */
  export function itemMatchComplete(
    matched: ReadonlyArray<string>,
    total: ReadonlyArray<string>,
  ): boolean {
    return isSetComplete(matched, total);
  }

  export interface CellCenter { x: number; y: number; }

  /** Row-major cell centers for a cols×rows grid inside (width × height), with even gutters. */
  export function cellCenters(
    grid: { cols: number; rows: number },
    width: number,
    height: number,
  ): CellCenter[] {
    const cellW = width / grid.cols;
    const cellH = height / grid.rows;
    const out: CellCenter[] = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        out.push({ x: cellW * c + cellW / 2, y: cellH * r + cellH / 2 });
      }
    }
    return out;
  }

  /** A single placed card in the match grid. */
  export interface MatchCard {
    /** Unique per card: "<pairId>#A" / "<pairId>#B". */
    id: string;
    pairId: string;
    sprite: SpriteKey;
  }

  /** Expand pairs into two cards each, then deterministically shuffle by seed. */
  export function shuffleItemMatch(content: ItemMatchContent, seed: number): MatchCard[] {
    const cards: MatchCard[] = [];
    for (const p of content.pairs) {
      cards.push({ id: `${p.id}#A`, pairId: p.id, sprite: p.spriteA });
      cards.push({ id: `${p.id}#B`, pairId: p.id, sprite: p.spriteB });
    }
    return seededShuffle(cards, seed);
  }
  ```
  > `DraggableMeta.pairId` is part of the shared `dropValidation` contract (§3.3). `isMatch` uses pairId equality; `isPairMatch` additionally guards against selecting the same card twice.

- [ ] Run to see all pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/item-match/itemMatchLogic.test.ts
  ```
  Expected output: `11 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/item-match/itemMatchLogic.ts src/games/item-match/itemMatchLogic.test.ts && \
  git commit -m "feat: add item-match logic (pair match, completion, grid layout, shuffle)"
  ```
  Expected output: commit created.

---

### Task 11: item-match content.json + shipped-content test

**Files:**
- `src/games/item-match/content.json` (create)
- `src/games/item-match/itemMatchLogic.test.ts` (modify)

- [ ] Create the shipped content.json (verbatim from §4.3 example; 4×2 grid = 8 cells = 4 pairs × 2).
  File `src/games/item-match/content.json`:
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

- [ ] Add a shipped-content test.
  Append to `src/games/item-match/itemMatchLogic.test.ts`:
  ```ts
  import shipped from './content.json';
  import { MAX_INTERACTIVE_SPRITES } from '@/config/gameConfig';

  describe('shipped item-match content.json', () => {
    it('passes the validator and has gameId "item-match"', () => {
      expect(() => validateItemMatchContent(shipped as unknown as ItemMatchContent)).not.toThrow();
      expect(shipped.gameId).toBe('item-match');
      expect(shipped.schema).toBe(1);
    });
    it('keeps interactive card count (pairs*2) within MAX_INTERACTIVE_SPRITES (§8 jank cap)', () => {
      expect(shipped.pairs.length * 2).toBeLessThanOrEqual(MAX_INTERACTIVE_SPRITES);
    });
  });
  ```

- [ ] Run to see it pass.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/item-match/itemMatchLogic.test.ts
  ```
  Expected output: `13 passed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/item-match/content.json src/games/item-match/itemMatchLogic.test.ts && \
  git commit -m "feat: add item-match content.json and validate shipped content"
  ```
  Expected output: commit created.

---

### Task 12: ItemMatchScene (THIN wiring — tap-to-match)

**Files:**
- `src/games/item-match/ItemMatchScene.ts` (create)

- [ ] Create the scene. `reshuffle(seed)` stores the shuffled cards on the instance ONLY (no `buildLayout()`; decision 4). `buildLayout()` renders `this.cards` at `cellCenters`. There is NO `currentSeed()` — Base owns the seed and calls `reshuffle` then `buildLayout` (decision 4). On the second tap, `isPairMatch` → keep + matchCue + snap reward → if that match completes the set, `this.onSetComplete()` (the single completion entry point; decision 1). Item-match uses taps, not drag, so `getDragEvents()` returns an empty object (no draggables registered).
  File `src/games/item-match/ItemMatchScene.ts`:
  ```ts
  import Phaser from 'phaser';
  import { BaseGameScene } from '@/shell/scenes/BaseGameScene';
  import { MIN_HIT_AREA_PX, type DraggableMeta, type DragDropEvents } from '@/shell/input/dropValidation';
  import type { ContentConfig, ItemMatchContent } from '@/types';
  import {
    validateItemMatchContent,
    isPairMatch,
    itemMatchComplete,
    cellCenters,
    shuffleItemMatch,
    type MatchCard,
  } from './itemMatchLogic';
  import contentJson from './content.json';

  export class ItemMatchScene extends BaseGameScene {
    private imContent!: ItemMatchContent;
    private cards: MatchCard[] = [];
    private matched = new Set<string>();
    private firstPick: { meta: DraggableMeta; obj: Phaser.GameObjects.Image } | null = null;

    constructor() {
      super('ItemMatch');
    }

    protected loadContent(): ContentConfig {
      const c = contentJson as unknown as ItemMatchContent;
      validateItemMatchContent(c);
      this.imContent = c;
      return c;
    }

    /** Mutate the card set for the given seed ONLY. Base calls buildLayout() afterward (decision 4). */
    protected reshuffle(seed: number): void {
      this.cards = shuffleItemMatch(this.imContent, seed);
    }

    /** Item-match is tap-driven; no draggables. Base still expects a DragDropEvents object. */
    protected getDragEvents(): DragDropEvents {
      return {};
    }

    protected buildLayout(): void {
      const { width, height } = this.scale;
      this.matched.clear();
      this.firstPick = null;
      this.children.removeAll();

      const centers = cellCenters(this.imContent.grid, width, height);
      this.cards.forEach((card, idx) => {
        const center = centers[idx];
        const img = this.add
          .image(center.x, center.y, 'item-match', card.sprite)
          .setDisplaySize(MIN_HIT_AREA_PX, MIN_HIT_AREA_PX)
          .setInteractive({ useHandCursor: true });
        const meta: DraggableMeta = { id: card.id, pairId: card.pairId };
        img.on('pointerup', () => this.handlePick(meta, img));
      });
    }

    private handlePick(meta: DraggableMeta, obj: Phaser.GameObjects.Image): void {
      if (this.matched.has(meta.pairId ?? '')) return;
      if (!this.firstPick) {
        this.firstPick = { meta, obj };
        return;
      }
      const first = this.firstPick;
      this.firstPick = null;
      if (!isPairMatch(first.meta, meta)) {
        // mismatch: cards simply remain tappable; no penalty, no score (per spec).
        return;
      }
      this.matched.add(meta.pairId ?? '');
      const pair = this.imContent.pairs.find((p) => p.id === meta.pairId);
      if (pair) void this.audio.play(pair.matchCue);
      void this.rewards.play({ kind: 'snap', x: obj.x, y: obj.y });
      const allPairIds = this.imContent.pairs.map((p) => p.id);
      if (itemMatchComplete([...this.matched], allPairIds)) { void this.onSetComplete(); }
    }
  }
  ```

- [ ] Type-check.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npx tsc --noEmit
  ```
  Expected output: no type errors. (No `currentSeed()`; `reshuffle` writes `this.cards`; `buildLayout` reads them.)

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/item-match/ItemMatchScene.ts && \
  git commit -m "feat: add ItemMatchScene (thin wiring over item-match logic)"
  ```
  Expected output: commit created.

---

### Task 13: registry — confirm/complete GAMES (M2-authored; M4 extends only)

> Per decision 6, `src/games/registry.ts` and `src/games/registry.test.ts` are authored in M2 with `titleKey` = `hub.title.*` and `tileVoiceCue` = `hub.tile.*` (matching `SHELL_CUES`). M4 does NOT recreate the test file and does NOT rename ids. This task confirms the three entries exist and are correct, filling any M2-left stub with the exact ids.

**Files:**
- `src/games/registry.ts` (modify — confirm/complete only)

- [ ] Read the current registry and its M2 test to confirm the authoritative ids.
  Read `/Users/shan/PhpstormProjects/ehaan-games/src/games/registry.ts` and `/Users/shan/PhpstormProjects/ehaan-games/src/games/registry.test.ts`. Confirm the test asserts `titleKey === 'hub.title.<game>'`, `tileVoiceCue === 'hub.tile.<game>'`, `contentPath === 'games/<id>/content.json'`, and `atlas === <id>`.

- [ ] Run the existing M2 registry test to see the current state.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/registry.test.ts
  ```
  Expected output: passes if M2 fully populated the registry; if M2 left a stub, the failing assertion names the missing/incorrect entry to fix in the next step.

- [ ] Ensure `src/games/registry.ts` contains exactly these three entries (uses the shared `GameDef` shape §2.1 + `spriteKey` §2.2; tile icons live in the `shared` atlas; ids match `SHELL_CUES`). If M2 already wrote them identically, this is a no-op confirmation. If any entry differs or is missing, set it to:
  File `src/games/registry.ts`:
  ```ts
  import type { GameDef } from '@/types';
  import { spriteKey } from '@/types';

  /** Ordered list rendered by HubScene. Add a game = add one entry. */
  export const GAMES: readonly GameDef[] = [
    {
      id: 'color-sort',
      sceneKey: 'ColorSort',
      titleKey: 'hub.title.colorSort',
      tileSprite: spriteKey('shared', 'tile-color-sort'),
      atlas: 'color-sort',
      tileVoiceCue: 'hub.tile.colorSort' as GameDef['tileVoiceCue'],
      contentPath: 'games/color-sort/content.json',
    },
    {
      id: 'item-sort',
      sceneKey: 'ItemSort',
      titleKey: 'hub.title.itemSort',
      tileSprite: spriteKey('shared', 'tile-item-sort'),
      atlas: 'item-sort',
      tileVoiceCue: 'hub.tile.itemSort' as GameDef['tileVoiceCue'],
      contentPath: 'games/item-sort/content.json',
    },
    {
      id: 'item-match',
      sceneKey: 'ItemMatch',
      titleKey: 'hub.title.itemMatch',
      tileSprite: spriteKey('shared', 'tile-item-match'),
      atlas: 'item-match',
      tileVoiceCue: 'hub.tile.itemMatch' as GameDef['tileVoiceCue'],
      contentPath: 'games/item-match/content.json',
    },
  ];
  ```
  > The `hub.tile.*` ids MUST equal the `SHELL_CUES` ids M2 registered (decision 6), so hub tile voice prompts resolve. The `tile-color-sort` / `tile-item-sort` / `tile-item-match` frames live in the `shared` atlas (M3, or M2 placeholder `shared.json`). The `as GameDef['tileVoiceCue']` cast satisfies the branded `AudioCueId` type.

- [ ] Run the M2 registry test to confirm green.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/registry.test.ts
  ```
  Expected output: all registry integrity assertions pass (3 entries; unique ids/sceneKeys; `hub.title.*`/`hub.tile.*` ids; `contentPath`/`atlas` correct).

- [ ] Commit (only if the file changed; otherwise skip with a note that M2 already authored it correctly).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/games/registry.ts && \
  git commit -m "feat: confirm the three v1 games in the hub registry (ids match SHELL_CUES)" || echo "registry already complete from M2 — nothing to commit"
  ```
  Expected output: commit created, or the "already complete" note.

---

### Task 14: Register the three Scenes with the Phaser game (main.ts)

**Files:**
- `src/main.ts` (modify)

- [ ] Read `/Users/shan/PhpstormProjects/ehaan-games/src/main.ts`, locate the scene-registration point M2 defined (the `scene: [...]` array in the `Phaser.Types.Core.GameConfig`, or the `game.scene.add(...)` calls), and identify where the shell scenes `BootScene, HubScene, SettingsScene` are listed.

- [ ] Add imports for the three game scenes near the other scene imports in `src/main.ts`:
  ```ts
  import { ColorSortScene } from '@/games/color-sort/ColorSortScene';
  import { ItemSortScene } from '@/games/item-sort/ItemSortScene';
  import { ItemMatchScene } from '@/games/item-match/ItemMatchScene';
  ```
  And add the three classes to the `scene` array after `BootScene, HubScene, SettingsScene`:
  ```ts
    scene: [BootScene, HubScene, SettingsScene, ColorSortScene, ItemSortScene, ItemMatchScene],
  ```
  > Match M2's actual config shape. If M2 registers scenes via `game.scene.add('ColorSort', ColorSortScene)`, add three equivalent calls using the exact `SceneKey` strings `'ColorSort'`, `'ItemSort'`, `'ItemMatch'`.

- [ ] Type-check + full build.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm run build
  ```
  Expected output: `tsc --noEmit` clean, then Vite build succeeds writing to `dist/`.

- [ ] Run the full test suite to confirm nothing regressed.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test
  ```
  Expected output: all pure-module suites pass (color-sort, item-sort, item-match, registry) plus all M1/M2 suites — `0 failed`.

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add src/main.ts && \
  git commit -m "feat: register color-sort, item-sort, item-match scenes in the game"
  ```
  Expected output: commit created.

---

### Task 15: Manual QA checklist — color-sort

**Files:**
- `qa/checklists/color-sort.md` (create)

- [ ] Create the checklist (exact steps + expected results; colorblind-cue verification is mandatory; shuffle-continuity check relies on Base reading the persisted `shuffleSeed`, decision 4).
  File `qa/checklists/color-sort.md`:
  ```markdown
  # Manual QA — Color Sort

  Device: ___________  OS/version: ___________  Build: ___________  Date: ___________

  ## Launch
  - [ ] From Hub, tap the Color Sort tile.
        Expected: ColorSortScene opens; intro voice cue `cs.intro` plays once (audible after the first tap that unlocked audio).
  - [ ] Bins appear across the top; draggable items along the bottom.
        Expected: 4 bins (blue, green, purple, red), 6 items; all visible without scrolling.

  ## Colorblind-safety (HARD requirement — fail = block release)
  - [ ] Each bin shows a DISTINCT shape outline AND fill pattern AND icon, not color alone.
        Expected: blue=circle/solid/circle-icon, green=triangle/dots/triangle-icon, purple=heart/zigzag/heart-icon, red=star/grid/star-icon.
  - [ ] No two adjacent bins are red/green or blue/purple.
        Expected: bin order is blue → green → purple → red; no forbidden adjacency.
  - [ ] View the screen through a deuteranopia/protanopia simulator (e.g. Sim Daltonism / iOS color filters).
        Expected: every bin is still distinguishable by shape+pattern+icon; matching by cue (not color) succeeds.
  - [ ] Each item carries the same redundant cue as its target bin.
        Expected: an item belonging to "blue" shows the circle shape + solid pattern + circle icon.

  ## Big tap targets (ages 2–5)
  - [ ] Each item and bin hit area is at least ~88px on its shortest edge.
        Expected: a toddler-sized tap reliably picks up an item; no mis-grabs of neighbors.

  ## Drop behavior
  - [ ] Drag an item onto its CORRECT bin.
        Expected: item snaps in; a positive "snap" reward (small pop) plays; no score/number shown.
  - [ ] Drag an item onto a WRONG bin.
        Expected: item returns to origin with a gentle tween; NO penalty sound, NO scolding, NO score.

  ## Completion → appreciation → reshuffle
  - [ ] Correctly place ALL 6 items.
        Expected: full APPRECIATION reward plays (celebratory pop + particles + cheer + `cs.appreciation` voice); NO score, NO stars, NO progress bar, NO "next level".
  - [ ] After the reward, the set reshuffles and play continues.
        Expected: items reappear in a new arrangement; same bins; play is open and continuous.
  - [ ] Close and reopen the game.
        Expected: the same shuffle arrangement resumes (persisted shuffle seed read by BaseGameScene); no data prompt, no login.

  ## No manipulation / no urgency (UK Children's Code)
  - [ ] Observe the full loop for 2 minutes.
        Expected: no streaks, countdowns, timers, "don't stop now" nudges, or guilt messaging anywhere.

  ## Audio resilience (run on iOS too)
  - [ ] Mid-play, trigger a phone call / lock-unlock, then return to the app.
        Expected: voice cues still play (routed via native audio); AudioContext resumed on app resume.
  ```

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add qa/checklists/color-sort.md && \
  git commit -m "docs: add color-sort manual QA checklist"
  ```
  Expected output: commit created.

---

### Task 16: Manual QA checklist — item-sort

**Files:**
- `qa/checklists/item-sort.md` (create)

- [ ] Create the checklist.
  File `qa/checklists/item-sort.md`:
  ```markdown
  # Manual QA — Item Sort

  Device: ___________  OS/version: ___________  Build: ___________  Date: ___________

  ## Launch
  - [ ] From Hub, tap the Item Sort tile.
        Expected: ItemSortScene opens; intro voice cue `is.intro` plays once.
  - [ ] Category bins appear (fruit, animal); draggable items appear (apple, banana, cat, dog).
        Expected: 2 bins, 4 items; all visible without scrolling.

  ## Big tap targets (ages 2–5)
  - [ ] Each item/bin hit area is at least ~88px on its shortest edge.
        Expected: reliable pickup with a toddler-sized tap.

  ## Categorization / drop behavior
  - [ ] Drag a fruit (apple/banana) into the FRUIT bin.
        Expected: snaps in; positive "snap" reward; no score shown.
  - [ ] Drag an animal (cat/dog) into the ANIMAL bin.
        Expected: snaps in; positive "snap" reward.
  - [ ] Drag a fruit into the ANIMAL bin (wrong category).
        Expected: item returns to origin gently; NO penalty sound, NO score, NO scolding.

  ## Completion → appreciation → reshuffle
  - [ ] Correctly sort ALL 4 items.
        Expected: full APPRECIATION reward (pop + cheer + `is.appreciation`); NO score/stars/progress bar/next-level.
  - [ ] After the reward, the set reshuffles and play continues openly.
        Expected: items reappear shuffled; same bins.
  - [ ] Close and reopen the game.
        Expected: the same shuffle arrangement resumes (persisted shuffle seed); no data/login prompt.

  ## No manipulation / no urgency
  - [ ] Observe the loop for 2 minutes.
        Expected: no streaks, timers, urgency, or guilt nudges.

  ## Audio resilience (iOS)
  - [ ] Interrupt with a call / lock-unlock, then return.
        Expected: voice still plays (native audio); context resumed on resume.
  ```

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add qa/checklists/item-sort.md && \
  git commit -m "docs: add item-sort manual QA checklist"
  ```
  Expected output: commit created.

---

### Task 17: Manual QA checklist — item-match

**Files:**
- `qa/checklists/item-match.md` (create)

- [ ] Create the checklist.
  File `qa/checklists/item-match.md`:
  ```markdown
  # Manual QA — Item Match

  Device: ___________  OS/version: ___________  Build: ___________  Date: ___________

  ## Launch
  - [ ] From Hub, tap the Item Match tile.
        Expected: ItemMatchScene opens; intro voice cue `im.intro` plays once.
  - [ ] A 4×2 grid of 8 cards appears (sun, moon, star, cloud — two of each).
        Expected: all 8 cells filled; cards evenly spaced and centered within the grid.

  ## Grid layout
  - [ ] Cards are laid out in row-major order with even spacing.
        Expected: 4 columns × 2 rows; no overlaps; no card off-screen.

  ## Big tap targets (ages 2–5)
  - [ ] Each card hit area is at least ~88px on its shortest edge.
        Expected: reliable tap selection; no accidental neighbor taps.

  ## Matching behavior
  - [ ] Tap two cards of the SAME pair (e.g. both suns).
        Expected: they register as matched; `im.sun` match cue plays; positive "snap" reward; cards stay.
  - [ ] Tap two cards of DIFFERENT pairs.
        Expected: no match; NO penalty sound, NO score; both remain tappable (open, forgiving play).
  - [ ] Tap the same single card twice.
        Expected: treated as no match (a card cannot match itself).

  ## Completion → appreciation → reshuffle
  - [ ] Match ALL 4 pairs.
        Expected: full APPRECIATION reward (pop + cheer + `im.appreciation`); NO score/stars/progress bar/next-level.
  - [ ] After the reward, the grid reshuffles and play continues.
        Expected: cards reappear in a new arrangement; same 4 pairs.
  - [ ] Close and reopen the game.
        Expected: the same shuffle arrangement resumes (persisted shuffle seed); no data/login prompt.

  ## No manipulation / no urgency
  - [ ] Observe the loop for 2 minutes.
        Expected: no streaks, timers, move counters, urgency, or guilt nudges.

  ## Audio resilience (iOS)
  - [ ] Interrupt with a call / lock-unlock, then return.
        Expected: match/voice cues still play (native audio); context resumed on resume.
  ```

- [ ] Commit.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git add qa/checklists/item-match.md && \
  git commit -m "docs: add item-match manual QA checklist"
  ```
  Expected output: commit created.

---

### Task 18: Milestone verification (all games green, no regressions, build clean)

**Files:** none (verification only)

- [ ] Run the entire test suite.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test
  ```
  Expected output: all suites pass — `src/games/color-sort/colorSortLogic.test.ts` (17), `src/games/item-sort/itemSortLogic.test.ts` (8), `src/games/item-match/itemMatchLogic.test.ts` (12), `src/games/registry.test.ts` (M2-authored, passing), plus all M1/M2 suites — `0 failed`.

- [ ] Confirm no pure game-logic module imports `phaser` (LAW: pure modules are framework-free).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && ! grep -lE "from ['\"]phaser['\"]" src/games/color-sort/colorSortLogic.ts src/games/item-sort/itemSortLogic.ts src/games/item-match/itemMatchLogic.ts && echo "OK: no phaser import in pure logic"
  ```
  Expected output: `OK: no phaser import in pure logic`.

- [ ] Confirm no game scene assigns a mutable `drag.events` field (decision 2 — events are constructor-injected via `getDragEvents()`).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && ! grep -rnE "\.drag\.events\s*=" src/games && echo "OK: no post-construction drag.events assignment"
  ```
  Expected output: `OK: no post-construction drag.events assignment`.

- [ ] Confirm completion flows through the single entry point `onSetComplete()` and the rejected `reportItemResolved` API does not exist (decision 1).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && grep -rnE "reportItemResolved" src/games && echo "FAIL: reportItemResolved must not exist" || echo "OK: completion via onSetComplete()"
  ```
  Expected output: `OK: completion via onSetComplete()` (i.e. `reportItemResolved` is absent). Optionally also assert `onSetComplete()` IS present:
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && grep -rn "this.onSetComplete()" src/games
  ```
  Expected: at least one match (the game scenes call the single completion entry point).

- [ ] Confirm no scene defines a `currentSeed()` and no `reshuffle` calls `buildLayout` (decision 4 — Base owns the seed; reshuffle mutates state only).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && ! grep -rnE "currentSeed\s*\(" src/games && echo "OK: no per-scene currentSeed; Base owns the seed"
  ```
  Expected output: `OK: no per-scene currentSeed; Base owns the seed`.

- [ ] Lint the new code.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm run lint
  ```
  Expected output: no lint errors.

- [ ] Full type-check + production build.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm run build
  ```
  Expected output: clean `tsc --noEmit` then a successful Vite build to `dist/`.

- [ ] Confirm all three content.json files validate via their shipped-content tests and that the Hub sees three registered games.
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && npm test -- src/games/registry.test.ts src/games/color-sort/colorSortLogic.test.ts src/games/item-sort/itemSortLogic.test.ts src/games/item-match/itemMatchLogic.test.ts
  ```
  Expected output: all four files green (color-sort 17, item-sort 8, item-match 12, registry M2-authored), `0 failed`.

- [ ] Final milestone marker commit (docs only; all code already committed).
  ```bash
  cd /Users/shan/PhpstormProjects/ehaan-games && git commit --allow-empty -m "docs: M4 complete — three v1 games (color-sort, item-sort, item-match) wired into the hub"
  ```
  Expected output: empty marker commit created.

---

## Milestone exit criteria (all must hold)

- [ ] Three games each have: a PURE unit-tested logic module (no `phaser` import), a validated `content.json`, and a THIN Scene extending `BaseGameScene`.
- [ ] color-sort enforces — via unit tests — redundant-cue presence, cue uniqueness, forbidden-adjacency rejection, ≥3:1 contrast (bare-token check; shipped palette blue/green/purple/red all pass on white), and category-ref integrity (Okabe-Ito palette, §5). The shipped `content.json` passes `validateColorSortContent` deterministically with no conditional branch.
- [ ] item-sort unit tests cover categorization correctness + completion; item-match unit tests cover pair matching + completion + grid layout math; all shuffles are deterministic by seed.
- [ ] Completion flows ONLY through the single entry point `BaseGameScene.onSetComplete()` (there is NO `reportItemResolved`); the appreciation reward + reshuffle + `cyclesCompleted` increment are sequenced once by M2's `gameLoop` (internal to `onSetComplete()`) — NO levels, scoring, progress bars, streaks, urgency, or guilt anywhere.
- [ ] Drag events are constructor-injected via each scene's `getDragEvents()` (no `this.drag.events = ...`); `reshuffle(seed)` mutates state only and never calls `buildLayout()`; there is no per-scene `currentSeed()`; Base owns the persisted seed (shuffle continuity on relaunch).
- [ ] All `add.image()/add.sprite()` calls pass the FULL `"atlas/frame"` SpriteKey as the frame name (decision 3), consistent with `HubScene.frameOf` and the M3 packer output.
- [ ] All three games are confirmed in the M2-authored `src/games/registry.ts` with `hub.title.*`/`hub.tile.*` ids matching `SHELL_CUES` (M4 did not rename ids or recreate `registry.test.ts`); their Scenes are registered in `src/main.ts`; `npm run build` is clean.
- [ ] A manual QA checklist exists per game in `qa/checklists/` with exact steps + expected results, including colorblind-cue verification, shuffle-continuity-on-relaunch, and iOS audio-resilience checks.