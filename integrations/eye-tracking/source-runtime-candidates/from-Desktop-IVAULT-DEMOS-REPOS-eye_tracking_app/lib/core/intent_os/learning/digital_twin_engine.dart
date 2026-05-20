import 'digital_twin_state.dart';
import '../intent_type.dart';

class DigitalTwinEngine {
  DigitalTwinState state = DigitalTwinState();

  void updateAttention(double fixationMs, double stability) {
    state.attentionDepth =
        (state.attentionDepth * 0.9) +
        ((fixationMs / 1200.0) * 0.1);

    state.gazeStability =
        (state.gazeStability * 0.9) + (stability * 0.1);
  }

  void updateCognitiveLoad(double gazeVariance, double blinkRate) {
    state.cognitiveLoad =
        (gazeVariance * 0.6 + blinkRate * 0.4).clamp(0.0, 1.0);
  }

  void updateDecisionLatency(double dwellMs) {
    state.decisionLatency =
        (state.decisionLatency * 0.9) +
        ((dwellMs / 1000.0) * 0.1);
  }

  void updateIntent(double hover, double select, double dwell) {
    state.hoverProbability =
        (state.hoverProbability * 0.8) + (hover * 0.2);

    state.selectProbability =
        (state.selectProbability * 0.8) + (select * 0.2);

    state.dwellProbability =
        (state.dwellProbability * 0.8) + (dwell * 0.2);
  }

  void updateFromFrame({
    required double fixationMs,
    required double stability,
    required double gazeVariance,
    required double blinkRate,
    required double hover,
    required double select,
    required double dwell,
    required double dwellMs,
  }) {
    updateAttention(fixationMs, stability);
    updateCognitiveLoad(gazeVariance, blinkRate);
    updateDecisionLatency(dwellMs);
    updateIntent(hover, select, dwell);
  }

  IntentType simulateNextAction() {
    if (state.decisionLatency < 0.3 &&
        state.cognitiveLoad < 0.4) {
      return IntentType.fastInteract;
    }

    if (state.selectProbability > 0.75 &&
        state.gazeStability > 0.6) {
      return IntentType.select;
    }

    if (state.dwellProbability > 0.7 &&
        state.attentionDepth > 0.6) {
      return IntentType.dwellReady;
    }

    if (state.hoverProbability >= 0.6) {
      return IntentType.hover;
    }

    return IntentType.hover;
  }
}
