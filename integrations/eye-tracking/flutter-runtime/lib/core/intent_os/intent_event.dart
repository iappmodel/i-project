/// Kind of gaze / blink signal batch passed to [IntentEngine.process].
///
/// Callers supply [IntentEvent.fixation]; do not also branch on fixation before calling the engine.
enum IntentEventKind { dwellBlinkEdge, blinkCountSelect }

/// Frame-local signals for intent resolution (dwell + blink edge, or blink-count UX).
class IntentEvent {
  const IntentEvent.dwellBlinkEdge({
    required this.fixation,
    required this.wasBlinking,
    required this.isBlinking,
    required this.dwellSatisfiedForStint,
    required this.currentZone,
    required this.selectedAnnouncedForStint,
  })  : kind = IntentEventKind.dwellBlinkEdge,
        nextBlinkCount = 0,
        prevBlinkCount = 0,
        displaySelectedZone = '';

  const IntentEvent.blinkCountSelect({
    required this.fixation,
    required this.nextBlinkCount,
    required this.prevBlinkCount,
    required this.displaySelectedZone,
  })  : kind = IntentEventKind.blinkCountSelect,
        wasBlinking = false,
        isBlinking = false,
        dwellSatisfiedForStint = false,
        currentZone = null,
        selectedAnnouncedForStint = false;

  final IntentEventKind kind;
  final bool fixation;
  final bool wasBlinking;
  final bool isBlinking;
  final bool dwellSatisfiedForStint;
  final String? currentZone;
  final bool selectedAnnouncedForStint;
  final int nextBlinkCount;
  final int prevBlinkCount;
  final String displaySelectedZone;
}
