import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:pop_core/pop_core.dart';

/// HTTP client for the POP validator stub (`integrations/pop-core/validator`).
///
/// No-op when [baseUrl] is empty — local seal still works without backend.
final class ProofValidatorClient {
  ProofValidatorClient({String? baseUrl})
      : baseUrl = baseUrl ?? _baseUrlFromEnvironment();

  static const String _validatePath = '/v1/proof-packets/validate';

  /// Compile-time override: `--dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787`
  static String? _baseUrlFromEnvironment() {
    const raw = String.fromEnvironment('POP_VALIDATOR_URL');
    if (raw.isEmpty) return null;
    return raw;
  }

  final String? baseUrl;

  bool get isEnabled => baseUrl != null && baseUrl!.isNotEmpty;

  Future<ProofValidationResult?> submit({
    required ProofPacketV0 packet,
    String? artifactId,
    String mode = 'pending',
  }) async {
    if (!isEnabled) return null;

    final uri = Uri.parse('$baseUrl$_validatePath');
    final client = HttpClient();
    try {
      final request = await client.postUrl(uri);
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode({
          'packet': packet.toJson(),
          if (artifactId != null) 'artifactId': artifactId,
          'mode': mode,
        }),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          'POP validator HTTP ${response.statusCode}: $body',
          uri: uri,
        );
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      return ProofValidationResult.fromJson(decoded);
    } finally {
      client.close(force: true);
    }
  }
}

/// Parsed validator response (pending mode fields).
final class ProofValidationResult {
  const ProofValidationResult({
    required this.sessionId,
    required this.reviewStatus,
    required this.mode,
    this.holdAmount,
    this.holdStatus,
    this.holdOutcome,
  });

  factory ProofValidationResult.fromJson(Map<String, dynamic> json) {
    final hold = json['hold'] as Map<String, dynamic>?;
    return ProofValidationResult(
      sessionId: json['sessionId'] as String,
      reviewStatus: json['reviewStatus'] as String,
      mode: json['mode'] as String? ?? 'pending',
      holdAmount: hold?['amount'] as int?,
      holdStatus: hold?['status'] as String?,
      holdOutcome: json['holdOutcome'] as String?,
    );
  }

  final String sessionId;
  final String reviewStatus;
  final String mode;
  final int? holdAmount;
  final String? holdStatus;
  final String? holdOutcome;
}
