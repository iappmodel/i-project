import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/intent/zone_dwell_logic.dart';

void main() {
  const zoneDwellMs = 1000.0;
  const dwellReleaseMs = 200;
  const nowMs = 10_000;

  group('effectiveZoneDwellMs', () {
    test('non-positive avgDwellMs uses 1200 as base', () {
      double m(String _) => 1.0;
      expect(
        effectiveZoneDwellMs(
          avgDwellMs: 0,
          currentZone: 'LEFT',
          dwellMultiplierFor: m,
        ),
        1200.0,
      );
      expect(
        effectiveZoneDwellMs(
          avgDwellMs: -50,
          currentZone: 'LEFT',
          dwellMultiplierFor: m,
        ),
        1200.0,
      );
    });

    test('null currentZone uses CENTER for multiplier lookup', () {
      String? captured;
      final r = effectiveZoneDwellMs(
        avgDwellMs: 1000,
        currentZone: null,
        dwellMultiplierFor: (z) {
          captured = z;
          return 1.0;
        },
      );
      expect(captured, 'CENTER');
      expect(r, 1000.0);
    });

    test('multiplier applies to base duration', () {
      expect(
        effectiveZoneDwellMs(
          avgDwellMs: 1000,
          currentZone: 'RIGHT',
          dwellMultiplierFor: (z) => z == 'RIGHT' ? 0.85 : 1.0,
        ),
        closeTo(850.0, 1e-9),
      );
      expect(
        effectiveZoneDwellMs(
          avgDwellMs: 1000,
          currentZone: 'LEFT',
          dwellMultiplierFor: (_) => 1.3333333333333333,
        ),
        closeTo(1333.3333333333333, 1e-6),
      );
    });

    test('positive avgDwellMs preserved when multiplier is 1', () {
      expect(
        effectiveZoneDwellMs(
          avgDwellMs: 888.0,
          currentZone: 'LEFT',
          dwellMultiplierFor: (_) => 1.0,
        ),
        888.0,
      );
    });
  });

  group('activeZoneForPipeline', () {
    test('non-empty displaySelectedZone wins over currentZone', () {
      expect(
        activeZoneForPipeline(
          displaySelectedZone: 'LEFT',
          currentZone: 'RIGHT',
        ),
        'LEFT',
      );
      expect(
        activeZoneForPipeline(displaySelectedZone: 'X', currentZone: null),
        'X',
      );
    });

    test('empty displaySelectedZone falls back to currentZone when set', () {
      expect(
        activeZoneForPipeline(displaySelectedZone: '', currentZone: 'RIGHT'),
        'RIGHT',
      );
    });

    test('empty displaySelectedZone and null currentZone returns empty', () {
      expect(
        activeZoneForPipeline(displaySelectedZone: '', currentZone: null),
        '',
      );
    });
  });

  group('dwellProgressMs', () {
    test('zero progress returns 0', () {
      expect(dwellProgressMs(dwellProgress: 0, zoneDwellMs: 2000), 0);
    });

    test('half progress returns half duration rounded', () {
      expect(
        dwellProgressMs(dwellProgress: 0.5, zoneDwellMs: 1001),
        (500.5).round(),
      );
    });

    test('fractional intermediate uses Dart double.round()', () {
      final product = 0.503 * 1000.0;
      expect(
        dwellProgressMs(dwellProgress: 0.503, zoneDwellMs: 1000),
        product.round(),
      );
      expect(product.round(), 503);
    });

    test('full progress returns rounded zoneDwellMs', () {
      expect(dwellProgressMs(dwellProgress: 1.0, zoneDwellMs: 942.8), 943);
    });
  });

  group('zoneDwellProgressRatio', () {
    double golden(double elapsedMs, double zoneDwellMs) =>
        (elapsedMs / zoneDwellMs).clamp(0.0, 1.0);

    test('zero elapsed yields 0', () {
      expect(
        zoneDwellProgressRatio(elapsedMs: 0, zoneDwellMs: 2400),
        golden(0, 2400),
      );
    });

    test('half elapsed yields half ratio', () {
      expect(zoneDwellProgressRatio(elapsedMs: 500, zoneDwellMs: 1000), 0.5);
    });

    test('progress above 1 clamps to 1', () {
      expect(zoneDwellProgressRatio(elapsedMs: 3000, zoneDwellMs: 1000), 1);
    });

    test('non-positive zoneDwellMs matches division + clamp', () {
      expect(
        zoneDwellProgressRatio(elapsedMs: 100, zoneDwellMs: 0),
        golden(100, 0),
      );
      expect(
        zoneDwellProgressRatio(elapsedMs: 100, zoneDwellMs: -200),
        golden(100, -200),
      );
    });

    test('matches main int / double promotion and formula', () {
      const elapsed = 333;
      const z = 1100.0;
      expect(
        zoneDwellProgressRatio(elapsedMs: elapsed.toDouble(), zoneDwellMs: z),
        (elapsed / z).clamp(0.0, 1.0),
      );
    });

    test('parity grid vs (elapsedMs / zoneDwellMs).clamp(0.0, 1.0)', () {
      const cases = <(double, double)>[
        (0, 1000),
        (1, 3),
        (900, 1000),
        (1000, 1000),
        (-50, 1000),
        (50, -1000),
      ];
      for (final (e, z) in cases) {
        expect(
          zoneDwellProgressRatio(elapsedMs: e, zoneDwellMs: z),
          golden(e, z),
        );
      }
    });
  });

  group('resolveZoneDwellAdvance', () {
    test(
      'zone band change resets dwell fields and flags sync + blink reset',
      () {
        final r = resolveZoneDwellAdvance(
          zone: 'LEFT',
          currentZone: 'CENTER',
          zoneStartMs: 9000,
          nowMs: nowMs,
          zoneDwellMs: zoneDwellMs,
          dwellReleaseMs: dwellReleaseMs,
          dwellSatisfiedForStint: true,
          dwellProgress: 0.8,
          selectedAnnouncedForStint: true,
          displaySelectedZone: 'CENTER',
        );
        expect(r.zoneBandChanged, true);
        expect(r.zoneOverlayDirty, true);
        expect(r.callSyncDwellReadyFalse, true);
        expect(r.shouldMarkDwellSatisfied, false);
        expect(r.resetWasBlinking, true);
        expect(r.nextCurrentZone, 'LEFT');
        expect(r.nextZoneStartMs, nowMs);
        expect(r.nextDwellSatisfiedForStint, false);
        expect(r.nextDwellProgress, 0);
        expect(r.nextSelectedAnnouncedForStint, false);
        expect(r.nextDisplaySelectedZone, '');
      },
    );

    test('same zone with null zoneStart is a no-op', () {
      final r = resolveZoneDwellAdvance(
        zone: 'LEFT',
        currentZone: 'LEFT',
        zoneStartMs: null,
        nowMs: nowMs,
        zoneDwellMs: zoneDwellMs,
        dwellReleaseMs: dwellReleaseMs,
        dwellSatisfiedForStint: false,
        dwellProgress: 0.1,
        selectedAnnouncedForStint: false,
        displaySelectedZone: '',
      );
      expect(r.zoneBandChanged, false);
      expect(r.zoneOverlayDirty, false);
      expect(r.shouldMarkDwellSatisfied, false);
      expect(r.callSyncDwellReadyFalse, false);
    });

    test(
      'hysteresis clears satisfied and syncs when elapsed < release after stint',
      () {
        final zoneStartMs = nowMs - 150;
        final r = resolveZoneDwellAdvance(
          zone: 'LEFT',
          currentZone: 'LEFT',
          zoneStartMs: zoneStartMs,
          nowMs: nowMs,
          zoneDwellMs: zoneDwellMs,
          dwellReleaseMs: dwellReleaseMs,
          dwellSatisfiedForStint: true,
          dwellProgress: 1,
          selectedAnnouncedForStint: true,
          displaySelectedZone: 'LEFT',
        );
        expect(r.zoneBandChanged, false);
        expect(r.zoneOverlayDirty, true);
        expect(r.callSyncDwellReadyFalse, true);
        expect(r.shouldMarkDwellSatisfied, false);
        expect(r.nextDwellSatisfiedForStint, false);
        expect(r.nextDwellProgress, closeTo(0.15, 1e-9));
      },
    );

    test(
      'fractional nextDwellProgress matches zoneDwellProgressRatio (hysteresis and in-progress)',
      () {
        final hStart = nowMs - 150;
        final hElapsed = nowMs - hStart;
        final h = resolveZoneDwellAdvance(
          zone: 'LEFT',
          currentZone: 'LEFT',
          zoneStartMs: hStart,
          nowMs: nowMs,
          zoneDwellMs: zoneDwellMs,
          dwellReleaseMs: dwellReleaseMs,
          dwellSatisfiedForStint: true,
          dwellProgress: 1,
          selectedAnnouncedForStint: true,
          displaySelectedZone: 'LEFT',
        );
        expect(
          h.nextDwellProgress,
          zoneDwellProgressRatio(
            elapsedMs: hElapsed.toDouble(),
            zoneDwellMs: zoneDwellMs,
          ),
        );

        final pStart = nowMs - 650;
        final pElapsed = nowMs - pStart;
        final p = resolveZoneDwellAdvance(
          zone: 'CENTER',
          currentZone: 'CENTER',
          zoneStartMs: pStart,
          nowMs: nowMs,
          zoneDwellMs: zoneDwellMs,
          dwellReleaseMs: dwellReleaseMs,
          dwellSatisfiedForStint: false,
          dwellProgress: 0.5,
          selectedAnnouncedForStint: false,
          displaySelectedZone: '',
        );
        expect(
          p.nextDwellProgress,
          zoneDwellProgressRatio(
            elapsedMs: pElapsed.toDouble(),
            zoneDwellMs: zoneDwellMs,
          ),
        );
      },
    );

    test(
      'after satisfied, elapsed >= release is no progress/no sync (no-op dirty)',
      () {
        final zoneStartMs = nowMs - 500;
        final r = resolveZoneDwellAdvance(
          zone: 'LEFT',
          currentZone: 'LEFT',
          zoneStartMs: zoneStartMs,
          nowMs: nowMs,
          zoneDwellMs: zoneDwellMs,
          dwellReleaseMs: dwellReleaseMs,
          dwellSatisfiedForStint: true,
          dwellProgress: 1,
          selectedAnnouncedForStint: true,
          displaySelectedZone: 'LEFT',
        );
        expect(r.zoneOverlayDirty, false);
        expect(r.callSyncDwellReadyFalse, false);
        expect(r.shouldMarkDwellSatisfied, false);
        expect(r.nextDwellSatisfiedForStint, true);
        expect(r.nextDwellProgress, 1);
      },
    );

    test('elapsed > dwell requests marks satisfied', () {
      final zoneStartMs = nowMs - 1001;
      final r = resolveZoneDwellAdvance(
        zone: 'RIGHT',
        currentZone: 'RIGHT',
        zoneStartMs: zoneStartMs,
        nowMs: nowMs,
        zoneDwellMs: zoneDwellMs,
        dwellReleaseMs: dwellReleaseMs,
        dwellSatisfiedForStint: false,
        dwellProgress: 0.3,
        selectedAnnouncedForStint: false,
        displaySelectedZone: '',
      );
      expect(r.shouldMarkDwellSatisfied, true);
      expect(r.zoneOverlayDirty, true);
      expect(r.callSyncDwellReadyFalse, false);
    });

    test('progress updates only when delta >= 0.02 or next is zero', () {
      final zoneStartMs = nowMs - 400;
      final smallDelta = resolveZoneDwellAdvance(
        zone: 'CENTER',
        currentZone: 'CENTER',
        zoneStartMs: zoneStartMs,
        nowMs: nowMs,
        zoneDwellMs: zoneDwellMs,
        dwellReleaseMs: dwellReleaseMs,
        dwellSatisfiedForStint: false,
        dwellProgress: 0.39,
        selectedAnnouncedForStint: false,
        displaySelectedZone: '',
      );
      expect(smallDelta.zoneOverlayDirty, false);
      expect(smallDelta.nextDwellProgress, 0.39);

      final okDelta = resolveZoneDwellAdvance(
        zone: 'CENTER',
        currentZone: 'CENTER',
        zoneStartMs: zoneStartMs,
        nowMs: nowMs,
        zoneDwellMs: zoneDwellMs,
        dwellReleaseMs: dwellReleaseMs,
        dwellSatisfiedForStint: false,
        dwellProgress: 0.35,
        selectedAnnouncedForStint: false,
        displaySelectedZone: '',
      );
      expect(okDelta.zoneOverlayDirty, true);
      expect(okDelta.nextDwellProgress, 0.4);
    });
  });
}
