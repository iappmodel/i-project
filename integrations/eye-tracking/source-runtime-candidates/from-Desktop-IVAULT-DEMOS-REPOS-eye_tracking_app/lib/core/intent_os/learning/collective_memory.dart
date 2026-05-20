class CollectiveMemory {
  final Map<String, double> longTermAttention = <String, double>{};

  void updateMemory(Map<String, double> field) {
    field.forEach((node, value) {
      longTermAttention[node] =
          (longTermAttention[node] ?? 0) * 0.95 + value * 0.05;
    });
  }
}
