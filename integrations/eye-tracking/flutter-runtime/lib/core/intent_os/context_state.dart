class ContextState {
  String mode = "idle"; // idle | command | navigation | control

  String? lastVoice;
  String? activeCommand;

  bool gazeLocked = false;

  void reset() {
    mode = "idle";
    lastVoice = null;
    activeCommand = null;
    gazeLocked = false;
  }
}
