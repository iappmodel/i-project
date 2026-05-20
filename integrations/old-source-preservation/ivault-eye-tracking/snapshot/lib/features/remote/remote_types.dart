// Canonical iRemote / Remote Control Layer — wire-oriented types (Dart).

/// Active app surface for contextual commands.
enum RemoteSurface {
  feed,
  immersiveFeed,
  watch,
  verification,
  wallet,
  earn,
  pending,
  pay,
  withdraw,
  convert,
  tip,
  studio,
  campaignBuilder,
  connectPlatforms,
  igo,
  profile,
  presenter,
  unknown,
}

/// UI mode for the remote chrome.
enum RemoteMode {
  collapsed,
  quick,
  expanded,
  commandCenter,
  locked,
  disabled,
}

/// Who initiated the command (used for gaze/voice safety in full product).
enum RemoteInputSource {
  touch,
  keyboard,
  voice,
  gaze,
  gesture,
  controller,
  presenter,
  system,
}

/// Risk tier for policy + confirmation.
enum RemoteRiskLevel {
  low,
  medium,
  high,
  blocked,
}

/// Orb chrome (visual feedback only).
enum RemoteOrbVisualState {
  idle,
  earning,
  pending,
  danger,
  listening,
  verifying,
  locked,
  disabled,
}

/// Normalized anchor for the floating orb.
enum RemoteAnchor {
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  custom,
}

/// Persisted orb position (fractions of safe viewport, 0–1).
final class RemotePosition {
  const RemotePosition({
    required this.x,
    required this.y,
    this.anchor = RemoteAnchor.bottomRight,
  });

  final double x;
  final double y;
  final RemoteAnchor anchor;

  RemotePosition copyWith({double? x, double? y, RemoteAnchor? anchor}) {
    return RemotePosition(
      x: x ?? this.x,
      y: y ?? this.y,
      anchor: anchor ?? this.anchor,
    );
  }

  Map<String, Object?> toJson() => {
        'x': x,
        'y': y,
        'anchor': anchor.name,
      };

  static RemotePosition fromJson(Map<String, Object?> json) {
    final ax = json['x'];
    final ay = json['y'];
    final a = json['anchor'] as String?;
    return RemotePosition(
      x: (ax is num) ? ax.toDouble() : 0.88,
      y: (ay is num) ? ay.toDouble() : 0.78,
      anchor: RemoteAnchor.values.firstWhere(
        (e) => e.name == a,
        orElse: () => RemoteAnchor.bottomRight,
      ),
    );
  }
}

/// Snapshot of safety evaluation shown in UI.
final class RemoteSafetySnapshot {
  const RemoteSafetySnapshot({
    required this.riskLevel,
    required this.requiresConfirmation,
    this.reason,
  });

  final RemoteRiskLevel riskLevel;
  final bool requiresConfirmation;
  final String? reason;

  RemoteSafetySnapshot copyWith({
    RemoteRiskLevel? riskLevel,
    bool? requiresConfirmation,
    String? reason,
  }) {
    return RemoteSafetySnapshot(
      riskLevel: riskLevel ?? this.riskLevel,
      requiresConfirmation:
          requiresConfirmation ?? this.requiresConfirmation,
      reason: reason ?? this.reason,
    );
  }
}

/// Full remote UI + routing state (immutable updates via copyWith).
final class RemoteControlState {
  const RemoteControlState({
    this.mode = RemoteMode.collapsed,
    this.surface = RemoteSurface.unknown,
    this.inputSource = RemoteInputSource.touch,
    this.activeContentId,
    this.activeOfferId,
    this.activeCampaignId,
    this.activeWalletActionId,
    this.isDragging = false,
    this.isListening = false,
    this.isGazeEnabled = false,
    this.isVoiceEnabled = false,
    this.isLocked = false,
    this.lastCommandAt,
    this.lastCommand,
    this.position = const RemotePosition(x: 0.88, y: 0.78),
    this.safety = const RemoteSafetySnapshot(
      riskLevel: RemoteRiskLevel.low,
      requiresConfirmation: false,
    ),
    this.orbVisual = RemoteOrbVisualState.idle,
    this.reducedMotion = false,
    this.strictConfirmations = true,
  });

  final RemoteMode mode;
  final RemoteSurface surface;
  final RemoteInputSource inputSource;
  final String? activeContentId;
  final String? activeOfferId;
  final String? activeCampaignId;
  final String? activeWalletActionId;
  final bool isDragging;
  final bool isListening;
  final bool isGazeEnabled;
  final bool isVoiceEnabled;
  final bool isLocked;
  final DateTime? lastCommandAt;
  final String? lastCommand;
  final RemotePosition position;
  final RemoteSafetySnapshot safety;
  final RemoteOrbVisualState orbVisual;
  final bool reducedMotion;
  final bool strictConfirmations;

  RemoteControlState copyWith({
    RemoteMode? mode,
    RemoteSurface? surface,
    RemoteInputSource? inputSource,
    String? activeContentId,
    String? activeOfferId,
    String? activeCampaignId,
    String? activeWalletActionId,
    bool? isDragging,
    bool? isListening,
    bool? isGazeEnabled,
    bool? isVoiceEnabled,
    bool? isLocked,
    DateTime? lastCommandAt,
    String? lastCommand,
    RemotePosition? position,
    RemoteSafetySnapshot? safety,
    RemoteOrbVisualState? orbVisual,
    bool? reducedMotion,
    bool? strictConfirmations,
    bool clearActiveContentId = false,
    bool clearActiveOfferId = false,
    bool clearActiveCampaignId = false,
    bool clearActiveWalletActionId = false,
  }) {
    return RemoteControlState(
      mode: mode ?? this.mode,
      surface: surface ?? this.surface,
      inputSource: inputSource ?? this.inputSource,
      activeContentId:
          clearActiveContentId ? null : (activeContentId ?? this.activeContentId),
      activeOfferId:
          clearActiveOfferId ? null : (activeOfferId ?? this.activeOfferId),
      activeCampaignId: clearActiveCampaignId
          ? null
          : (activeCampaignId ?? this.activeCampaignId),
      activeWalletActionId: clearActiveWalletActionId
          ? null
          : (activeWalletActionId ?? this.activeWalletActionId),
      isDragging: isDragging ?? this.isDragging,
      isListening: isListening ?? this.isListening,
      isGazeEnabled: isGazeEnabled ?? this.isGazeEnabled,
      isVoiceEnabled: isVoiceEnabled ?? this.isVoiceEnabled,
      isLocked: isLocked ?? this.isLocked,
      lastCommandAt: lastCommandAt ?? this.lastCommandAt,
      lastCommand: lastCommand ?? this.lastCommand,
      position: position ?? this.position,
      safety: safety ?? this.safety,
      orbVisual: orbVisual ?? this.orbVisual,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      strictConfirmations:
          strictConfirmations ?? this.strictConfirmations,
    );
  }
}

/// Command envelope flowing through [routeRemoteCommand].
final class RemoteCommand {
  const RemoteCommand({
    required this.id,
    required this.type,
    required this.label,
    this.description,
    required this.surface,
    required this.riskLevel,
    this.inputSource = RemoteInputSource.touch,
    this.payload,
    this.requiresConfirmation = false,
    this.requiresBiometric = false,
    this.requiresKyc = false,
    this.requiresAdult = false,
    this.trustTierRequired,
    this.disabledReason,
  });

  final String id;
  final String type;
  final String label;
  final String? description;
  final RemoteSurface surface;
  final RemoteRiskLevel riskLevel;
  final RemoteInputSource inputSource;
  final Map<String, Object?>? payload;
  final bool requiresConfirmation;
  final bool requiresBiometric;
  final bool requiresKyc;
  final bool requiresAdult;
  final int? trustTierRequired;
  final String? disabledReason;

  RemoteCommand copyWith({
    RemoteInputSource? inputSource,
    bool? requiresConfirmation,
    String? disabledReason,
  }) {
    return RemoteCommand(
      id: id,
      type: type,
      label: label,
      description: description,
      surface: surface,
      riskLevel: riskLevel,
      inputSource: inputSource ?? this.inputSource,
      payload: payload,
      requiresConfirmation: requiresConfirmation ?? this.requiresConfirmation,
      requiresBiometric: requiresBiometric,
      requiresKyc: requiresKyc,
      requiresAdult: requiresAdult,
      trustTierRequired: trustTierRequired,
      disabledReason: disabledReason ?? this.disabledReason,
    );
  }
}

/// User-tunable preferences (MVP: in-memory + optional persistence hook).
final class RemotePreferences {
  const RemotePreferences({
    this.defaultPosition = const RemotePosition(x: 0.88, y: 0.78),
    this.size = RemoteSize.medium,
    this.opacity = 0.92,
    this.hapticsEnabled = true,
    this.voiceEnabled = false,
    this.gazeEnabled = false,
    this.reducedMotion = false,
    this.strictConfirmations = true,
    this.leftHanded = false,
    this.autoHide = false,
  });

  final RemotePosition defaultPosition;
  final RemoteSize size;
  final double opacity;
  final bool hapticsEnabled;
  final bool voiceEnabled;
  final bool gazeEnabled;
  final bool reducedMotion;
  final bool strictConfirmations;
  final bool leftHanded;
  final bool autoHide;

  RemotePreferences copyWith({
    RemotePosition? defaultPosition,
    RemoteSize? size,
    double? opacity,
    bool? hapticsEnabled,
    bool? voiceEnabled,
    bool? gazeEnabled,
    bool? reducedMotion,
    bool? strictConfirmations,
    bool? leftHanded,
    bool? autoHide,
  }) {
    return RemotePreferences(
      defaultPosition: defaultPosition ?? this.defaultPosition,
      size: size ?? this.size,
      opacity: opacity ?? this.opacity,
      hapticsEnabled: hapticsEnabled ?? this.hapticsEnabled,
      voiceEnabled: voiceEnabled ?? this.voiceEnabled,
      gazeEnabled: gazeEnabled ?? this.gazeEnabled,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      strictConfirmations: strictConfirmations ?? this.strictConfirmations,
      leftHanded: leftHanded ?? this.leftHanded,
      autoHide: autoHide ?? this.autoHide,
    );
  }
}

enum RemoteSize {
  small,
  medium,
  large,
}
