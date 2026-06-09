# Ehaan Games v1 — Implementation Plan Overview

> **For agentic workers:** This is the index for the v1 plan set. Execute the milestone plans in the order below. REQUIRED SUB-SKILL for each milestone: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Every milestone references the canonical contracts doc — read it first.

**Goal:** Ship an ongoing catalog of free, fully-offline, zero-data 2D games for ages 2–5 (v1: color sort, item sort, item match) to iOS + Android from one codebase, on Phaser 4.1 (TypeScript) + Capacitor 8.3, with a reusable game shell.

**Source of truth:**
- Design spec: [2026-06-09-kids-games-stack-and-architecture-design.md](../specs/2026-06-09-kids-games-stack-and-architecture-design.md)
- **Canonical contracts** (types, interfaces, file paths, JSON schemas, palette, test strategy, pinned deps/scripts): [2026-06-09-ehaan-games-v1-contracts.md](2026-06-09-ehaan-games-v1-contracts.md) — **read this before any milestone; it is LAW.**

---

## The milestones

| # | Plan | Goal | Prerequisite |
|---|---|---|---|
| **M0** | [Phase-0 Vertical-Slice Gate](2026-06-09-m0-phase0-vertical-slice-gate.md) | Throwaway color-sort slice to prove iOS audio survival + cheap-Android drag; **GO/NO-GO**. Scaffolds the workspace. | none |
| **M1** | [Shell — Platform & Services](2026-06-09-m1-shell-services.md) | AudioService (+native/web backends), AppLifecycle, ProgressStore, ParentalGate, DragDropController, RewardFx, theme/UI (Button/Dialog), shared types | M0 = GO |
| **M2** | [Shell — Scenes & Bootstrap](2026-06-09-m2-shell-scenes.md) | Boot/Hub/Settings/BaseGameScene, registry, main.ts bootstrap, idle-throttle, sprite-cap guard | M1 |
| **M3** | [AI-Asset Pipeline](2026-06-09-m3-ai-asset-pipeline.md) | `tools/` scripts: rembg → pack-atlas → compress-audio → manifest → icons; style guide + generation SOP | M0 = GO (parallel-OK) |
| **M4** | [The Three Games](2026-06-09-m4-three-games.md) | color-sort (colorblind-safe), item-sort, item-match as thin Scenes + content.json + pure logic | M2 (+ M3 assets; placeholder atlas OK) |
| **M5** | [Compliance, Store Readiness, QA & Launch](2026-06-09-m5-compliance-store-launch.md) | Privacy/labels/Data-Safety, AD_ID exclusion, zero-outbound network proof, splash/haptics/status-bar, device-matrix QA, PWA bonus | M2 + M4 |

## Execution order (dependency graph)

```
M0 (GATE) ──GO──┬── M1 ── M2 ──┬── M4 ── M5
                └── M3 ─────────┘
                (M1 ∥ M3 can run in parallel after M0 passes; M4 needs M2 + M3)
```

Recommended sequence: **M0 → (M1 ∥ M3) → M2 → M4 → M5.**

## ⚠️ The Phase-0 gate governs everything

M0 is a **decision gate**, not just the first feature. It builds a *throwaway* slice and validates the two real risks from the spec (§8):

1. **iOS audio survives** an incoming-call interruption + a lock/unlock cycle (voice prompts must not go silent).
2. **Drag is responsive** and battery acceptable on a current Android device.

- **GO** → proceed to M1–M5 on Phaser as written.
- **NO-GO** → **pivot to the React Native + Expo fallback** (same TypeScript team, no language change; Skia + Reanimated 4 + Gesture Handler / reanimated-dnd). In that case M1–M5 become a **design reference** — the architecture (shell modules, content-config games, compliance, asset pipeline) carries over, but the Phaser-specific implementation steps must be re-authored for RN. Do not begin M1 until M0 returns GO.

## Conventions (from the contracts doc)

- **TDD where decidable:** pure, framework-free modules (validation, completion, palette/contrast, audio queue/resume, serialization, challenge gen, layout math, compliance assertions) are unit-tested with vitest (failing test → see it fail → minimal impl → pass → commit). Phaser scenes are thin wiring covered by **manual-QA checklists** in `qa/checklists/`.
- **Zero networking** in the shipped build; the single most important compliance action is the **zero-outbound network-proxy trace** (M5).
- **No levels, no scoring** — open play with appreciation-only rewards.
- Conventional-commit messages; exact file paths; frequent commits.

## Open items deferred to execution

- **Device test targets** (M0): the specific current iPad + current Android device the team will use. Note (per spec §10): no old/legacy hardware will be tested, leaving residual low-end-jank risk mitigated by atlasing/WebGL/idle-throttle/sprite-cap.
- **AI generation accounts** (M3): a paid ElevenLabs plan must be confirmed before shipping audio (the manifest gate enforces a license string).
