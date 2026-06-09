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
