import 'package:speech_to_text/speech_to_text.dart';

import '../events/voice_event.dart';
import '../system.dart';

/// When [bus] is [System.bus], STT and [setVoice] emit [VoiceEvent] so [IntentEngine] can resolve voice intents.
class VoiceEngine {
  VoiceEngine({EventBus? bus}) : _bus = bus;

  final SpeechToText _stt = SpeechToText();
  final EventBus? _bus;

  bool _isReady = false;
  bool _isListening = false;
  String _lastVoiceText = '';

  void _emitVoice(String text, {double? confidence, bool finalResult = true}) {
    final b = _bus;
    if (b == null || text.isEmpty) return;
    b.emit(
      VoiceEvent(
        text: text,
        timestamp: DateTime.now().millisecondsSinceEpoch,
        confidence: confidence,
        finalResult: finalResult,
      ),
    );
  }

  Future<void> init() async {
    _isReady = await _stt.initialize();
  }

  void startListening(Function(String text) onCommand) {
    if (!_isReady || _isListening) return;

    _isListening = true;

    _stt.listen(
      onResult: (result) {
        final text = result.recognizedWords.toLowerCase();
        onCommand(text);
        _emitVoice(
          text,
          confidence: result.confidence,
          finalResult: result.finalResult,
        );
      },
    );
  }

  void stop() {
    _stt.stop();
    _isListening = false;
  }

  void setVoice(String text) {
    _lastVoiceText = text.toLowerCase();
    _emitVoice(_lastVoiceText);
  }

  String get lastVoiceText => _lastVoiceText;
}
