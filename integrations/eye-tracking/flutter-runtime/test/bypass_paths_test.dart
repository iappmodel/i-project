import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('main.dart routes zone select through PopActionExecutor', () async {
    final mainFile = File('lib/main.dart');
    expect(mainFile.existsSync(), isTrue);
    final src = await mainFile.readAsString();
    expect(src.contains('_requestZoneSelect'), isTrue);
    expect(src.contains('PopActionExecutor'), isTrue);
    expect(src.contains('_applyZoneSelectSideEffects'), isTrue);
    expect(
      RegExp(r'\bvoid _selectZone\b').hasMatch(src),
      isFalse,
      reason: 'Legacy _selectZone method must be replaced by gated paths',
    );
  });

  test('main.dart does not contain legacy _executeAction entry point', () async {
    final main = File('lib/main.dart');
    final src = await main.readAsString();
    expect(
      RegExp(r'\b_executeAction\b').hasMatch(src),
      isFalse,
    );
    expect(
      RegExp(r'(?<!Pop)(?<!AutonomousExecution)\bActionExecutor\b').hasMatch(src),
      isFalse,
      reason: 'Use PopActionExecutor / AutonomousExecutionKernel only',
    );
    expect(src.contains('_cameFromKernel = true'), isTrue);
    expect(src.contains('Unsafe execution path detected'), isTrue);
  });
}
