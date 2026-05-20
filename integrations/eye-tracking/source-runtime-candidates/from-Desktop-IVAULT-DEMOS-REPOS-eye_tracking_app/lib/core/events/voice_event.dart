/// Emitted when speech is recognized or programmatic voice text is applied for intent routing.
class VoiceEvent {
  const VoiceEvent({
    required this.text,
    required this.timestamp,
    this.confidence,
    this.finalResult = true,
  });

  /// Normalized transcript (typically lowercased).
  final String text;
  final int timestamp;
  final double? confidence;
  final bool finalResult;
}
