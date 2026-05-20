/// Blends **local** (user-specific) and **global** (population) values without ever
/// trusting either fully, unless [weight] is 0 or 1.
///
/// [weight] is the trust placed on **local**: at 0 the result is [global]; at 1, [local].
double merge(double local, double global, double weight) {
  final w = weight.clamp(0.0, 1.0);
  return local * w + global * (1.0 - w);
}

/// Dynamic trust: early in a session (few samples) → weight on local is low → trust **global**.
/// After ~200 samples, weight saturates at 1 → trust **local**.
double computeLocalWeight(int sessionSamples) {
  if (sessionSamples <= 0) return 0.0;
  return (sessionSamples / 200.0).clamp(0.0, 1.0);
}
