import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/user_engagement_state.dart';

void main() {
  test('zoning out when fatigue above threshold and gaze stable', () {
    expect(
      deriveUserEngagementState(fatigueLevel: 0.07, gazeStable: true),
      UserEngagementState.zoningOut,
    );
    expect(
      deriveUserEngagementState(fatigueLevel: 0.061, gazeStable: true),
      UserEngagementState.zoningOut,
    );
  });

  test('attentive when fatigue at or below threshold', () {
    expect(
      deriveUserEngagementState(fatigueLevel: 0.06, gazeStable: true),
      UserEngagementState.attentive,
    );
    expect(
      deriveUserEngagementState(fatigueLevel: 0.05, gazeStable: true),
      UserEngagementState.attentive,
    );
  });

  test('attentive when gaze not stable or fatigue null', () {
    expect(
      deriveUserEngagementState(fatigueLevel: 0.10, gazeStable: false),
      UserEngagementState.attentive,
    );
    expect(
      deriveUserEngagementState(fatigueLevel: null, gazeStable: true),
      UserEngagementState.attentive,
    );
  });

  test('wire names', () {
    expect(userEngagementStateWire(UserEngagementState.attentive), 'attentive');
    expect(userEngagementStateWire(UserEngagementState.zoningOut), 'zoning_out');
  });
}
