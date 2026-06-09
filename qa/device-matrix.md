# Ehaan Games — Device Matrix & Phase 0 GO/NO-GO Gate

This file is the AUTHORITATIVE record of the Phase 0 de-risk gate. **No other milestone (Phase 1–5)
may begin until this file records a GO decision.** (Spec §9 Phase 0; §10 resolved decisions.)

## Scope of Phase 0 (the gate)
Prove, on the team's CURRENT devices, that the two dealbreaker-class risks are survivable:
1. **iOS WKWebView WebAudio defect** — a critical voice prompt must SURVIVE a call interruption and a
   lock/unlock cycle (routed via `@capacitor-community/native-audio`, assetPath `public/assets/audio/<id>.m4a`;
   AudioContext resumed on Capacitor App `resume` + document `visibilitychange`).
2. **Android drag latency + battery** — drag must feel responsive and battery drain acceptable.

Per spec §10: CURRENT devices only — no old/legacy hardware. The iOS audio test still applies because
it targets a WebAudio defect present on CURRENT iOS. Residual low-end Android jank risk is accepted and
mitigated by default via atlasing / WebGL / idle-throttling (idle throttle built in Phase 1).

## Devices under test
| Role | Model | OS version | Owner | Date tested |
|---|---|---|---|---|
| iPad (current) | _fill in_ | _fill in_ | _fill in_ | _fill in_ |
| Android (current) | C6 | Android 13 | _fill in_ | 2026-06-09 (build/deploy verified; gate tests pending) |

## Test procedure
- iOS: follow `qa/checklists/phase0-ios-audio.md` (Tests A call-interruption, B lock/unlock, C bg/fg).
- Android: follow `qa/checklists/phase0-android-drag.md` (Tests A drag latency, B battery, C idle).

## Build & integration findings (2026-06-09)

The Android debug build was produced and deployed to a connected device. These integration findings
were discovered and resolved during deployment; they correct/extend the plan's assumptions and MUST be
carried forward.

**Build environment — JDK 21 is REQUIRED.** Capacitor 8.3's Android library compiles to Java release 21;
building with JDK 17 fails (`error: invalid source release: 21`). Installed `openjdk@21` (Homebrew) and
built with `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`. Add JDK 21 to the
build-machine prerequisites. Working command:
`JAVA_HOME=<jdk21> ANDROID_HOME=~/Library/Android/sdk ./android/gradlew -p android :app:installDebug`.

**Finding 1 — native-audio assetPath needs a `public/` prefix on Android (CORRECTS prior LAW).** The
reconciliation declared the convention as `assets/audio/<id>.m4a` (NO public/ prefix). On-device this
FAILED: `@capacitor-community/native-audio` v7 opens `assetPath` via AssetManager relative to the assets
root, where Capacitor places web assets under `public/`. `preload` rejected (`Error:
assets/audio/spike-prompt-sort.m4a`) and — being awaited before the tap listener attached — aborted
bootstrap → blank screen. FIX (committed): `NativeAudioBackend.preload` uses `public/${cue.src}.m4a`.
**Resolved assetPath = `public/assets/audio/<id>.m4a`.** Contracts §2.3/§3.2 and M1 Task 10 must adopt
this. (Phaser/WebAudio still loads via the web root as `assets/audio/<id>`.)

**Finding 2 — the PWA service worker serves stale assets in the native shell.** `vite-plugin-pwa`
(generateSW) precaches the bundle; inside the Capacitor WebView the SW served the OLD bundle after a
rebuild, masking the fix until app data was cleared. In a native app the SW is REDUNDANT (Capacitor
serves bundled assets offline) and causes stale-content traps. ACTION (M1): disable the workbox SW for
the NATIVE build; keep `vite-plugin-pwa` only for the web/PWA deliverable. Dev workaround until then:
`adb shell pm clear com.telaeris.ehaangames` (or uninstall/reinstall) after each rebuild.

**Finding 3 — spike bootstrap hardened.** Wrapped `registerCues` in try/catch so a single preload
failure can no longer abort init / blank the screen. M1's AudioService should likewise treat preload
failures non-fatally.

**Status:** Android app BUILDS, INSTALLS, LAUNCHES, and RENDERS the spike scene on the device
(Phaser 4.1.0, WebGL); native-audio preload succeeds after Finding 1. The subjective gate tests (drag
latency, 15-min battery) and ALL iOS audio-interruption tests remain for the human (see the per-platform
checklists). iOS requires Xcode on the build machine (not yet exercised).

## Recorded results
### iOS — `phase0-ios-audio.md`
| Test | Result (PASS/FAIL) | Notes (latency, silence, recovery) |
|---|---|---|
| A — call interruption x3 | _fill in_ | _fill in_ |
| B — lock/unlock x3 | _fill in_ | _fill in_ |
| C — background/foreground | _fill in_ | _fill in_ |
| Native-audio assetPath used | `public/assets/audio/<id>.m4a` | REQUIRED on Android (Finding 1); plugin opens via AssetManager relative to assets root. Confirm the same resolves on iOS. |

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
  and its learnings (assetPath `public/assets/audio/<id>.m4a`, resume triggers, unlock-on-first-gesture),
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
