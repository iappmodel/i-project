import 'package:eye_tracking_app/core/intent_os/learning/collective_zone_stats.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('predictLikelyZone returns gaze band when collective is uniform', () {
    final s = CollectiveZoneStats();
    expect(s.predictLikelyZone('LEFT'), 'LEFT');
    expect(s.predictLikelyZone('RIGHT'), 'RIGHT');
  });

  test('recordSelection shifts predictLikelyZone toward popular zone', () {
    final s = CollectiveZoneStats();
    for (var i = 0; i < 40; i++) {
      s.recordSelection('CENTER');
    }
    // Gaze says LEFT; strong prior + high collective weight pulls to CENTER.
    final pred = s.predictLikelyZone('LEFT', collectiveWeight: 0.72);
    expect(pred, 'CENTER');
    expect(s.zoneHitRates['CENTER']! > s.zoneHitRates['LEFT']!, isTrue);
  });

  test('dwellMultiplierFor shortens for high-probability zones', () {
    final s = CollectiveZoneStats();
    for (var i = 0; i < 30; i++) {
      s.recordSelection('RIGHT');
    }
    final mRight = s.dwellMultiplierFor('RIGHT');
    final mLeft = s.dwellMultiplierFor('LEFT');
    expect(mRight < mLeft, isTrue);
    expect(mRight >= 0.88 && mRight <= 1.0, isTrue);
  });

  test('intentSelectBoost increases for frequent zones', () {
    final s = CollectiveZoneStats();
    final b0 = s.intentSelectBoost('CENTER');
    for (var i = 0; i < 25; i++) {
      s.recordSelection('CENTER');
    }
    final b1 = s.intentSelectBoost('CENTER');
    expect(b1 > b0, isTrue);
  });
}
