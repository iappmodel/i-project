import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'proof_test_harness.dart';

void main() {
  test('writes PP-000001 golden fixture', () {
    final packet = ProofTestHarness.buildPp000001Packet();
    final fixture = File('../../pop-core/fixtures/PP-000001.json');
    fixture.parent.createSync(recursive: true);
    const encoder = JsonEncoder.withIndent('  ');
    fixture.writeAsStringSync('${encoder.convert(packet.toJson())}\n');
    expect(fixture.existsSync(), isTrue);
  });
}
