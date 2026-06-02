import 'package:flutter/material.dart';

import 'calibration_wizard.dart';

/// Full-screen first-run consent + calibration wizard (Stage 8).
class PopOnboardingOverlay extends StatelessWidget {
  const PopOnboardingOverlay({
    super.key,
    required this.step,
    required this.onAcceptConsent,
    required this.onDismissComplete,
  });

  final CalibrationWizardStep step;
  final VoidCallback onAcceptConsent;
  final VoidCallback onDismissComplete;

  @override
  Widget build(BuildContext context) {
    final isConsent = step == CalibrationWizardStep.consent;
    final isComplete = step == CalibrationWizardStep.complete;

    return Material(
      color: Colors.black.withValues(alpha: 0.72),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                calibrationWizardTitle(step),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                calibrationWizardBody(step),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),
              const Spacer(),
              if (isConsent)
                FilledButton(
                  onPressed: onAcceptConsent,
                  child: const Text('I agree — start calibration'),
                )
              else if (isComplete)
                FilledButton(
                  onPressed: onDismissComplete,
                  child: const Text('Continue to feed'),
                )
              else
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: CircularProgressIndicator(color: Colors.white70),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
