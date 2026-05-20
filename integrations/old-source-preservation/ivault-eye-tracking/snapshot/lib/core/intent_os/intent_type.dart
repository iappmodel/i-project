/// High-level user intent inferred from gaze, dwell, blink, and voice signals.
enum IntentType {
  idle,
  fastInteract,
  hover,
  focus,
  dwellReady,
  select,
  confirm,
  cancel,
}
