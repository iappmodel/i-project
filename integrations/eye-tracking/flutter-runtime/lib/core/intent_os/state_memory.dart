/// Rolling gaze, fixation, dwell, and blink-edge fields for intent routing.
final class StateMemory {
  double? lastX;
  double? lastY;

  int fixationStartMs = 0;
  int lastBlinkMs = 0;

  bool inDwell = false;
}
