import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/core/events/campaign_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('CampaignEventWire names align with canonical campaign.* strings', () {
    expect(CampaignEventWire.created, CanonicalCampaignEventTypesV01.created);
    expect(CampaignEventWire.submittedForReview, CanonicalCampaignEventTypesV01.submittedForReview);
    expect(CampaignEventWire.approved, CanonicalCampaignEventTypesV01.approved);
    expect(CampaignEventWire.rejected, CanonicalCampaignEventTypesV01.rejected);
    expect(CampaignEventWire.activated, CanonicalCampaignEventTypesV01.activated);
    expect(CampaignEventWire.paused, CanonicalCampaignEventTypesV01.paused);
    expect(CampaignEventWire.completed, CanonicalCampaignEventTypesV01.completed);
    expect(CampaignEventWire.submittedForReview, 'campaign.submitted_for_review');
  });

  test('enum wire values match §8 payload unions', () {
    expect(CampaignOwnerType.localBusiness.wireValue, 'local_business');
    expect(CampaignOfferType.localOffer.wireValue, 'local_offer');
    expect(CampaignPausedBy.system.wireValue, 'system');
    expect(CampaignCompletedReason.budgetDepleted.wireValue, 'budget_depleted');
  });

  test('EventBus forwards campaign events', () async {
    final bus = EventBus();
    final seen = <CampaignEvent>[];
    final sub = bus.campaignEvents.listen(seen.add);

    bus.emit(
      const CampaignCreatedEvent(
        campaignId: 'c1',
        ownerId: 'o1',
        ownerType: CampaignOwnerType.brand,
        name: 'Summer',
        campaignType: CampaignOfferType.watch,
        totalBudget: 500,
        currency: WalletCurrency.usd,
      ),
    );
    bus.emit(
      const CampaignSubmittedForReviewEvent(campaignId: 'c1', submittedBy: 'o1'),
    );
    bus.emit(
      const CampaignApprovedEvent(
        campaignId: 'c1',
        approvedBy: 'admin-1',
        approvedAt: '2026-04-25T00:00:00.000Z',
      ),
    );
    bus.emit(
      const CampaignRejectedEvent(
        campaignId: 'c2',
        rejectedBy: 'admin-1',
        reason: 'policy',
      ),
    );
    bus.emit(
      const CampaignActivatedEvent(
        campaignId: 'c1',
        activatedAt: '2026-04-25T01:00:00.000Z',
      ),
    );
    bus.emit(
      const CampaignPausedEvent(
        campaignId: 'c1',
        pausedBy: CampaignPausedBy.owner,
        reason: 'hold spend',
      ),
    );
    bus.emit(
      const CampaignCompletedEvent(
        campaignId: 'c1',
        completedAt: '2026-04-26T00:00:00.000Z',
        reason: CampaignCompletedReason.budgetDepleted,
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(7));
    expect(seen.whereType<CampaignCreatedEvent>().single.totalBudget, 500);
    expect(seen.whereType<CampaignApprovedEvent>().single.approvedBy, 'admin-1');
    await sub.cancel();
  });
}
