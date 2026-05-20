import 'dart:async';

import 'events/blink_event.dart';
import 'events/gaze_event.dart';
import 'events/voice_event.dart';

/// Application-wide event bus (broadcast).
class EventBus {
  final StreamController<Object> _bus = StreamController<Object>.broadcast();

  Stream<GazeEvent> get gazeEvents =>
      _bus.stream.where((e) => e is GazeEvent).cast<GazeEvent>();

  Stream<BlinkEvent> get blinkEvents =>
      _bus.stream.where((e) => e is BlinkEvent).cast<BlinkEvent>();

  Stream<VoiceEvent> get voiceEvents =>
      _bus.stream.where((e) => e is VoiceEvent).cast<VoiceEvent>();

  /// All bus payloads ([GazeEvent], [BlinkEvent], [VoiceEvent]) for unified listeners.
  Stream<Object> get stream => _bus.stream;

  void emit(Object event) {
    if (event is! GazeEvent &&
        event is! BlinkEvent &&
        event is! VoiceEvent) {
      return;
    }
    if (!_bus.isClosed) {
      _bus.add(event);
    }
  }
}

/// Global hooks for cross-cutting concerns (logging, intent OS, analytics).
class System {
  System._();

  static final EventBus bus = EventBus();
}
