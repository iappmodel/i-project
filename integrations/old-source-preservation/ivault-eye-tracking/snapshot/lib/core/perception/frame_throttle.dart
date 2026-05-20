class FrameThrottle {
  bool _isProcessing = false;
  int _lastTimestamp = 0;

  bool shouldProcess(int timestamp) {
    // drop frames if still processing previous one
    if (_isProcessing) return false;

    // basic temporal spacing (avoid burst overload)
    if (timestamp - _lastTimestamp < 33) return false; // ~30 FPS cap

    _lastTimestamp = timestamp;
    _isProcessing = true;
    return true;
  }

  void release() {
    _isProcessing = false;
  }
}
