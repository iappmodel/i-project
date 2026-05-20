import 'package:eye_tracking_app/campaign_budget_reserve_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime(2026, 4, 25, 12);

  group('CampaignBudgetReserveEngine', () {
    test('happy path: reserve → approve → clear spends; invariant holds', () {
      final eng = CampaignBudgetReserveEngine()
        ..registerCampaign(campaignId: 'c1', totalBudget: 100);

      final r0 = eng.bookFor('c1')!;
      expect(r0.availableBudget, 100);
      expect(r0.reservedBudget, 0);
      expect(r0.spentBudget, 0);

      final r1 = eng.attemptReserve(
        campaignId: 'c1',
        rewardCandidateId: 'rc1',
        amount: 30,
        now: now,
        valueLotId: 'lot-a',
      );
      expect(r1, isA<ReserveAttemptOk>());
      final ok1 = (r1 as ReserveAttemptOk).value;
      expect(ok1.book.availableBudget, 70);
      expect(ok1.book.reservedBudget, 30);
      expect(ok1.lot.stage, BudgetReserveLotStage.reservedAwaitingApproval);

      final a = eng.approveRewardDecision(valueLotId: 'lot-a');
      expect(a, isA<BudgetReserveMutationOk>());
      expect(
        ((a as BudgetReserveMutationOk).lot)!.stage,
        BudgetReserveLotStage.reservedAwaitingValueClear,
      );

      final s = eng.convertReserveToSpendOnValueClear(valueLotId: 'lot-a');
      expect(s, isA<BudgetReserveMutationOk>());
      final bs = (s as BudgetReserveMutationOk).book;
      expect(bs.reservedBudget, 0);
      expect(bs.spentBudget, 30);
      expect(bs.availableBudget, 70);
      expect(
        eng.lotById('lot-a')!.stage,
        BudgetReserveLotStage.spent,
      );
    });

    test('reject after reserve releases budget', () {
      final eng = CampaignBudgetReserveEngine()
        ..registerCampaign(campaignId: 'c1', totalBudget: 50);

      final r = eng.attemptReserve(
        campaignId: 'c1',
        rewardCandidateId: 'rc2',
        amount: 20,
        now: now,
      ) as ReserveAttemptOk;

      expect(r.value.book.reservedBudget, 20);
      final rel = eng.releaseReserveOnReject(
        valueLotId: r.value.valueLotId,
      ) as BudgetReserveMutationOk;
      expect(rel.book.reservedBudget, 0);
      expect(rel.book.availableBudget, 50);
      expect(rel.lot!.stage, BudgetReserveLotStage.released);
    });

    test('cannot spend without approval stage', () {
      final eng = CampaignBudgetReserveEngine()
        ..registerCampaign(campaignId: 'c1', totalBudget: 10);
      final r = eng.attemptReserve(
        campaignId: 'c1',
        rewardCandidateId: 'rc',
        amount: 5,
        now: now,
      ) as ReserveAttemptOk;
      final bad = eng.convertReserveToSpendOnValueClear(
        valueLotId: r.value.valueLotId,
      );
      expect(bad, isA<BudgetReserveMutationErr>());
      expect(
        (bad as BudgetReserveMutationErr).failure,
        BudgetReserveMutationFailure.invalidLotStage,
      );
    });

    test('overspend blocked: reserve sum cannot exceed available', () {
      final eng = CampaignBudgetReserveEngine()
        ..registerCampaign(campaignId: 'c1', totalBudget: 10);

      final first = eng.attemptReserve(
        campaignId: 'c1',
        rewardCandidateId: 'a',
        amount: 6,
        now: now,
      );
      expect(first, isA<ReserveAttemptOk>());

      final second = eng.attemptReserve(
        campaignId: 'c1',
        rewardCandidateId: 'b',
        amount: 5,
        now: now,
      );
      expect(second, isA<ReserveAttemptErr>());
      expect(
        (second as ReserveAttemptErr).failure.code,
        ReserveAttemptFailureCode.insufficientAvailableBudget,
      );

      expect(eng.bookFor('c1')!.reservedBudget, 6);
      expect(eng.bookFor('c1')!.availableBudget, 4);
    });

    test('refund moves amount from spent to refundedBudget', () {
      final eng = CampaignBudgetReserveEngine()
        ..registerCampaign(campaignId: 'c1', totalBudget: 100);
      final lotId = (eng.attemptReserve(
            campaignId: 'c1',
            rewardCandidateId: 'rc',
            amount: 40,
            now: now,
          ) as ReserveAttemptOk)
          .value
          .valueLotId;
      eng.approveRewardDecision(valueLotId: lotId);
      eng.convertReserveToSpendOnValueClear(valueLotId: lotId);
      expect(eng.bookFor('c1')!.spentBudget, 40);

      final ref = eng.recordRefundFromSpent(campaignId: 'c1', amount: 15)
          as BudgetReserveMutationOk;
      expect(ref.book.spentBudget, 25);
      expect(ref.book.refundedBudget, 15);
      expect(ref.book.availableBudget, 75);
    });

    test('refund cannot exceed spent', () {
      final eng = CampaignBudgetReserveEngine()
        ..registerCampaign(campaignId: 'c1', totalBudget: 10);
      expect(
        eng.recordRefundFromSpent(campaignId: 'c1', amount: 1),
        isA<BudgetReserveMutationErr>(),
      );
    });
  });
}
