/// User-facing recalibration recommendation (Stage 6).
library;

const String kRecalibrationPromptMessage =
    'Eye tracking drifted — look left, then right, or use Cal L/R to recalibrate.';

/// Whether to show the soft recalibration banner.
bool shouldShowRecalibrationPrompt({
  required bool recommended,
  required bool calibrationBusy,
  required bool dismissedForSession,
}) {
  return recommended && !calibrationBusy && !dismissedForSession;
}
