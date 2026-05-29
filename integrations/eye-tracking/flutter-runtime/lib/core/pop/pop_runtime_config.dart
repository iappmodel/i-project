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
