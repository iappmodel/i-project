import 'behavior_profile.dart';

/// Bounded buffers for gaze metrics: grows until [maxSamples], then compresses
/// by replacing the whole buffer with its mean (one value).
class MemoryCompressor {
  MemoryCompressor({this.maxSamples = 200});

  final int maxSamples;

  final List<double> _fixationSamples = [];
  final List<double> _dwellSamples = [];
  final List<double> _stabilitySamples = [];

  List<double> get fixationSamples => List.unmodifiable(_fixationSamples);
  List<double> get dwellSamples => List.unmodifiable(_dwellSamples);
  List<double> get stabilitySamples => List.unmodifiable(_stabilitySamples);

  void addFixation(double ms) {
    _fixationSamples.add(ms);
    if (_fixationSamples.length > maxSamples) _compressFixation();
  }

  void addDwell(double ms) {
    _dwellSamples.add(ms);
    if (_dwellSamples.length > maxSamples) _compressDwell();
  }

  void addStability(double value) {
    _stabilitySamples.add(value);
    if (_stabilitySamples.length > maxSamples) _compressStability();
  }

  BehaviorProfile buildProfile() {
    return BehaviorProfile(
      avgFixationMs: _fixationSamples.isEmpty
          ? 250
          : _fixationSamples.first,

      avgDwellMs: _dwellSamples.isEmpty
          ? 800
          : _dwellSamples.first,

      gazeStabilityIndex: _stabilitySamples.isEmpty
          ? 0.5
          : _stabilitySamples.first,
    );
  }

  void _compressFixation() {
    final avg = _fixationSamples.reduce((a, b) => a + b) /
        _fixationSamples.length;

    _fixationSamples
      ..clear()
      ..add(avg);
  }

  void _compressDwell() {
    final avg = _dwellSamples.reduce((a, b) => a + b) /
        _dwellSamples.length;

    _dwellSamples
      ..clear()
      ..add(avg);
  }

  void _compressStability() {
    final avg = _stabilitySamples.reduce((a, b) => a + b) /
        _stabilitySamples.length;

    _stabilitySamples
      ..clear()
      ..add(avg);
  }
}
