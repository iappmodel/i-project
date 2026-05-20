import 'dart:ui';

import 'voice_engine.dart';

class MultimodalCommandEngine {
  String? _lastVoice;
  String _mode = "idle";

  void setVoice(String text) {
    _lastVoice = text;

    if (text.contains("command")) {
      _mode = "command";
    }

    if (text.contains("exit")) {
      _mode = "idle";
    }
  }

  void process({
    required bool blink,
    required bool dwell,
    required String? context,
  }) {
    if (_mode != "command") return;

    // EXAMPLE: voice defines rule, gaze triggers execution
    if (_lastVoice != null && blink) {
      _execute("blink_action");
    }

    if (_lastVoice != null && dwell) {
      _execute("dwell_action");
    }
  }

  void _execute(String action) {
    // route to ControlPipeline / CommandEngine
  }
}

abstract class ControlPipeline {
  void process({
    required double stability,
    required bool blinkDetected,
    required Offset gaze,
  });
}

class MultimodalFrameProcessor {
  MultimodalFrameProcessor({
    required this.voiceEngine,
    required this.multimodalEngine,
    required this.controlPipeline,
  });

  final VoiceEngine voiceEngine;
  final MultimodalCommandEngine multimodalEngine;
  final ControlPipeline controlPipeline;

  void processFrame({
    required bool blink,
    required bool dwell,
    required Offset gaze,
    required double stability,
    required String? voice,
  }) {
    voiceEngine.setVoice(voice ?? "");

    multimodalEngine.process(
      blink: blink,
      dwell: dwell,
      context: voice,
    );

    controlPipeline.process(
      stability: stability,
      blinkDetected: blink,
      gaze: gaze,
    );
  }
}
