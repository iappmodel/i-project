import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('main runtime does not depend on duplicate signal authority', () async {
    final main = File('lib/main.dart');
    final source = await main.readAsString();

    expect(source.contains('gaze_filter.dart'), isFalse);
    expect(source.contains('_gazeFilter'), isFalse);
    expect(source.contains('gaze_processing_pipeline.dart'), isFalse);
    expect(source.contains('GazeProcessingPipeline'), isFalse);
  });
}
