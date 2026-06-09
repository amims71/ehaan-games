# Ehaan Games — Stack & Architecture Design

**Date:** 2026-06-09
**Status:** Approved (design phase) — ready for implementation planning
**Author:** Brainstormed with Claude (Opus 4.8), grounded by an adversarially-validated research pass

---

## 1. Summary

Build an **ongoing catalog of simple 2D games for children aged 2–5**, starting with three games — color sorting, item sorting, item matching. Ship **one bundled, fully-offline app** to the Apple App Store and Google Play, with a web/PWA build as a near-free bonus from the same codebase.

**Stack:** Phaser 4.1.x (TypeScript) + Capacitor 8.3.x, bundled with Vite. Local-only storage via Capacitor Preferences. **Zero networking code, zero data collection.**

The decision is gated on a one-week vertical slice (Phase 0) that proves iOS audio resilience and drag latency on cheap Android hardware. If that gate fails, the documented fallback is React Native + Expo — same TypeScript team, no new language.

---

## 2. Project context & constraints

These were established during brainstorming and drive every decision below:

| Constraint | Value | Consequence |
|---|---|---|
| Team skills | Web / JavaScript / TypeScript / PHP | No new language (no Dart/C#/Swift/Kotlin); minimize ramp-up |
| Monetization | Free, no ads, no IAP | Cleanest kids-category review |
| Data | Collect **zero** personal data | Fully offline; **no backend** for v1; side-steps COPPA/GDPR-K consent |
| Scope | Ongoing catalog (not a one-off) | Invest in a reusable game shell; new games ≈ content + config |
| Audience | Ages 2–5 | Big tap targets, voice prompts (pre-literate), no manipulative engagement |
| Assets | **AI-generated only** (art + audio) | Need a style guide, asset pipeline, and licensing hygiene |
| Targets | iOS + Android (web/PWA a bonus) | Single codebase across all three |

---

## 3. Stack decision

### 3.1 Chosen: Phaser 4.1.x (TypeScript) + Capacitor 8.3.x

One Phaser game instance, Scene-based, packaged by Capacitor into native iOS + Android shells, and published as a PWA from the same Vite `dist/`.

**Rationale.** This is the only option that simultaneously (a) reuses the team's exact skills with zero new-language ramp-up, and (b) reaches iOS + Android + web from one codebase at near-zero marginal web cost. Phaser is a real 2D game engine, so the precise primitives these games need ship out of the box — draggable objects (`setInteractive({draggable:true})` + drag events), sprite/atlas animation, tween-based reward "pops", and a sound manager. The reusable shell maps cleanly onto a Scene architecture, so each new game becomes mostly content + config (an atlas + a level JSON).

The honest framing: **this wins on people and economics, not raw engineering superiority.** The two real technical weaknesses (below) are designed for, not ignored.

### 3.2 Trade-off matrix (all candidates)

| Stack | Ramp-up (JS team) | Game fit | Cross-platform | Verdict |
|---|---|---|---|---|
| **Phaser 4.1 + Capacitor** ⭐ | Lowest — zero new language | Very good — drag/sprite/tween/sound built in | **Best** — iOS+Android+web near-free | **WINNER** (gated) |
| React Native + Expo (Skia + Reanimated 4 + reanimated-dnd) | Lowest (tied) | Strong but **DIY** — hand-build the game layer | iOS+Android first-class; PWA less free | **Runner-up + designated fallback** |
| Flutter + Flame 1.37 (Dart) | High — new language | Excellent (overkill) | iOS+Android+web (heavy) | Reject — violates ramp-up constraint |
| Godot 4.6 (GDScript) | Medium | Very good | Weak HTML5/PWA | Reject — best engine, but loses to web stack here |
| Unity 6.3 (C#) | Highest | Excellent (overkill) | Heavy WebGL | Reject — new language + telemetry vs zero-data |

### 3.3 Version pins (deliberate)

- **Phaser 4.1.x** ("Salusa") — *not* the frozen, unmaintained v3; *not* the brand-new 4.0.0. 4.1 adds mobile shader optimizations and automatic WebGL context recovery.
- **Capacitor 8.3.x** — stay on stable; defer the v9 alpha.
- Pin all versions; re-test on real devices at each minor bump.

---

## 4. Architecture

### 4.1 The reusable game shell (the long-term asset)

Each module is a **thin abstraction** so an implementation swap — or a full pivot to the RN fallback — stays localized and never touches game code.

**Scenes**
- `BootScene` — load shared atlas + audio manifest, init platform services
- `HubScene` — kid-friendly menu; tiles driven by a `games/registry.ts` (add a game = add an entry)
- `SettingsScene` — audio on/off, volume — **behind the parental gate**
- `BaseGameScene` (abstract) — lifecycle, win/lose loop, reward sequencing, per-child progress hooks; every game extends this

**Shared systems**
- `audio/AudioService` — thin facade over the audio backend
  - `NativeAudioBackend` (`@capacitor-community/native-audio`) — **critical voice prompts on device**, bypassing the WKWebView WebAudio bug
  - `WebAudioBackend` (Phaser sound manager) — PWA + non-critical SFX
- `input/DragDropController` — shared draggable + droppable, snap zones, **generous toddler-sized hit areas**, drag feedback
- `rewards/RewardFx` — tween pop/scale/particles + cheer SFX. **Celebratory only — no streaks, urgency, or guilt nudges** (ethics + UK Children's Code)
- `storage/ProgressStore` — thin facade over Capacitor Preferences (device) / localStorage (web); **no cloud, no PII**
- `platform/AppLifecycle` — resume/re-acquire AudioContext on Capacitor App `resume` **and** document `visibilitychange`
- `platform/ParentalGate` — adult task (hold-to-continue + multiply two numbers) with a spoken "ask a grown-up" cue for pre-literate kids
- `ui/` — shared buttons, dialogs, big tap targets, colorblind-safe theme tokens

### 4.2 How a game is defined (data flow)

A new game = **a thin Scene that extends `BaseGameScene` + a `levels.json`**. The Scene wires shell systems (drag-drop, audio, rewards) to the content; the JSON describes items, targets, layout, palette, and audio cues. No engine plumbing per game — that is what makes the catalog cheap to grow.

### 4.3 Project structure

```
ehaan-games/                      (monorepo root; pnpm/npm workspace, Vite + TS + Capacitor)
├─ vite.config.ts                 (bundles to /dist; base path for Capacitor + PWA)
├─ capacitor.config.ts            (appId; NO server.url — assets bundled; splash; edge-to-edge)
├─ public/                        (PWA manifest.json, icons, service worker)
├─ src/
│  ├─ main.ts                     (Phaser.Game bootstrap; register Scenes; PWA SW reg)
│  ├─ shell/                      (THE REUSABLE SHELL)
│  │  ├─ scenes/                  (Boot, Hub, Settings, BaseGameScene)
│  │  ├─ audio/                   (AudioService + NativeAudioBackend + WebAudioBackend)
│  │  ├─ input/DragDropController.ts
│  │  ├─ rewards/RewardFx.ts
│  │  ├─ storage/ProgressStore.ts
│  │  ├─ platform/                (AppLifecycle, ParentalGate)
│  │  └─ ui/                      (buttons, dialogs, theme tokens)
│  ├─ games/
│  │  ├─ registry.ts              (declares games for HubScene)
│  │  ├─ color-sort/  (ColorSortScene.ts + levels.json)
│  │  ├─ item-sort/   (ItemSortScene.ts  + levels.json)
│  │  └─ item-match/  (ItemMatchScene.ts + levels.json)
│  └─ types/                      (LevelConfig, GameDef, AudioCue, SpriteKey)
├─ assets/                        (build INPUT, not shipped raw)
│  ├─ style-guide.md              (the ONE reusable prompt block + locked look rules)
│  ├─ references/                 (3–5 fixed reference images)
│  ├─ raw/                        (generated art on opaque bg)
│  └─ audio-raw/                  (voice prompts + SFX + music bed)
├─ tools/                         (AI-asset pipeline scripts — JS/TS)
│  ├─ remove-bg.ts                (batch rembg/BiRefNet → transparent PNG)
│  ├─ pack-atlas.ts               (free-tex-packer-core → atlas PNG + JSON)
│  ├─ compress-audio.ts
│  └─ asset-manifest.ts           (provenance log per asset)
├─ dist/                          (Vite output; Capacitor copies this)
├─ ios/  android/                 (Capacitor native projects)
├─ docs/  (privacy-policy.md, compliance-checklist.md)
└─ qa/    (device-matrix.md)
```

---

## 5. The three v1 games

| Game | Mechanic | Content config |
|---|---|---|
| **Color sort** | Drag items into matching color bins | Items + colors with a **redundant shape/pattern/icon cue**; Okabe-Ito colorblind-safe palette |
| **Item sort** | Drag items into category bins (fruit vs animal…) | Categories, items, target bins |
| **Item match** | Tap/drag to pair matching items on a grid | Pairs, grid layout |

**Color-sort accessibility is a hard requirement, not polish:** every color category is paired with a redundant non-color cue (distinct shape outline + fill pattern + icon on both item and bin), uses a colorblind-safe palette, keeps ≥3:1 item/background contrast, and never places adjacent red/green or blue/purple bins. This serves colorblind children *and* the ~8% of fathers who are colorblind playing alongside them.

---

## 6. AI-asset pipeline

Fully scriptable in the team's JS/TS skills — no new language. All steps are API/CLI-driven.

1. **Lock one style first** — a single reusable prompt block (e.g. "flat vector children's-book illustration, thick rounded outlines, soft pastel palette, simple shapes, centered subject on plain background, no text, friendly") + 3–5 fixed reference images, both committed to the repo to prevent drift across the catalog.
2. **Generate** with Nano Banana Pro (Gemini 3 Pro Image) via the Gemini API — strongest 2026 model for keeping subject identity locked across variations (up to 14 reference images). Opaque bg, square-framed, centered, ~2× max on-screen size; keep a seed/reference log per game.
3. **Cut out** backgrounds locally with `rembg` (BiRefNet model) — 100% offline, no per-image cost. Trim + uniform padding; visually QA cutouts for halos/lost thin features.
4. **Pack** with `free-tex-packer-core` (npm) in the Vite build → per-game atlas PNG + JSON-hash that Phaser loads directly.
5. **Animate** with code-driven tween/scale/bounce of single sprites (simpler + lighter than frame sequences for this audience).
6. **Audio** — ElevenLabs (paid commercial, royalty-free, no attribution) for one warm "youthful/playful" **adult** narrator (not a synthetic-child voice) across all prompts, plus short SFX (pickup/snap/correct/wrong) and a low-key looping music bed (or Stable Audio for the cleanest-licensed bed). **Bundle all audio as small compressed files — no runtime TTS, no network.**
7. **Provenance log** per asset (model + prompt + date + license).

**Legal hygiene.** Purely AI-generated art is not copyrightable in the US (SCOTUS denied cert, Mar 2, 2026). Add meaningful human editing/compositing to final art so a human-authored work exists; treat the **shell + catalog + brand** as the protectable value, not individual sprites. Static pre-baked assets sit outside Google Play's runtime-AI-content policy — fine for an offline Families app. Confirm a paid ElevenLabs plan before shipping voice/SFX; prefer tools not in active litigation.

---

## 7. Compliance (kids stores)

The strategy is **collect literally nothing**, which side-steps COPPA/GDPR-K verifiable-parental-consent obligations entirely.

- **Privacy policy** — write and host a reachable URL stating "we collect no data" (required by *both* stores even at zero collection); link in store metadata and in-app behind the parental gate.
- **Apple** — select the "Ages 5 and under" band (Kids Category); file the "Data Not Collected" privacy label; complete the updated age-rating questionnaire; include no third-party analytics/advertising (Guideline 1.3 / 5.1.4).
- **Google Play** — Data Safety form "no data collected/shared"; opt into the Play Families Policy badge; **exclude the `com.google.android.gms.permission.AD_ID` permission** (auto-disables AAID); target API 35+; ship `.aab`; transmit no device identifiers.
- **No third-party SDKs** — no analytics/ads/crash/font-CDN. A default-on SDK silently phoning home is the #1 cause of label-contradiction rejections.
- **Network proof** — capture a network-proxy trace of the **final shipped build** showing **zero outbound connections**. This is the single most important review-pass action.
- **Thin-wrapper avoidance (Guideline 4.2)** — bundle 100% of assets (never set `server.url`), hide all browser/WebView chrome, native splash + haptics + native audio, handle offline natively.
- **Parental gate** guards every adult-facing surface (settings, privacy link, any future store link). Note: a gate is not the same as parental *consent* — collecting nothing avoids consent entirely.
- **No manipulative engagement** — no streaks, urgency, or loss-aversion nudges (UK Children's Code; Teacher-Approved disqualification).

---

## 8. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **iOS WKWebView audio defect** — audio can go silent for the whole session after a call or lock/unlock; unrecoverable by a pre-literate child | High (dealbreaker-class) | Route critical voice prompts through the native audio plugin; resume AudioContext on App `resume` + `visibilitychange`; pre-decode SFX; gate first audio behind first tap. **Validate on a real iPad via call interruption + lock/unlock in week 1.** |
| **Jank/battery on cheap Android** — Phaser's continuous JS render loop is the textbook jank pattern on sub-$80 tablets | Medium (dealbreaker-class) | Atlas everything, cap sprite counts, target WebGL, throttle the loop when idle. **Benchmark drag latency + battery on a genuinely cheap tablet in week 1.** Fail → pivot to RN+Expo. |
| App Store "thin web wrapper" rejection (4.2) | Medium | Bundle all assets, hide chrome, native splash/haptics/audio; treat "no thin-wrapper signals" as a pre-submission checklist. |
| A default-on SDK silently transmits an identifier, contradicting the "Data Not Collected" label | Medium | Zero networking code; audit transitive deps; exclude AD_ID; capture a zero-outbound network trace before submission. |
| Phaser version trap (v3 frozen / 4.0.0 too new) | Low | Target Phaser 4.1.x; re-test at each minor bump. |
| Maintenance treadmill on a self-assembled toolchain across a growing catalog | Medium | Pin versions; thin abstractions over audio/storage/drag localize swaps; budget recurring re-target/re-test cycles. |
| AI assets not copyrightable in the US | Medium | Add human editing to final art; protect shell+catalog+brand; keep a provenance log. |
| AI-asset visual drift across the catalog | Medium | Committed style guide + fixed reference set; human QA gate on every batch + atlas QA. |

---

## 9. Build plan

- **Phase 0 — De-risk (≈week 1, the gate).** Stand up Vite + Phaser 4.1.x + Capacitor 8.3.x; build one *throwaway* color-sort vertical slice (a few draggable sprites into a bin, one music loop, one voice prompt via native audio). Test on (a) a real older iPad through a call interruption + lock/unlock — voice must survive; and (b) a genuinely cheap (sub-$80) Android tablet — drag must feel responsive, battery acceptable. **Decision gate:** pass → proceed; fail on iOS audio or cheap-Android drag → pivot to React Native + Expo (Skia + Reanimated 4 + Gesture Handler / reanimated-dnd), same TS team, no language change.
- **Phase 1 — Build the reusable shell.** Scenes (Boot, Hub, Settings, BaseGameScene) + thin-abstraction modules (AudioService, DragDropController, RewardFx, ProgressStore, AppLifecycle, ParentalGate); colorblind-safe theme tokens + big-tap-target UI kit.
- **Phase 2 — Stand up the AI-asset pipeline.** Commit style guide + reference images; wire `tools/` scripts (generate → rembg → pack-atlas → compress-audio → provenance manifest); produce first batch + human QA.
- **Phase 3 — Build the 3 games** as content + config on the shell; register all three in the Hub.
- **Phase 4 — Compliance + store readiness.** Privacy policy; Apple age-rating + "Data Not Collected"; Google Data Safety + Families badge; exclude AD_ID, API 35+, `.aab`; bundle assets + strip chrome; capture zero-outbound network trace.
- **Phase 5 — Device-matrix QA + launch.** Re-test full catalog on iPad + cheap Android (audio interruption, drag, battery, 60fps); verify the parental gate guards every adult surface; ship App Store + Google Play; publish PWA from the same `dist/`. Lock version pins; schedule the recurring re-target/re-test maintenance cycle.

---

## 10. Resolved decisions & open questions

**Resolved (2026-06-09):**
- **Product name:** "Ehaan Games" — use for the app title and appId base.
- **PWA priority:** later bonus. Launch targets iOS + Android; the PWA (same-build web version, installable from a URL) is published afterward.

**Open (to resolve during planning):**
- **Per-game level count for v1** — how many levels/difficulty steps per game at launch?
- **Device test targets** — which specific older iPad model and which cheap Android tablet will be used for the Phase-0 gate?
```