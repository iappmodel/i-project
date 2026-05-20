import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('main.dart does not contain legacy _executeAction entry point', () async {
    final main = File('lib/main.dart');
    expect(main.existsSync(), isTrue);
    final src = await main.readAsString();
    expect(
      RegExp(r'\b_executeAction\b').hasMatch(src),
      isFalse,
      reason: 'Autonomous side effects must go through AutonomousExecutionKernel + '
          '_applyAutonomousSideEffects only',
    );
    expect(
      RegExp(r'ActionExecutor\b').hasMatch(src),
      isFalse,
      reason: 'main.dart must not use ActionExecutor; use _executeAutonomousIntentChain instead',
    );
    expect(
      RegExp(r'kernelApproved').hasMatch(src),
      isFalse,
      reason: 'No ActionExecutor kernelApproved bypass in main.dart',
    );
    expect(
      src.contains('_cameFromKernel = true'),
      isTrue,
      reason: 'FIX 5: side effects must be wrapped so _applyAutonomousSideEffects sees kernel flag',
    );
    expect(
      src.contains('Unsafe execution path detected'),
      isTrue,
      reason: 'FIX 5: dev assert must guard _applyAutonomousSideEffects',
    );
  });
}
