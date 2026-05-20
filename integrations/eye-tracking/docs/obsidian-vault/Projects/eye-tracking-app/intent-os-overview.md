---

## title: Intent OS overview
tags: [eye-tracking, intent-os, architecture]
created: 2026-04-17
code: lib/core/intent_os/intent_os.dart

# Intent OS overview

## Staged stack (gaze → UI)

From `intent_os.dart` library docstring:


| #   | Stage       | Role                                                         |
| --- | ----------- | ------------------------------------------------------------ |
| 1   | Prediction  | `IntentPrediction` / gaze band (`intent_influence_pipeline`) |
| 2   | Influence   | `IntentInfluenceEngine` — “magnetism”; **does not commit**   |
| 3   | Fixation    | `FixationState` — unstable / saccadic excluded               |
| 4   | Dwell       | Zone hold + `LearningStore` timing in camera loop            |
| 5   | Agent       | `AutonomousAgent.decide` — proposals                         |
| 6   | Safety gate | `ActionExecutor` / `decideAction` / `shouldConfirm`          |
| 7   | Execution   | `ActionExecutor.execute` → callbacks                         |


## Autonomous execution

When a side effect should run through the kernel chain: [[kernel-autonomous-execution]].

## Parallel symbolic path

`**IntentOS.process`** — blink, dwell, voice, stability, user feedback flags:

`SignalRouter` → `**IntentEngine**` → `**ActionRouter**`, with **learning** (`LearningStore`, `IntentLearner`, `FeedbackCollector`).

This **complements** fixation/dwell in the UI loop; it does **not** replace them.

## Learning folder

`lib/core/intent_os/learning/` — profiles, collective stats, action-memory learning, and UI-evolution signals.

**Live vs scaffold (audited 2026-04-23):** Canonical table and call-site notes live in repo `**AGENTS.md`** → section **Intent OS — `lib/core/intent_os/learning/`**. In short: `LearningStore`, `LearningEngine`, `EvolutionSignalBuffer` / `recordEvolutionSignal`, and `UIEvolutionEngine` are **live** from `lib/main.dart`; vault-only names like `IntentLearner` / `FeedbackCollector` remain **design / scaffold** until implemented or wired under `lib/`.

## Related

- Gaze input: [[gaze-dart-pipeline]]
- Native signals: [[native-android-vision]]
- Kernels: [[kernel-autonomous-execution]]
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[intent UX for false positives]]
- [[voice as override vs parallel channel]]
- [[collective learning privacy]]

