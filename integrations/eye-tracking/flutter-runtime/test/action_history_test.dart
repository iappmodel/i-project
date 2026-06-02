import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/core/intent_os/action_history.dart';
import 'package:eye_tracking_app/core/intent_os/autonomous_action.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';

void main() {
  test('undoLast removes most recent entry', () {
    final h = ActionHistory();
    h.record(
      const AutonomousAction(
        type: UIActionType.openZone,
        targetZone: 'LEFT',
        confidence: 0.9,
        riskScore: 0.1,
        predictedLatency: 40,
      ),
    );
    h.record(
      const AutonomousAction(
        type: UIActionType.openZone,
        targetZone: 'RIGHT',
        confidence: 0.9,
        riskScore: 0.1,
        predictedLatency: 40,
      ),
    );
    expect(h.length, 2);
    h.undoLast();
    expect(h.length, 1);
    expect(h.entries.last.targetZone, 'LEFT');
  });
}
