import 'remote_types.dart';

/// Wire command type strings (canonical spec).
abstract final class RemoteCommandTypes {
  static const String goBack = 'GO_BACK';
  static const String goHome = 'GO_HOME';
  static const String goFeed = 'GO_FEED';
  static const String goEarn = 'GO_EARN';
  static const String goWallet = 'GO_WALLET';
  static const String goProfile = 'GO_PROFILE';
  static const String nextItem = 'NEXT_ITEM';
  static const String previousItem = 'PREVIOUS_ITEM';
  static const String openSheet = 'OPEN_SHEET';
  static const String closeSheet = 'CLOSE_SHEET';
  static const String toggleFullscreen = 'TOGGLE_FULLSCREEN';

  static const String likeContent = 'LIKE_CONTENT';
  static const String saveContent = 'SAVE_CONTENT';
  static const String commentContent = 'COMMENT_CONTENT';
  static const String shareContent = 'SHARE_CONTENT';
  static const String revealMetadata = 'REVEAL_METADATA';
  static const String hideMetadata = 'HIDE_METADATA';
  static const String muteContent = 'MUTE_CONTENT';
  static const String unmuteContent = 'UNMUTE_CONTENT';
  static const String reportContent = 'REPORT_CONTENT';

  static const String startWatch = 'START_WATCH';
  static const String startVerification = 'START_VERIFICATION';
  static const String releaseReward = 'RELEASE_REWARD';
  static const String openOffer = 'OPEN_OFFER';
  static const String acceptOffer = 'ACCEPT_OFFER';
  static const String declineOffer = 'DECLINE_OFFER';
  static const String viewRequirements = 'VIEW_REQUIREMENTS';

  static const String openWallet = 'OPEN_WALLET';
  static const String openPending = 'OPEN_PENDING';
  static const String convertCoins = 'CONVERT_COINS';
  static const String withdraw = 'WITHDRAW';
  static const String pay = 'PAY';
  static const String tip = 'TIP';
  static const String viewLimits = 'VIEW_LIMITS';
  static const String viewHistory = 'VIEW_HISTORY';

  static const String openStudio = 'OPEN_STUDIO';
  static const String playPreview = 'PLAY_PREVIEW';
  static const String pausePreview = 'PAUSE_PREVIEW';
  static const String undoEdit = 'UNDO_EDIT';
  static const String redoEdit = 'REDO_EDIT';
  static const String changeAspectRatio = 'CHANGE_ASPECT_RATIO';
  static const String exportMedia = 'EXPORT_MEDIA';
  static const String addText = 'ADD_TEXT';
  static const String addLayer = 'ADD_LAYER';
  static const String openCampaignBuilder = 'OPEN_CAMPAIGN_BUILDER';
  static const String publishCampaign = 'PUBLISH_CAMPAIGN';

  static const String openConnectors = 'OPEN_CONNECTORS';
  static const String connectPlatform = 'CONNECT_PLATFORM';
  static const String disconnectPlatform = 'DISCONNECT_PLATFORM';
  static const String syncPlatform = 'SYNC_PLATFORM';
  static const String viewImportedContent = 'VIEW_IMPORTED_CONTENT';

  static const String cancelAction = 'CANCEL_ACTION';
  static const String lockRemote = 'LOCK_REMOTE';
  static const String unlockRemote = 'UNLOCK_REMOTE';
  static const String emergencyStop = 'EMERGENCY_STOP';
  static const String requireConfirmation = 'REQUIRE_CONFIRMATION';
  static const String disableGazeControl = 'DISABLE_GAZE_CONTROL';
  static const String disableVoiceControl = 'DISABLE_VOICE_CONTROL';

  static const String openEarn = 'OPEN_EARN';
  static const String openCommandCenter = 'OPEN_COMMAND_CENTER';
  static const String openRemoteSettings = 'OPEN_REMOTE_SETTINGS';
}

/// Declarative metadata for building [RemoteCommand] instances.
final class RemoteCommandSpec {
  const RemoteCommandSpec({
    required this.type,
    required this.label,
    this.description,
    required this.riskLevel,
    this.requiresConfirmation = false,
    this.requiresBiometric = false,
    this.requiresKyc = false,
    this.requiresAdult = false,
    this.trustTierRequired,
  });

  final String type;
  final String label;
  final String? description;
  final RemoteRiskLevel riskLevel;
  final bool requiresConfirmation;
  final bool requiresBiometric;
  final bool requiresKyc;
  final bool requiresAdult;
  final int? trustTierRequired;

  RemoteCommand toCommand({
    required RemoteSurface surface,
    RemoteInputSource inputSource = RemoteInputSource.touch,
    Map<String, Object?>? payload,
  }) {
    final id = '${type}_${DateTime.now().microsecondsSinceEpoch}';
    return RemoteCommand(
      id: id,
      type: type,
      label: label,
      description: description,
      surface: surface,
      riskLevel: riskLevel,
      inputSource: inputSource,
      payload: payload,
      requiresConfirmation:
          requiresConfirmation || riskLevel == RemoteRiskLevel.medium,
      requiresBiometric: requiresBiometric,
      requiresKyc: requiresKyc,
      requiresAdult: requiresAdult,
      trustTierRequired: trustTierRequired,
    );
  }
}

/// Registry: canonical type → default policy metadata.
final Map<String, RemoteCommandSpec> kRemoteCommandRegistry = {
  RemoteCommandTypes.nextItem: const RemoteCommandSpec(
    type: RemoteCommandTypes.nextItem,
    label: 'Next',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.previousItem: const RemoteCommandSpec(
    type: RemoteCommandTypes.previousItem,
    label: 'Back',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.revealMetadata: const RemoteCommandSpec(
    type: RemoteCommandTypes.revealMetadata,
    label: 'Reveal',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.hideMetadata: const RemoteCommandSpec(
    type: RemoteCommandTypes.hideMetadata,
    label: 'Hide details',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.likeContent: const RemoteCommandSpec(
    type: RemoteCommandTypes.likeContent,
    label: 'Like',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.saveContent: const RemoteCommandSpec(
    type: RemoteCommandTypes.saveContent,
    label: 'Save',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.commentContent: const RemoteCommandSpec(
    type: RemoteCommandTypes.commentContent,
    label: 'Comment',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openWallet: const RemoteCommandSpec(
    type: RemoteCommandTypes.openWallet,
    label: 'Wallet',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openEarn: const RemoteCommandSpec(
    type: RemoteCommandTypes.openEarn,
    label: 'Earn',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.startWatch: const RemoteCommandSpec(
    type: RemoteCommandTypes.startWatch,
    label: 'Watch & Earn',
    riskLevel: RemoteRiskLevel.medium,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.openOffer: const RemoteCommandSpec(
    type: RemoteCommandTypes.openOffer,
    label: 'Open offer',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openConnectors: const RemoteCommandSpec(
    type: RemoteCommandTypes.openConnectors,
    label: 'Connectors',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.startVerification: const RemoteCommandSpec(
    type: RemoteCommandTypes.startVerification,
    label: 'Verify',
    riskLevel: RemoteRiskLevel.medium,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.releaseReward: const RemoteCommandSpec(
    type: RemoteCommandTypes.releaseReward,
    label: 'Release reward',
    riskLevel: RemoteRiskLevel.high,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.viewRequirements: const RemoteCommandSpec(
    type: RemoteCommandTypes.viewRequirements,
    label: 'Requirements',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.muteContent: const RemoteCommandSpec(
    type: RemoteCommandTypes.muteContent,
    label: 'Mute',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.cancelAction: const RemoteCommandSpec(
    type: RemoteCommandTypes.cancelAction,
    label: 'Cancel',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openPending: const RemoteCommandSpec(
    type: RemoteCommandTypes.openPending,
    label: 'Pending',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.convertCoins: const RemoteCommandSpec(
    type: RemoteCommandTypes.convertCoins,
    label: 'Convert',
    riskLevel: RemoteRiskLevel.medium,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.withdraw: const RemoteCommandSpec(
    type: RemoteCommandTypes.withdraw,
    label: 'Withdraw',
    riskLevel: RemoteRiskLevel.high,
    requiresConfirmation: true,
    requiresKyc: true,
    requiresBiometric: true,
  ),
  RemoteCommandTypes.pay: const RemoteCommandSpec(
    type: RemoteCommandTypes.pay,
    label: 'Pay',
    riskLevel: RemoteRiskLevel.high,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.tip: const RemoteCommandSpec(
    type: RemoteCommandTypes.tip,
    label: 'Tip',
    riskLevel: RemoteRiskLevel.medium,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.viewHistory: const RemoteCommandSpec(
    type: RemoteCommandTypes.viewHistory,
    label: 'History',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.viewLimits: const RemoteCommandSpec(
    type: RemoteCommandTypes.viewLimits,
    label: 'Limits',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.playPreview: const RemoteCommandSpec(
    type: RemoteCommandTypes.playPreview,
    label: 'Play',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.pausePreview: const RemoteCommandSpec(
    type: RemoteCommandTypes.pausePreview,
    label: 'Pause',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.undoEdit: const RemoteCommandSpec(
    type: RemoteCommandTypes.undoEdit,
    label: 'Undo',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.redoEdit: const RemoteCommandSpec(
    type: RemoteCommandTypes.redoEdit,
    label: 'Redo',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.changeAspectRatio: const RemoteCommandSpec(
    type: RemoteCommandTypes.changeAspectRatio,
    label: 'Aspect',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.exportMedia: const RemoteCommandSpec(
    type: RemoteCommandTypes.exportMedia,
    label: 'Export',
    riskLevel: RemoteRiskLevel.medium,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.openStudio: const RemoteCommandSpec(
    type: RemoteCommandTypes.openStudio,
    label: 'Studio',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openCampaignBuilder: const RemoteCommandSpec(
    type: RemoteCommandTypes.openCampaignBuilder,
    label: 'Campaigns',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.publishCampaign: const RemoteCommandSpec(
    type: RemoteCommandTypes.publishCampaign,
    label: 'Publish',
    riskLevel: RemoteRiskLevel.high,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.connectPlatform: const RemoteCommandSpec(
    type: RemoteCommandTypes.connectPlatform,
    label: 'Connect',
    riskLevel: RemoteRiskLevel.medium,
    requiresConfirmation: true,
    requiresAdult: true,
  ),
  RemoteCommandTypes.disconnectPlatform: const RemoteCommandSpec(
    type: RemoteCommandTypes.disconnectPlatform,
    label: 'Disconnect',
    riskLevel: RemoteRiskLevel.high,
    requiresConfirmation: true,
  ),
  RemoteCommandTypes.syncPlatform: const RemoteCommandSpec(
    type: RemoteCommandTypes.syncPlatform,
    label: 'Sync',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.viewImportedContent: const RemoteCommandSpec(
    type: RemoteCommandTypes.viewImportedContent,
    label: 'Imports',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.emergencyStop: const RemoteCommandSpec(
    type: RemoteCommandTypes.emergencyStop,
    label: 'Emergency stop',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.lockRemote: const RemoteCommandSpec(
    type: RemoteCommandTypes.lockRemote,
    label: 'Lock remote',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.unlockRemote: const RemoteCommandSpec(
    type: RemoteCommandTypes.unlockRemote,
    label: 'Unlock remote',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openCommandCenter: const RemoteCommandSpec(
    type: RemoteCommandTypes.openCommandCenter,
    label: 'Command center',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.openRemoteSettings: const RemoteCommandSpec(
    type: RemoteCommandTypes.openRemoteSettings,
    label: 'Remote settings',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.goWallet: const RemoteCommandSpec(
    type: RemoteCommandTypes.goWallet,
    label: 'Wallet',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.goEarn: const RemoteCommandSpec(
    type: RemoteCommandTypes.goEarn,
    label: 'Earn',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.goFeed: const RemoteCommandSpec(
    type: RemoteCommandTypes.goFeed,
    label: 'Feed',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.goHome: const RemoteCommandSpec(
    type: RemoteCommandTypes.goHome,
    label: 'Home',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.goBack: const RemoteCommandSpec(
    type: RemoteCommandTypes.goBack,
    label: 'Back',
    riskLevel: RemoteRiskLevel.low,
  ),
  RemoteCommandTypes.goProfile: const RemoteCommandSpec(
    type: RemoteCommandTypes.goProfile,
    label: 'Profile',
    riskLevel: RemoteRiskLevel.low,
  ),
};

/// Commands shown per surface (Level 1 manual remote MVP).
final Map<RemoteSurface, List<String>> kRemoteCommandsBySurface = {
  RemoteSurface.feed: [
    RemoteCommandTypes.previousItem,
    RemoteCommandTypes.nextItem,
    RemoteCommandTypes.revealMetadata,
    RemoteCommandTypes.hideMetadata,
    RemoteCommandTypes.likeContent,
    RemoteCommandTypes.saveContent,
    RemoteCommandTypes.openWallet,
    RemoteCommandTypes.openEarn,
    RemoteCommandTypes.startWatch,
  ],
  RemoteSurface.immersiveFeed: [
    RemoteCommandTypes.previousItem,
    RemoteCommandTypes.nextItem,
    RemoteCommandTypes.revealMetadata,
    RemoteCommandTypes.hideMetadata,
    RemoteCommandTypes.likeContent,
    RemoteCommandTypes.saveContent,
    RemoteCommandTypes.commentContent,
    RemoteCommandTypes.startWatch,
    RemoteCommandTypes.openOffer,
    RemoteCommandTypes.openConnectors,
    RemoteCommandTypes.openWallet,
  ],
  RemoteSurface.watch: [
    RemoteCommandTypes.cancelAction,
    RemoteCommandTypes.muteContent,
    RemoteCommandTypes.startVerification,
    RemoteCommandTypes.viewRequirements,
    RemoteCommandTypes.openWallet,
  ],
  RemoteSurface.verification: [
    RemoteCommandTypes.cancelAction,
    RemoteCommandTypes.releaseReward,
    RemoteCommandTypes.viewRequirements,
    RemoteCommandTypes.openWallet,
  ],
  RemoteSurface.wallet: [
    RemoteCommandTypes.openPending,
    RemoteCommandTypes.convertCoins,
    RemoteCommandTypes.withdraw,
    RemoteCommandTypes.pay,
    RemoteCommandTypes.tip,
    RemoteCommandTypes.viewHistory,
    RemoteCommandTypes.viewLimits,
  ],
  RemoteSurface.earn: [
    RemoteCommandTypes.openWallet,
    RemoteCommandTypes.startWatch,
    RemoteCommandTypes.openOffer,
  ],
  RemoteSurface.pending: [
    RemoteCommandTypes.openWallet,
    RemoteCommandTypes.viewHistory,
  ],
  RemoteSurface.pay: [
    RemoteCommandTypes.cancelAction,
    RemoteCommandTypes.pay,
    RemoteCommandTypes.openWallet,
  ],
  RemoteSurface.withdraw: [
    RemoteCommandTypes.cancelAction,
    RemoteCommandTypes.withdraw,
    RemoteCommandTypes.viewLimits,
  ],
  RemoteSurface.convert: [
    RemoteCommandTypes.cancelAction,
    RemoteCommandTypes.convertCoins,
    RemoteCommandTypes.openWallet,
  ],
  RemoteSurface.tip: [
    RemoteCommandTypes.cancelAction,
    RemoteCommandTypes.tip,
    RemoteCommandTypes.openWallet,
  ],
  RemoteSurface.studio: [
    RemoteCommandTypes.playPreview,
    RemoteCommandTypes.pausePreview,
    RemoteCommandTypes.undoEdit,
    RemoteCommandTypes.redoEdit,
    RemoteCommandTypes.changeAspectRatio,
    RemoteCommandTypes.exportMedia,
    RemoteCommandTypes.openCampaignBuilder,
  ],
  RemoteSurface.campaignBuilder: [
    RemoteCommandTypes.openStudio,
    RemoteCommandTypes.viewRequirements,
    RemoteCommandTypes.publishCampaign,
    RemoteCommandTypes.cancelAction,
  ],
  RemoteSurface.connectPlatforms: [
    RemoteCommandTypes.connectPlatform,
    RemoteCommandTypes.disconnectPlatform,
    RemoteCommandTypes.syncPlatform,
    RemoteCommandTypes.viewImportedContent,
  ],
  RemoteSurface.igo: [
    RemoteCommandTypes.nextItem,
    RemoteCommandTypes.openWallet,
    RemoteCommandTypes.openEarn,
  ],
  RemoteSurface.profile: [
    RemoteCommandTypes.goWallet,
    RemoteCommandTypes.openEarn,
  ],
  RemoteSurface.presenter: [
    RemoteCommandTypes.previousItem,
    RemoteCommandTypes.nextItem,
    RemoteCommandTypes.revealMetadata,
    RemoteCommandTypes.startWatch,
    RemoteCommandTypes.openWallet,
    RemoteCommandTypes.openEarn,
    RemoteCommandTypes.openCampaignBuilder,
    RemoteCommandTypes.openStudio,
    RemoteCommandTypes.closeSheet,
  ],
  RemoteSurface.unknown: [
    RemoteCommandTypes.openWallet,
    RemoteCommandTypes.openEarn,
    RemoteCommandTypes.openCommandCenter,
  ],
};

List<RemoteCommand> remoteCommandsForSurface(
  RemoteSurface surface, {
  RemoteInputSource inputSource = RemoteInputSource.touch,
}) {
  final types = kRemoteCommandsBySurface[surface] ??
      kRemoteCommandsBySurface[RemoteSurface.unknown]!;
  final out = <RemoteCommand>[];
  for (final t in types) {
    final spec = kRemoteCommandRegistry[t];
    if (spec != null) {
      out.add(spec.toCommand(surface: surface, inputSource: inputSource));
    }
  }
  return out;
}

RemoteCommand? commandFromType(
  String type,
  RemoteSurface surface, {
  RemoteInputSource inputSource = RemoteInputSource.touch,
}) {
  final spec = kRemoteCommandRegistry[type];
  return spec?.toCommand(surface: surface, inputSource: inputSource);
}
