// Campaign lifecycle catalog §8 — campaign.* payloads (local types + bus).

import 'package:eye_tracking_app/canonical/build_spec_v01.dart';

import 'wallet_event.dart';

/// Stable wire names for campaign domain events (analytics / projection / [EventBus]).
abstract final class CampaignEventWire {
  static const created = CanonicalCampaignEventTypesV01.created;
  static const submittedForReview = CanonicalCampaignEventTypesV01.submittedForReview;
  static const approved = CanonicalCampaignEventTypesV01.approved;
  static const rejected = CanonicalCampaignEventTypesV01.rejected;
  static const activated = CanonicalCampaignEventTypesV01.activated;
  static const paused = CanonicalCampaignEventTypesV01.paused;
  static const completed = CanonicalCampaignEventTypesV01.completed;
}

/// Wire: [CampaignEventWire.created] — `ownerType`.
enum CampaignOwnerType {
  brand('brand'),
  creator('creator'),
  localBusiness('local_business'),
  platform('platform');

  const CampaignOwnerType(this.wireValue);
  final String wireValue;
}

/// Wire: [CampaignEventWire.created] — `campaignType`.
enum CampaignOfferType {
  watch('watch'),
  engage('engage'),
  visit('visit'),
  install('install'),
  survey('survey'),
  purchase('purchase'),
  localOffer('local_offer');

  const CampaignOfferType(this.wireValue);
  final String wireValue;
}

/// Wire: [CampaignEventWire.paused] — `pausedBy`.
enum CampaignPausedBy {
  owner('owner'),
  admin('admin'),
  system('system');

  const CampaignPausedBy(this.wireValue);
  final String wireValue;
}

/// Wire: [CampaignEventWire.completed] — completion `reason`.
enum CampaignCompletedReason {
  budgetDepleted('budget_depleted'),
  endDateReached('end_date_reached'),
  ownerCompleted('owner_completed'),
  adminCompleted('admin_completed');

  const CampaignCompletedReason(this.wireValue);
  final String wireValue;
}

/// Base type for campaign lifecycle events on [EventBus].
sealed class CampaignEvent {
  const CampaignEvent();
}

/// Wire: [CampaignEventWire.created]
final class CampaignCreatedEvent extends CampaignEvent {
  const CampaignCreatedEvent({
    required this.campaignId,
    required this.ownerId,
    required this.ownerType,
    required this.name,
    required this.campaignType,
    required this.totalBudget,
    required this.currency,
  });

  final String campaignId;
  final String ownerId;
  final CampaignOwnerType ownerType;
  final String name;
  final CampaignOfferType campaignType;
  final double totalBudget;
  final WalletCurrency currency;
}

/// Wire: [CampaignEventWire.submittedForReview]
final class CampaignSubmittedForReviewEvent extends CampaignEvent {
  const CampaignSubmittedForReviewEvent({
    required this.campaignId,
    required this.submittedBy,
  });

  final String campaignId;
  final String submittedBy;
}

/// Wire: [CampaignEventWire.approved]
final class CampaignApprovedEvent extends CampaignEvent {
  const CampaignApprovedEvent({
    required this.campaignId,
    required this.approvedBy,
    required this.approvedAt,
  });

  final String campaignId;
  final String approvedBy;

  /// ISO-8601 instant.
  final String approvedAt;
}

/// Wire: [CampaignEventWire.rejected]
final class CampaignRejectedEvent extends CampaignEvent {
  const CampaignRejectedEvent({
    required this.campaignId,
    required this.rejectedBy,
    required this.reason,
  });

  final String campaignId;
  final String rejectedBy;
  final String reason;
}

/// Wire: [CampaignEventWire.activated]
final class CampaignActivatedEvent extends CampaignEvent {
  const CampaignActivatedEvent({
    required this.campaignId,
    required this.activatedAt,
  });

  final String campaignId;

  /// ISO-8601 instant.
  final String activatedAt;
}

/// Wire: [CampaignEventWire.paused]
final class CampaignPausedEvent extends CampaignEvent {
  const CampaignPausedEvent({
    required this.campaignId,
    required this.pausedBy,
    required this.reason,
  });

  final String campaignId;
  final CampaignPausedBy pausedBy;
  final String reason;
}

/// Wire: [CampaignEventWire.completed]
final class CampaignCompletedEvent extends CampaignEvent {
  const CampaignCompletedEvent({
    required this.campaignId,
    required this.completedAt,
    required this.reason,
  });

  final String campaignId;

  /// ISO-8601 instant.
  final String completedAt;
  final CampaignCompletedReason reason;
}
