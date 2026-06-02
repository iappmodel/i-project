/// POP production runtime flags (Stage 9).
library;

import 'package:flutter/foundation.dart';

/// Use Y-plane transport instead of full-frame JPEG on Android.
const bool kUseYPlaneTransport = true;

/// Omit full landmark meshes from native → Dart channel in release builds.
bool get kDerivedSignalsOnly => !kDebugMode;

/// Adaptive frame skip when native processing exceeds this budget (ms).
const double kNativeProcessBudgetMs = 45.0;

/// Show per-frame perf HUD overlays (debug only).
bool get kShowPerfHud => kDebugMode;

/// Emergency kill switch default for autonomous execution.
const bool kDefaultEmergencyKillSwitch = false;

/// Block zone commits when native anti-spoof flags are set.
const bool kBlockOnLikelyFake = true;

/// Minimum face confidence for zone commit (0–1).
const double kMinZoneCommitConfidence = 0.65;

/// Minimum confidence passed to governance for manual zone select.
const double kMinGovernanceConfidence = 0.86;

/// External/OS remote control (AccessibilityService, deep links, payments) — off for MVP.
///
/// Override only for internal QA: `--dart-define=POP_ENABLE_EXTERNAL_OS_CONTROL=true`
const bool kEnableExternalOsControl = bool.fromEnvironment(
  'POP_ENABLE_EXTERNAL_OS_CONTROL',
  defaultValue: false,
);

/// HUD + verification stability overlay refresh cap (~5 Hz).
const int kOverlayRefreshIntervalMs = 200;

/// Camera ingest spacing (~12.5 fps); native budget gates adaptive skip.
const int kCameraFrameSpacingMs = 80;

/// Selfie segmenter adds ~15–25 ms/frame; off unless anti-spoof mask needed.
const bool kEnableSelfieSegmenter = false;
