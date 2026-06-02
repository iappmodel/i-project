import 'dart:typed_data';

/// Reusable dense Y8 buffer for vision channel payloads (Stage 7).
final class YPlaneBufferPool {
  Uint8List? _buffer;

  /// Returns a view into pooled storage (valid until next [pack] call).
  Uint8List acquire(int byteLength) {
    if (_buffer == null || _buffer!.length < byteLength) {
      _buffer = Uint8List(byteLength);
    }
    return Uint8List.view(_buffer!.buffer, _buffer!.offsetInBytes, byteLength);
  }

  void clear() => _buffer = null;
}
