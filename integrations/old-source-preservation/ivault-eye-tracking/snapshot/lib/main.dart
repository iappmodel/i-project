import 'dart:async';
import 'dart:math';

import 'features/remote/remote_controller.dart';
import 'features/remote/remote_scope.dart';
import 'features/remote/remote_shell.dart';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

import 'blink_detector.dart';
import 'attention_kernel.dart';
import 'ear_calibration.dart';
import 'ear_normalize.dart';
import 'gaze_buffer.dart';
import 'gaze_fixation.dart';
import 'gaze_normalize.dart';
import 'core/events/blink_event.dart';
import 'core/events/gaze_event.dart';
import 'core/events/interaction_frame.dart';
import 'core/events/predicted_intent.dart';
import 'core/events/temporal_predictor.dart';
import 'core/events/ui_preloader.dart' as predictive_preloader;
import 'core/pointer_controller.dart';
import 'core/system.dart';
import 'core/ui_sandbox.dart';
import 'engine/gaze_pipeline.dart';
import 'gaze_zone.dart';
import 'gaze_zone_buttons.dart';
import 'dwell_engine.dart';
import 'intent_influence_ui.dart';
import 'trajectory_buffer.dart';
import 'ui_preloader.dart';
import 'core/intent_os/action_request.dart';
import 'core/intent_os/autonomous_execution_kernel.dart';
import 'core/intent_os/autonomous_agent.dart';
import 'core/intent_os/intent_action.dart';
import 'core/intent_os/intent_engine.dart';
import 'core/intent_os/intent_influence_pipeline.dart';
import 'core/intent_os/intent_predictor.dart';
import 'core/intent_os/intent_type.dart';
import 'core/intent_os/learning/digital_twin_engine.dart';
import 'core/intent_os/learning/evolution_intent_bridge.dart';
import 'core/intent_os/learning/learning_store.dart';
import 'core/intent_os/learning/ui_evolution_engine.dart';
import 'core/intent_os/ui_action_type.dart';
import 'core/stability/tracking_engine.dart';
import 'core/stability/tracking_state.dart';
import 'head_confidence.dart';
import 'head_pitch_zone.dart';
import 'user_engagement_state.dart';
import 'debug_state.dart';
import 'admin/admin_console_engine.dart';
import 'canonical/canonical.dart';
import 'economy/post_attention_spine.dart';
import 'features/admin/admin_console_screen.dart';
import 'features/debug/confidence_hud.dart';
import 'features/economy/wallet_ledger_strip.dart';
import 'features/vision/frame_codec.dart';
import 'policy_version.dart';
import 'reward_engine.dart';
import 'reward_issuance_engine.dart';
import 'wallet_ledger_engine.dart';

/// Native 0–100 [nativeAttention] plus a small bonus when [fatigueLevel] is low (EAR fatigue).
int attentionWithFatigueBonus({
  required int nativeAttention,
  required double? fatigueLevel,
}) {
  var v = nativeAttention.toDouble();
  if (fatigueLevel != null && fatigueLevel < 0.05) {
    v += 0.1;
  }
  final r = v.round();
  if (r < 0) return 0;
  if (r > 100) return 100;
  return r;
}

String _predictionActionType(UIActionType type) {
  switch (type) {
    case UIActionType.tap:
      return 'tap';
    case UIActionType.longPress:
      return 'longPress';
    case UIActionType.scroll:
      return 'scroll';
    case UIActionType.openZone:
      return 'open';
    case UIActionType.closeZone:
      return 'close';
    case UIActionType.highlight:
      return 'highlight';
    case UIActionType.preload:
      return 'preload';
  }
}

bool matchesPrediction(IntentAction action, List<PredictedIntent> predictions) {
  final actionType = _predictionActionType(action.type);
  return predictions.any((prediction) {
    return prediction.actionType == actionType &&
        prediction.targetZone == action.targetZone &&
        prediction.probability > 0.6;
  });
}

/// Parsed Android [VisionProcessor.process] map for one frame.
final class _VisionFrame {
  const _VisionFrame({
    required this.leftEar,
    required this.rightEar,
    required this.gazeX,
    required this.gazeY,
    required this.headYawRaw,
    required this.headYaw,
    required this.headPitch,
    required this.headStable,
    required this.landmarks,
    required this.leftEye,
    required this.rightEye,
    required this.hasFace,
    required this.attentionScore,
    required this.likelyFake,
    required this.fakeStaticGaze,
    required this.fakePerfectStability,
    required this.fakeNoBlink,
    required this.faceConfidence,
    this.nativeDecodeMs,
    this.nativeProcessMs,
    this.nativeTotalMs,
  });

  final double? leftEar;
  final double? rightEar;
  final double? gazeX;
  final num? gazeY;
  final double? headYawRaw;
  final double? headYaw;
  final double? headPitch;
  final bool? headStable;
  final List<dynamic> landmarks;
  final List<dynamic> leftEye;
  final List<dynamic> rightEye;
  final bool hasFace;

  /// Android [VisionProcessor] 0–100; may be combined with Flutter-side fatigue in [attentionWithFatigueBonus].
  final int attentionScore;

  /// Android anti-spoof heuristics (frozen / unnaturally still / no blinks).
  final bool likelyFake;
  final bool fakeStaticGaze;
  final bool fakePerfectStability;
  final bool fakeNoBlink;

  /// Android segmentation: fraction of category-mask pixels for person (`1`); `0.0` if missing or invalid.
  /// Raw `-1` (no mask) is clamped to `0.0` when parsing.
  final double faceConfidence;
  final double? nativeDecodeMs;
  final double? nativeProcessMs;
  final double? nativeTotalMs;

  factory _VisionFrame.fromMap(Map<dynamic, dynamic> raw) {
    final leftEar = (raw['leftEAR'] as num?)?.toDouble();
    final rightEar = (raw['rightEAR'] as num?)?.toDouble();
    final gazeX = (raw['gazeX'] as num?)?.toDouble();
    final gazeY = raw['gazeY'];
    final headYawRaw = (raw['headYawRaw'] as num?)?.toDouble();
    final headYaw = (raw['headYaw'] as num?)?.toDouble();
    final headPitch = (raw['headPitch'] as num?)?.toDouble();
    final headStable = raw['headStable'] as bool?;
    final landmarks = raw['landmarks'];
    final allLandmarks = landmarks is List ? landmarks : <dynamic>[];
    final leftEyeRaw = raw['leftEye'];
    final rightEyeRaw = raw['rightEye'];
    final leftEye = leftEyeRaw is List ? leftEyeRaw : <dynamic>[];
    final rightEye = rightEyeRaw is List ? rightEyeRaw : <dynamic>[];
    final hasFace = landmarks is List && landmarks.isNotEmpty;
    final attentionScore = (raw['attentionScore'] as num?)?.toInt() ?? 0;
    final likelyFake = raw['likelyFake'] == true;
    final fakeStaticGaze = raw['fakeStaticGaze'] == true;
    final fakePerfectStability = raw['fakePerfectStability'] == true;
    final fakeNoBlink = raw['fakeNoBlink'] == true;
    final rawFaceConfidence =
        (raw['faceConfidence'] as num?)?.toDouble() ?? 0.0;
    final safeConfidence =
        rawFaceConfidence < 0 ? 0.0 : rawFaceConfidence;
    final nativeDecodeMs = (raw['nativeDecodeMs'] as num?)?.toDouble();
    final nativeProcessMs = (raw['nativeProcessMs'] as num?)?.toDouble();
    final nativeTotalMs = (raw['nativeTotalMs'] as num?)?.toDouble();
    return _VisionFrame(
      leftEar: leftEar,
      rightEar: rightEar,
      gazeX: gazeX,
      gazeY: gazeY,
      headYawRaw: headYawRaw,
      headYaw: headYaw,
      headPitch: headPitch,
      headStable: headStable,
      landmarks: allLandmarks,
      leftEye: leftEye,
      rightEye: rightEye,
      hasFace: hasFace,
      attentionScore: attentionScore,
      likelyFake: likelyFake,
      fakeStaticGaze: fakeStaticGaze,
      fakePerfectStability: fakePerfectStability,
      fakeNoBlink: fakeNoBlink,
      faceConfidence: safeConfidence,
      nativeDecodeMs: nativeDecodeMs,
      nativeProcessMs: nativeProcessMs,
      nativeTotalMs: nativeTotalMs,
    );
  }
}

final class _FramePerfMetrics {
  int windowStartMs = 0;
  int cameraInputCount = 0;
  int processedCount = 0;
  int droppedThrottle = 0;
  int droppedBusy = 0;
  /// Hard no-face / hold expired (`!isValidFrame` in [_updateFrame]).
  int droppedInvalidNoFace = 0;
  /// Face held but gaze X/Y null or non-finite after drift adjustment.
  int droppedInvalidGaze = 0;

  double encodeTotalMs = 0;
  int encodeSamples = 0;
  double channelTotalMs = 0;
  int channelSamples = 0;
  double postprocessTotalMs = 0;
  int postprocessSamples = 0;

  double lastNativeDecodeMs = 0;
  double lastNativeProcessMs = 0;
  double lastNativeTotalMs = 0;

  void resetWindow(int nowMs) {
    windowStartMs = nowMs;
    cameraInputCount = 0;
    processedCount = 0;
    droppedThrottle = 0;
    droppedBusy = 0;
    droppedInvalidNoFace = 0;
    droppedInvalidGaze = 0;
    encodeTotalMs = 0;
    encodeSamples = 0;
    channelTotalMs = 0;
    channelSamples = 0;
    postprocessTotalMs = 0;
    postprocessSamples = 0;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const EyeTrackingApp());
}

/// Root widget: owns portrait + system UI chrome for the camera session.
final class EyeTrackingApp extends StatefulWidget {
  const EyeTrackingApp({super.key});

  @override
  State<EyeTrackingApp> createState() => _EyeTrackingAppState();
}

final class _EyeTrackingAppState extends State<EyeTrackingApp> {
  late final RemoteController _remote = RemoteController();

  @override
  void initState() {
    super.initState();
    unawaited(_remote.loadPersistedPosition());
  }

  @override
  void dispose() {
    _remote.dispose();
    unawaited(SystemChrome.setPreferredOrientations(DeviceOrientation.values));
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RemoteControlScope(
      controller: _remote,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        home: RemoteShell(
          controller: _remote,
          child: const _FrontCameraScreen(),
        ),
      ),
    );
  }
}

final class _FrontCameraScreen extends StatefulWidget {
  const _FrontCameraScreen();

  @override
  State<_FrontCameraScreen> createState() => _FrontCameraScreenState();
}

final class _FrontCameraScreenState extends State<_FrontCameraScreen> {
  /// Single future so [FutureBuilder] does not re-run initialization on rebuilds.
  late final Future<CameraController> _session = _openFrontCamera();

  static Future<CameraController> _openFrontCamera() async {
    final permission = await Permission.camera.request();
    if (!permission.isGranted) {
      throw StateError('Camera permission denied.');
    }

    final cameras = await availableCameras();
    final fronts = cameras
        .where((c) => c.lensDirection == CameraLensDirection.front)
        .toList();
    if (fronts.isEmpty) {
      throw StateError('No front camera available.');
    }
    final front = fronts.first;

    final controller = CameraController(
      front,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );
    await controller.initialize();
    try {
      await controller.setFlashMode(FlashMode.torch);
    } on CameraException catch (e) {
      debugPrint('setFlashMode(torch): $e');
      try {
        await controller.setFlashMode(FlashMode.always);
      } on CameraException catch (e2) {
        debugPrint('setFlashMode(always): $e2');
      }
    }
    return controller;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<CameraController>(
      future: _session,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return ColoredBox(
            color: Colors.black,
            child: Center(
              child: Text(
                snapshot.error.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const ColoredBox(color: Colors.black);
        }
        return _FullScreenPreview(controller: snapshot.data!);
      },
    );
  }
}

/// First-frame preview scale; [AnimatedScale] runs to 1.0 on the next frame.
const double _kPreviewScaleRevealStart = 0.94;
const bool _kVerbosePerFrameLogs = false;

/// RGB ×1.1 (~+10% linear brightness) on the live preview only (not vision JPEG bytes).
const ColorFilter _kPreviewBrightnessBoost = ColorFilter.matrix(<double>[
  1.1, 0, 0, 0, 0,
  0, 1.1, 0, 0, 0,
  0, 0, 1.1, 0, 0,
  0, 0, 0, 1, 0,
]);

/// Full-screen preview + image stream (Android / iOS only; camera plugin asserts elsewhere).
final class _FullScreenPreview extends StatefulWidget {
  const _FullScreenPreview({required this.controller});

  final CameraController controller;

  @override
  State<_FullScreenPreview> createState() => _FullScreenPreviewState();
}

enum CalibrationPhase {
  idle,
  samplingLeft,
  samplingRight,
  samplingNeutralYaw,
  samplingOpenEar,
  ready,
}

final class _FullScreenPreviewState extends State<_FullScreenPreview> {
  static const MethodChannel _visionChannel = MethodChannel('vision_channel');
  static const int _kFrameSpacingMs = 80;
  static const double _kThirdConfidenceGate = 0.6;
  static const String _calibrateHeadPoseMethod = 'calibrateHeadPose';

  /// Demo spine: Rule 2 wallet + post-attention issuance (no external backend).
  static const String _kEconomyDemoUserId = 'demo-user';
  static const String _kEconomyDemoCampaignId = 'demo-campaign';
  static const String _kEconomyDemoWalletId = 'demo-wallet';
  static const int _kEconomyEventLogCap = 64;

  /// When true, a frame handler is running; skip new frames (no overlap / backpressure).
  bool _processingFrame = false;

  final BlinkDetector _blinkDetector = BlinkDetector();

  /// Zone commits on dwell/blink: use [_intentEngine.process] only — do not add new
  /// `if (_fixationState == FixationState.fixation) { _selectZone(...); }` paths in this widget.
  late final IntentEngine _intentEngine;

  late final GazeCollectiveIntentPredictor _intentPredictor;
  final AutonomousAgent _autonomousAgent = const AutonomousAgent();
  /// Single autonomous execution boundary (prefilter + governance + safety + optional kill switch).
  final AutonomousExecutionKernel _autonomousExecution = AutonomousExecutionKernel();
  AutonomousActionGateResult? _debugLastAutonomousGateResult;
  String? _debugLastAutonomousBlockedGate;

  /// Last successful autonomous commit (ms since epoch) for [ActionContext.timeSinceLastActionMs].
  int? _lastAutonomousCommitMs;

  /// Recent autonomous commit timestamps for [ActionContext.recentActionsLast1s] burst cap.
  final List<int> _autonomousCommitMsWindow = <int>[];

  /// Autonomous [UIAction] awaiting second-blink confirm; cleared on execute, cancel blink, or timeout.
  ActionRequest? _pendingAutonomousConfirm;
  Timer? _autonomousConfirmTimer;

  final IntentInfluenceEngine _influenceEngine = IntentInfluenceEngine();

  /// Latest presentation influence from [_intentPredictor] → [_influenceEngine];
  /// does not affect dwell/select logic. UI may listen for hitbox / opacity / magnetism.
  final ValueNotifier<IntentInfluence?> _influenceNotifier =
      ValueNotifier<IntentInfluence?>(null);
  IntentInfluence? _latestInfluence;

  final EvolutionSignalBuffer _evolutionSignalBuffer = EvolutionSignalBuffer();
  final UIEvolutionEngine _uiEvolutionEngine = UIEvolutionEngine();

  /// Presentation-only: [IntentInfluence] weight smoothed by ×0.9 each frame, then merged with max(fresh).
  double _influenceWeightDisplay = 0.0;
  String? _influenceZoneDisplay;

  int get _dwellProgressMs =>
      ((_dwellEngine.state?.durationMs ?? 0).round()).clamp(0, 0x7fffffff);

  /// Kernel [KernelEvaluationInput.autonomyLevel]: \([0,1]\) from [BehaviorProfile.userTrustScore].
  // ignore: unused_element
  double get _autonomyLevel =>
      _intentEngine.learningStore.behavior.userTrustScore;

  /// `UP` / `DOWN` from [getHeadPitchBand]; `null` when pitch is mid or unavailable.
  String? _headPitchBand;

  /// Discrete gaze band after [updateZone] stability + dwell; `null` when raw gaze unavailable.
  String? _currentZone;
  /// True once gaze has stayed in `_currentZone` longer than [DwellEngine.thresholdMs] this stint.
  bool _dwellSatisfiedForStint = false;
  /// 0–1 while dwelling in the current zone; reaches 1 when [_dwellSatisfiedForStint].
  double _dwellProgress = 0;
  /// True after [_selectZone] (dwell satisfied + first blink), until zone changes or cancel/confirm.
  bool _selectedAnnouncedForStint = false;

  /// Last zone locked by dwell; cleared when gaze band changes or blink confirm/cancel.
  String _displaySelectedZone = '';
  int _lastFrameMs = 0;
  int _lastLogTime = 0;
  int _lastPerfSummaryMs = 0;
  int _lastInvalidFrameDebugMs = 0;
  int _lastVerboseFrameLogMs = 0;
  final _FramePerfMetrics _framePerf = _FramePerfMetrics();

  /// Reuse last good native frame for this long when detection drops (reduces flicker).
  static const int _faceHoldMs = 500;

  int _lastFaceSeenMs = 0;

  /// True while a live or held-within-[_faceHoldMs] face is driving the pipeline (for UI / future use).
  // ignore: unused_field
  bool _faceLocked = false;

  _VisionFrame? _lastHeldFace;

  bool get hasActiveFace =>
      _lastHeldFace != null &&
      (DateTime.now().millisecondsSinceEpoch - _lastFaceSeenMs) < _faceHoldMs;

  /// Live layout size from [build]; used to map gaze → screen pixels for the pointer dot.
  Size? _viewSize;

  /// [MediaQuery.paddingOf(context).top] from last [build]; used for zone strip Y in magnetism.
  double _overlaySafeTop = 0;

  final ValueNotifier<Offset> _pointerNotifier =
      ValueNotifier<Offset>(const Offset(200, 400));

  final PointerController _pointerController = PointerController();
  late final AttentionKernel _attentionKernel;

  final ValueNotifier<DebugState> _debugNotifier = ValueNotifier<DebugState>(
    const DebugState(
      motion: EyeMotionState.noFace,
      zone: 'CENTER',
      selected: '',
    ),
  );
  final ValueNotifier<int> _blinkCountNotifier = ValueNotifier<int>(0);
  final Random _explorationRand = Random();
  static const List<String> _zoneLabels = <String>['LEFT', 'CENTER', 'RIGHT'];
  String? _focusLockedZone;
  bool _isExplorationMode = false;
  Map<String, Offset> _zoneOffsets = const <String, Offset>{};
  Map<String, double> _zoneOpacity = const <String, double>{};

  EyeMotionState _eyeMotionFromGaze({
    required bool validGaze,
    required bool blinking,
  }) {
    if (!validGaze) return EyeMotionState.noFace;
    if (blinking) return EyeMotionState.blink;
    switch (_fixationState) {
      case FixationState.fixation:
        return EyeMotionState.fixation;
      case FixationState.saccade:
        return EyeMotionState.saccade;
      case FixationState.unstable:
        return EyeMotionState.saccade;
    }
  }

  double smoothGazeX = 0;
  double smoothGazeY = 0;
  final GazePipeline _pipeline = GazePipeline();
  final UISandbox _sandbox = UISandbox();
  final DigitalTwinEngine _digitalTwinEngine = DigitalTwinEngine();
  final TrajectoryBuffer trajectoryBuffer = TrajectoryBuffer();
  late final UIPreloader uiPreloader;
  final TemporalPredictor _predictor = TemporalPredictor();
  final predictive_preloader.UIPreloader _preloader =
      predictive_preloader.UIPreloader();
  int _lastPreloadMs = 0;
  static const int preloadCooldownMs = 100;
  final GazeFixation _gazeFixation = GazeFixation();
  final TrackingEngine _trackingEngine = TrackingEngine();
  final DwellEngine _dwellEngine = DwellEngine();
  int? _lastDwellTickMs;

  bool get _isTrackingState =>
      _trackingEngine.state == TrackingState.tracking;

  /// Same trace buffer the pipeline writes to; used for [GazeFixation.update].
  GazeBuffer get _gazeTraceBuffer => _pipeline.buffer;

  FixationState _fixationState = FixationState.unstable;
  final double _baselineX = 0.09;
  final double _baselineY = 0.0;

  /// Last values from [BlinkDetector.updateEar] for overlay / logging.
  bool _isBlinking = false;
  int _blinkCount = 0;

  /// Last completed blink: `leftDrop = leftOpenEAR − minLeft`, `rightDrop = rightOpenEAR − minRight`;
  /// `isRightDominant = rightDrop > leftDrop` ([BlinkDetector.updateEar] after reopen).
  bool? _blinkIsRightDominant;
  double? _blinkLeftDrop;
  double? _blinkRightDrop;

  /// Measured raw [gazeX] while user looks **left** / **right** (see [normalizeGazeX]).
  double? _gazeMeasuredLeft;
  double? _gazeMeasuredRight;

  /// Frames with valid gaze this session; drives [effectiveGazeCalibrationBounds] (reset on hard face loss).
  int _gazeSessionSamples = 0;

  /// Raw head yaw from native (`headYawRaw`) when user captured neutral (same instant as Android neutral).
  double? _neutralHeadYaw;

  bool _pendingCaptureLeft = false;
  bool _pendingCaptureRight = false;
  bool _pendingCaptureNeutralYaw = false;

  final OpenEarCalibrator _openEarCalibrator = OpenEarCalibrator();
  bool _openEarCalibrating = false;
  CalibrationPhase _calibrationPhase = CalibrationPhase.idle;

  /// Last Android `processFrame` threw; cleared on next successful native call.

  /// Average left / right EAR while eyes open ([OpenEarCalibrator]); drives [normalizedEarPair].
  double? _leftOpenEar;
  double? _rightOpenEar;

  /// Last `leftNorm` / `rightNorm` from [normalizedEarPair] for overlay (updated when face + baselines).
  double? _lastLeftNorm;
  double? _lastRightNorm;

  /// Mean `(left+right)/2` open baseline minus current mean EAR ([earFatigueLevel]); `null` until calibrated.
  double? _earFatigueLevel;

  /// [attentionWithFatigueBonus] applied to native [\_VisionFrame.attentionScore] for overlay / UX.
  int _displayAttentionScore = 0;

  /// Last native `attentionScore` from Android (before fatigue bonus).
  int _nativeAttentionScore = 0;
  double _verifiedAttentionScore = 0;
  double _fraudScore = 0;
  double _attentionConfidenceScore = 0;
  bool _attentionSessionValid = false;
  AttentionRuntimeState _attentionRuntimeState = AttentionRuntimeState.noFace;
  double _attentionRewardProgress = 0;
  double _attentionRewardMultiplier = 0;
  AttentionRewardTier _attentionRewardTier = AttentionRewardTier.ignore;
  int? _lastAttentionUpdateMs;
  final AttentionVerificationEngine _attentionVerifier =
      AttentionVerificationEngine();

  final WalletLedgerEngine _walletLedger = WalletLedgerEngine();
  final PostAttentionEconomySpine _economySpine = PostAttentionEconomySpine();
  final AdminConsoleEngine _adminConsole = AdminConsoleEngine();
  String _economyAttentionSessionId =
      'sess-${DateTime.now().millisecondsSinceEpoch}';
  final List<Map<String, Object?>> _economyEventOutbox =
      <Map<String, Object?>>[];

  bool _likelyFake = false;
  bool _fakeStaticGaze = false;
  bool _fakePerfectStability = false;
  bool _fakeNoBlink = false;

  UserEngagementState _userEngagementState = UserEngagementState.attentive;

  bool get _canStreamImages =>
      defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;

  bool get _isCalibrationReady =>
      _gazeMeasuredLeft != null &&
      _gazeMeasuredRight != null &&
      _neutralHeadYaw != null &&
      _leftOpenEar != null &&
      _rightOpenEar != null;

  String get _calibrationPhaseLabel {
    switch (_calibrationPhase) {
      case CalibrationPhase.idle:
        return 'idle';
      case CalibrationPhase.samplingLeft:
        return 'sampling-left';
      case CalibrationPhase.samplingRight:
        return 'sampling-right';
      case CalibrationPhase.samplingNeutralYaw:
        return 'sampling-neutral';
      case CalibrationPhase.samplingOpenEar:
        return 'sampling-ear';
      case CalibrationPhase.ready:
        return 'ready';
    }
  }

  void _setCalibrationPhase(CalibrationPhase phase) {
    if (_calibrationPhase == phase) return;
    if (!mounted) return;
    _calibrationPhase = phase;
    _safeUiUpdate(() {
      if (!mounted) return;
      setState(() {});
    });
  }

  void _refreshCalibrationStateMachine() {
    if (_isCalibrationReady) {
      _setCalibrationPhase(CalibrationPhase.ready);
      return;
    }
    if (_openEarCalibrating) {
      _setCalibrationPhase(CalibrationPhase.samplingOpenEar);
      return;
    }
    _setCalibrationPhase(CalibrationPhase.idle);
  }

  void _beginLeftCalibration() {
    if (defaultTargetPlatform != TargetPlatform.android || !mounted) return;
    setState(() {
      _pendingCaptureLeft = true;
      _calibrationPhase = CalibrationPhase.samplingLeft;
    });
  }

  void _beginRightCalibration() {
    if (defaultTargetPlatform != TargetPlatform.android || !mounted) return;
    setState(() {
      _pendingCaptureRight = true;
      _calibrationPhase = CalibrationPhase.samplingRight;
    });
  }

  /// Animates to 1.0 via [AnimatedScale] after first frame.
  double _previewScale = _kPreviewScaleRevealStart;

  final List<VoidCallback> _pendingUiUpdates = <VoidCallback>[];
  bool _uiUpdateScheduled = false;

  bool get _shouldDeferUiUpdate {
    switch (SchedulerBinding.instance.schedulerPhase) {
      case SchedulerPhase.transientCallbacks:
      case SchedulerPhase.midFrameMicrotasks:
      case SchedulerPhase.persistentCallbacks:
      case SchedulerPhase.postFrameCallbacks:
        return true;
      case SchedulerPhase.idle:
        return false;
    }
  }

  void _safeUiUpdate(VoidCallback fn) {
    if (!mounted) return;
    if (_shouldDeferUiUpdate) {
      _pendingUiUpdates.add(fn);
      if (_uiUpdateScheduled) return;
      _uiUpdateScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _uiUpdateScheduled = false;
        if (!mounted) return;
        final updates = List<VoidCallback>.of(_pendingUiUpdates);
        _pendingUiUpdates.clear();
        for (final update in updates) {
          if (!mounted) return;
          update();
        }
      });
      SchedulerBinding.instance.ensureVisualUpdate();
      return;
    }
    fn();
  }

  void _safeDebugUiUpdate(DebugState Function(DebugState current) update) {
    _safeUiUpdate(() {
      _debugNotifier.value = update(_debugNotifier.value);
    });
  }

  void _safeInfluenceUiUpdate(IntentInfluence? value) {
    _safeUiUpdate(() {
      if (_influenceNotifier.value != value) {
        _influenceNotifier.value = value;
      }
    });
  }

  void _safePointerUiUpdate(Offset value) {
    _safeUiUpdate(() {
      if (_pointerNotifier.value != value) {
        _pointerNotifier.value = value;
      }
    });
  }

  void _safeBlinkCountUiUpdate(int value) {
    _safeUiUpdate(() {
      if (_blinkCountNotifier.value != value) {
        _blinkCountNotifier.value = value;
      }
    });
  }

  void _updateViewportSnapshot(Size nextViewSize, double nextSafeTop) {
    if (_viewSize == nextViewSize && _overlaySafeTop == nextSafeTop) return;
    _safeUiUpdate(() {
      _viewSize = nextViewSize;
      _overlaySafeTop = nextSafeTop;
    });
  }

  @override
  void initState() {
    super.initState();
    _attentionKernel = AttentionKernel(safeUiUpdate: _safeUiUpdate);
    uiPreloader = UIPreloader(safeUiUpdate: _safeUiUpdate);
    _intentEngine = IntentEngine(LearningStore(), System.bus);
    _intentPredictor =
        GazeCollectiveIntentPredictor(_intentEngine.learningStore.collectiveZones);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _previewScale = 1.0;
      _safeUiUpdate(() {
        if (!mounted) return;
        setState(() {});
      });
      if (_canStreamImages) {
        unawaited(_startImageStream());
      }
    });
    if (kDebugMode && ConfidenceHud.debugShowConfidenceHud) {
      _autonomousExecution.auditSink = (type, confidence, result, blockedGate) {
        debugPrint(
          '[ACTION_AUDIT] type=${type.name} confidence=${confidence.toStringAsFixed(3)} '
          'result=${result.name} gate=${blockedGate ?? 'none'}',
        );
        _safeUiUpdate(() {
          if (!mounted) return;
          setState(() {
            _debugLastAutonomousGateResult = result;
            _debugLastAutonomousBlockedGate = blockedGate;
          });
        });
      };
    }
  }

  @override
  void dispose() {
    if (kDebugMode) {
      _autonomousExecution.auditSink = null;
    }
    _autonomousConfirmTimer?.cancel();
    _intentEngine.endSession();
    _intentEngine.dispose();
    _attentionKernel.dispose();
    _pointerNotifier.dispose();
    _influenceNotifier.dispose();
    _debugNotifier.dispose();
    _blinkCountNotifier.dispose();
    uiPreloader.warmHint.dispose();
    super.dispose();
  }

  Future<void> _requestHeadNeutralCalibration() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _visionChannel.invokeMethod<void>(_calibrateHeadPoseMethod);
      debugPrint('Head yaw neutral: next frame will capture baseline.');
    } on PlatformException catch (e) {
      debugPrint('calibrateHeadPose: ${e.message}');
    }
  }

  /// Stores [neutralYaw] = current raw yaw on the next frame; also tells native to zero relative yaw.
  Future<void> _requestNeutralYawAndSample() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    if (!mounted) return;
    setState(() {
      _pendingCaptureNeutralYaw = true;
      _calibrationPhase = CalibrationPhase.samplingNeutralYaw;
    });
    await _requestHeadNeutralCalibration();
  }

  void _startOpenEarCalibration() {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    if (!mounted) return;
    setState(() {
      _openEarCalibrating = true;
      _leftOpenEar = null;
      _rightOpenEar = null;
      _earFatigueLevel = null;
      _displayAttentionScore = 0;
      _nativeAttentionScore = 0;
      _verifiedAttentionScore = 0;
      _attentionRewardProgress = 0;
      _attentionRewardMultiplier = 0;
      _attentionRewardTier = AttentionRewardTier.ignore;
      _fraudScore = 0;
      _attentionConfidenceScore = 0;
      _attentionSessionValid = false;
      _attentionRuntimeState = AttentionRuntimeState.noFace;
      _lastAttentionUpdateMs = null;
      _userEngagementState = UserEngagementState.attentive;
      _openEarCalibrator.start();
      _calibrationPhase = CalibrationPhase.samplingOpenEar;
    });
  }

  Future<void> _startImageStream() async {
    if (!mounted) return;
    final c = widget.controller;
    if (!c.value.isInitialized || c.value.isStreamingImages) return;
    try {
      await c.startImageStream(_onCameraImage);
    } on CameraException catch (e) {
      debugPrint('startImageStream failed: $e');
    }
  }

  /// Lock visual focus to one zone: amplify it, center it, and suppress others.
  void _lockFocus(String nodeId) {
    if (!_zoneLabels.contains(nodeId)) return;
    final muted = <String, double>{
      for (final z in _zoneLabels) z: z == nodeId ? 1.0 : 0.28,
    };
    final offsets = <String, Offset>{
      'LEFT': const Offset(-48, 0),
      'CENTER': const Offset(0, 0),
      'RIGHT': const Offset(48, 0),
    };
    setState(() {
      _isExplorationMode = false;
      _focusLockedZone = nodeId;
      _zoneOpacity = muted;
      _zoneOffsets = offsets;
    });
  }

  /// Smoothly return to baseline visual state from lock mode.
  void _unlockFocus() {
    setState(() {
      _focusLockedZone = null;
      _zoneOpacity = const <String, double>{};
      _zoneOffsets = const <String, Offset>{};
    });
  }

  /// Spread zones, loosen follow snapping, and increase visual entropy.
  void _enterExplorationMode() {
    final offsets = <String, Offset>{
      'LEFT': Offset(
        -32 + (_explorationRand.nextDouble() - 0.5) * 24,
        (_explorationRand.nextDouble() - 0.5) * 18,
      ),
      'CENTER': Offset(
        (_explorationRand.nextDouble() - 0.5) * 20,
        (_explorationRand.nextDouble() - 0.5) * 18,
      ),
      'RIGHT': Offset(
        32 + (_explorationRand.nextDouble() - 0.5) * 24,
        (_explorationRand.nextDouble() - 0.5) * 18,
      ),
    };
    final opacity = <String, double>{
      for (final z in _zoneLabels) z: 0.62 + _explorationRand.nextDouble() * 0.35,
    };
    setState(() {
      _isExplorationMode = true;
      _focusLockedZone = null;
      _zoneOffsets = offsets;
      _zoneOpacity = opacity;
    });
  }

  void _exitExplorationMode() {
    setState(() {
      _isExplorationMode = false;
      _zoneOffsets = const <String, Offset>{};
      _zoneOpacity = const <String, double>{};
    });
  }

  void _markDwellSatisfied(String zone) {
    if (!_isTrackingState) return;
    if (_fixationState != FixationState.fixation) return;
    if (_dwellSatisfiedForStint) return;
    _dwellSatisfiedForStint = true;
    _dwellProgress = 1;
    _displaySelectedZone = zone;
    _safeDebugUiUpdate((debug) => debug.copyWith(selected: zone));
    _selectedAnnouncedForStint = true;
    _intentEngine.syncDwellReady(true);
    debugPrint('DWELL_READY: $zone');
  }

  /// Applies a zone label from intent resolution only (today: [_intentEngine] results).
  /// Legacy fixation checks elsewhere remain until refactor; do not route new features here directly.
  // ignore: unused_element
  bool _selectZone(String zone) {
    if (!_isTrackingState) return false;
    _selectedAnnouncedForStint = true;
    _displaySelectedZone = zone;
    _safeDebugUiUpdate((debug) => debug.copyWith(selected: zone));
    _intentEngine.learningStore.collectiveZones.recordSelection(zone);
    final IntentInfluence? inf = _latestInfluence;
    if (inf != null) {
      final int now = DateTime.now().millisecondsSinceEpoch;
      recordEvolutionSignal(
        inf,
        _evolutionSignalBuffer,
        elementId: zone,
        influenceStrength: inf.weight,
        success: true,
        dwellTime: _dwellProgressMs.toDouble(),
        timestamp: now,
      );
      _uiEvolutionEngine.update(
        zone,
        _evolutionSignalBuffer.signalsFor(zone),
      );
    }
    debugPrint('SELECTED: $zone');
    return true;
  }

  void _onCameraImage(CameraImage image) {
    if (!mounted) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    _ensurePerfWindow(now);
    _framePerf.cameraInputCount++;
    if (now - _lastFrameMs < _kFrameSpacingMs) {
      _framePerf.droppedThrottle++;
      _maybeLogPerfSummary(now);
      return;
    } // ~12 FPS (stable)
    _lastFrameMs = now;
    if (_processingFrame) {
      _framePerf.droppedBusy++;
      _maybeLogPerfSummary(now);
      return;
    }
    _processingFrame = true;
    _maybeLogPerfSummary(now);
    unawaited(_updateFrame(image));
  }

  /// One frame: native face → gaze → normalize → zone → blink → intent → attention → UI.
  Future<void> _updateFrame(CameraImage image) async {
    try {
      if (!mounted) return;
      if (defaultTargetPlatform != TargetPlatform.android) return;

      final fresh = await _processFace(image);
      final postprocessSw = Stopwatch()..start();
      final now = DateTime.now().millisecondsSinceEpoch;
      final rawHasFace =
          fresh != null && fresh.landmarks.isNotEmpty;

      _VisionFrame? face;
      if (rawHasFace) {
        _lastFaceSeenMs = now;
        _faceLocked = true;
        _lastHeldFace = fresh;
        face = fresh;
      } else if (_lastHeldFace != null &&
          (now - _lastFaceSeenMs) < _faceHoldMs) {
        // HOLD FACE (soft continuity)
        face = _lastHeldFace;
      } else {
        // HARD LOSS → degrade only
        face = null;
      }

      final isValidFrame = face != null;
      final faceDetected = face != null;

      if (!isValidFrame) {
        _framePerf.droppedInvalidNoFace++;
        if (kDebugMode && now - _lastInvalidFrameDebugMs >= 1000) {
          _lastInvalidFrameDebugMs = now;
          if (fresh == null) {
            debugPrint(
              '[vision_frame] no valid face: native result null or non-map',
            );
          } else {
            debugPrint(
              '[vision_frame] no valid face: landmarks=${fresh.landmarks.length} hasFace=${fresh.hasFace}',
            );
          }
        }
        _faceLocked = false;
        _lastHeldFace = null;
        if (fresh == null && _kVerbosePerFrameLogs) {
          debugPrint('EAR L: n/a | EAR R: n/a');
        }
        _pipeline.reset();
        _sandbox.reset();
        trajectoryBuffer.clear();
        uiPreloader.clear();
        _gazeFixation.reset();
        _pointerController.reset();
        _attentionKernel.reset();
        _attentionVerifier.reset();
        _economySpine.resetIdempotency();
        _economyAttentionSessionId =
            'sess-${DateTime.now().millisecondsSinceEpoch}';
        _gazeSessionSamples = 0;
        smoothGazeX = 0;
        smoothGazeY = 0;
        final d = _debugNotifier.value;
        if (d.motion != EyeMotionState.noFace) {
          _safeDebugUiUpdate(
            (debug) => debug.copyWith(motion: EyeMotionState.noFace),
          );
        }
        return;
      }

      final frameConfidence = face.faceConfidence.clamp(0.0, 1.0).toDouble();
      if (frameConfidence < _kThirdConfidenceGate) {
        _clearPendingAutonomousConfirm();
        _clearZoneTracking();
        _pointerController.reset();
        _attentionKernel.reset();
        _safeDebugUiUpdate(
          (debug) => debug.copyWith(motion: EyeMotionState.noFace),
        );
        return;
      }

      final gazeXRaw = face.gazeX;
      final gazeYRaw = face.gazeY?.toDouble();
      final drift = _intentEngine.learningStore.profile.calibrationDrift;
      final adjustedX = (gazeXRaw ?? 0.0) + drift;
      final adjustedY = (gazeYRaw ?? 0.0) + drift;
      double? effectiveGazeX = gazeXRaw != null ? adjustedX : null;
      double? effectiveGazeY = gazeYRaw != null ? adjustedY : null;

      final rawX = effectiveGazeX;
      final rawY = effectiveGazeY;
      if (rawX == null || rawY == null) {
        _framePerf.droppedInvalidGaze++;
        return;
      }
      if (!rawX.isFinite || !rawY.isFinite) {
        _framePerf.droppedInvalidGaze++;
        return;
      }

      _computeGaze(face);
      final norm = _normalize(face, effectiveGazeX: effectiveGazeX);
      if (effectiveGazeX != null) {
        _gazeSessionSamples++;
      }
      var zoneOverlayDirty = norm.calibrationDirty;

      final pitchBandDirty = _refreshHeadPose(face);
      if (pitchBandDirty) {
        zoneOverlayDirty = true;
      }

      zoneOverlayDirty |= _refreshLandmarksAndEarBaselines(face);

      final rawMeanBaseline = (_leftOpenEar != null && _rightOpenEar != null)
          ? (_leftOpenEar! + _rightOpenEar!) / 2
          : null;

      final yaw = face.headYaw;
      final pitch = face.headPitch;
      final headConf = (yaw != null && pitch != null)
          ? headConfidence(yaw, pitch)
          : 1.0;
      final confidence = computeConfidence(
        hasLandmarks: face.landmarks.isNotEmpty,
        leftEar: face.leftEar ?? 0,
        rightEar: face.rightEar ?? 0,
        headConf: headConf,
      );

      final filterAlpha = smoothingAlphaFromConfidence(confidence);

      final double? ear = _avgEar(face.leftEar, face.rightEar);
      final blink = updateBlink(ear, rawMeanBaseline: rawMeanBaseline);
      final nextBlinking = blink['isBlinking']! as bool;
      final nextBlinkCount = blink['blinkCount']! as int;
      // Interaction timing uses a blink edge (event), not sustained blink state.
      final blinkEdge = nextBlinkCount > _blinkCount;

      final result = _pipeline.update(
        x: rawX,
        y: rawY,
        valid: true,
        now: now,
        blink: blinkEdge,
        headYaw: face.headYaw,
        headPitch: face.headPitch,
        filterAlpha: filterAlpha,
      );

      final isValid = result.valid && result.x != null && result.y != null;
      final qualityClamped = (result.quality ?? 0.0).clamp(0.0, 1.0).toDouble();
      _trackingEngine.update(
        faceDetected: faceDetected,
        quality: isValid ? qualityClamped : 0.0,
      );
      Offset? pipelineGaze;

      if (!isValid) {
        zoneOverlayDirty |= _clearZoneTracking();
        _pointerController.reset(); // important
        _latestInfluence = null;
        _safeInfluenceUiUpdate(null);
        _influenceWeightDisplay = 0.0;
        _influenceZoneDisplay = null;
      } else {
        pipelineGaze = Offset(
          result.x!,
          result.y!,
        );
        final px = pipelineGaze.dx;
        final py = pipelineGaze.dy;

        trajectoryBuffer.add(px, py, now);

        _fixationState = _gazeFixation.update(
          buffer: _gazeTraceBuffer,
          varX: result.varX ?? 0,
          varY: result.varY ?? 0,
          now: now,
        );
        System.bus.emit(
          GazeEvent(
            x: px,
            y: py,
            state: _fixationState,
            timestamp: now,
            confidence: result.quality ?? 1.0,
            gazeBand: getZone(px),
          ),
        );
        _maybeLogVerboseFrame(
          now,
          'state: $_fixationState | quality: ${result.quality}',
          intervalMs: 1000,
        );
        final gazeX = pipelineGaze.dx;
        smoothGazeX = gazeX;
        smoothGazeY = pipelineGaze.dy;

        final frameZone = _displaySelectedZone.isNotEmpty
            ? _displaySelectedZone
            : (_currentZone ?? 'CENTER');
        _predictor.add(
          InteractionFrame(
            gaze: Offset(smoothGazeX, smoothGazeY),
            zone: frameZone,
            fixation: _fixationState,
            stability: result.varX ?? 0,
            timestamp: now,
          ),
        );

        final predictions = _predictor.predict();
        if (now - _lastPreloadMs > preloadCooldownMs) {
          for (final p in predictions.take(2)) {
            if (p.probability > 0.6) {
              _preloader.preload(p);
            }
          }
          _lastPreloadMs = now;
        }

        _sandbox.syncFromPipeline(
          result: result,
          fixationState: _fixationState,
          smoothGazeXForZone: smoothGazeX,
        );
        _syncDigitalTwinFromGaze(result);
        if (_kVerbosePerFrameLogs && now - _lastLogTime > 500) {
          _lastLogTime = now;
          _maybeLogVerboseFrame(now, 'GazeX: $gazeX', intervalMs: 1000);
        }
        final bool stable =
            _gazeTraceBuffer.hasEnough &&
            (result.varX ?? 1) < 0.00003 &&
            (result.varY ?? 1) < 0.00003;

        if (stable && _fixationState == FixationState.fixation) {
          zoneOverlayDirty |= updateZone(smoothGazeX);
        } else if (_currentZone != null && !_dwellSatisfiedForStint) {
          _dwellEngine.reset();
          _lastDwellTickMs = null;
          if (_dwellProgress != 0) {
            _dwellProgress = 0;
            zoneOverlayDirty = true;
          }
        }

        final gb = getZone(smoothGazeX);
        final likely = _intentEngine.learningStore.collectiveZones
            .predictLikelyZone(gb);
        uiPreloader.preload(
          _debugNotifier.value.zone,
          _intentEngine.currentIntent,
          collectiveLikelyZone: likely,
        );

        final prediction = _intentPredictor.predict(gaze: smoothGazeX, now: now);
        _influenceWeightDisplay *= 0.9;
        final fresh = _influenceEngine.compute(
          prediction,
          collective: _intentEngine.learningStore.collectiveZones,
        );
        if (fresh != null) {
          _influenceZoneDisplay = fresh.zone;
          _influenceWeightDisplay =
              max(_influenceWeightDisplay, fresh.weight);
        }
        if (_influenceWeightDisplay < 1e-3) {
          _influenceWeightDisplay = 0.0;
          _influenceZoneDisplay = null;
        }
        _latestInfluence = _influenceZoneDisplay != null
            ? IntentInfluence(
                zone: _influenceZoneDisplay!,
                weight: _influenceWeightDisplay.clamp(0.0, 1.0),
                zoneBias: zoneBiasForPredictedZone(
                  predictedZone: _influenceZoneDisplay!,
                  weight: _influenceWeightDisplay.clamp(0.0, 1.0),
                  stats: _intentEngine.learningStore.collectiveZones,
                ),
              )
            : null;
        _safeInfluenceUiUpdate(_latestInfluence);

        if (prediction != null) {
          final action = _autonomousAgent.decide(
            prediction: prediction,
            state: _fixationState,
            dwellProgress: _dwellProgress,
          );
          if (action != null) {
            final q = _pendingAutonomousConfirm;
            if (q == null ||
                q.action.targetZone != action.targetZone ||
                q.action.type != action.type) {
              _queueConfirmation(
                ActionRequest(
                  action: action,
                  queuedAtMs: DateTime.now().millisecondsSinceEpoch,
                ),
              );
            }
          }
        }
      }
      if (blinkEdge) {
        // Edge-triggered behavior: one action per blink transition only.
        _pointerController.click();
        System.bus.emit(
          BlinkEvent(
            type: EyeMotionState.blink,
            timestamp: now,
            confidence: face.faceConfidence.clamp(0.0, 1.0),
          ),
        );
        debugPrint('BLINK_CLICK');
      }
      final nextBlinkDom = blink['isRightDominant'] as bool?;
      final nextBlinkLeftDrop = blink['leftDrop'] as double?;
      final nextBlinkRightDrop = blink['rightDrop'] as double?;
      final blinkDominanceDirty = nextBlinkDom != _blinkIsRightDominant ||
          nextBlinkLeftDrop != _blinkLeftDrop ||
          nextBlinkRightDrop != _blinkRightDrop;

      if (isValid && pipelineGaze != null) {
        final attention = _attentionKernel.process(
          rawGaze: pipelineGaze,
          stability: qualityClamped,
          isFixating: _fixationState == FixationState.fixation,
          blink: nextBlinking,
          now: now,
          headPenalty: (1.0 - headConf).clamp(0.0, 1.0).toDouble(),
          features: AttentionFeatures(
            gazeStability: qualityClamped,
            eyeOpennessRatio: _avgEar(face.leftEar, face.rightEar)?.clamp(0.0, 1.0) ??
                (nextBlinking ? 0.2 : 0.85),
            blinkFrequency: nextBlinking ? 1.0 : 0.08,
            pupilVariance: (1.0 - qualityClamped).clamp(0.0, 1.0).toDouble(),
            scrollSpeed: _isExplorationMode ? 0.65 : 0.2,
            pauseDurationMs: _fixationState == FixationState.fixation
                ? _dwellProgressMs.toDouble()
                : 0.0,
            interactionLatencyMs: blinkEdge ? 150.0 : 420.0,
            sessionTimeMs: now,
            fatigueIndex: (_earFatigueLevel ?? 0.0).clamp(0.0, 1.0).toDouble(),
            contentType: _displaySelectedZone.isEmpty ? 'organic' : 'campaign',
            rewardExpectation: _attentionRewardProgress.clamp(0.0, 1.0).toDouble(),
          ),
        );

        if (attention != null) {
          final blendedVerifiedAttention =
              ((_verifiedAttentionScore * 0.6) + (attention.score * 0.4))
                  .clamp(0.0, 1.0)
                  .toDouble();
          if ((blendedVerifiedAttention - _verifiedAttentionScore).abs() > 0.0001 ||
              (attention.fraudRisk * 100.0 - _fraudScore).abs() > 0.5) {
            _verifiedAttentionScore = blendedVerifiedAttention;
            _fraudScore = (attention.fraudRisk * 100.0).clamp(0.0, 100.0);
            _attentionRewardTier = rewardTierForAttention(_verifiedAttentionScore);
            _attentionRewardMultiplier =
                rewardMultiplierForAttention(_verifiedAttentionScore);
            zoneOverlayDirty = true;
          }
          _pointerController.baselineX = _baselineX;
          _pointerController.baselineY = _baselineY;
          _pointerController.setLayoutSize(_viewSize);
          final pointerPosition =
              _pointerController.update(attention.gaze, attention.stability);
          if (pointerPosition != null) {
            var pointer = pointerPosition;
            final inf = _latestInfluence;
            final view = _viewSize;
            if (inf != null && view != null) {
              final zoneCenters =
                  gazeZoneStripCenters(view, _overlaySafeTop, compact: true);
              final target = zoneCenters[inf.zone];
              if (target != null) {
                pointer = applyMagnetism(
                  pointer,
                  target,
                  inf.weight,
                );
              }
            }
            _safePointerUiUpdate(pointer);
          }
        }
      }

      zoneOverlayDirty |= _computeAttention(
        face: face,
        normalizedGazeX: norm.normalizedGazeX,
        normalizedGazeY: pipelineGaze?.dy,
        nextBlinking: nextBlinking,
        stability: qualityClamped,
        blinkEdge: blinkEdge,
      );

      final nextAttentionDisplay = attentionWithFatigueBonus(
        nativeAttention: face.attentionScore,
        fatigueLevel: _earFatigueLevel,
      );
      if (nextAttentionDisplay != _displayAttentionScore ||
          face.attentionScore != _nativeAttentionScore) {
        zoneOverlayDirty = true;
      }

      final intent = _detectIntent(nextBlinkCount);
      var nextCount = intent.nextCount;
      zoneOverlayDirty |= intent.dirty;

      _updateFrameUi(
        zoneOverlayDirty: zoneOverlayDirty,
        validGaze: isValid,
        nextBlinking: nextBlinking,
        nextCount: nextCount,
        blinkDominanceDirty: blinkDominanceDirty,
        pitchBandDirty: pitchBandDirty,
        nextPitchBand: _headPitchBandFromFace(face),
        nextBlinkDom: nextBlinkDom,
        nextBlinkLeftDrop: nextBlinkLeftDrop,
        nextBlinkRightDrop: nextBlinkRightDrop,
        nextAttentionDisplay: nextAttentionDisplay,
        nextNativeAttention: face.attentionScore,
        nextLikelyFake: face.likelyFake,
        nextFakeStaticGaze: face.fakeStaticGaze,
        nextFakePerfectStability: face.fakePerfectStability,
        nextFakeNoBlink: face.fakeNoBlink,
      );
      postprocessSw.stop();
      _framePerf.postprocessTotalMs += postprocessSw.elapsedMicroseconds / 1000.0;
      _framePerf.postprocessSamples++;
      _framePerf.processedCount++;
      _maybeLogPerfSummary(now);
    } on PlatformException catch (e) {
      debugPrint('processFrame: ${e.message}');
    } catch (e) {
      debugPrint('processFrame failed: $e');
    } finally {
      _processingFrame = false;
    }
  }

  Future<_VisionFrame?> _processFace(CameraImage image) async {
    if (!mounted) return null;
    final encodeSw = Stopwatch()..start();
    final payload = cameraImageToVisionChannelPayload(image);
    encodeSw.stop();
    _framePerf.encodeTotalMs += encodeSw.elapsedMicroseconds / 1000.0;
    _framePerf.encodeSamples++;
    final channelSw = Stopwatch()..start();
    final result = await _visionChannel.invokeMethod('processFrame', payload);
    channelSw.stop();
    _framePerf.channelTotalMs += channelSw.elapsedMicroseconds / 1000.0;
    _framePerf.channelSamples++;
    if (result is! Map) return null;
    final face = _VisionFrame.fromMap(result);
    if (face.nativeDecodeMs != null) {
      _framePerf.lastNativeDecodeMs = face.nativeDecodeMs!;
    }
    if (face.nativeProcessMs != null) {
      _framePerf.lastNativeProcessMs = face.nativeProcessMs!;
    }
    if (face.nativeTotalMs != null) {
      _framePerf.lastNativeTotalMs = face.nativeTotalMs!;
    }
    if (kDebugMode && _kVerbosePerFrameLogs) {
      final lStr =
          face.leftEar != null ? face.leftEar!.toStringAsFixed(4) : 'n/a';
      final rStr =
          face.rightEar != null ? face.rightEar!.toStringAsFixed(4) : 'n/a';
      _maybeLogVerboseFrame(
        DateTime.now().millisecondsSinceEpoch,
        'EAR L: $lStr | EAR R: $rStr | Landmarks: ${face.landmarks.length} | '
        'LeftEye: ${face.leftEye.length} | RightEye: ${face.rightEye.length}',
        intervalMs: 1000,
      );
    }
    return face;
  }

  void _computeGaze(_VisionFrame face) {
    final hy = face.headYaw;
    final hp = face.headPitch;
    final hs = face.headStable;
    if (kDebugMode && _kVerbosePerFrameLogs && hy != null && hp != null && hs != null) {
      debugPrint(
        'Head yaw: ${hy.toStringAsFixed(3)} pitch: ${hp.toStringAsFixed(3)} stable: $hs',
      );
    }
  }

  /// Calibration samples + [normalizeGazeX].
  ///
  /// [effectiveGazeX] is live gaze from the current frame while a face is active, or null on hard loss.
  ({double? normalizedGazeX, bool calibrationDirty}) _normalize(
    _VisionFrame face, {
    required double? effectiveGazeX,
  }) {
    var calibrationDirty = false;
    final gazeX = effectiveGazeX;
    if (_pendingCaptureLeft && gazeX != null) {
      _gazeMeasuredLeft = gazeX;
      _pendingCaptureLeft = false;
      calibrationDirty = true;
      debugPrint('Gaze min (look-left) captured: $gazeX');
      _refreshCalibrationStateMachine();
    }
    if (_pendingCaptureRight && gazeX != null) {
      _gazeMeasuredRight = gazeX;
      _pendingCaptureRight = false;
      calibrationDirty = true;
      debugPrint('Gaze max (look-right) captured: $gazeX');
      _refreshCalibrationStateMachine();
    }
    final headYawRaw = face.headYawRaw;
    if (_pendingCaptureNeutralYaw &&
        headYawRaw != null &&
        headYawRaw.isFinite) {
      _neutralHeadYaw = headYawRaw;
      _pendingCaptureNeutralYaw = false;
      calibrationDirty = true;
      debugPrint('Neutral yaw captured: $headYawRaw');
      _refreshCalibrationStateMachine();
    }
    final bounds = effectiveGazeCalibrationBounds(
      measuredLeft: _gazeMeasuredLeft,
      measuredRight: _gazeMeasuredRight,
      sessionSamples: _gazeSessionSamples,
    );
    final normalizedGazeX = gazeX != null
        ? normalizeGazeX(
            gazeX - gazeXCalibrationOffset,
            bounds.left,
            bounds.right,
          )
        : null;
    return (
      normalizedGazeX: normalizedGazeX,
      calibrationDirty: calibrationDirty,
    );
  }

  /// Mean EAR when both eyes are valid; otherwise null (same signal [BlinkDetector] uses internally).
  double? _avgEar(double? leftEar, double? rightEar) {
    if (leftEar == null ||
        rightEar == null ||
        !leftEar.isFinite ||
        !rightEar.isFinite) {
      return null;
    }
    return (leftEar + rightEar) / 2;
  }

  /// Raw [gazeX] → [getZone], then runs dwell lock:
  /// zone change resets timer; after [DwellEngine.thresholdMs], zone is locked.
  bool updateZone(double gazeX) {
    final zone = getZone(gazeX);
    return _advanceZoneDwell(zone);
  }

  /// Feeds [DigitalTwinEngine] from live gaze + intent (advisory model; does not execute actions).
  void _syncDigitalTwinFromGaze(GazePipelineOutput result) {
    if (!result.valid) return;
    final vx = result.varX ?? 0;
    final vy = result.varY ?? 0;
    final gazeVariance = (vx + vy).clamp(0.0, 1.0);
    final stability = (1.0 - (vx + vy) * 8000).clamp(0.0, 1.0);
    final fixationMs =
        _fixationState == FixationState.fixation ? 300.0 : 0.0;

    var hover = 0.4;
    var select = 0.35;
    switch (_intentEngine.currentIntent) {
      case IntentType.hover:
        hover = 0.68;
      case IntentType.focus:
        hover = 0.55;
        select = 0.52;
      case IntentType.dwellReady:
        select = 0.62;
      case IntentType.select:
        select = 0.78;
      default:
        break;
    }

    _digitalTwinEngine.updateFromFrame(
      fixationMs: fixationMs,
      stability: stability,
      gazeVariance: gazeVariance,
      blinkRate: _isBlinking ? 0.65 : 0.08,
      hover: hover,
      select: select,
      dwell: _dwellProgress.clamp(0.0, 1.0),
      dwellMs: _dwellProgressMs.toDouble(),
    );
  }

  /// Clears zone streak + dwell and resets [GazePipeline] when gaze is invalid.
  bool _clearZoneTracking() {
    _pipeline.reset();
    _sandbox.reset();
    trajectoryBuffer.clear();
    uiPreloader.clear();
    _gazeFixation.reset();
    _fixationState = FixationState.unstable;
    smoothGazeX = 0;
    smoothGazeY = 0;
    var zoneOverlayDirty = false;
    if (_currentZone != null) {
      zoneOverlayDirty = true;
    }
    _currentZone = null;
    _dwellEngine.reset();
    _lastDwellTickMs = null;
    _dwellSatisfiedForStint = false;
    _intentEngine.syncDwellReady(false);
    _dwellProgress = 0;
    _selectedAnnouncedForStint = false;
    _displaySelectedZone = '';
    _safeDebugUiUpdate((debug) => debug.copyWith(selected: ''));
    return zoneOverlayDirty;
  }

  /// Runs [BlinkDetector.updateEar] using [avgEar] for both eyes (same mean signal as separate L/R).
  Map<String, Object?> updateBlink(
    double? avgEar, {
    required double? rawMeanBaseline,
  }) {
    return _blinkDetector.updateEar(
      avgEar,
      avgEar,
      leftOpenBaseline: _leftOpenEar,
      rightOpenBaseline: _rightOpenEar,
      rawMeanBaseline: rawMeanBaseline,
    );
  }

  /// Uses [DwellEngine] to accumulate on-zone gaze time (delta-based) and confirm intent after threshold.
  bool _advanceZoneDwell(String zone) {
    var zoneOverlayDirty = false;
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final lastTick = _lastDwellTickMs;
    final deltaMs = lastTick == null ? 0.0 : (nowMs - lastTick).toDouble();
    _lastDwellTickMs = nowMs;
    if (_debugNotifier.value.zone != zone) {
      _safeDebugUiUpdate((debug) => debug.copyWith(zone: zone));
    }
    if (zone != _currentZone) {
      _currentZone = zone;
      _dwellEngine.reset();
      _dwellSatisfiedForStint = false;
      _intentEngine.syncDwellReady(false);
      _dwellProgress = 0;
      _selectedAnnouncedForStint = false;
      _displaySelectedZone = '';
      _safeDebugUiUpdate((debug) => debug.copyWith(selected: ''));
      zoneOverlayDirty = true;
    } else {
      if (_fixationState != FixationState.fixation) {
        if (_dwellProgress != 0 || _dwellSatisfiedForStint) {
          zoneOverlayDirty = true;
        }
        _dwellEngine.reset();
        _dwellSatisfiedForStint = false;
        _intentEngine.syncDwellReady(false);
        _dwellProgress = 0;
      } else {
        final intentConfirmed = _dwellEngine.update(
          targetId: zone,
          gazeInsideTarget: true,
          deltaMs: deltaMs,
        );
        final nextProgress = _dwellEngine.progressFor(zone);
        if ((nextProgress - _dwellProgress).abs() >= 0.02 ||
            nextProgress == 0) {
          _dwellProgress = nextProgress;
          zoneOverlayDirty = true;
        }
        if (intentConfirmed && !_dwellSatisfiedForStint) {
          _markDwellSatisfied(zone);
          zoneOverlayDirty = true;
        }
      }
    }
    return zoneOverlayDirty;
  }

  String? _headPitchBandFromFace(_VisionFrame face) {
    final headPitch = face.headPitch;
    return headPitch != null ? getHeadPitchBand(headPitch) : null;
  }

  /// Returns true when `_headPitchBand` should update.
  bool _refreshHeadPose(_VisionFrame face) {
    final next = _headPitchBandFromFace(face);
    final dirty = next != _headPitchBand;
    return dirty;
  }

  /// Face presence, open-EAR calibration, normalized EAR overlay; returns overlay dirty.
  bool _refreshLandmarksAndEarBaselines(_VisionFrame face) {
    var zoneOverlayDirty = false;
    final hasFace = face.hasFace;
    final leftEar = face.leftEar;
    final rightEar = face.rightEar;

    if (!hasFace && _earFatigueLevel != null) {
      _earFatigueLevel = null;
      zoneOverlayDirty = true;
    }

    if (_openEarCalibrating &&
        hasFace &&
        leftEar != null &&
        rightEar != null) {
      final done = _openEarCalibrator.addFrame(leftEar, rightEar);
      if (done != null) {
        _leftOpenEar = done.$1;
        _rightOpenEar = done.$2;
        _openEarCalibrating = false;
        _refreshCalibrationStateMachine();
        zoneOverlayDirty = true;
        debugPrint(
          'Open EAR baselines leftOpenEAR=$_leftOpenEar rightOpenEAR=$_rightOpenEar',
        );
      } else {
        zoneOverlayDirty = true;
      }
    }

    if (hasFace && leftEar != null && rightEar != null) {
      final norms = normalizedEarPair(
        leftEar,
        rightEar,
        _leftOpenEar,
        _rightOpenEar,
      );
      if (norms != null) {
        if (_lastLeftNorm != norms.$1 || _lastRightNorm != norms.$2) {
          _lastLeftNorm = norms.$1;
          _lastRightNorm = norms.$2;
          zoneOverlayDirty = true;
        }
      } else if (_lastLeftNorm != null || _lastRightNorm != null) {
        _lastLeftNorm = null;
        _lastRightNorm = null;
        zoneOverlayDirty = true;
      }
    }
    return zoneOverlayDirty;
  }

  /// EAR fatigue, slow baseline drift, and [UserEngagementState]; returns overlay dirty.
  bool _computeAttention({
    required _VisionFrame face,
    required double? normalizedGazeX,
    required double? normalizedGazeY,
    required bool nextBlinking,
    required double stability,
    required bool blinkEdge,
  }) {
    var zoneOverlayDirty = false;
    final hasFace = face.hasFace;
    final leftEar = face.leftEar;
    final rightEar = face.rightEar;
    final headStable = face.headStable;

    double? nextEarFatigue;
    if (hasFace &&
        leftEar != null &&
        rightEar != null &&
        !_openEarCalibrating &&
        _leftOpenEar != null &&
        _rightOpenEar != null) {
      final l0 = _leftOpenEar!;
      final r0 = _rightOpenEar!;
      final baselineMean = (l0 + r0) / 2;
      final currentMean = (leftEar + rightEar) / 2;
      nextEarFatigue = earFatigueLevel(baselineMean, currentMean);
      if (!nextBlinking) {
        final l1 = advanceOpenEarBaselineChannel(l0, leftEar);
        final r1 = advanceOpenEarBaselineChannel(r0, rightEar);
        if ((l1 - l0).abs() > 0.0005 || (r1 - r0).abs() > 0.0005) {
          zoneOverlayDirty = true;
        }
        _leftOpenEar = l1;
        _rightOpenEar = r1;
      }
    }
    final fatigueDirty = () {
      final a = _earFatigueLevel;
      final b = nextEarFatigue;
      if (a == null && b == null) return false;
      if (a == null || b == null) return true;
      return (a - b).abs() > 0.0001;
    }();
    if (fatigueDirty) {
      _earFatigueLevel = nextEarFatigue;
      zoneOverlayDirty = true;
    }

    final nextEngagement = !hasFace
        ? UserEngagementState.attentive
        : deriveUserEngagementState(
            fatigueLevel: _earFatigueLevel,
            gazeStable: headStable == true &&
                normalizedGazeX != null &&
                !nextBlinking,
          );
    final engagementDirty = nextEngagement != _userEngagementState;
    if (engagementDirty) {
      _userEngagementState = nextEngagement;
      zoneOverlayDirty = true;
      debugPrint('userState: ${userEngagementStateWire(nextEngagement)}');
    }

    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final dtMs = _lastAttentionUpdateMs == null
        ? 0
        : (nowMs - _lastAttentionUpdateMs!).clamp(0, 1000);
    _lastAttentionUpdateMs = nowMs;

    final confidence = face.faceConfidence.clamp(0.0, 1.0).toDouble();
    if (confidence < 0.6 || !hasFace) {
      final decayedScore = (_verifiedAttentionScore * 0.9).clamp(0.0, 1.0);
      final decayedProgress =
          (_attentionRewardProgress - (dtMs / 4000.0)).clamp(0.0, 1.0);
      final decayedMultiplier =
          rewardMultiplierForAttention(decayedScore).clamp(0.0, 1.15);
      final decayedTier = rewardTierForAttention(decayedScore);
      final decayedConfidence = (_attentionConfidenceScore * 0.92).clamp(0.0, 1.0);
      if ((decayedScore - _verifiedAttentionScore).abs() > 0.0001 ||
          (decayedProgress - _attentionRewardProgress).abs() > 0.0001 ||
          (decayedConfidence - _attentionConfidenceScore).abs() > 0.0001 ||
          (decayedMultiplier - _attentionRewardMultiplier).abs() > 0.0001 ||
          decayedTier != _attentionRewardTier) {
        _verifiedAttentionScore = decayedScore;
        _attentionRewardProgress = decayedProgress;
        _attentionRewardMultiplier = decayedMultiplier;
        _attentionRewardTier = decayedTier;
        _attentionConfidenceScore = decayedConfidence;
        _attentionRuntimeState = AttentionRuntimeState.noFace;
        zoneOverlayDirty = true;
      }
      return zoneOverlayDirty;
    }

    final gazePoint = (normalizedGazeX != null && normalizedGazeY != null)
        ? Offset(
            normalizedGazeX.clamp(0.0, 1.0).toDouble(),
            normalizedGazeY.clamp(0.0, 1.0).toDouble(),
          )
        : null;
    final headYawDeg = (() {
      final yaw = face.headYaw;
      if (yaw == null) return null;
      if (yaw.abs() <= 3.2) return yaw * (180 / pi); // radians
      return yaw;
    })();
    final headPitchDeg = (() {
      final pitch = face.headPitch;
      if (pitch == null) return null;
      if (pitch.abs() <= 3.2) return pitch * (180 / pi); // radians
      return pitch;
    })();
    final verification = _attentionVerifier.update(
      AttentionSignalFrame(
        timestampMs: nowMs,
        hasFace: hasFace,
        gaze: gazePoint,
        ear: _avgEar(face.leftEar, face.rightEar),
        headYawDeg: headYawDeg,
        headPitchDeg: headPitchDeg,
        isFixating: _fixationState == FixationState.fixation,
        blinkEdge: blinkEdge,
        interactionSignal: blinkEdge
            ? 1.0
            : ((_fixationState == FixationState.fixation &&
                        !nextBlinking &&
                        gazePoint != null)
                    ? 0.65
                    : 0.15),
        nativeFraudFlags: face.likelyFake ||
            face.fakeStaticGaze ||
            face.fakePerfectStability ||
            face.fakeNoBlink,
      ),
    );
    final verifiedScore =
        (verification.rollingAttentionScore / 100.0).clamp(0.0, 1.0);

    var rewardProgress = _attentionRewardProgress;
    if (verifiedScore >= 0.4) {
      rewardProgress += (dtMs / 1000.0) * verifiedScore * 0.25;
    } else {
      rewardProgress -= dtMs / 5000.0;
    }
    final crossedAttentionRewardFull =
        _attentionRewardProgress < 1.0 && rewardProgress >= 1.0;
    rewardProgress = rewardProgress.clamp(0.0, 1.0);

    final rewardMultiplier =
        rewardMultiplierForAttention(verifiedScore).clamp(0.0, 1.15);
    final rewardTier = rewardTierForAttention(verifiedScore);
    if ((verifiedScore - _verifiedAttentionScore).abs() > 0.0001 ||
        (verification.confidenceScore - _attentionConfidenceScore).abs() > 0.0001 ||
        (verification.fraudScore - _fraudScore).abs() > 0.0001 ||
        verification.state != _attentionRuntimeState ||
        verification.valid != _attentionSessionValid ||
        (rewardProgress - _attentionRewardProgress).abs() > 0.0001 ||
        (rewardMultiplier - _attentionRewardMultiplier).abs() > 0.0001 ||
        rewardTier != _attentionRewardTier) {
      _verifiedAttentionScore = verifiedScore;
      _attentionConfidenceScore = verification.confidenceScore;
      _fraudScore = verification.fraudScore;
      _attentionRuntimeState = verification.state;
      _attentionSessionValid = verification.valid;
      _attentionRewardProgress = rewardProgress;
      _attentionRewardMultiplier = rewardMultiplier;
      _attentionRewardTier = rewardTier;
      zoneOverlayDirty = true;
      if (crossedAttentionRewardFull && verification.valid) {
        _runEconomySpineAfterAttention(verification);
      }
    }
    return zoneOverlayDirty;
  }

  CampaignBudgetState _demoEconomyBudget() {
    return CampaignBudgetState(
      campaignId: _kEconomyDemoCampaignId,
      brandId: 'demo-brand',
      totalBudgetUsd: 500,
      rewardPerActionUsd: 10,
      targetActions: 50,
      minTrustScore: 0,
      remainingBudgetUsd: 400,
      reservedUsd: 100,
      spentUsd: 0,
    );
  }

  void _runEconomySpineAfterAttention(AttentionVerificationSnapshot snap) {
    if (!_attentionSessionValid || !snap.valid) return;

    final seal = _attentionVerifier.buildVerificationResult(
      sessionId: _economyAttentionSessionId,
      userId: _kEconomyDemoUserId,
      campaignId: _kEconomyDemoCampaignId,
      contentId: 'camera-main',
      snapshot: snap,
    );
    if (!seal.verified) return;

    final now = DateTime.now().toUtc();
    final correlationId = 'corr-spine-${now.microsecondsSinceEpoch}';
    final idempotencyKey =
        '${_economyAttentionSessionId}-attention-reward-full';

    final req = RewardIssuanceRequest(
      userId: seal.userId,
      campaignId: seal.campaignId!,
      attentionSessionId: seal.sessionId,
      attention: seal,
      rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
      budget: _demoEconomyBudget(),
      trustScore: (_intentEngine.learningStore.behavior.userTrustScore * 100)
          .clamp(0.0, 100.0)
          .toDouble(),
      fraudSignals: const FraudSignals(noFraudFlags: true),
      duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
      dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 500),
      eligibility: const IssuanceEligibility(
        geoEligible: true,
        deviceEligible: true,
        sessionEligible: true,
      ),
      now: now,
      activePolicyVersionId: kBootstrapPolicyVersionId,
      requireLockedCampaignBudgetReserve: false,
    );

    final result = _economySpine.run(
      issuanceRequest: req,
      ledger: _walletLedger,
      walletId: _kEconomyDemoWalletId,
      correlationId: correlationId,
      idempotencyKey: idempotencyKey,
    );

    for (final e in result.events) {
      _economyEventOutbox.add(systemEventV01ToJson(e));
      while (_economyEventOutbox.length > _kEconomyEventLogCap) {
        _economyEventOutbox.removeAt(0);
      }
    }
    if (kDebugMode) {
      debugPrint(
        '[economy_spine] approved=${result.decisionApproved} '
        'dup=${result.duplicateSkipped} fail=${result.failureReason} '
        'events=${result.events.length} outbox=${_economyEventOutbox.length}',
      );
    }
  }

  void _queueConfirmation(ActionRequest r) {
    _autonomousConfirmTimer?.cancel();
    _autonomousConfirmTimer = Timer(const Duration(seconds: 15), () {
      if (!mounted) return;
      if (_pendingAutonomousConfirm != null) {
        _pendingAutonomousConfirm = null;
        _autonomousConfirmTimer = null;
        _safeUiUpdate(() {
          if (!mounted) return;
          setState(() {});
        });
        debugPrint('AUTONOMOUS_CONFIRM: timeout');
      }
    });
    _pendingAutonomousConfirm = r;
    _safeUiUpdate(() {
      if (!mounted) return;
      setState(() {});
    });
    debugPrint('AUTONOMOUS_CONFIRM: queued ${r.action.type.name} ${r.action.targetZone}');
  }

  void _clearPendingAutonomousConfirm() {
    _autonomousConfirmTimer?.cancel();
    _autonomousConfirmTimer = null;
    _pendingAutonomousConfirm = null;
    _safeUiUpdate(() {
      if (!mounted) return;
      setState(() {});
    });
  }

  // ignore: unused_element
  int _recentAutonomousCommitsLast1s(int nowMs) {
    _autonomousCommitMsWindow.removeWhere((t) => nowMs - t > 1000);
    return _autonomousCommitMsWindow.length;
  }

  // ignore: unused_element
  int _timeSinceLastAutonomousMs(int nowMs) {
    final last = _lastAutonomousCommitMs;
    if (last == null) return 1 << 30;
    return (nowMs - last).clamp(0, 1 << 30);
  }

  /// Temporary behavior pass: keep blink count observable, but route actions through
  /// the edge-triggered click path in [_updateFrame] only.
  ({int nextCount, bool dirty}) _detectIntent(int nextCount) {
    return (nextCount: nextCount, dirty: false);
  }

  void _updateFrameUi({
    required bool zoneOverlayDirty,
    required bool validGaze,
    required bool nextBlinking,
    required int nextCount,
    required bool blinkDominanceDirty,
    required bool pitchBandDirty,
    required String? nextPitchBand,
    required bool? nextBlinkDom,
    required double? nextBlinkLeftDrop,
    required double? nextBlinkRightDrop,
    required int nextAttentionDisplay,
    required int nextNativeAttention,
    required bool nextLikelyFake,
    required bool nextFakeStaticGaze,
    required bool nextFakePerfectStability,
    required bool nextFakeNoBlink,
  }) {
    final nextMotion = _eyeMotionFromGaze(
      validGaze: validGaze,
      blinking: nextBlinking,
    );
    final dbg = _debugNotifier.value;
    if (dbg.motion != nextMotion) {
      _safeDebugUiUpdate((debug) => debug.copyWith(motion: nextMotion));
    }

    _maybeLogVerboseFrame(
      DateTime.now().millisecondsSinceEpoch,
      'Blink: $nextBlinking | Count: $nextCount',
      intervalMs: 1000,
    );
    if (!mounted) return;
    if (zoneOverlayDirty ||
        nextBlinking != _isBlinking ||
        nextCount != _blinkCount ||
        blinkDominanceDirty ||
        pitchBandDirty ||
        nextAttentionDisplay != _displayAttentionScore ||
        nextNativeAttention != _nativeAttentionScore ||
        nextLikelyFake != _likelyFake ||
        nextFakeStaticGaze != _fakeStaticGaze ||
        nextFakePerfectStability != _fakePerfectStability ||
        nextFakeNoBlink != _fakeNoBlink) {
      _isBlinking = nextBlinking;
      _blinkCount = nextCount;
      if (_blinkCountNotifier.value != nextCount) {
        _safeBlinkCountUiUpdate(nextCount);
      }
      _blinkIsRightDominant = nextBlinkDom;
      _blinkLeftDrop = nextBlinkLeftDrop;
      _blinkRightDrop = nextBlinkRightDrop;
      _displayAttentionScore = nextAttentionDisplay;
      _nativeAttentionScore = nextNativeAttention;
      _likelyFake = nextLikelyFake;
      _fakeStaticGaze = nextFakeStaticGaze;
      _fakePerfectStability = nextFakePerfectStability;
      _fakeNoBlink = nextFakeNoBlink;
      if (pitchBandDirty) {
        _headPitchBand = nextPitchBand;
      }
    }
  }

  void _ensurePerfWindow(int nowMs) {
    if (_framePerf.windowStartMs == 0) {
      _framePerf.resetWindow(nowMs);
    }
  }

  void _maybeLogVerboseFrame(
    int nowMs,
    String message, {
    int intervalMs = 1000,
  }) {
    if (!kDebugMode || !_kVerbosePerFrameLogs) return;
    if (nowMs - _lastVerboseFrameLogMs < intervalMs) return;
    _lastVerboseFrameLogMs = nowMs;
    debugPrint(message);
  }

  void _maybeLogPerfSummary(int nowMs) {
    if (!kDebugMode) return;
    if (nowMs - _lastPerfSummaryMs < 1000) return;
    _lastPerfSummaryMs = nowMs;
    _ensurePerfWindow(nowMs);
    final windowMs = (nowMs - _framePerf.windowStartMs).clamp(1, 60000);
    final secs = windowMs / 1000.0;
    final cameraFps = _framePerf.cameraInputCount / secs;
    final processedFps = _framePerf.processedCount / secs;
    final avgEncodeMs = _framePerf.encodeSamples == 0
        ? 0.0
        : _framePerf.encodeTotalMs / _framePerf.encodeSamples;
    final avgChannelMs = _framePerf.channelSamples == 0
        ? 0.0
        : _framePerf.channelTotalMs / _framePerf.channelSamples;
    final avgPostprocessMs = _framePerf.postprocessSamples == 0
        ? 0.0
        : _framePerf.postprocessTotalMs / _framePerf.postprocessSamples;
    final invSum =
        _framePerf.droppedInvalidNoFace + _framePerf.droppedInvalidGaze;
    debugPrint(
      '[frame_perf] fps(camera=${cameraFps.toStringAsFixed(1)}, processed=${processedFps.toStringAsFixed(1)}) '
      'drop(throttle=${_framePerf.droppedThrottle}, busy=${_framePerf.droppedBusy}, '
      'invalid(sum=$invSum, noFace=${_framePerf.droppedInvalidNoFace}, gaze=${_framePerf.droppedInvalidGaze}) '
      'ms(avg encode=${avgEncodeMs.toStringAsFixed(2)}, channel=${avgChannelMs.toStringAsFixed(2)}, post=${avgPostprocessMs.toStringAsFixed(2)}) '
      'native(last decode=${_framePerf.lastNativeDecodeMs.toStringAsFixed(2)}, process=${_framePerf.lastNativeProcessMs.toStringAsFixed(2)}, total=${_framePerf.lastNativeTotalMs.toStringAsFixed(2)})',
    );
    _framePerf.resetWindow(nowMs);
  }

  ({
    double processedFps,
    double avgEncodeMs,
    double avgChannelMs,
    double lastNativeTotalMs,
  }) _debugHudFramePerf() {
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    if (_framePerf.windowStartMs == 0 || nowMs <= _framePerf.windowStartMs) {
      return (
        processedFps: 0.0,
        avgEncodeMs: 0.0,
        avgChannelMs: 0.0,
        lastNativeTotalMs: _framePerf.lastNativeTotalMs,
      );
    }
    final secs = (nowMs - _framePerf.windowStartMs) / 1000.0;
    if (secs < 0.001) {
      return (
        processedFps: 0.0,
        avgEncodeMs: 0.0,
        avgChannelMs: 0.0,
        lastNativeTotalMs: _framePerf.lastNativeTotalMs,
      );
    }
    final processedFps = _framePerf.processedCount / secs;
    final avgEncodeMs = _framePerf.encodeSamples == 0
        ? 0.0
        : _framePerf.encodeTotalMs / _framePerf.encodeSamples;
    final avgChannelMs = _framePerf.channelSamples == 0
        ? 0.0
        : _framePerf.channelTotalMs / _framePerf.channelSamples;
    return (
      processedFps: processedFps,
      avgEncodeMs: avgEncodeMs,
      avgChannelMs: avgChannelMs,
      lastNativeTotalMs: _framePerf.lastNativeTotalMs,
    );
  }

  @override
  Widget build(BuildContext context) {
    final nextViewSize = MediaQuery.sizeOf(context);
    final nextSafeTop = MediaQuery.paddingOf(context).top;
    _updateViewportSnapshot(nextViewSize, nextSafeTop);
    final preview = widget.controller.value.previewSize;
    if (preview == null) {
      return const ColoredBox(color: Colors.black);
    }
    // Preview buffer is typically landscape; swap for portrait cover fit.
    final previewW = preview.height;
    final previewH = preview.width;
    final confidenceHud = (!kDebugMode || !ConfidenceHud.debugShowConfidenceHud)
        ? null
        : () {
            final perf = _debugHudFramePerf();
            final invSum =
                _framePerf.droppedInvalidNoFace + _framePerf.droppedInvalidGaze;
            return ConfidenceHud(
              currentZone: _currentZone,
              fixationLabel: _fixationState.name,
              dwellProgress: _dwellProgress,
              trackingLabel: _trackingEngine.state.name,
              governanceStatus: ConfidenceHud.governanceStatusFromGate(
                _debugLastAutonomousGateResult,
              ),
              safetyStatus: ConfidenceHud.safetyStatusFromGate(
                _debugLastAutonomousGateResult,
              ),
              lastBlockedGate: _debugLastAutonomousBlockedGate,
              invalidSum: invSum,
              invalidNoFace: _framePerf.droppedInvalidNoFace,
              invalidGaze: _framePerf.droppedInvalidGaze,
              processedFps: perf.processedFps,
              avgEncodeMs: perf.avgEncodeMs,
              avgChannelMs: perf.avgChannelMs,
              lastNativeTotalMs: perf.lastNativeTotalMs,
              attentionScore: _verifiedAttentionScore,
              confidenceScore: _attentionConfidenceScore,
              fraudScore: _fraudScore,
              attentionState: _attentionRuntimeState,
              attentionValid: _attentionSessionValid,
            );
          }();

    return ColoredBox(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRect(
            child: ColorFiltered(
              colorFilter: _kPreviewBrightnessBoost,
              child: AnimatedScale(
                scale: _previewScale,
                duration: const Duration(milliseconds: 120),
                curve: Curves.easeOutBack,
                alignment: Alignment.center,
                child: FittedBox(
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                  child: SizedBox(
                    width: previewW,
                    height: previewH,
                    child: CameraPreview(widget.controller),
                  ),
                ),
              ),
            ),
          ),
          ValueListenableBuilder<Offset>(
            valueListenable: _pointerNotifier,
            builder: (context, p, _) {
              return Positioned(
                left: p.dx - 6,
                top: p.dy - 6,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.cyanAccent.withValues(alpha: 0.85),
                      boxShadow: const [
                        BoxShadow(
                          blurRadius: 6,
                          spreadRadius: 1,
                          color: Colors.black45,
                        ),
                      ],
                    ),
                    child: const SizedBox(width: 12, height: 12),
                  ),
                ),
              );
            },
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: ValueListenableBuilder<String?>(
                  valueListenable: uiPreloader.warmHint,
                  builder: (context, warm, _) {
                    return ValueListenableBuilder<DebugState>(
                      valueListenable: _debugNotifier,
                      builder: (context, debug, _) {
                        final activeFocused =
                            _focusLockedZone ?? warm ?? debug.zone;
                        return GazeZoneButtons(
                          focused: activeFocused,
                          selected: debug.selected,
                          zoneOffsets: _zoneOffsets,
                          zoneOpacity: _zoneOpacity,
                          compact: true,
                          influenceListenable: _influenceNotifier,
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ),
          if (confidenceHud != null)
            Positioned(
              top: 8,
              left: 8,
              child: SafeArea(
                bottom: false,
                child: IgnorePointer(child: confidenceHud),
              ),
            ),
          Positioned(
            top: 40,
            left: 4,
            right: 4,
            child: SafeArea(
              bottom: false,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      backgroundColor: Colors.black54,
                      foregroundColor: Colors.white70,
                    ),
                    onPressed: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (_) => AdminConsoleScreen(
                            engine: _adminConsole,
                          ),
                        ),
                      );
                    },
                    child: const Text('Admin', style: TextStyle(fontSize: 12)),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: WalletLedgerStrip(
                      ledger: _walletLedger,
                      walletId: _kEconomyDemoWalletId,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (defaultTargetPlatform == TargetPlatform.android)
            Positioned(
              top: 8,
              right: 8,
              child: SafeArea(
                child: Material(
                  color: Colors.black45,
                  borderRadius: BorderRadius.circular(8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextButton(
                        onPressed: _beginLeftCalibration,
                        child: const Text(
                          'Cal L',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: _beginRightCalibration,
                        child: const Text(
                          'Cal R',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: _requestNeutralYawAndSample,
                        child: const Text(
                          'Cal N',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: _startOpenEarCalibration,
                        child: const Text(
                          'Cal EAR',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      const Divider(height: 8, color: Colors.white24),
                      TextButton(
                        onPressed: () => _lockFocus('LEFT'),
                        child: const Text(
                          'Lock L',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: () => _lockFocus('CENTER'),
                        child: const Text(
                          'Lock C',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: () => _lockFocus('RIGHT'),
                        child: const Text(
                          'Lock R',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: _unlockFocus,
                        child: const Text(
                          'Unlock',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: _isExplorationMode
                            ? _exitExplorationMode
                            : _enterExplorationMode,
                        child: Text(
                          _isExplorationMode ? 'Exit Explore' : 'Explore',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => setState(() {
                          _autonomousExecution.emergencyKillSwitch =
                              !_autonomousExecution.emergencyKillSwitch;
                        }),
                        child: Text(
                          _autonomousExecution.emergencyKillSwitch
                              ? 'AO kill ON'
                              : 'AO kill OFF',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_currentZone != null && !_selectedAnnouncedForStint)
            Positioned(
              right: 12,
              bottom: 24,
              child: SafeArea(
                child: SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    value: _dwellSatisfiedForStint
                        ? 1
                        : max(_dwellProgress, _attentionRewardProgress),
                    strokeWidth: 3,
                    backgroundColor: Colors.white24,
                    color: Colors.white70,
                  ),
                ),
              ),
            ),
          if (_pendingAutonomousConfirm != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 100,
              child: SafeArea(
                child: Center(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      child: Text(
                        'Confirm ${_pendingAutonomousConfirm!.action.type.name} '
                        'on ${_pendingAutonomousConfirm!.action.targetZone}? '
                        '· 2 blinks confirm · 3+ cancel',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                          height: 1.25,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          Positioned(
            left: 12,
            bottom: 24,
            child: GestureDetector(
              onLongPress: defaultTargetPlatform == TargetPlatform.android
                  ? _requestHeadNeutralCalibration
                  : null,
              child: ValueListenableBuilder<int>(
                valueListenable: _blinkCountNotifier,
                builder: (context, blinkCount, _) {
                  return Text(
                    'Gaze: min=${_gazeMeasuredLeft?.toStringAsFixed(3) ?? '—'} '
                    'max=${_gazeMeasuredRight?.toStringAsFixed(3) ?? '—'} '
                    'yaw₀=${_neutralHeadYaw?.toStringAsFixed(3) ?? '—'}\n'
                    'EAR open: leftOpenEAR=${_leftOpenEar?.toStringAsFixed(3) ?? '—'} '
                    'rightOpenEAR=${_rightOpenEar?.toStringAsFixed(3) ?? '—'}'
                    '${_openEarCalibrating ? ' (${_openEarCalibrator.framesCollected}/${_openEarCalibrator.sampleCount})' : ''}\n'
                    'Calibration FSM: $_calibrationPhaseLabel\n'
                    'EAR norm: leftNorm=${_lastLeftNorm?.toStringAsFixed(2) ?? '—'} '
                    'rightNorm=${_lastRightNorm?.toStringAsFixed(2) ?? '—'}\n'
                    'EAR fatigue (mean): ${_earFatigueLevel?.toStringAsFixed(4) ?? '—'} '
                    '(baselineMean−currentMean)\n'
                    'Attention: $_displayAttentionScore (native $_nativeAttentionScore'
                    '${_earFatigueLevel != null && _earFatigueLevel! < 0.05 ? ', +0.1 fatigue' : ''})\n'
                    'Verified attention: ${_verifiedAttentionScore.toStringAsFixed(2)} '
                    '| conf=${_attentionConfidenceScore.toStringAsFixed(2)} '
                    '| tier=${_attentionRewardTier.name} '
                    '| x${_attentionRewardMultiplier.toStringAsFixed(2)} '
                    '| progress=${_attentionRewardProgress.toStringAsFixed(2)} '
                    '| fraud=${_fraudScore.toStringAsFixed(1)} '
                    '| state=${_attentionRuntimeState.name} '
                    '| valid=$_attentionSessionValid\n'
                    'Authenticity: likelyFake=$_likelyFake '
                    '(staticGaze=$_fakeStaticGaze perfectStab=$_fakePerfectStability noBlink=$_fakeNoBlink)\n'
                    'EAR blink close (dyn): ${_leftOpenEar != null && _rightOpenEar != null ? dynamicEarCloseThreshold((_leftOpenEar! + _rightOpenEar!) / 2).toStringAsFixed(3) : '—'} '
                    '(0.7×meanOpen)\n'
                    'Blinks: dwell, then close eyes (mean EAR<0.08) to select · 2=confirm · 3+=cancel\n'
                    'Blink: $_isBlinking | Count: $blinkCount\n'
                    'Blink drop: leftDrop=${_blinkLeftDrop?.toStringAsFixed(3) ?? '—'} '
                    'rightDrop=${_blinkRightDrop?.toStringAsFixed(3) ?? '—'} '
                    'isRightDominant=${_blinkIsRightDominant == null ? '—' : _blinkIsRightDominant!}\n'
                    'Zone: ${_currentZone ?? '—'}'
                    '${_currentZone != null && !_selectedAnnouncedForStint ? (_dwellSatisfiedForStint ? ' (blink to select)' : ' (dwell…)') : ''}'
                    '${_selectedAnnouncedForStint && _currentZone != null ? ' ✓' : ''}\n'
                    'Pitch: ${_headPitchBand ?? '—'}\n'
                    '${defaultTargetPlatform == TargetPlatform.android ? 'Long-press: head yaw only · Cal L/R/N: gaze + yaw₀.' : ''}',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                      height: 1.35,
                      shadows: [
                        Shadow(blurRadius: 4, color: Colors.black54),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
          ValueListenableBuilder<KernelTelemetry?>(
            valueListenable: _attentionKernel.telemetryNotifier,
            builder: (context, t, _) {
              if (t == null) return const SizedBox.shrink();
              return Positioned(
                right: 20,
                bottom: 30,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0x88000000),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DefaultTextStyle(
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('CONF: ${t.confidence.toStringAsFixed(2)}'),
                        Text('STAB: ${t.stability.toStringAsFixed(2)}'),
                        Text('HEAD: ${t.headPenalty.toStringAsFixed(2)}'),
                        Text('VEL: ${t.velocityPenalty.toStringAsFixed(2)}'),
                        Text('FIX: ${t.fixationDuration}ms'),
                        Text('STATE: ${t.isFixating}'),
                        Text('PASS: ${t.passed}'),
                        Text('REASON: ${t.reason}'),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
