# Kids-Store Compliance, Native-Shell Hardening, Device-Matrix QA, Launch & PWA Bonus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the runnable Ehaan Games build provably compliant with both kids stores and ship it. Produce the privacy policy + hosting note; generate the PWA/store icons the manifest references; harden the native shell so it presents as a native app (configure the Capacitor splash screen, edge-to-edge/status-bar styling, and haptics — voice audio is already wired in M1); set Android `targetSdk`/`compileSdk` to API 35+ and gate the audio licensing; lock the Apple and Google Play submission configs; encode the "collect nothing / connect nowhere" guarantees as automated assertion tests (no `server.url`, no `AD_ID` permission, no forbidden **direct** SDKs) and delegate the transitive-SDK guarantee to the network trace; strip all WebView/browser chrome to dodge Guideline 4.2; run the network-proxy zero-outbound trace that is the single most important review-pass action; audit that the ParentalGate covers every adult surface; run the current-device QA matrix (audio interruption, drag, battery, 60fps); verify the PWA offline bonus from the same `dist/`; and execute a final launch checklist.

**Architecture:** Most tasks here are configuration, native-shell wiring, written procedures, and assertion tests — not feature TDD. The verifiable logic (config/manifest/deps assertions) lives in the PURE module `src/compliance/assertions.ts` and is unit-tested with Vitest under strict TDD. The "shipped build behaves correctly on real hardware / makes no outbound connections / has no transitive analytics SDK" guarantees are covered by DOCUMENTED MANUAL QA CHECKLISTS under `qa/checklists/` with exact steps and expected results — the zero-outbound network trace is the real guarantee that catches transitive SDKs the name-based test cannot. Every store-facing requirement maps to a concrete, verifiable artifact (a committed doc, a passing test, or a signed-off checklist).

**Tech Stack:** Phaser 4.1.x (TypeScript) + Capacitor 8.3.x + Vite 5.x; Vitest 2.x for assertion tests; `vite-plugin-pwa` 0.20.x for the PWA bonus (configured upstream in M0 — see Prerequisites); `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/haptics` for the native shell; Capacitor Android target API 35+ shipping `.aab`. Honors `docs/superpowers/specs/2026-06-09-kids-games-stack-and-architecture-design.md` and the canonical Shared Contracts (§1 paths, §6.3 assertions, §7 versions/scripts).

---

## Prerequisites

- **M0 (de-risk + scaffold)** complete and, per the cross-cutting fixes, it OWNS the PWA plugin wiring: `package.json` includes `vite-plugin-pwa` (0.20.x) **and** the native-shell plugins `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/haptics`; `vite.config.ts` configures `VitePWA` (offline precache, `runtimeCaching: []`); `public/manifest.webmanifest` (name "Ehaan Games") exists and is linked from `index.html`. M5 therefore does **not** add the PWA plugin or create the manifest — it only verifies the build emits `dist/sw.js` + `dist/manifest.webmanifest` and supplies the icons + native-shell config those reference. `vitest.config.ts` include globs cover `src/**/*.test.ts`, `tests/**/*.test.ts`, and `tools/**/*.test.ts` per the contract fix; `@/` → `src/` alias resolves in both Vite and Vitest.
- **M1 (shell)** complete: `AudioService` + `NativeAudioBackend` + `WebAudioBackend` + `AppLifecycle` route critical voice prompts natively and resume the AudioContext (so the audio-interruption QA in this plan has something to verify); `ParentalGate` (`PARENTAL_GATE_HOLD_MS = 1500`) gates `SettingsScene`.
- **M2 (asset pipeline)** complete: `public/assets/` populated with atlases + audio (including the looping music bed per spec §6.6) so the build is content-complete and submittable; the provenance manifest exists with a `humanEdited` and a per-audio-asset `license` field (this plan gates submission on those being truthfully set).
- **M3 (games)** complete: all three games registered in `src/games/registry.ts` and playable; the shared `contentLoader.ts` (or the per-game validators the contract settles on) validates content; the `oiYellow`-vs-contrast question is already resolved upstream so color-sort content ships with a palette that passes `meetsContrast`.
- **M4 (compliance config groundwork)** complete: `capacitor.config.ts` exists with `appId 'com.telaeris.ehaangames'` and **no** `server.url`; `android/` and `ios/` native projects generated via `cap add`; Vitest configured per §6.4.
- A **runnable app**: `npm run build` succeeds, `npx cap sync` succeeds, and the app launches on a current iPad (`npm run ios`) and a current Android device (`npm run android`). All three games are playable.
- Shared Contracts §6.3 (`src/compliance/assertions.ts`) function signatures are LAW: `hasNoServerUrl`, `manifestExcludesAdId`, `hasNoForbiddenSdks`.
- This plan is **last**: it tests, hardens, and submits the artifacts produced by M0–M4. Do not start until the app is content-complete and runs on both platforms.

## Files

**Create:**
- `docs/privacy-policy.md` — the hostable "we collect no data" policy + hosting/URL note.
- `docs/compliance-checklist.md` — master compliance checklist mapping every store requirement to its verifiable artifact, including the documented transitive-SDK limitation of the name-based test.
- `src/compliance/assertions.ts` — PURE assertion helpers (`hasNoServerUrl`, `manifestExcludesAdId`, `hasNoForbiddenSdks`) per Shared Contracts §6.3.
- `src/compliance/assertions.test.ts` — unit tests for the three assertion helpers (sibling, per §6.5).
- `tests/compliance/capacitorConfig.test.ts` — asserts the real `capacitor.config.ts` has no `server.url`.
- `tests/compliance/androidManifest.test.ts` — asserts `AndroidManifest.xml` excludes the `AD_ID` permission (skips with a note if `android/` absent).
- `tests/compliance/noForbiddenSdks.test.ts` — asserts the **direct** deps in `package.json` contain no analytics/ads/crash/font-CDN SDKs.
- `tools/gen-icons.ts` — PWA + store icon generation script (source PNG → all required sizes).
- `qa/checklists/network-zero-outbound.md` — the network-proxy zero-outbound trace procedure (most important review-pass action; also the transitive-SDK guarantee).
- `qa/checklists/thin-wrapper-chrome.md` — strip-all-WebView-chrome checklist (Guideline 4.2 avoidance).
- `qa/checklists/parental-gate.md` — ParentalGate-coverage audit (every adult surface gated).
- `qa/checklists/device-matrix.md` — current iPad + current Android QA (audio interruption, drag, battery, 60fps).
- `qa/checklists/store-apple.md` — Apple App Store submission steps (Ages 5 and under, Data Not Collected, age-rating questionnaire).
- `qa/checklists/store-google-play.md` — Google Play submission steps (Data Safety, Families badge, API 35+, `.aab`, AD_ID exclusion).
- `qa/checklists/pwa-offline.md` — PWA offline verification checklist (later bonus).
- `qa/checklists/launch.md` — final launch checklist + version-pin lock + maintenance cadence + audio-license gate.

**Modify:**
- `android/app/src/main/AndroidManifest.xml` — add the explicit `tools:node="remove"` exclusion of `com.google.android.gms.permission.AD_ID`.
- `android/variables.gradle` — set `compileSdkVersion`/`targetSdkVersion` to 35 (API 35+).
- `src/main.ts` — wire the native splash hide, status-bar styling/edge-to-edge, and a haptic on first interaction (native-shell signals; voice audio is already wired in M1).
- `capacitor.config.ts` — add `SplashScreen`/`StatusBar` plugin config; confirm/keep no `server.url`; ensure no debug/inspectable WebView flags in the production config.
- `package.json` — add the `assert:compliance` and `assets:icons` script aliases.
- `public/icons/` — populated by `tools/gen-icons.ts` with the exact filenames the manifest references.

> **Not modified here:** `vite.config.ts` and `public/manifest.webmanifest` are owned by M0 (PWA plugin + manifest). This plan only **verifies** their build output and supplies the icons they reference.

---

### Task 1: Write the hostable privacy policy + hosting note

**Files:**
- `docs/privacy-policy.md` (create)

- [ ] **Create `docs/privacy-policy.md`** with this exact content:

  ```markdown
  # Ehaan Games — Privacy Policy

  **Effective date:** 2026-06-09
  **Applies to:** Ehaan Games (iOS, Android, and the web/PWA version)
  **Publisher:** Telaeris, Inc.

  ## Summary

  **Ehaan Games collects no data.** The app does not collect, store, transmit,
  sell, or share any personal information or any other data about you or your
  child. There are no accounts, no logins, no advertising, and no analytics.

  ## What we collect

  Nothing. Ehaan Games is fully offline. It does not contain any networking
  code and makes no outbound network connections. We do not collect:

  - Personal information (names, email addresses, phone numbers).
  - Device identifiers (no Advertising ID / IDFA / AAID; the Android
    `com.google.android.gms.permission.AD_ID` permission is explicitly excluded).
  - Location, contacts, photos, microphone, or camera data.
  - Usage analytics, crash reports, or behavioral/telemetry data.

  ## Local storage on your device

  The app saves only minimal, non-personal preferences locally on the device
  (for example: sound on/off, master volume, and which arrangement of items was
  last shown so play resumes naturally). This information never leaves the
  device and is not associated with any identifier.

  ## Children's privacy

  Ehaan Games is designed for children aged 2–5. Because we collect no data, the
  app does not require verifiable parental consent under COPPA or GDPR-K. There
  is no advertising and no in-app purchasing. Adult-only areas (settings and this
  privacy policy link) are protected by a parental gate.

  ## Third parties

  We use no third-party advertising, analytics, crash-reporting, or font-CDN
  SDKs. No data is shared with any third party because no data is collected.

  ## Changes to this policy

  If this policy changes, the updated version will be posted at the URL below
  with a new effective date.

  ## Contact

  Questions about this policy: privacy@telaeris.com
  ```

- [ ] **Append the hosting note** to the same file so the published URL is unambiguous and reachable by both stores:

  ```markdown

  ---

  ## Hosting note (internal — not part of the published page)

  Both Apple and Google require a publicly reachable privacy-policy URL even
  when zero data is collected. Publish this document verbatim at a stable URL:

  - **Canonical URL:** `https://www.telaeris.com/ehaan-games/privacy`
  - **Hosting:** static HTML rendered from this Markdown, served over HTTPS.
    It must return HTTP 200 with no auth wall and no redirect chain that drops
    HTTPS. (This is a marketing-site page; it is NOT served by the app and the
    app never fetches it — the app is fully offline.)
  - **In-app reference:** the same URL is displayed (as text, not opened in an
    in-app browser) behind the parental gate in `SettingsScene`. The app does
    not open a network connection to render it.
  - **Store metadata:** paste this URL into App Store Connect (App Privacy →
    Privacy Policy URL) and Google Play Console (Store listing → Privacy Policy).
  - **Re-publish trigger:** any change to the policy body above requires
    updating the hosted page and bumping the effective date before the next
    store submission.
  ```

- [ ] **Verify the file is committed-ready** — confirm it states "collects no data" and contains both the canonical URL and the AD_ID exclusion statement:

  Run: `grep -c "collects no data" docs/privacy-policy.md && grep -c "telaeris.com/ehaan-games/privacy" docs/privacy-policy.md && grep -c "AD_ID" docs/privacy-policy.md`

  Expected output: three lines, each `1` (each phrase present exactly once).

- [ ] **Commit:** `git add docs/privacy-policy.md && git commit -m "docs: add no-data privacy policy and hosting note"`

---

### Task 2: PURE compliance assertion helpers (TDD) — `hasNoServerUrl`

**Files:**
- `src/compliance/assertions.ts` (create)
- `src/compliance/assertions.test.ts` (create)

- [ ] **Write the failing test** in `src/compliance/assertions.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { hasNoServerUrl } from './assertions';

  describe('hasNoServerUrl', () => {
    it('returns true when config has no server key', () => {
      expect(hasNoServerUrl({ appId: 'com.telaeris.ehaangames' })).toBe(true);
    });

    it('returns true when server exists but has no url', () => {
      expect(hasNoServerUrl({ server: { androidScheme: 'https' } })).toBe(true);
    });

    it('returns false when server.url is set', () => {
      expect(hasNoServerUrl({ server: { url: 'http://10.0.0.2:3000' } })).toBe(false);
    });

    it('returns false when server.url is an empty string (still a remote-load signal)', () => {
      expect(hasNoServerUrl({ server: { url: '' } })).toBe(false);
    });
  });
  ```

- [ ] **Run to see it fail:** `npx vitest run src/compliance/assertions.test.ts`

  Expected failure: `Error: Failed to resolve import "./assertions"` (the module does not exist yet), or `hasNoServerUrl is not a function`.

- [ ] **Minimal implementation** — create `src/compliance/assertions.ts` with exactly:

  ```ts
  // src/compliance/assertions.ts  (PURE — no phaser, no DOM, no capacitor, no fs)

  /** True if a capacitor.config object has NO server.url (bundled assets only). */
  export function hasNoServerUrl(config: Record<string, unknown>): boolean {
    const server = config['server'];
    if (server == null || typeof server !== 'object') return true;
    return !('url' in (server as Record<string, unknown>));
  }
  ```

- [ ] **Run to pass:** `npx vitest run src/compliance/assertions.test.ts`

  Expected output: `4 passed` for the `hasNoServerUrl` describe block.

- [ ] **Commit:** `git add src/compliance/assertions.ts src/compliance/assertions.test.ts && git commit -m "feat: add hasNoServerUrl compliance assertion"`

---

### Task 2.1: PURE compliance assertion helper (TDD) — `manifestExcludesAdId`

**Files:**
- `src/compliance/assertions.ts` (modify)
- `src/compliance/assertions.test.ts` (modify)

- [ ] **Add the failing test** to `src/compliance/assertions.test.ts` (append a new describe block):

  ```ts
  import { manifestExcludesAdId } from './assertions';

  describe('manifestExcludesAdId', () => {
    const REMOVED = `<manifest xmlns:tools="http://schemas.android.com/tools">
      <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />
    </manifest>`;
    const PRESENT = `<manifest>
      <uses-permission android:name="com.google.android.gms.permission.AD_ID" />
    </manifest>`;
    const ABSENT = `<manifest><application/></manifest>`;

    it('returns true when AD_ID is explicitly removed via tools:node="remove"', () => {
      expect(manifestExcludesAdId(REMOVED)).toBe(true);
    });

    it('returns true when AD_ID never appears at all', () => {
      expect(manifestExcludesAdId(ABSENT)).toBe(true);
    });

    it('returns false when AD_ID is requested without a remove node', () => {
      expect(manifestExcludesAdId(PRESENT)).toBe(false);
    });
  });
  ```

- [ ] **Run to see it fail:** `npx vitest run src/compliance/assertions.test.ts`

  Expected failure: `manifestExcludesAdId is not a function` / import resolution error for the new symbol.

- [ ] **Minimal implementation** — append to `src/compliance/assertions.ts`:

  ```ts
  /**
   * True if an AndroidManifest.xml string does NOT effectively request
   * com.google.android.gms.permission.AD_ID. It is acceptable for the
   * permission to appear ONLY when paired with tools:node="remove" (the
   * explicit opt-out that suppresses the auto-merged permission).
   */
  export function manifestExcludesAdId(manifestXml: string): boolean {
    const AD_ID = 'com.google.android.gms.permission.AD_ID';
    // Find every uses-permission element that names AD_ID.
    const tagRe = /<uses-permission\b[^>]*>/g;
    const matches = manifestXml.match(tagRe) ?? [];
    const adIdTags = matches.filter((t) => t.includes(AD_ID));
    if (adIdTags.length === 0) return true; // never requested
    // Every AD_ID occurrence must carry tools:node="remove".
    return adIdTags.every((t) => /tools:node\s*=\s*"remove"/.test(t));
  }
  ```

- [ ] **Run to pass:** `npx vitest run src/compliance/assertions.test.ts`

  Expected output: `7 passed` total (4 from Task 2 + 3 new).

- [ ] **Commit:** `git add src/compliance/assertions.ts src/compliance/assertions.test.ts && git commit -m "feat: add manifestExcludesAdId compliance assertion"`

---

### Task 2.2: PURE compliance assertion helper (TDD) — `hasNoForbiddenSdks` (direct deps only)

> **Scope (fix 4):** `hasNoForbiddenSdks` inspects DIRECT dependency NAMES only. It is a fast first-line guard against the obvious mistake of adding an analytics/ads/crash/font-CDN package. It **cannot** see transitive deps, which spec §8 calls the #1 rejection cause. That risk is owned by the zero-outbound network trace (Task 7) and the `npm ls` transitive audit step within it; this limitation is documented in `docs/compliance-checklist.md` (Task 13).

**Files:**
- `src/compliance/assertions.ts` (modify)
- `src/compliance/assertions.test.ts` (modify)

- [ ] **Add the failing test** to `src/compliance/assertions.test.ts`:

  ```ts
  import { hasNoForbiddenSdks } from './assertions';

  describe('hasNoForbiddenSdks', () => {
    it('returns true for the allowed v1 dependency set', () => {
      expect(
        hasNoForbiddenSdks({
          phaser: '4.1.0',
          '@capacitor/core': '8.3.0',
          '@capacitor/splash-screen': '8.0.0',
          '@capacitor/status-bar': '8.0.0',
          '@capacitor/haptics': '8.0.0',
          '@capacitor-community/native-audio': '7.0.0',
          'vite-plugin-pwa': '0.20.0',
        }),
      ).toBe(true);
    });

    it('returns false when an analytics SDK is present', () => {
      expect(hasNoForbiddenSdks({ 'firebase-analytics': '11.0.0' })).toBe(false);
    });

    it('returns false when an ads SDK is present', () => {
      expect(hasNoForbiddenSdks({ 'react-native-google-mobile-ads': '13.0.0' })).toBe(false);
    });

    it('returns false when a crash-reporting SDK is present', () => {
      expect(hasNoForbiddenSdks({ '@sentry/capacitor': '0.20.0' })).toBe(false);
    });

    it('returns false when a font-CDN SDK is present', () => {
      expect(hasNoForbiddenSdks({ 'webfontloader': '1.6.28' })).toBe(false);
    });

    it('returns false for a push/attribution SDK (onesignal)', () => {
      expect(hasNoForbiddenSdks({ 'onesignal-cordova-plugin': '5.0.0' })).toBe(false);
    });

    it('returns false for an attribution SDK (branch)', () => {
      expect(hasNoForbiddenSdks({ 'branch-sdk': '2.0.0' })).toBe(false);
    });

    it('does NOT false-positive on the allowed capacitor native-audio plugin', () => {
      expect(hasNoForbiddenSdks({ '@capacitor-community/native-audio': '7.0.0' })).toBe(true);
    });
  });
  ```

- [ ] **Run to see it fail:** `npx vitest run src/compliance/assertions.test.ts`

  Expected failure: `hasNoForbiddenSdks is not a function`.

- [ ] **Minimal implementation** — append to `src/compliance/assertions.ts`. The match list is conservative-but-broad and matched as a **boundary-aware** substring so legitimate packages (e.g. `@capacitor-community/native-audio`) are not falsely flagged:

  ```ts
  /**
   * Substrings that flag a forbidden analytics / ads / crash-reporting /
   * attribution / push / font-CDN SDK, matched case-insensitively against
   * DIRECT dependency package names only.
   *
   * LIMITATION (LAW): this inspects direct dep NAMES, not transitive deps. A
   * transitive default-on SDK (spec §8 #1 rejection cause) is NOT caught here —
   * it is caught by the zero-outbound network trace (qa/checklists/
   * network-zero-outbound.md) and its `npm ls` audit step. See
   * docs/compliance-checklist.md.
   */
  const FORBIDDEN_SDK_SUBSTRINGS: readonly string[] = [
    'analytics',
    'firebase',
    'gtag',
    'google-tag',
    'segment',
    'mixpanel',
    'amplitude',
    'admob',
    'mobile-ads',
    'applovin',
    'unity-ads',
    'facebook',
    'appsflyer',
    'adjust',
    'sentry',
    'bugsnag',
    'crashlytics',
    'datadog',
    'onesignal',
    'branch-sdk',
    'webfontloader',
    'typekit',
    'fontsource-cdn',
  ];

  /** True if a package.json deps map contains no known forbidden DIRECT SDK. */
  export function hasNoForbiddenSdks(deps: Record<string, string>): boolean {
    const names = Object.keys(deps).map((n) => n.toLowerCase());
    return !names.some((name) =>
      FORBIDDEN_SDK_SUBSTRINGS.some((bad) => name.includes(bad)),
    );
  }
  ```

- [ ] **Run to pass:** `npx vitest run src/compliance/assertions.test.ts`

  Expected output: `15 passed` total (4 + 3 + 8).

- [ ] **Commit:** `git add src/compliance/assertions.ts src/compliance/assertions.test.ts && git commit -m "feat: add hasNoForbiddenSdks direct-dep compliance assertion"`

---

### Task 3: Automated test — `capacitor.config.ts` has no `server.url`

**Files:**
- `tests/compliance/capacitorConfig.test.ts` (create)

> **Import-path note (fix 3):** `tests/compliance/` is two levels below the repo root, so `../../capacitor.config` resolves to the repo-root `capacitor.config.ts`. Under the Vitest `node` environment the file's `import type { CapacitorConfig } from '@capacitor/cli'` is type-only and erased, so importing it executes no Capacitor runtime and trips no network (`tests/setup.ts` stubs `fetch` to throw). The `@/` alias is for `src/`; it does not apply to a repo-root file, so the relative path is correct here.

- [ ] **Write the failing test** in `tests/compliance/capacitorConfig.test.ts` (imports the REAL config — this is the binding assertion against the shipped file):

  ```ts
  import { describe, it, expect } from 'vitest';
  import { hasNoServerUrl } from '@/compliance/assertions';
  // Import the actual project config. tests/compliance/ is two levels below the
  // repo root, so ../../capacitor.config resolves to the repo-root
  // capacitor.config.ts. Default export is CapacitorConfig.
  import config from '../../capacitor.config';

  describe('capacitor.config (shipped)', () => {
    it('declares the locked appId', () => {
      expect((config as Record<string, unknown>).appId).toBe('com.telaeris.ehaangames');
    });

    it('has NO server.url (assets are bundled; never a remote load)', () => {
      expect(hasNoServerUrl(config as unknown as Record<string, unknown>)).toBe(true);
    });
  });
  ```

- [ ] **Run to see it fail (or pass) and confirm it is wired to the real file:** `npx vitest run tests/compliance/capacitorConfig.test.ts`

  Expected behavior: with `capacitor.config.ts` correctly having no `server.url` (per M4), both assertions pass. If the import fails to resolve, confirm the relative path from `tests/compliance/` to repo-root `capacitor.config.ts` and that the Vitest tsconfig allows extensionless TS imports. To prove the test actually guards the file, temporarily add `server: { url: 'http://x' }` to `capacitor.config.ts`, re-run, and SEE the second test FAIL with `expected false to be true`; then remove it and re-run to green.

- [ ] **Run to pass:** `npx vitest run tests/compliance/capacitorConfig.test.ts`

  Expected output: `2 passed`.

- [ ] **Commit:** `git add tests/compliance/capacitorConfig.test.ts && git commit -m "test: assert capacitor.config has no server.url"`

---

### Task 4: Exclude `AD_ID` in AndroidManifest + automated test

**Files:**
- `android/app/src/main/AndroidManifest.xml` (modify)
- `tests/compliance/androidManifest.test.ts` (create)

- [ ] **Read the current manifest** to find the `<manifest>` open tag and insert point:

  Run: `cat android/app/src/main/AndroidManifest.xml`

  Expected: a `<manifest xmlns:android="...">` element. Note whether `xmlns:tools` is already declared.

- [ ] **Ensure the `tools` namespace is declared** on the root `<manifest>` element. If the opening tag is `<manifest xmlns:android="http://schemas.android.com/apk/res/android">`, edit it to add the tools namespace:

  ```xml
  <manifest xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:tools="http://schemas.android.com/tools">
  ```

- [ ] **Add the explicit AD_ID removal** immediately inside `<manifest>` (before `<application>`). This suppresses the permission auto-merged by Play Services and is the affirmative "no advertising ID" signal:

  ```xml
      <!-- Kids-store compliance: explicitly remove the advertising-ID permission
           so no AAID is ever requested (matches "Data Not Collected"). -->
      <uses-permission android:name="com.google.android.gms.permission.AD_ID"
          tools:node="remove" />
  ```

- [ ] **Write the failing test** in `tests/compliance/androidManifest.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { existsSync, readFileSync } from 'node:fs';
  import { resolve } from 'node:path';
  import { manifestExcludesAdId } from '@/compliance/assertions';

  const MANIFEST = resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml');

  describe('AndroidManifest (shipped)', () => {
    it.skipIf(!existsSync(MANIFEST))(
      'excludes the com.google.android.gms.permission.AD_ID permission',
      () => {
        const xml = readFileSync(MANIFEST, 'utf8');
        expect(manifestExcludesAdId(xml)).toBe(true);
      },
    );

    it('documents the skip when android/ is not generated', () => {
      if (!existsSync(MANIFEST)) {
        // android/ project not yet generated (cap add android). The AD_ID
        // exclusion is enforced once the native project exists; see M4.
        expect(existsSync(MANIFEST)).toBe(false);
      } else {
        expect(existsSync(MANIFEST)).toBe(true);
      }
    });
  });
  ```

- [ ] **Run to see the guard work:** `npx vitest run tests/compliance/androidManifest.test.ts`

  Expected: with `android/` present and the edit applied, the AD_ID test passes. To prove it guards the file, temporarily remove the `tools:node="remove"` attribute, re-run, and SEE `expected false to be true`; then restore it and re-run to green.

- [ ] **Run to pass:** `npx vitest run tests/compliance/androidManifest.test.ts`

  Expected output: `2 passed` (or `1 passed / 1 skipped` if `android/` is absent in this checkout — the skip is documented, not silent).

- [ ] **Commit:** `git add android/app/src/main/AndroidManifest.xml tests/compliance/androidManifest.test.ts && git commit -m "build: exclude AD_ID permission and assert it in AndroidManifest"`

---

### Task 5: Automated test — no forbidden DIRECT SDKs + the `assert:compliance` script

**Files:**
- `tests/compliance/noForbiddenSdks.test.ts` (create)
- `package.json` (modify)

- [ ] **Write the failing test** in `tests/compliance/noForbiddenSdks.test.ts` (reads the REAL `package.json`; asserts over DIRECT deps only — transitive risk is delegated to Task 7):

  ```ts
  import { describe, it, expect } from 'vitest';
  import { readFileSync } from 'node:fs';
  import { resolve } from 'node:path';
  import { hasNoForbiddenSdks } from '@/compliance/assertions';

  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  describe('package.json direct deps (shipped)', () => {
    it('contains no analytics/ads/crash/font-CDN SDK in dependencies', () => {
      expect(hasNoForbiddenSdks(pkg.dependencies ?? {})).toBe(true);
    });

    it('contains no analytics/ads/crash/font-CDN SDK in devDependencies', () => {
      expect(hasNoForbiddenSdks(pkg.devDependencies ?? {})).toBe(true);
    });

    it('documents that transitive deps are NOT covered here', () => {
      // The transitive-SDK guarantee (spec §8 #1 rejection cause) is owned by
      // the zero-outbound network trace + its `npm ls` audit, NOT this test.
      // This assertion exists so the limitation is visible in the test report.
      expect(typeof hasNoForbiddenSdks).toBe('function');
    });
  });
  ```

- [ ] **Run to see the guard work:** `npx vitest run tests/compliance/noForbiddenSdks.test.ts`

  Expected: passes against the allowed dep set. To prove it guards, temporarily add `"firebase-analytics": "1.0.0"` to `devDependencies`, re-run, SEE `expected false to be true`, then remove it and re-run to green.

- [ ] **Run to pass:** `npx vitest run tests/compliance/noForbiddenSdks.test.ts`

  Expected output: `3 passed`.

- [ ] **Add the `assert:compliance` script** to `package.json` `scripts` so the whole compliance suite runs as one command:

  ```json
    "assert:compliance": "vitest run src/compliance tests/compliance"
  ```

- [ ] **Run the full compliance suite:** `npm run assert:compliance`

  Expected output: all assertion + config + manifest + sdk tests green; summary `Test Files  4 passed`, `Tests  20 passed` (15 unit + 2 capacitor + 3 sdk; manifest counts as 0–2 depending on `android/` presence — if `android/` is present the total is `22 passed`).

- [ ] **Commit:** `git add tests/compliance/noForbiddenSdks.test.ts package.json && git commit -m "test: assert package.json has no forbidden direct SDKs"`

---

### Task 6: Generate the PWA + store icons the manifest references

> **Fix 2 + spec-coverage gap:** the M0 `public/manifest.webmanifest` references `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and the stores need app icons, yet the M2/M3 asset pipeline only produces atlases + audio. This task produces every icon file the manifest and stores reference from a single committed master image, so the PWA build and store listings never point at missing files.

**Files:**
- `tools/gen-icons.ts` (create)
- `package.json` (modify)
- `public/icons/` (populated)

- [ ] **Confirm a master source icon exists.** The brand master is a square, ≥1024×1024 PNG produced as part of the M2 asset prep (committed under `assets/icons/master-1024.png`). Verify it is present:

  Run: `ls assets/icons/master-1024.png`

  Expected output: the path prints (file exists). If absent, create it first as a one-time manual asset-prep step: export a 1024×1024 PNG of the Ehaan Games app icon (the same friendly mark used on the Hub) into `assets/icons/master-1024.png` and commit it. The icon must be human-composited (spec §6 legal hygiene) — record it in the asset provenance manifest with `humanEdited: true`.

- [ ] **Create `tools/gen-icons.ts`** with this exact content (uses `sharp`, already a transitive/dev dependency available to the `tools/` pipeline; resizes the master into every required PWA + maskable + store size):

  ```ts
  // tools/gen-icons.ts — generate all PWA + store icons from one master PNG.
  // Run: npm run assets:icons
  import sharp from 'sharp';
  import { mkdirSync } from 'node:fs';
  import { resolve, dirname } from 'node:path';
  import { fileURLToPath } from 'node:url';

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = resolve(__dirname, '..');
  const MASTER = resolve(ROOT, 'assets/icons/master-1024.png');
  const OUT = resolve(ROOT, 'public/icons');

  interface IconSpec {
    file: string;
    size: number;
    /** Maskable icons need ~20% safe-zone padding so platform masks don't clip. */
    maskable?: boolean;
  }

  // Filenames here MUST match public/manifest.webmanifest (M0) and the store icons.
  const SPECS: IconSpec[] = [
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-512-maskable.png', size: 512, maskable: true },
    // Store icons (Apple App Store marketing icon + Play hi-res icon).
    { file: 'icon-1024.png', size: 1024 },
    { file: 'icon-512-store.png', size: 512 },
  ];

  const BG = { r: 255, g: 255, b: 255, alpha: 1 }; // matches manifest background_color #FFFFFF

  async function main(): Promise<void> {
    mkdirSync(OUT, { recursive: true });
    for (const spec of SPECS) {
      const dest = resolve(OUT, spec.file);
      if (spec.maskable) {
        // Render the mark at 60% on a full-bleed background for a generous safe zone.
        const inner = Math.round(spec.size * 0.6);
        const pad = Math.round((spec.size - inner) / 2);
        const mark = await sharp(MASTER).resize(inner, inner, { fit: 'contain' }).png().toBuffer();
        await sharp({
          create: { width: spec.size, height: spec.size, channels: 4, background: BG },
        })
          .composite([{ input: mark, top: pad, left: pad }])
          .png()
          .toFile(dest);
      } else {
        await sharp(MASTER)
          .resize(spec.size, spec.size, { fit: 'contain', background: BG })
          .flatten({ background: BG }) // store icons must be opaque (no alpha)
          .png()
          .toFile(dest);
      }
      // eslint-disable-next-line no-console
      console.log(`wrote ${dest}`);
    }
  }

  void main();
  ```

- [ ] **Add the `assets:icons` script** to `package.json` `scripts`:

  ```json
    "assets:icons": "tsx tools/gen-icons.ts"
  ```

- [ ] **Generate the icons:** `npm run assets:icons`

  Expected output: five `wrote .../public/icons/<file>.png` lines (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `icon-1024.png`, `icon-512-store.png`).

- [ ] **Verify every manifest-referenced icon now exists:** `ls public/icons/icon-192.png public/icons/icon-512.png public/icons/icon-512-maskable.png public/icons/icon-1024.png`

  Expected output: all four paths print (no "No such file").

- [ ] **Commit:** `git add tools/gen-icons.ts package.json public/icons assets/icons/master-1024.png && git commit -m "feat: generate PWA and store icons from master image"`

---

### Task 7: Native-shell hardening — splash, status-bar/edge-to-edge, haptics

> **Spec-coverage gaps:** spec §7 requires "native splash + haptics + native audio" and §4.3 requires "splash; edge-to-edge" status-bar styling to avoid the thin-wrapper rejection (Guideline 4.2). Native audio is already wired in M1. This task wires the remaining native-shell signals so the QA rows that assert them (Task 8 row 13, Task 11 device matrix) have a real implementation to verify. Plugins are already in `package.json` per Prerequisites.

**Files:**
- `capacitor.config.ts` (modify)
- `src/main.ts` (modify)

- [ ] **Read `capacitor.config.ts`** to find the export shape:

  Run: `cat capacitor.config.ts`

  Expected: a default-exported `CapacitorConfig` object with `appId 'com.telaeris.ehaangames'`, `webDir: 'dist'`, and NO `server.url`.

- [ ] **Add SplashScreen + StatusBar plugin config** to `capacitor.config.ts` inside the config object (do NOT add a `server.url`; do NOT enable `webContentsDebuggingEnabled` for release):

  ```ts
    plugins: {
      SplashScreen: {
        launchAutoHide: false, // we hide it from JS once the first Phaser frame is ready
        backgroundColor: '#FFFFFF',
        showSpinner: false,
        androidScaleType: 'CENTER_CROP',
      },
      StatusBar: {
        // Edge-to-edge: the canvas draws under the status bar; we style it from JS.
        overlaysWebView: true,
        style: 'DARK', // dark icons on the light (#FFFFFF) background
      },
    },
  ```

- [ ] **Read `src/main.ts`** to find where the `Phaser.Game` is constructed and the first scene is ready:

  Run: `cat src/main.ts`

  Expected: the Phaser bootstrap (importing `gameConfig`), scene registration, and the PWA SW registration (from M0).

- [ ] **Wire the native-shell calls** in `src/main.ts`. Add the imports and a small guarded helper that runs only on a native platform, hides the splash once the game is booted, applies edge-to-edge status-bar styling, and fires a light haptic on the first pointer interaction:

  ```ts
  import { Capacitor } from '@capacitor/core';
  import { SplashScreen } from '@capacitor/splash-screen';
  import { StatusBar, Style } from '@capacitor/status-bar';
  import { Haptics, ImpactStyle } from '@capacitor/haptics';

  /** Native-shell signals (splash hide, edge-to-edge status bar, first-tap haptic). */
  function initNativeShell(game: Phaser.Game): void {
    if (!Capacitor.isNativePlatform()) return;

    // Edge-to-edge: canvas under a styled, overlaying status bar.
    void StatusBar.setOverlaysWebView({ overlay: true });
    void StatusBar.setStyle({ style: Style.Dark });

    // Hide the native splash only once the first Phaser frame has rendered,
    // so there is no white flash between splash and canvas.
    game.events.once(Phaser.Core.Events.READY, () => {
      void SplashScreen.hide({ fadeOutDuration: 200 });
    });

    // A single light haptic on the very first interaction = a native feel
    // (NOT a manipulative pattern; one tap only).
    const fireOnce = (): void => {
      void Haptics.impact({ style: ImpactStyle.Light });
      window.removeEventListener('pointerdown', fireOnce);
    };
    window.addEventListener('pointerdown', fireOnce, { once: true });
  }
  ```

  Then call `initNativeShell(game)` immediately after the `Phaser.Game` instance is created (after `const game = new Phaser.Game(gameConfig);` or equivalent).

- [ ] **Verify the build still type-checks and bundles with the native-shell wiring:** `npm run build`

  Expected output: `tsc --noEmit` clean and Vite build succeeds (the `@capacitor/*` plugins resolve; no type errors).

- [ ] **Commit:** `git add capacitor.config.ts src/main.ts && git commit -m "feat: wire native splash, edge-to-edge status bar, and first-tap haptic"`

---

### Task 8: Set Android target/compile SDK to API 35+

> **Spec-coverage gap:** spec §7 + Shared Contracts §7.2 require API 35+ shipping `.aab`, but the prior plan only *verified* the SDK level. `cap add android` on older tooling can default below 35; this task actually EDITS the gradle config so the value is correct, not just checked.

**Files:**
- `android/variables.gradle` (modify)

- [ ] **Read `android/variables.gradle`** to find the SDK version properties:

  Run: `cat android/variables.gradle`

  Expected: an `ext { ... }` block containing `minSdkVersion`, `compileSdkVersion`, and `targetSdkVersion` properties (Capacitor's generated defaults).

- [ ] **Set `compileSdkVersion` and `targetSdkVersion` to 35.** Edit `android/variables.gradle` so the relevant lines read exactly:

  ```gradle
      compileSdkVersion = 35
      targetSdkVersion = 35
  ```

  (Leave `minSdkVersion` at the Capacitor 8 default unless the team requires otherwise; only the compile/target SDK must be 35+ for store acceptance.)

- [ ] **Verify the values are set to 35+:** `grep -E "compileSdkVersion|targetSdkVersion" android/variables.gradle`

  Expected output: two lines, each showing `= 35` (or higher).

- [ ] **Commit:** `git add android/variables.gradle && git commit -m "build: set Android compile/target SDK to API 35"`

---

### Task 9: Thin-wrapper / WebView-chrome strip checklist (Guideline 4.2 avoidance)

**Files:**
- `qa/checklists/thin-wrapper-chrome.md` (create)

- [ ] **Create `qa/checklists/thin-wrapper-chrome.md`** with this exact content:

  ```markdown
  # QA Checklist — Thin-Wrapper / WebView-Chrome Strip (Guideline 4.2 avoidance)

  **Purpose:** Prove Ehaan Games presents as a native app, not a web page in a
  shell. Apple Guideline 4.2 rejects "thin web wrappers". Run on the shipped
  build on a current iPad and a current Android device. Sign off each row.

  | # | Step | Expected result | Pass? |
  |---|------|-----------------|-------|
  | 1 | Inspect `capacitor.config.ts`. | NO `server.url` key. Assets load from the bundled `dist/` (`webDir: 'dist'`). | ☐ |
  | 2 | Launch on iPad; observe the first frame. | Native splash shows (configured in `capacitor.config.ts`), then the Phaser canvas with NO white flash. NO Safari address bar, NO reload/share buttons, NO URL text. | ☐ |
  | 3 | Launch on Android; observe the first frame. | Native splash, then canvas. NO Chrome address bar, NO browser menu, NO "pull to refresh". | ☐ |
  | 4 | Swipe down from the top of the play area (iPad and Android). | NO pull-to-refresh spinner; the gesture does nothing or is consumed by the game. | ☐ |
  | 5 | Long-press any sprite or background. | NO text-selection handles, NO "copy/share image" context menu, NO magnifier. (`user-select: none`, `-webkit-touch-callout: none` set in `index.html`/CSS.) | ☐ |
  | 6 | Double-tap the canvas; pinch the canvas. | NO browser zoom; viewport stays fixed. (`viewport` meta has `user-scalable=no, viewport-fit=cover`.) | ☐ |
  | 7 | Rotate the device. | Layout adapts via the game's scale manager; no browser reflow artifacts, no scrollbars appear; canvas stays edge-to-edge under the status bar. | ☐ |
  | 8 | Scroll-drag past the canvas edges. | NO rubber-band overscroll revealing a white page edge; the page body cannot scroll (`overflow: hidden` on `html, body`). | ☐ |
  | 9 | Inspect `index.html`. | Single `<div id="app">`; NO external `<script src="http...">`, NO `<link href="http...">` to any CDN (fonts/CSS all bundled). | ☐ |
  | 10 | Toggle airplane mode, then cold-launch the app. | App launches and is fully playable offline (all assets bundled). No "no connection" UI ever. | ☐ |
  | 11 | Trigger every screen transition (Hub → each game → Settings via gate). | Transitions are Phaser scene changes, not page navigations (URL never changes — there is no URL bar). | ☐ |
  | 12 | Production build inspectability. | `capacitor.config.ts` does NOT enable `android.webContentsDebuggingEnabled` for release; iOS `WKWebView` is not left inspectable in release. | ☐ |
  | 13 | Confirm native shell features present. | Native splash hides cleanly via JS (`SplashScreen.hide`); status bar is styled and overlays edge-to-edge (`StatusBar`); a single light haptic fires on the first tap (`Haptics.impact`); voice prompts play via native audio. NONE are browser defaults. | ☐ |

  **Sign-off:** Tester ____________  Device(s) ____________  Date ____________
  **Result:** ☐ PASS (all rows ✓)  ☐ FAIL (list failing rows): ____________

  > A FAIL on any row blocks submission. Fix the underlying chrome leak (CSS,
  > viewport meta, capacitor.config, or src/main.ts native-shell wiring) and
  > re-run the full checklist.
  ```

- [ ] **Verify the checklist is non-empty and committed-ready:** `grep -c "☐" qa/checklists/thin-wrapper-chrome.md`

  Expected output: a count ≥ 15 (one box per row plus sign-off boxes).

- [ ] **Commit:** `git add qa/checklists/thin-wrapper-chrome.md && git commit -m "docs: add thin-wrapper chrome-strip QA checklist"`

---

### Task 10: Network-proxy zero-outbound trace procedure (the single most important review-pass action + transitive-SDK guarantee)

**Files:**
- `qa/checklists/network-zero-outbound.md` (create)

- [ ] **Create `qa/checklists/network-zero-outbound.md`** with this exact content (now also the binding TRANSITIVE-SDK audit — the name-based test in Task 5 cannot see transitive deps, so this trace + its `npm ls` step is the real guarantee):

  ```markdown
  # QA Procedure — Zero-Outbound Network Trace (MOST IMPORTANT review-pass action)

  **Purpose:** Prove the FINAL SHIPPED build makes ZERO outbound network
  connections. This backs the "Data Not Collected" (Apple) and "No data
  collected/shared" (Google) declarations. A single stray connection (a
  default-on SDK, a font CDN, a Capacitor plugin pinging home) contradicts the
  privacy labels and is the #1 cause of kids-category rejection.

  **This procedure is also the binding guarantee against TRANSITIVE SDKs.** The
  automated `hasNoForbiddenSdks` test (Task 5) only inspects DIRECT dependency
  names; a forbidden SDK pulled in transitively is caught ONLY here (the
  dependency audit in section A + the live trace in sections D–E).

  **Run against the EXACT artifact you will submit** (the release `.ipa`/`.aab`
  build copied to a device), not a dev server. Capture evidence (screenshots /
  exported logs) and attach to `docs/compliance-checklist.md`.

  ## Tooling

  - **Proxy:** mitmproxy (`mitmproxy` / `mitmweb`) on the test workstation, OR
    Charles Proxy. mitmproxy is free and scriptable; instructions below use it.
  - One current iPad and one current Android device on the same Wi-Fi as the
    workstation.

  ## A. Build the exact shipped artifact + transitive dependency audit

  1. `npm run build` (Vite → `dist/`).
  2. **Transitive-SDK audit (covers the gap in the name-based test):** run
     `npm ls --all > qa/evidence/npm-ls-<date>.txt` and scan the FULL tree for
     any analytics/ads/crash/attribution/push/font-CDN package (firebase,
     analytics, admob, mobile-ads, sentry, bugsnag, crashlytics, appsflyer,
     adjust, onesignal, branch, segment, mixpanel, amplitude, datadog,
     webfontloader, typekit). ZERO matches expected. Any match = investigate &
     remove before continuing.
  3. `npx cap sync` (copies `dist/` into both native projects).
  4. iOS: open `ios/App/App.xcworkspace` in Xcode, Product → Archive →
     Distribute (or build a Release `.app` to the device).
  5. Android: build the release `.aab` (or a release `apk` installed on device).
     `cd android && ./gradlew bundleRelease` (artifact under
     `android/app/build/outputs/bundle/release/`).

  ## B. Stand up the intercepting proxy

  6. Start mitmproxy in web mode on the workstation: `mitmweb --listen-port 8080`.
  7. Note the workstation LAN IP (e.g. `192.168.1.50`).
  8. **iPad:** Settings → Wi-Fi → (network) → Configure Proxy → Manual →
     Server `192.168.1.50`, Port `8080`. Install the mitmproxy CA cert
     (visit `http://mitm.it` on the device, install + trust the profile in
     Settings → General → About → Certificate Trust Settings) so HTTPS is
     also intercepted (not just visible as opaque CONNECTs).
  9. **Android:** Wi-Fi → (network) → Advanced → Proxy → Manual →
     `192.168.1.50:8080`. Install + trust the mitmproxy CA cert (Settings →
     Security → Install certificate). Note: on Android 7+ user CAs are not
     trusted by release apps by default — for THIS test build only, this is
     acceptable because we are proving the app does not even ATTEMPT outbound
     connections; any attempt still shows as a CONNECT/handshake in mitmproxy
     even if the app rejects the cert.

  ## C. Clear the slate

  10. In mitmweb, clear the flow list (so the capture starts empty).
  11. Confirm the proxy sees OTHER traffic (sanity check): open the device
      browser, load `http://example.com` — it MUST appear in mitmweb. This
      proves the proxy is actually in the path. Then clear the flow list again.

  ## D. Exercise the WHOLE app under capture

  12. Cold-launch Ehaan Games.
  13. Open every Hub tile and play each game to a full appreciation reward:
      color-sort, item-sort, item-match.
  14. Trigger an appreciation reward (full set complete) at least once per game.
  15. Open Settings via the parental gate; pass the gate; toggle mute/volume;
      view the privacy-policy URL text.
  16. Background the app and resume it (Home, reopen). Lock/unlock the device.
  17. Leave the app idle on the Hub for 2 minutes (catch delayed/periodic beacons).
  18. Repeat steps 12–17 on the second device (the other platform).

  ## E. Verdict

  19. In mitmweb, review the FULL flow list captured during steps 12–18.
  20. **PASS criteria (LAW):** ZERO flows originate from the Ehaan Games app —
      no HTTP, no HTTPS CONNECT, no DNS-triggered requests to any host. The only
      acceptable entries are unrelated OS/background traffic from OTHER apps
      (identify by host; e.g. Apple push, OS time sync — these are NOT the app).
      If you cannot attribute a flow to the OS with certainty, treat it as a FAIL
      and investigate.
  21. **FAIL criteria:** ANY connection attempt attributable to the app
      (including a TLS handshake that the app initiates, even if it fails). On
      fail: identify the source (transitive dependency, plugin, font/CSS CDN,
      analytics), remove it, rebuild, and re-run this entire procedure from A.
  22. Export the mitmweb flow list (File → Save) and screenshot the empty/OS-only
      result. Save under `qa/evidence/zero-outbound-<platform>-<date>.*`.

  ## F. Record

  | Field | Value |
  |-------|-------|
  | Build (iOS) version/build number | ____________ |
  | Build (Android) versionCode | ____________ |
  | iPad model / iOS version | ____________ |
  | Android model / OS version | ____________ |
  | Proxy tool + version | ____________ |
  | `npm ls --all` transitive audit result | ☐ ZERO forbidden (PASS)  ☐ ≥1 (FAIL) |
  | Outbound flows attributable to app | ☐ ZERO (PASS)  ☐ ≥1 (FAIL) |
  | Evidence file paths | ____________ |
  | Tester / Date | ____________ |

  > This trace MUST PASS on both platforms before submitting to either store.
  > Re-run after any dependency bump or plugin add — a NEW transitive SDK is the
  > #1 rejection risk and is caught ONLY by this procedure.
  ```

- [ ] **Verify the procedure names mitmproxy, the zero-flow PASS criterion, and the transitive audit:** `grep -c "mitm" qa/checklists/network-zero-outbound.md && grep -c "ZERO" qa/checklists/network-zero-outbound.md && grep -c "npm ls" qa/checklists/network-zero-outbound.md`

  Expected output: three lines, each ≥ 1.

- [ ] **Commit:** `git add qa/checklists/network-zero-outbound.md && git commit -m "docs: add zero-outbound network trace and transitive-SDK audit procedure"`

---

### Task 11: ParentalGate-coverage audit checklist (every adult surface gated)

**Files:**
- `qa/checklists/parental-gate.md` (create)

- [ ] **Create `qa/checklists/parental-gate.md`** with this exact content:

  ```markdown
  # QA Checklist — Parental-Gate Coverage Audit

  **Purpose:** Confirm EVERY adult-facing surface is behind the parental gate
  (hold-to-continue → multiply-two-numbers, per Shared Contracts §3.7,
  `PARENTAL_GATE_HOLD_MS = 1500`). A gate is NOT parental consent — but every
  adult action (settings, external links, anything not a game) must be gated so
  a 2–5-year-old cannot reach it. Run on the shipped build, both platforms.

  ## Inventory of adult surfaces (every one MUST be gated)

  | # | Adult surface | Where | Gated? Expected | Pass? |
  |---|---------------|-------|-----------------|-------|
  | 1 | Settings (audio on/off, volume) | `SettingsScene` entry from Hub | Tapping the Settings affordance presents the parental gate FIRST; Settings opens only after a correct answer. | ☐ |
  | 2 | Privacy-policy URL view | inside `SettingsScene` | Reachable only after the gate (it is inside Settings). URL is shown as text; tapping it does NOT open an in-app browser or any network connection. | ☐ |
  | 3 | Any external / store link (none in v1, but verify) | n/a v1 | NO ungated external link exists anywhere. If a future link is added, it is gated. | ☐ |
  | 4 | App-info / "about" surface (if present) | Hub/Settings | Behind the gate or absent. | ☐ |

  ## Gate behavior verification

  | # | Step | Expected result | Pass? |
  |---|------|-----------------|-------|
  | 5 | Tap the Settings affordance. | Hold-to-continue prompt appears; a spoken "ask a grown-up" voice cue plays (pre-literate support). | ☐ |
  | 6 | Release the hold before 1500 ms. | Gate does NOT advance to the math step. | ☐ |
  | 7 | Hold for ≥ 1500 ms (`PARENTAL_GATE_HOLD_MS`). | Advances to the multiply-two-numbers challenge with 4 shuffled options. | ☐ |
  | 8 | Inspect the math operands. | Both operands are 2..9 (no trivial 0 or 1); options include the correct product. | ☐ |
  | 9 | Tap a WRONG option. | Gate does NOT open the adult surface; it re-renders a challenge (re-attempt allowed). No path leaks through on wrong answers. | ☐ |
  | 10 | Tap the CORRECT option. | `present()` resolves true; the adult surface (Settings) opens. | ☐ |
  | 11 | A child taps randomly/rapidly during the math step. | No combination of rapid taps opens the surface without a correct product (verify by mashing all four options quickly). | ☐ |
  | 12 | Dismiss the gate (back/escape) mid-challenge. | Returns to the previous kid-safe scene; adult surface stays closed. | ☐ |
  | 13 | Re-enter the gate after a pass and a scene change. | A NEW challenge is generated (operands/options differ across presentations — verify across 3 entries). | ☐ |

  ## Code audit (one-time, verifiable)

  | # | Step | Expected result | Pass? |
  |---|------|-----------------|-------|
  | 14 | `grep -rn "SettingsScene" src/` and trace every caller. | The ONLY way to start `SettingsScene` is through `ParentalGate.present()` resolving true. No `scene.start('Settings')` without a preceding gate pass. | ☐ |
  | 15 | `grep -rn "ParentalGate" src/`. | Every adult surface listed above is wrapped by a `ParentalGate` call; no adult surface is launched directly. | ☐ |

  **Sign-off:** Tester ____________  Device(s) ____________  Date ____________
  **Result:** ☐ PASS (all rows ✓)  ☐ FAIL (list failing rows): ____________

  > Any ungated adult surface blocks submission (kids-category requirement).
  ```

- [ ] **Verify the checklist references the LAW hold duration:** `grep -c "1500" qa/checklists/parental-gate.md`

  Expected output: ≥ 2 (referenced in the header and a step).

- [ ] **Commit:** `git add qa/checklists/parental-gate.md && git commit -m "docs: add parental-gate coverage audit checklist"`

---

### Task 12: Device-matrix QA checklist (current iPad + current Android)

**Files:**
- `qa/checklists/device-matrix.md` (create)

- [ ] **Create `qa/checklists/device-matrix.md`** with this exact content:

  ```markdown
  # QA Checklist — Device Matrix (current iPad + current Android)

  **Purpose:** Verify the full catalog on the team's CURRENT devices only (no
  legacy hardware, per spec §10). Covers the two dealbreaker-class risks (iOS
  WKWebView audio defect; drag latency/battery) plus 60fps and shuffle
  continuity. Run on the shipped release build. Fill BOTH device columns.

  ## Devices under test

  | | iPad | Android |
  |---|------|---------|
  | Model | ____________ | ____________ |
  | OS version | ____________ | ____________ |
  | Build tested | ____________ | ____________ |

  ## A. iOS audio interruption (targets the WKWebView WebAudio defect)

  | # | Step | Expected result | iPad |
  |---|------|-----------------|------|
  | A1 | Cold-launch; tap once to unlock audio; open a game. | First voice prompt (intro cue) plays via native audio. | ☐ |
  | A2 | While a game is open, RECEIVE A PHONE/FACETIME CALL (or trigger an interruption); decline/end it. | After the interruption, voice prompts STILL PLAY (AudioContext re-acquired on App `resume`). No silent session. | ☐ |
  | A3 | LOCK the device for ~10s, then UNLOCK and return to the app. | Voice prompts STILL PLAY after unlock (resume on `visibilitychange` → visible). | ☐ |
  | A4 | Background the app (Home), wait 30s, reopen. | Audio resumes; intro/label cues play on the next interaction. | ☐ |
  | A5 | Toggle mute in Settings (via gate), unmute, return to a game. | Mute silences cues; unmute restores them; no stuck-silent state. | ☐ |
  | A6 | Trigger an appreciation reward after the interruption tests. | Cheer/appreciation voice + SFX play correctly; the looping music bed continues. | ☐ |

  ## B. Android drag responsiveness + battery

  | # | Step | Expected result | Android |
  |---|------|-----------------|---------|
  | B1 | Open color-sort; drag an item to a bin. | Drag tracks the finger with no perceptible lag; pickup is immediate (hit area ≥ 88px, `MIN_HIT_AREA_PX`). | ☐ |
  | B2 | Drag rapidly between bins for 30s. | No dropped frames felt; sprite never "sticks" or teleports. | ☐ |
  | B3 | Invalid drop (wrong bin). | Item snaps back to origin smoothly (no jank on the return tween). | ☐ |
  | B4 | Play all three games continuously for 15 minutes. | No memory-growth slowdown; drag stays responsive at minute 15 as at minute 1. | ☐ |
  | B5 | Note battery % before and after the 15-minute session. | Drain is acceptable for 15 min of active play (record %; flag if > ~10%). Before: ___% After: ___% | ☐ |
  | B6 | Leave the app idle on the Hub for 5 minutes. | Idle loop is throttled (no hot device, minimal drain) — render loop throttles when idle per spec §8 and the gameConfig low-power setting. | ☐ |

  ## C. 60fps / smoothness (both platforms)

  | # | Step | Expected result | iPad | Android |
  |---|------|-----------------|------|---------|
  | C1 | Enable an on-device FPS readout (or use Xcode Instruments / Android GPU profiler) during active drag. | Sustains ~60fps during drag + reward animations; no sustained drops below ~50fps. | ☐ | ☐ |
  | C2 | Trigger an appreciation reward (pop + particles + cheer). | Reward animation is smooth; no frame hitch when particles spawn. | ☐ | ☐ |
  | C3 | Rapid scene transitions (Hub ↔ each game ↔ Settings) ×10. | Transitions are smooth; no growing hitch (atlases cached, not re-decoded each time). | ☐ | ☐ |
  | C4 | Confirm WebGL renderer in use (not Canvas fallback). | Renderer reports WebGL on both devices. | ☐ | ☐ |

  ## D. Cross-cutting

  | # | Step | Expected result | iPad | Android |
  |---|------|-----------------|------|---------|
  | D1 | Color-sort: verify each color bin shows its redundant cue (shape outline + fill pattern + icon) on item AND bin. | Every category is distinguishable WITHOUT color; no adjacent red/green or blue/purple bins; ≥3:1 contrast (the shipped palette passes `meetsContrast`). | ☐ | ☐ |
  | D2 | All tap targets (tiles, items, buttons, gate options) are easily hit by a small finger. | Targets ≥ 88px edge; no mis-taps from generous spacing. | ☐ | ☐ |
  | D3 | Rotate device during play. | Layout re-flows via scale manager; no crash, no lost game state. | ☐ | ☐ |
  | D4 | Shuffle continuity: complete a set (reshuffle), force-quit the app, relaunch the same game. | The same shuffled arrangement resumes (persisted `shuffleSeed` read on `create()` via `ProgressStore.load()` — NOT a fresh `Math.random` arrangement). | ☐ | ☐ |

  **Sign-off:** Tester ____________  Date ____________
  **Result:** ☐ PASS (all rows ✓)  ☐ FAIL (list failing rows): ____________

  > A FAIL on A2/A3 (iOS audio survival) is a launch blocker — re-verify the
  > native-audio routing + resume wiring before resubmitting. A FAIL on D4
  > (shuffle continuity) means BaseGameScene.create() is not reading the
  > persisted seed — fix the ProgressStore wiring before launch.
  ```

- [ ] **Verify the checklist covers all required dimensions:** `grep -ci "audio interruption\|drag\|battery\|60fps\|fps\|continuity" qa/checklists/device-matrix.md`

  Expected output: a count ≥ 5.

- [ ] **Commit:** `git add qa/checklists/device-matrix.md && git commit -m "docs: add current-device QA matrix checklist"`

---

### Task 13: Apple App Store submission checklist

**Files:**
- `qa/checklists/store-apple.md` (create)

- [ ] **Create `qa/checklists/store-apple.md`** with this exact content:

  ```markdown
  # Submission Checklist — Apple App Store (Kids Category)

  **Purpose:** Concrete, verifiable steps to submit Ehaan Games to the App Store
  in the Kids Category with a "Data Not Collected" label. Do each row in App
  Store Connect; record the exact selection.

  | # | Action | Exact selection / expected | Done? |
  |---|--------|----------------------------|-------|
  | 1 | App Store Connect → create app record. | Name "Ehaan Games"; Bundle ID `com.telaeris.ehaangames` (matches `capacitor.config.ts`). | ☐ |
  | 2 | App Information → Category. | Primary category: **Kids**. | ☐ |
  | 3 | Kids Category → age band. | Select **"Ages 5 and under"**. | ☐ |
  | 4 | Age Rating questionnaire (updated/current form). | Answer every item truthfully: NO violence, NO mature/suggestive content, NO unrestricted web access, NO user-generated content, NO ads, NO in-app purchases, NO gambling. Resulting rating must be the lowest band, eligible for Kids. | ☐ |
  | 5 | App Privacy → "Get Started" → data types. | Select **"Data Not Collected"** for the app (and any SDK). Confirm NO data type is marked collected. | ☐ |
  | 6 | App Privacy → Privacy Policy URL. | Enter `https://www.telaeris.com/ehaan-games/privacy` (must return HTTP 200, HTTPS, no auth). | ☐ |
  | 7 | Pricing. | **Free**; NO in-app purchases configured. | ☐ |
  | 8 | App Review notes. | State: "Fully offline; no networking code; collects no data; appreciation-only rewards; all assets bundled; settings/privacy behind a parental gate. Zero-outbound network trace captured (see compliance)." | ☐ |
  | 9 | Third-party SDKs. | Confirm NONE present that collect data: `npm run assert:compliance` → `hasNoForbiddenSdks` green (direct deps) AND `qa/checklists/network-zero-outbound.md` §A `npm ls` audit clean (transitive deps). | ☐ |
  | 10 | App icon. | The 1024×1024 marketing icon is `public/icons/icon-1024.png` (generated by `npm run assets:icons`). | ☐ |
  | 11 | Build: archive the Release build. | Xcode → Product → Archive from `ios/App/App.xcworkspace`; upload via Organizer/Transporter. | ☐ |
  | 12 | Screenshots. | Provide required iPad screenshots (gameplay; no chrome). | ☐ |
  | 13 | Pre-submit gates. | `npm run assert:compliance` green; `qa/checklists/network-zero-outbound.md` PASS (iOS); `qa/checklists/thin-wrapper-chrome.md` PASS (iPad); `qa/checklists/parental-gate.md` PASS; `qa/checklists/device-matrix.md` PASS. | ☐ |
  | 14 | Submit for review. | Submit; record submission date + version/build number. | ☐ |

  ## Guideline cross-reference
  - **1.3 Kids Category / 5.1.4 Kids privacy:** no third-party analytics/ads;
    parental gate on adult surfaces; "Data Not Collected".
  - **4.2 Minimum functionality (anti-thin-wrapper):** `qa/checklists/thin-wrapper-chrome.md`.

  **Submitted by:** ____________  Version/Build: ____________  Date: ____________
  ```

- [ ] **Verify the checklist names the required Apple selections:** `grep -ci "Ages 5 and under\|Data Not Collected\|age rating" qa/checklists/store-apple.md`

  Expected output: ≥ 3.

- [ ] **Commit:** `git add qa/checklists/store-apple.md && git commit -m "docs: add Apple App Store submission checklist"`

---

### Task 14: Google Play submission checklist

**Files:**
- `qa/checklists/store-google-play.md` (create)

- [ ] **Create `qa/checklists/store-google-play.md`** with this exact content:

  ```markdown
  # Submission Checklist — Google Play (Families)

  **Purpose:** Concrete, verifiable steps to submit Ehaan Games to Google Play
  with a "no data collected/shared" Data Safety declaration and the Families
  badge. Do each row in Play Console; record the exact selection.

  | # | Action | Exact selection / expected | Done? |
  |---|--------|----------------------------|-------|
  | 1 | Play Console → create app. | Name "Ehaan Games"; default language set; Free. | ☐ |
  | 2 | App content → Target audience and content. | Select age groups including **Ages 5 and under** (and the relevant child bands). Opt into the **Designed for Families / Play Families** program. | ☐ |
  | 3 | App content → Data Safety form. | Declare **"No data collected"** AND **"No data shared"**. Mark NO data types collected/shared. | ☐ |
  | 4 | Data Safety → security practices. | "Data is encrypted in transit": N/A — no data transmitted; "Users can request deletion": no data to delete. Answer consistently with zero collection. | ☐ |
  | 5 | App content → Privacy Policy. | Enter `https://www.telaeris.com/ehaan-games/privacy` (HTTP 200, HTTPS). | ☐ |
  | 6 | App content → Ads. | Declare **"No, my app does not contain ads."** | ☐ |
  | 7 | Advertising ID (AD_ID) declaration. | Declare the app does NOT use an Advertising ID. Verify the manifest excludes the permission (`npm run assert:compliance` → `manifestExcludesAdId` green; `AndroidManifest.xml` has `tools:node="remove"` for `com.google.android.gms.permission.AD_ID`). | ☐ |
  | 8 | Content rating questionnaire (IARC). | Answer truthfully: no violence, no ads, no purchases, no UGC, no data sharing. Resulting rating eligible for Families. | ☐ |
  | 9 | App bundle target API. | Confirm `compileSdkVersion`/`targetSdkVersion` is **35 or higher** in `android/variables.gradle` (set by the M5 gradle task: `grep -E "compileSdkVersion|targetSdkVersion" android/variables.gradle` → both `= 35`). | ☐ |
  | 10 | Build artifact. | Ship a signed release **`.aab`** (`cd android && ./gradlew bundleRelease`), NOT an `.apk`. Upload to a release track. | ☐ |
  | 11 | App signing. | Use Play App Signing; record the signing key setup. | ☐ |
  | 12 | Store listing. | Phone/tablet screenshots (gameplay, no chrome); hi-res icon `public/icons/icon-512-store.png` (512×512, generated by `npm run assets:icons`); short + full description (no manipulative-engagement language). | ☐ |
  | 13 | Transitive-SDK confirmation. | `qa/checklists/network-zero-outbound.md` §A `npm ls` audit clean (no transitive analytics/ads/crash SDK — the #1 Data-Safety contradiction). | ☐ |
  | 14 | Pre-submit gates. | `npm run assert:compliance` green; `qa/checklists/network-zero-outbound.md` PASS (Android); `qa/checklists/thin-wrapper-chrome.md` PASS (Android); `qa/checklists/parental-gate.md` PASS; `qa/checklists/device-matrix.md` PASS. | ☐ |
  | 15 | Submit for review (Families review). | Submit to the chosen track; record date + versionCode. | ☐ |

  **Submitted by:** ____________  versionCode: ____________  Date: ____________
  ```

- [ ] **Verify the checklist names the required Google selections:** `grep -ci "No data collected\|Families\|API\|.aab\|AD_ID" qa/checklists/store-google-play.md`

  Expected output: ≥ 5.

- [ ] **Commit:** `git add qa/checklists/store-google-play.md && git commit -m "docs: add Google Play submission checklist"`

---

### Task 15: PWA offline deliverable — verify the build emits the SW/manifest, then QA

> **Fix 1 + 5 + cross-cutting #8:** `vite-plugin-pwa` and `public/manifest.webmanifest` are configured/created in M0 (so M2's `vite build` SW expectation is satisfied by an earlier milestone). This task does NOT add the plugin or write the manifest — it VERIFIES the existing M0 wiring emits `dist/sw.js` + `dist/manifest.webmanifest` (now that this milestone has supplied the icons the manifest references) and adds the PWA QA checklist.

**Files:**
- `qa/checklists/pwa-offline.md` (create)

- [ ] **Verify the PWA plugin is configured upstream (M0).** Confirm the manifest and plugin exist before relying on them:

  Run: `grep -c "VitePWA" vite.config.ts && grep -c "Ehaan Games" public/manifest.webmanifest && grep -c "manifest.webmanifest" index.html`

  Expected output: three lines, each ≥ 1. If any is `0`, STOP — the PWA wiring belongs to M0; do not add it here. Return to M0 and complete it first (this preserves the dependency order: the milestone that configures the SW comes before the one that depends on its output).

- [ ] **Verify the build produces a service worker and precache manifest** (now that icons from Task 6 exist, the manifest's icon references resolve and precache):

  Run: `npm run build && ls dist/sw.js dist/manifest.webmanifest dist/icons/icon-192.png`

  Expected output: build succeeds (`tsc --noEmit` clean, Vite build clean), and `dist/sw.js`, `dist/manifest.webmanifest`, and the copied `dist/icons/icon-192.png` all exist in the listing.

- [ ] **Create `qa/checklists/pwa-offline.md`** with this exact content:

  ```markdown
  # QA Checklist — PWA Offline Bonus

  **Purpose:** Verify the same `dist/` build runs as an installable, fully
  offline PWA from a URL. This is the later bonus deliverable (spec §10) — it
  is NOT a launch blocker for the iOS/Android submissions, but it ships from the
  identical bundle and must stay zero-network. The PWA plugin + manifest are
  configured in M0; this checklist verifies the produced build.

  | # | Step | Expected result | Pass? |
  |---|------|-----------------|-------|
  | 1 | `npm run build` then serve `dist/` over HTTPS (any static host). | App loads; all three games playable in the browser. | ☐ |
  | 2 | Open DevTools → Application → Manifest. | Name "Ehaan Games"; icons resolve (`icon-192`, `icon-512`, `icon-512-maskable`); `display: standalone`. | ☐ |
  | 3 | Application → Service Workers. | A service worker is registered and "activated"; precache populated (JS/CSS/HTML/atlases/audio/icons). | ☐ |
  | 4 | Install the PWA (browser install prompt / "Add to Home Screen"). | Installs as a standalone app; launches without browser chrome; maskable icon renders cleanly. | ☐ |
  | 5 | DevTools → Network → set "Offline"; reload the installed PWA. | App still loads and is fully playable from cache — NO failed requests, NO offline error page. | ☐ |
  | 6 | DevTools → Network (while offline AND online) → play every game, open Settings via gate. | ZERO outbound requests to any origin at runtime (matches the native zero-outbound guarantee; `runtimeCaching: []` in the M0 PWA config). | ☐ |
  | 7 | Confirm no external CDN references. | Network panel shows only same-origin (the PWA host) asset loads on first visit; nothing from a font/analytics/ad CDN. | ☐ |
  | 8 | Re-run the build after a content change. | `registerType: 'autoUpdate'` (M0 config) picks up the new SW; cache version bumps. | ☐ |

  **Sign-off:** Tester ____________  Browser ____________  Date ____________
  **Result:** ☐ PASS  ☐ FAIL (rows): ____________
  ```

- [ ] **Commit:** `git add qa/checklists/pwa-offline.md && git commit -m "docs: add PWA offline QA checklist"`

---

### Task 16: Master compliance checklist (maps every requirement to its verifiable artifact)

**Files:**
- `docs/compliance-checklist.md` (create)

- [ ] **Create `docs/compliance-checklist.md`** with this exact content (single index tying each store requirement to the test/doc/checklist that proves it — and explicitly documenting the transitive-SDK limitation per fix 4):

  ```markdown
  # Ehaan Games — Compliance Checklist (master index)

  Every kids-store requirement maps to a VERIFIABLE artifact: an automated test,
  a committed doc, or a signed-off QA checklist. Nothing is "trust me".

  ## Automated (run `npm run assert:compliance` — must be green)

  | Requirement | Artifact | Proves |
  |---|---|---|
  | No remote asset load (anti-thin-wrapper) | `tests/compliance/capacitorConfig.test.ts` + `hasNoServerUrl` | `capacitor.config.ts` has no `server.url`. |
  | No advertising ID | `tests/compliance/androidManifest.test.ts` + `manifestExcludesAdId` | `AndroidManifest.xml` removes `com.google.android.gms.permission.AD_ID`. |
  | No data-collecting DIRECT SDKs | `tests/compliance/noForbiddenSdks.test.ts` + `hasNoForbiddenSdks` | `package.json` DIRECT deps have no analytics/ads/crash/attribution/push/font-CDN names. |
  | Color a11y (redundant cue, palette, contrast, adjacency) | `src/shell/ui/color.test.ts`, content validation (M1/M3) | Okabe-Ito + ≥3:1 + no forbidden adjacency. |

  ## LIMITATION of the automated SDK test (read this)

  `hasNoForbiddenSdks` inspects DIRECT dependency NAMES only. It CANNOT detect a
  forbidden SDK pulled in TRANSITIVELY, which spec §8 names the #1 rejection
  cause. The transitive-SDK guarantee is therefore owned by:

  - `qa/checklists/network-zero-outbound.md` §A — the `npm ls --all` dependency
    audit (scans the full tree), AND
  - the live zero-outbound network trace (the real proof nothing phones home).

  Both MUST pass on both platforms before submission. Re-run after ANY
  dependency or plugin change.

  ## Documents (committed)

  | Requirement | Artifact |
  |---|---|
  | Privacy policy "collects no data" + hosting URL | `docs/privacy-policy.md` |
  | Asset provenance / licensing hygiene (incl. paid audio plan + humanEdited art) | `tools/asset-manifest.ts` output (M2); gated in `qa/checklists/launch.md` |
  | PWA/store icons present | `public/icons/*` from `npm run assets:icons` (M5 Task 6) |

  ## Manual QA (signed-off checklists in `qa/checklists/`)

  | Requirement | Checklist |
  |---|---|
  | ZERO outbound connections + transitive-SDK audit (most important) | `network-zero-outbound.md` |
  | No WebView/browser chrome + native splash/status-bar/haptics (Guideline 4.2) | `thin-wrapper-chrome.md` |
  | Every adult surface gated | `parental-gate.md` |
  | iOS audio survival + drag + battery + 60fps + shuffle continuity | `device-matrix.md` |
  | PWA offline (bonus) | `pwa-offline.md` |

  ## Store submission steps

  | Store | Checklist |
  |---|---|
  | Apple App Store (Ages 5 and under, Data Not Collected) | `qa/checklists/store-apple.md` |
  | Google Play (Data Safety no-collection, Families, API 35+, .aab) | `qa/checklists/store-google-play.md` |

  ## Hard rules carried from the spec (must all hold)

  - [ ] Zero networking code in `src/`.
  - [ ] `capacitor.config.ts` has no `server.url`.
  - [ ] AndroidManifest excludes `AD_ID`.
  - [ ] No analytics/ads/crash/font-CDN SDKs — direct (test) AND transitive (npm ls + trace).
  - [ ] No ads, no IAP, no scoring/streaks/urgency (appreciation-only rewards).
  - [ ] Android `compile/targetSdk` ≥ 35; ship `.aab`.
  - [ ] Native splash + edge-to-edge status bar + first-tap haptic + native voice audio.
  - [ ] Privacy policy hosted and reachable (HTTP 200, HTTPS).
  - [ ] Audio assets confirmed under a paid commercial (ElevenLabs/Stable Audio) license before shipping.
  - [ ] Zero-outbound network trace PASSES on both platforms.
  ```

- [ ] **Verify the index references all the artifacts created in this milestone and the transitive limitation:** `grep -c "network-zero-outbound\|parental-gate\|device-matrix\|store-apple\|store-google-play\|privacy-policy" docs/compliance-checklist.md && grep -c "TRANSITIVELY\|transitive" docs/compliance-checklist.md`

  Expected output: two lines — the first ≥ 6, the second ≥ 2.

- [ ] **Commit:** `git add docs/compliance-checklist.md && git commit -m "docs: add master compliance checklist index"`

---

### Task 17: Final launch checklist + version-pin lock + audio-license gate + maintenance cadence

**Files:**
- `qa/checklists/launch.md` (create)

- [ ] **Create `qa/checklists/launch.md`** with this exact content (the go/no-go gate before publishing to either store, including the audio paid-license gate from spec §6 and the maintenance cadence from spec §9 Phase 5):

  ```markdown
  # Launch Checklist — Ehaan Games v1

  **Purpose:** The single go/no-go gate before publishing to the App Store and
  Google Play, then publishing the PWA from the same `dist/`. Every box must be
  checked, with evidence, before submitting.

  ## 1. Build is content-complete and runnable

  - [ ] All three games registered in `src/games/registry.ts` and playable.
  - [ ] `npm run build` succeeds (`tsc --noEmit` clean + Vite build clean).
  - [ ] `npx cap sync` succeeds; app launches via `npm run ios` and `npm run android`.
  - [ ] `npm run assets:icons` has been run; all manifest/store icons exist under `public/icons/`.

  ## 2. Automated compliance suite (green)

  - [ ] `npm run test` — full unit suite green (pure modules per Shared Contracts §6.1).
  - [ ] `npm run assert:compliance` — green:
        - `hasNoServerUrl` (capacitor.config)
        - `manifestExcludesAdId` (AndroidManifest)
        - `hasNoForbiddenSdks` (package.json DIRECT deps)
  - [ ] `npm run lint` — clean.

  ## 3. Native-shell + Android config

  - [ ] `grep -E "compileSdkVersion|targetSdkVersion" android/variables.gradle` → both `= 35` (or higher).
  - [ ] `src/main.ts` wires native splash hide, edge-to-edge status bar, and first-tap haptic; voice audio is native (M1).

  ## 4. Manual QA checklists (all PASS, signed-off)

  - [ ] `qa/checklists/network-zero-outbound.md` — PASS on iPad AND Android, INCLUDING the `npm ls` transitive audit (evidence attached). **HARDEST GATE — most important; the only guard against transitive SDKs.**
  - [ ] `qa/checklists/thin-wrapper-chrome.md` — PASS on iPad AND Android.
  - [ ] `qa/checklists/parental-gate.md` — PASS (every adult surface gated).
  - [ ] `qa/checklists/device-matrix.md` — PASS (audio interruption, drag, battery, 60fps, shuffle continuity).

  ## 5. Asset licensing gate (spec §6 legal hygiene)

  - [ ] Provenance manifest confirms a **paid commercial license** (ElevenLabs/Stable Audio, royalty-free, no attribution) for EVERY shipped voice/SFX/music asset — no asset ships without a confirmed `license` entry.
  - [ ] Final art records `humanEdited: true` with a real human compositing pass (not a self-asserted boolean) so a human-authored work exists.

  ## 6. Privacy + store metadata

  - [ ] `docs/privacy-policy.md` published at `https://www.telaeris.com/ehaan-games/privacy` (HTTP 200, HTTPS, no auth).
  - [ ] URL entered in App Store Connect AND Play Console.

  ## 7. Apple submission

  - [ ] `qa/checklists/store-apple.md` fully done; build uploaded; submitted.
  - [ ] Ages 5 and under band; Data Not Collected; age-rating questionnaire complete; Free; no IAP.

  ## 8. Google Play submission

  - [ ] `qa/checklists/store-google-play.md` fully done; signed `.aab` uploaded; submitted.
  - [ ] Data Safety "no data collected/shared"; Families program; targetSdk ≥ 35; AD_ID declared not used; no ads.

  ## 9. PWA bonus (after store submissions)

  - [ ] `qa/checklists/pwa-offline.md` — PASS.
  - [ ] PWA published from the same `dist/` at its URL.

  ## 10. Version-pin lock (LAW — Shared Contracts §7.2)

  - [ ] Record the exact installed versions at launch (commit `package-lock.json`):
        - phaser ____________ (must be 4.1.x)
        - @capacitor/core ____________ (8.3.x)
        - @capacitor/cli ____________ (8.3.x)
        - @capacitor/ios ____________ (8.3.x)
        - @capacitor/android ____________ (8.3.x)
        - @capacitor/app ____________ (8.x)
        - @capacitor/preferences ____________ (8.x)
        - @capacitor/splash-screen ____________ (8.x)
        - @capacitor/status-bar ____________ (8.x)
        - @capacitor/haptics ____________ (8.x)
        - @capacitor-community/native-audio ____________
        - vite ____________ (5.x)
        - vite-plugin-pwa ____________ (0.20.x)
        - typescript ____________ (5.x)
        - vitest ____________ (2.x)
  - [ ] Tag the release: `git tag -a v1.0.0 -m "Ehaan Games v1.0.0" && git push --tags`.

  ## 11. Maintenance cadence (schedule now — spec §9 Phase 5)

  - [ ] Schedule a recurring re-target/re-test cycle: at each minor bump of
        Phaser or Capacitor, re-run `npm run assert:compliance`, the device
        matrix, AND the zero-outbound trace (with the `npm ls` audit) on real
        devices before shipping.
  - [ ] On ANY new dependency or plugin: re-run the zero-outbound trace
        (`network-zero-outbound.md`) — a new default-on/transitive SDK is the
        #1 rejection risk and is caught ONLY by that trace.

  **Go/No-Go decision:** ☐ GO (all boxes ✓)  ☐ NO-GO (blockers): ____________
  **Released by:** ____________  Date: ____________
  ```

- [ ] **Verify the launch checklist enumerates the version pins, the four QA gates, and the audio-license gate:** `grep -c "4.1.x\|8.3.x\|network-zero-outbound\|device-matrix\|parental-gate\|thin-wrapper\|paid commercial license\|targetSdk" qa/checklists/launch.md`

  Expected output: ≥ 8.

- [ ] **Run the full automated gate one last time to confirm the milestone's tests are green together:** `npm run test && npm run assert:compliance`

  Expected output: full unit suite green; compliance suite green (all assertion, capacitor-config, manifest, and forbidden-direct-SDK tests passing).

- [ ] **Commit:** `git add qa/checklists/launch.md && git commit -m "docs: add final launch checklist with version-pin lock, audio-license gate, and maintenance cadence"`