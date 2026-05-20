import '../../gaze_zone.dart';
import 'learning/collective_zone_stats.dart';
import 'intent_influence_pipeline.dart';

/// Produces [IntentPrediction] from frame-time gaze and wall-clock [now] (ms since epoch).
abstract class IntentPredictor {
  IntentPrediction? predict({required double gaze, required int now});
}

/// Uses [getZone] on raw [gaze] and collective stats — no ML. [now] reserved for temporal models.
class GazeCollectiveIntentPredictor implements IntentPredictor {
  GazeCollectiveIntentPredictor(this._stats);

  final CollectiveZoneStats _stats;

  @override
  IntentPrediction? predict({required double gaze, required int now}) {
    final band = getZone(gaze);
    return intentPredictionFromGazeBand(_stats, band);
  }
}
