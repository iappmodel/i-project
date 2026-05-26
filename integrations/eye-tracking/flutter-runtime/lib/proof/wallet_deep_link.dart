/// Builds React wallet deep links after Flutter Seal Proof validates.
final class WalletDeepLink {
  WalletDeepLink._();

  /// `--dart-define=WALLET_APP_URL=http://10.0.2.2:5173` (emulator → host Vite)
  static String? baseUrlFromEnvironment() {
    const raw = String.fromEnvironment('WALLET_APP_URL');
    if (raw.isEmpty) return null;
    return raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
  }

  static String? build({required String sessionId, String? baseUrl}) {
    final base = baseUrl ?? baseUrlFromEnvironment();
    if (base == null || base.isEmpty) return null;
    final uri = Uri.parse(base).replace(
      queryParameters: {'proofSession': sessionId},
    );
    return uri.toString();
  }
}
