import 'feedback_signal.dart';

class FeedbackBuffer {
  final List<bool> feedback = [];

  void add(bool success) {
    feedback.add(success);

    if (feedback.length > 50) {
      feedback.removeAt(0);
    }
  }

  void addFeedback(FeedbackType type) {
    switch (type) {
      case FeedbackType.positive:
        feedback.add(true);
        break;

      case FeedbackType.negative:
        feedback.add(false);
        break;

      case FeedbackType.implicit:
        // weak signal (slight positive bias)
        feedback.add(true);
        break;
    }
  }

  double successRate() {
    if (feedback.isEmpty) return 1.0;

    return feedback.where((f) => f).length / feedback.length;
  }
}
