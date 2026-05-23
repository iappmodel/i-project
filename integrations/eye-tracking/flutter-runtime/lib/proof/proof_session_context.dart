/// Session identity and campaign context for proof packet emission.
final class ProofSessionContext {
  ProofSessionContext._({
    required this.sessionId,
    required this.localUserRef,
    required this.offerId,
    required this.contentId,
    required this.deviceIdHash,
    required this.startedAt,
    required this.appVersion,
    required this.runtimeVersion,
  });

  final String sessionId;
  final String localUserRef;
  final String offerId;
  final String contentId;
  final String deviceIdHash;
  final DateTime startedAt;
  final String appVersion;
  final String runtimeVersion;

  /// Starts a new proof session with stable demo defaults for PP-000001.
  factory ProofSessionContext.start({
    String? sessionId,
    String localUserRef = 'demo-user-001',
    String offerId = 'nike-pegasus-41-watch',
    String contentId = 'feed-card-sponsored-12',
    String deviceIdHash = 'sha256:placeholder-device-hash',
    DateTime? startedAt,
    String appVersion = '1.0.0+1',
    String runtimeVersion = 'flutter-runtime@archive-promoted',
  }) {
    return ProofSessionContext._(
      sessionId: sessionId ?? 'sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d',
      localUserRef: localUserRef,
      offerId: offerId,
      contentId: contentId,
      deviceIdHash: deviceIdHash,
      startedAt: startedAt ?? DateTime.utc(2026, 5, 20, 18, 4, 12),
      appVersion: appVersion,
      runtimeVersion: runtimeVersion,
    );
  }
}
