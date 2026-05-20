// Control-plane catalog §15 — admin.* payloads (mandatory for control actions).

import 'wallet_event.dart';

/// Stable wire names for admin domain events (analytics / projection / [EventBus]).
abstract final class AdminEventWire {
  static const campaignApproved = 'admin.campaign.approved';
  static const campaignPaused = 'admin.campaign.paused';
  static const rewardReversed = 'admin.reward.reversed';
  static const walletAdjustmentCreated = 'admin.wallet.adjustment.created';
  static const userRestricted = 'admin.user.restricted';
}

/// Wire: [AdminEventWire.userRestricted].
enum AdminUserRestrictionType {
  earning('earning'),
  withdrawal('withdrawal'),
  campaignAccess('campaign_access'),
  fullAccount('full_account');

  const AdminUserRestrictionType(this.wireValue);
  final String wireValue;
}

/// Wire: [AdminEventWire.walletAdjustmentCreated].
enum AdminWalletAdjustmentDirection {
  credit('credit'),
  debit('debit');

  const AdminWalletAdjustmentDirection(this.wireValue);
  final String wireValue;
}

/// Parses product / legacy currency strings to [WalletCurrency].
WalletCurrency adminWalletCurrencyFromWire(String raw) {
  final t = raw.trim().toLowerCase().replaceAll('_', '');
  switch (t) {
    case 'usd':
      return WalletCurrency.usd;
    case 'icoin':
    case 'icoins':
      return WalletCurrency.icoin;
    case 'vcoin':
    case 'vcoins':
      return WalletCurrency.vcoin;
    case 'rcoin':
    case 'rcoins':
      return WalletCurrency.rcoin;
    default:
      throw ArgumentError.value(raw, 'raw', 'Unknown admin wallet currency');
  }
}

/// Base type for admin control-plane events on [EventBus].
sealed class AdminEvent {
  const AdminEvent();
}

/// Wire: [AdminEventWire.campaignApproved]
final class AdminCampaignApprovedEvent extends AdminEvent {
  const AdminCampaignApprovedEvent({
    required this.adminId,
    required this.campaignId,
    required this.policyVersion,
    this.notes,
  });

  final String adminId;
  final String campaignId;
  final String policyVersion;
  final String? notes;
}

/// Wire: [AdminEventWire.campaignPaused]
final class AdminCampaignPausedEvent extends AdminEvent {
  const AdminCampaignPausedEvent({
    required this.adminId,
    required this.campaignId,
    required this.reason,
  });

  final String adminId;
  final String campaignId;
  final String reason;
}

/// Wire: [AdminEventWire.rewardReversed]
final class AdminRewardReversedEvent extends AdminEvent {
  const AdminRewardReversedEvent({
    required this.adminId,
    required this.userId,
    required this.rewardDecisionId,
    required this.valueLotId,
    required this.amount,
    required this.currency,
    required this.reason,
  });

  final String adminId;
  final String userId;
  final String rewardDecisionId;
  final String valueLotId;
  final double amount;
  final WalletCurrency currency;
  final String reason;
}

/// Wire: [AdminEventWire.walletAdjustmentCreated]
final class AdminWalletAdjustmentCreatedEvent extends AdminEvent {
  const AdminWalletAdjustmentCreatedEvent({
    required this.adminId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.direction,
    required this.reason,
    this.approvalTicketId,
  });

  final String adminId;
  final String userId;
  final double amount;
  final WalletCurrency currency;
  final AdminWalletAdjustmentDirection direction;
  final String reason;
  final String? approvalTicketId;
}

/// Wire: [AdminEventWire.userRestricted]
final class AdminUserRestrictedEvent extends AdminEvent {
  const AdminUserRestrictedEvent({
    required this.adminId,
    required this.userId,
    required this.restrictionType,
    required this.reason,
    this.expiresAt,
  });

  final String adminId;
  final String userId;
  final AdminUserRestrictionType restrictionType;
  final String reason;

  /// ISO-8601 end of restriction, if applicable.
  final String? expiresAt;
}
