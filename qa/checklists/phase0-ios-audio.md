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
