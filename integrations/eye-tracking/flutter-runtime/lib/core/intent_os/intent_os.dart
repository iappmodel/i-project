/// Gaze intent stack — how the conceptual stages map to this package and app code:
///
/// 1. **Prediction** — [IntentPrediction] from
///    `intent_influence_pipeline.dart` ([intentPredictionFromGazeBand]).
/// 2. **Influence** — [IntentInfluenceEngine] → [IntentInfluence] (presentation / magnetism;
///    does not commit selection by itself).
/// 3. **Fixation validation** — [FixationState] from `gaze_fixation.dart` / gaze events;
///    unstable or saccadic samples must not drive actionable intent alone.
/// 4. **Dwell accumulation** — zone hold and progress in the camera frame loop (`main.dart`)
///    and behavior-backed dwell timing via [LearningStore].
/// 5. **Agent decision** — [AutonomousAgent.decide] (`autonomous_agent.dart`) when lifting
///    proposals from prediction + fixation + dwell.
/// 6. **Safety gate** — [ActionExecutor]'s confidence floor; `decideAction` / `shouldConfirm`
/// in `action_decision.dart` (high-risk actions with confidence below 0.92 require confirmation).
/// 7. **Execution** — [ActionExecutor.execute] → zone/tap/highlight/preload callbacks.
///
/// [IntentEngine] / [IntentOS.process] resolve symbolic [IntentType] from blink/dwell/voice
/// signals on the event bus; that path complements the pipeline above, it does not replace
/// fixation or dwell checks in the UI loop.
library;

import '../system.dart';
import 'signal_router.dart';
import 'intent_engine.dart';
import 'action_router.dart';
import 'context_state.dart';
import 'learning/intent_learner.dart';
import 'learning/user_profile.dart';
import 'learning/feedback_buffer.dart';
import 'learning/feedback_collector.dart';
import 'learning/feedback_signal.dart';
import 'learning/learning_store.dart';

class IntentOS {
  final ContextState context = ContextState();
  late final IntentEngine intent;
  final ActionRouter actions = ActionRouter();

  final UserProfile profile = UserProfile();
  late final LearningStore _learning;
  final FeedbackBuffer feedback = FeedbackBuffer();
  final FeedbackCollector feedbackCollector = FeedbackCollector();
  late final IntentLearner learner;

  /// EMA updates toward observed fixation/dwell/blink/noise; shares [profile] with [learner].
  LearningStore get learningStore => _learning;

  IntentOS() {
    _learning = LearningStore(profile: profile);
    intent = IntentEngine(
      _learning,
      System.bus,
      context: context,
      subscribeToVoiceEvents: false,
    );
    learner = IntentLearner(profile, feedback);
  }

  void process({
    required bool blink,
    required bool dwell,
    required String? voice,
    required double stability,
    required bool userReversedAction,
    required bool userRepeatedAction,
    required bool userIgnoredSystem,
  }) {
    final signal = SignalRouter()
      ..blink = blink
      ..dwell = dwell
      ..voice = voice
      ..stability = stability;

    final result = intent.resolveIntent(signal);

    if (result != null) {
      actions.execute(result);

      final feedbackType = feedbackCollector.evaluate(
        actionTriggered: true,
        userReversedAction: userReversedAction,
        userRepeatedAction: userRepeatedAction,
        userIgnoredSystem: userIgnoredSystem,
      );

      feedback.add(feedbackType == FeedbackType.positive);
    }

    learner.adapt();
  }
}
