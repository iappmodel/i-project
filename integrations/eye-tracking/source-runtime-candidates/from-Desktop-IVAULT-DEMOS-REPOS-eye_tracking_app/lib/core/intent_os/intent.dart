import 'intent_type.dart';

class Intent {
  final IntentType type;
  final double confidence;
  final Map<String, dynamic> context;

  Intent(this.type, this.confidence, this.context);
}
