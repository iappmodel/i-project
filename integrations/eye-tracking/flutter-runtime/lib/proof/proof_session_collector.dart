/// Rolling accumulators for proof packet fields during an earn session.
final class ProofSessionCollector {
  int _totalFrames = 0;
  int _validFrames = 0;
  int _foregroundSamples = 0;
  int _foregroundPresent = 0;
  double _fpsSum = 0;
  int _fpsSamples = 0;
  int _taps = 0;
  int _scrolls = 0;
  bool _playbackStarted = false;
  bool _playbackCompleted = false;
  bool _likelyFake = false;
  int? _firstInteractionMs;
  int? _lastInteractionMs;
  int _sessionStartMs = 0;

  final List<Map<String, dynamic>> _blinkEvents = [];
  final List<Map<String, dynamic>> _dwellEvents = [];
  final List<Map<String, dynamic>> _stableGazeWindows = [];

  int _lastBlinkMs = -1000;
  static const int _blinkDebounceMs = 250;

  void reset({required int sessionStartMs}) {
    _totalFrames = 0;
    _validFrames = 0;
    _foregroundSamples = 0;
    _foregroundPresent = 0;
    _fpsSum = 0;
    _fpsSamples = 0;
    _taps = 0;
    _scrolls = 0;
    _playbackStarted = false;
    _playbackCompleted = false;
    _likelyFake = false;
    _firstInteractionMs = null;
    _lastInteractionMs = null;
    _sessionStartMs = sessionStartMs;
    _blinkEvents.clear();
    _dwellEvents.clear();
    _stableGazeWindows.clear();
    _lastBlinkMs = -1000;
  }

  void onFrame({
    required int timestampMs,
    required bool validFrame,
    required bool foreground,
    required double processedFps,
    required bool blinkDetected,
    required bool likelyFake,
  }) {
    _totalFrames++;
    if (validFrame) _validFrames++;
    _foregroundSamples++;
    if (foreground) _foregroundPresent++;
    if (processedFps > 0) {
      _fpsSum += processedFps;
      _fpsSamples++;
    }
    _likelyFake = likelyFake;
    if (!_playbackStarted) _playbackStarted = true;

    if (blinkDetected && timestampMs - _lastBlinkMs >= _blinkDebounceMs) {
      _blinkEvents.add({'timestampMs': timestampMs, 'detected': true});
      _lastBlinkMs = timestampMs;
    }
  }

  void recordDwell({
    required String zone,
    required int startedAtMs,
    required int endedAtMs,
    required bool satisfied,
  }) {
    _dwellEvents.add({
      'zone': zone,
      'startedAtMs': startedAtMs,
      'endedAtMs': endedAtMs,
      'satisfied': satisfied,
    });
  }

  void recordStableGazeWindow({
    required int startedAtMs,
    required int endedAtMs,
    required String zone,
    required double confidence,
  }) {
    _stableGazeWindows.add({
      'startedAtMs': startedAtMs,
      'endedAtMs': endedAtMs,
      'zone': zone,
      'confidence': confidence,
    });
  }

  void onTap({required int timestampMs}) {
    _taps++;
    _recordInteraction(timestampMs);
  }

  void onScroll({required int timestampMs}) {
    _scrolls++;
    _recordInteraction(timestampMs);
  }

  void markPlaybackCompleted() {
    _playbackCompleted = true;
  }

  void _recordInteraction(int timestampMs) {
    final relative = timestampMs - _sessionStartMs;
    _firstInteractionMs ??= relative;
    _lastInteractionMs = relative;
  }

  double get facePresentRatio =>
      _totalFrames == 0 ? 0 : _validFrames / _totalFrames;

  double get invalidFrameRatio =>
      _totalFrames == 0 ? 1 : 1 - facePresentRatio;

  double get processedFpsAvg =>
      _fpsSamples == 0 ? 0 : _fpsSum / _fpsSamples;

  double get foregroundRatio => _foregroundSamples == 0
      ? 0
      : _foregroundPresent / _foregroundSamples;

  bool get likelyFake => _likelyFake;

  int get taps => _taps;

  int get scrolls => _scrolls;

  bool get playbackStarted => _playbackStarted;

  bool get playbackCompleted => _playbackCompleted;

  List<Map<String, dynamic>> get blinkEvents =>
      List.unmodifiable(_blinkEvents);

  List<Map<String, dynamic>> get dwellEvents =>
      List.unmodifiable(_dwellEvents);

  List<Map<String, dynamic>> get stableGazeWindows =>
      List.unmodifiable(_stableGazeWindows);

  int? get firstInteractionMs => _firstInteractionMs;

  int? get lastInteractionMs => _lastInteractionMs;

  int get totalFrames => _totalFrames;
}
