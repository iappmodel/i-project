import 'package:flutter_test/flutter_test.dart';
import 'package:eye_tracking_app/campaign_engine.dart';

ManagedCampaign _sample({
  String id = 'c1',
  double total = 100,
  double reward = 2,
  DateTime? start,
  DateTime? end,
}) {
  final t0 = DateTime.utc(2026, 1, 1);
  return ManagedCampaign(
    id: id,
    brandId: 'b1',
    totalBudgetUsd: total,
    rewardPerVerifiedActionUsd: reward,
    targetAudience: {'music'},
    maxFraudSignalScore: 0.35,
    minAttentionScore: 0.5,
    minVerifiedAttentionSeconds: 2,
    startAt: start ?? t0,
    endAt: end ?? t0.add(const Duration(days: 30)),
    allowedGeoCodes: const {'US'},
    allowedDeviceClasses: const {'mobile'},
    maxVerifiedActionsPerUser: 5,
    maxVerifiedActionsPerUserPerDay: 2,
  );
}

void main() {
  group('CampaignEngine lifecycle', () {
    test('draft → submitted → approved → active', () {
      final e = CampaignEngine();
      final c = _sample();
      e.registerOrReplace(c);
      expect(e.submit('c1').ok, isTrue);
      expect(c.phase, CampaignLifecyclePhase.submitted);
      expect(e.approveReview('c1').ok, isTrue);
      expect(c.phase, CampaignLifecyclePhase.approved);
      final mid = DateTime.utc(2026, 1, 5);
      expect(e.activate('c1', mid).ok, isTrue);
      expect(c.phase, CampaignLifecyclePhase.active);
    });

    test('reject releases from submitted', () {
      final e = CampaignEngine();
      final c = _sample();
      e.registerOrReplace(c);
      e.submit('c1');
      expect(e.reject('c1').ok, isTrue);
      expect(c.phase, CampaignLifecyclePhase.rejected);
    });

    test('activate fails outside window', () {
      final e = CampaignEngine();
      final t0 = DateTime.utc(2026, 1, 10);
      final c = _sample(
        start: t0,
        end: t0.add(const Duration(days: 1)),
      );
      e.registerOrReplace(c);
      e.submit('c1');
      e.approveReview('c1');
      expect(
        e.activate('c1', DateTime.utc(2026, 1, 1)).ok,
        isFalse,
      );
    });
  });

  group('CampaignEngine budget rules', () {
    test('must reserve before settle; cannot exceed remaining', () {
      final e = CampaignEngine();
      final c = _sample(total: 10, reward: 4);
      e.registerOrReplace(c);
      e.submit('c1');
      e.approveReview('c1');
      e.activate('c1', DateTime.utc(2026, 1, 5));

      final r1 = e.reserveForVerifiedAction(
        campaignId: 'c1',
        amountUsd: 4,
        now: DateTime.utc(2026, 1, 5),
      );
      expect(r1.ok, isTrue);
      expect(c.reservedBudgetUsd, 4);
      expect(c.remainingBudgetUsd, 6);

      final r2 = e.reserveForVerifiedAction(
        campaignId: 'c1',
        amountUsd: 7,
        now: DateTime.utc(2026, 1, 5),
      );
      expect(r2.ok, isFalse);

      expect(
        e.settleReservation(
          reservationId: r1.reservationId!,
          now: DateTime.utc(2026, 1, 5),
        ).ok,
        isTrue,
      );
      expect(c.spentBudgetUsd, 4);
      expect(c.reservedBudgetUsd, 0);
      expect(c.remainingBudgetUsd, 6);
    });

    test('cannot settle without prior reserve', () {
      final e = CampaignEngine();
      final c = _sample();
      e.registerOrReplace(c);
      e.submit('c1');
      e.approveReview('c1');
      e.activate('c1', DateTime.utc(2026, 1, 5));
      expect(
        e.settleReservation(
          reservationId: 'missing',
          now: DateTime.utc(2026, 1, 5),
        ).ok,
        isFalse,
      );
    });

    test('reservation amount cannot exceed rewardPerVerifiedAction', () {
      final e = CampaignEngine();
      final c = _sample(reward: 1);
      e.registerOrReplace(c);
      e.submit('c1');
      e.approveReview('c1');
      e.activate('c1', DateTime.utc(2026, 1, 5));
      expect(
        e.reserveForVerifiedAction(
          campaignId: 'c1',
          amountUsd: 2,
          now: DateTime.utc(2026, 1, 5),
        ).ok,
        isFalse,
      );
    });

    test('expire releases unused reserve', () {
      final e = CampaignEngine();
      final c = _sample(total: 5, reward: 2);
      e.registerOrReplace(c);
      e.submit('c1');
      e.approveReview('c1');
      e.activate('c1', DateTime.utc(2026, 1, 5));
      final r = e.reserveForVerifiedAction(
        campaignId: 'c1',
        amountUsd: 2,
        now: DateTime.utc(2026, 1, 5),
        holdTtl: const Duration(seconds: 1),
      );
      expect(r.ok, isTrue);
      e.expireReservations(DateTime.utc(2026, 1, 5, 0, 0, 3));
      expect(c.reservedBudgetUsd, 0);
      expect(c.remainingBudgetUsd, 5);
    });

    test('markBudgetDepleted when no liquidity', () {
      final e = CampaignEngine();
      final c = _sample(total: 3, reward: 3);
      e.registerOrReplace(c);
      e.submit('c1');
      e.approveReview('c1');
      e.activate('c1', DateTime.utc(2026, 1, 5));
      final r = e.reserveForVerifiedAction(
        campaignId: 'c1',
        amountUsd: 3,
        now: DateTime.utc(2026, 1, 5),
      );
      expect(r.ok, isTrue);
      expect(
        e.settleReservation(
          reservationId: r.reservationId!,
          now: DateTime.utc(2026, 1, 5),
        ).ok,
        isTrue,
      );
      expect(c.phase, CampaignLifecyclePhase.budgetDepleted);
    });
  });

  group('CampaignEngine eligibility', () {
    test('passesAttentionAndFraud', () {
      final c = _sample();
      final e = CampaignEngine()..registerOrReplace(c);
      expect(
        e.passesAttentionAndFraud(
          campaign: c,
          attentionScore: 0.6,
          fraudSignalScore: 0.2,
          verifiedAttentionSeconds: 5,
        ),
        isTrue,
      );
      expect(
        e.passesAttentionAndFraud(
          campaign: c,
          attentionScore: 0.4,
          fraudSignalScore: 0.2,
          verifiedAttentionSeconds: 5,
        ),
        isFalse,
      );
    });

    test('passesGeoDevice and audience', () {
      final c = _sample();
      final e = CampaignEngine()..registerOrReplace(c);
      expect(
        e.passesGeoDevice(
          campaign: c,
          userGeo: 'US',
          userDeviceClass: 'mobile',
        ),
        isTrue,
      );
      expect(
        e.passesGeoDevice(
          campaign: c,
          userGeo: 'CA',
          userDeviceClass: 'mobile',
        ),
        isFalse,
      );
      expect(
        e.passesAudience(
          campaign: c,
          userInterests: {'music', 'news'},
        ),
        isTrue,
      );
      expect(
        e.passesAudience(
          campaign: c,
          userInterests: {'sports'},
        ),
        isFalse,
      );
    });

    test('passesFrequencyCaps', () {
      final c = _sample(maxVerifiedActionsPerUser: 2, maxVerifiedActionsPerUserPerDay: 1);
      final e = CampaignEngine()..registerOrReplace(c);
      expect(
        e.passesFrequencyCaps(
          campaign: c,
          userLifetimeActions: 0,
          userActionsToday: 0,
        ),
        isTrue,
      );
      expect(
        e.passesFrequencyCaps(
          campaign: c,
          userLifetimeActions: 2,
          userActionsToday: 0,
        ),
        isFalse,
      );
      expect(
        e.passesFrequencyCaps(
          campaign: c,
          userLifetimeActions: 0,
          userActionsToday: 1,
        ),
        isFalse,
      );
    });
  });
}
