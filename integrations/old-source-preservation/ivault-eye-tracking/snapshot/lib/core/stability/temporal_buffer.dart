class TemporalBuffer {
  final int size;
  final List<List<double>> buffer = [];

  TemporalBuffer({this.size = 5});

  List<double> smooth(List<double> input) {
    buffer.add(input);

    if (buffer.length > size) {
      buffer.removeAt(0);
    }

    final result = List<double>.filled(input.length, 0.0);

    for (final frame in buffer) {
      for (int i = 0; i < frame.length; i++) {
        result[i] += frame[i];
      }
    }

    for (int i = 0; i < result.length; i++) {
      result[i] /= buffer.length;
    }

    return result;
  }
}
