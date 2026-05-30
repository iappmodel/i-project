import 'dart:async';
import 'dart:math';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'features/calibration/calibration_phase.dart';
import 'features/camera/camera_session_controller.dart';
import 'features/vision/frame_codec.dart';
import 'features/vision/frame_perf_metrics.dart';
import 'features/vision/vision_channel_bridge.dart';
import 'features/vision/vision_frame.dart';
import 'features/vision/y_plane_frame_codec.dart';
import 'features/gaze/drift_adjusted_gaze.dart';
import 'features/gaze/held_face_policy.dart';
import 'features/gaze/pipeline_frame_confidence.dart';
import 'features/gaze/pipeline_tracking_coordinator.dart';
import 'features/intent/zone_dwell_logic.dart';
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
import 'core/action_memory.dart';
import 'core/system.dart';
import 'core/system_state.dart';
import 'core/ui_sandbox.dart';
import 'engine/gaze_pipeline.dart';
import 'gaze_zone.dart';
import 'gaze_coordinate_space.dart';
import 'gaze_zone_buttons.dart';
import 'intent_influence_ui.dart';
import 'trajectory_buffer.dart';
import 'ui_preloader.dart';
import 'core/intent_os/action_context.dart';
import 'core/intent_os/action_request.dart';
import 'core/intent_os/autonomous_execution_kernel.dart';
import 'core/intent_os/autonomous_agent.dart';
import 'core/intent_os/intent_action.dart';
import 'core/intent_os/intent_engine.dart';
import 'core/intent_os/intent_event.dart';
import 'core/intent_os/intent_influence_pipeline.dart';
import 'core/intent_os/intent_predictor.dart';
import 'core/intent_os/kernel_evaluation_input.dart';
import 'core/intent_os/pop_action_executor.dart';
import 'core/pop/frame_coordinator.dart';
import 'core/pop/pop_runtime_config.dart';
import 'core/signal_stale_policy.dart';
import 'core/intent_os/intent_type.dart';
import 'core/intent_os/learning/collective_stats.dart';
import 'core/intent_os/learning/digital_twin_engine.dart';
import 'core/intent_os/learning/evolution_intent_bridge.dart';
import 'core/intent_os/learning/learning_engine.dart';
import 'core/intent_os/learning/learning_store.dart';
import 'core/intent_os/learning/ui_evolution_engine.dart';
import 'core/intent_os/ui_action_type.dart';
import 'core/intent_os/ui_state_snapshot.dart';
import 'core/stability/tracking_engine.dart';
import 'core/stability/tracking_state.dart';
import 'head_pitch_zone.dart';
import 'user_engagement_state.dart';
import 'debug_state.dart';
import 'performance/pipeline_performance_monitor.dart';
import 'proof/proof_live_loop_bridge.dart';
import 'proof/proof_session_context.dart';
import 'proof/proof_validator_bridge.dart';
import 'verification/verification_stability_layer.dart';

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

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  ProofValidatorBridge().install();
  runApp(const EyeTrackingApp());
}

/// Root widget: owns portrait + system UI chrome for the camera session.
final class EyeTrackingApp extends StatefulWidget {
  const EyeTrackingApp({super.key});

  @override
  State<EyeTrackingApp> createState() => _EyeTrackingAppState();
}

final class _EyeTrackingAppState extends State<EyeTrackingApp> {
  @override
  void dispose() {
    unawaited(SystemChrome.setPreferredOrientations(DeviceOrientation.values));
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: _FrontCameraScreen(),
    );
  }
}

final class _FrontCameraScreen extends StatefulWidget {
  const _FrontCameraScreen();

  @override
  State<_FrontCameraScreen> createState() => _FrontCameraScreenState();
}

final class _FrontCameraScreenState extends State<_FrontCameraScreen> {
  final CameraSessionController _cameraSession = CameraSessionController();

  /// Single future so [FutureBuilder] does not re-run initialization on rebuilds.
  late final Future<CameraController> _session = _cameraSession.open();

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
        return _FullScreenPreview(cameraSession: _cameraSession);
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
  const _FullScreenPreview({required this.cameraSession});

  final CameraSessionController cameraSession;

  @override
  State<_FullScreenPreview> createState() => _FullScreenPreviewState();
}

final class _FullScreenPreviewState extends State<_FullScreenPreview>
    with WidgetsBindingObserver {
  static const int _dwellReleaseMs = 200;
  static const int _kFrameSpacingMs = 80;
  static const double _blinkCloseThreshold = BlinkDetector.EAR_CLOSED_THRESHOLD;
  static const double _blinkOpenThreshold = BlinkDetector.rawOpenThreshold;

  final VisionChannelBridge _bridge = VisionChannelBridge();

  /// When true, a frame handler is running; skip new frames (no overlap / backpressure).
  bool _processingFrame = false;

  final BlinkDetector _blinkDetector = BlinkDetector();

  /// Zone commits on dwell/blink: use [_intentEngine.process] only — do not add new
  /// `if (_fixationState == FixationState.fixation) { _selectZone(...); }` paths in this widget.
  late final IntentEngine _intentEngine;

  late final GazeCollectiveIntentPredictor _intentPredictor;
  final AutonomousAgent _autonomousAgent = const AutonomousAgent();
  /// Single autonomous execution boundary (prefilter + governance + safety + optional kill switch).
  final AutonomousExecutionKernel _autonomousExecution = AutonomousExecutionKernel(
    emergencyKillSwitch: kDefaultEmergencyKillSwitch,
  );

  /// Unified zone/action executor — manual dwell+blink commits pass same gates as autonomous path.
  final PopActionExecutor _popActionExecutor = PopActionExecutor();

  final PopFrameCoordinator _frameCoordinator = PopFrameCoordinator();

  double? _lastNativeTotalMs;

  /// UI: tracking lost — show recalibration prompt overlay.
  bool _lostFacePaused = false;

  /// Last successful autonomous commit (ms since epoch) for [ActionContext.timeSinceLastActionMs].
  int? _lastAutonomousCommitMs;

  /// Recent autonomous commit timestamps for [ActionContext.recentActionsLast1s] burst cap.
  final List<int> _autonomousCommitMsWindow = <int>[];

  /// Prevents re-entrant or concurrent autonomous side effects from [_applyAutonomousSideEffects].
  bool _executionLock = false;

  /// True only while inside [AutonomousExecutionKernel.tryExecute]'s execute closure (dev assert in [_applyAutonomousSideEffects]).
  bool _cameFromKernel = false;

  /// Autonomous [UIAction] awaiting second-blink confirm; cleared on execute, cancel blink, or timeout.
  ActionRequest? _pendingAutonomousConfirm;
  Timer? _autonomousConfirmTimer;

  final IntentInfluenceEngine _influenceEngine = IntentInfluenceEngine();

  /// Latest presentation influence from [_intentPredictor] → [_influenceEngine];
  /// does not affect dwell/select logic. UI may listen for hitbox / opacity / magnetism.
  final ValueNotifier<IntentInfluence?> _influenceNotifier =
      ValueNotifier<IntentInfluence?>(null);

  final EvolutionSignalBuffer _evolutionSignalBuffer = EvolutionSignalBuffer();
  final UIEvolutionEngine _uiEvolutionEngine = UIEvolutionEngine();

  /// Presentation-only: [IntentInfluence] weight smoothed by ×0.9 each frame, then merged with max(fresh).
  double _influenceWeightDisplay = 0.0;
  String? _influenceZoneDisplay;

  /// Zone dwell duration from [LearningStore.behavior] ([BehaviorProfile.avgDwellMs]),
  /// scaled by [CollectiveZoneStats.dwellMultiplierFor] (shorter dwell on collectively popular zones).
  double get _zoneDwellMs {
    return effectiveZoneDwellMs(
      avgDwellMs: _intentEngine.learningStore.behavior.avgDwellMs,
      currentZone: _currentZone,
      dwellMultiplierFor: _intentEngine.learningStore.collectiveZones
          .dwellMultiplierFor,
    );
  }

  /// Band label for pipeline sandbox (selection over live band).
  String get _activeZoneForPipeline {
    return activeZoneForPipeline(
      displaySelectedZone: _displaySelectedZone,
      currentZone: _currentZone,
    );
  }

  int get _dwellProgressMs => dwellProgressMs(
        dwellProgress: _dwellProgress,
        zoneDwellMs: _zoneDwellMs,
      );

  String _zoneFromGaze(double gazeX) => resolveZoneFromGaze(
        rawGazeX: gazeX,
        measuredLeft: _gazeMeasuredLeft,
        measuredRight: _gazeMeasuredRight,
      );

  /// Kernel [KernelEvaluationInput.autonomyLevel]: \([0,1]\) from [BehaviorProfile.userTrustScore].
  double get _autonomyLevel =>
      _intentEngine.learningStore.behavior.userTrustScore;

  /// `UP` / `DOWN` from [getHeadPitchBand]; `null` when pitch is mid or unavailable.
  String? _headPitchBand;

  /// Discrete gaze band after [updateZone] stability + dwell; `null` when raw gaze unavailable.
  String? _currentZone;
  /// When gaze last entered [_currentZone]; drives dwell timing.
  DateTime? _zoneStart;
  /// True once gaze has stayed in `_currentZone` longer than [_zoneDwellMs] this stint.
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
  final FramePerfMetrics _framePerf = FramePerfMetrics();

  /// Observe-only: rolling pipeline stage timings for debug HUD (no processing changes).
  final PipelinePerformanceMonitor _pipelinePerf = PipelinePerformanceMonitor();
  PipelinePerformanceSnapshot _pipelinePerfSnapshot =
      PipelinePerformanceSnapshot.empty;
  int _frameArrivalMs = 0;
  double _lastPipelineCaptureMs = 0;
  double _lastPipelineEncodeMs = 0;
  double _lastPipelineChannelMs = 0;
  double? _lastPipelineNativeDecodeMs;
  double? _lastPipelineNativeProcessMs;
  double? _lastPipelineNativeTotalMs;
  bool _lastFacePipelineTimed = false;

  /// Observe-only: smooths runtime signals for operator verification HUD (no dwell/reward control).
  final VerificationStabilityLayer _verificationStability =
      VerificationStabilityLayer();
  VerificationStabilitySnapshot _verificationSnapshot =
      VerificationStabilitySnapshot.empty;

  /// Proof packet capture for the live camera/vision loop (local bus emission only).
  final ProofLiveLoopBridge _proofBridge = ProofLiveLoopBridge();

  /// Reuse last good native frame for this long when detection drops (reduces flicker).
  static const int _faceHoldMs = 500;

  int _lastFaceSeenMs = 0;

  /// True while a live or held-within-[_faceHoldMs] face is driving the pipeline (for UI / future use).
  // ignore: unused_field
  bool _faceLocked = false;

  VisionFrame? _lastHeldFace;

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
  final AttentionKernel _attentionKernel = AttentionKernel();

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
  final LearningEngine _learningEngine = LearningEngine();
  final List<ActionMemory> _actionHistory = [];
  static const int _kMaxActionHistory = 32;
  final TrajectoryBuffer trajectoryBuffer = TrajectoryBuffer();
  final UIPreloader uiPreloader = UIPreloader();
  final TemporalPredictor _predictor = TemporalPredictor();
  final predictive_preloader.UIPreloader _preloader =
      predictive_preloader.UIPreloader();
  List<PredictedIntent> _latestPredictions = const <PredictedIntent>[];
  final Map<String, double> _predictionWeights = <String, double>{};
  int _lastPreloadMs = 0;
  static const int preloadCooldownMs = 100;
  final GazeFixation _gazeFixation = GazeFixation();
  final TrackingEngine _trackingEngine = TrackingEngine();

  bool get _isTrackingState =>
      _trackingEngine.state == TrackingState.tracking;

  void _updatePredictionWeight(String source, double weight) {
    _predictionWeights[source] = weight.clamp(0.0, 1.0);
  }

  /// Same trace buffer the pipeline writes to; used for [GazeFixation.update].
  GazeBuffer get _gazeTraceBuffer => _pipeline.buffer;

  FixationState _fixationState = FixationState.unstable;
  final double _baselineX = 0.09;
  final double _baselineY = 0.0;

  /// Last values from [BlinkDetector.updateEar] for overlay / logging.
  bool _isBlinking = false;
  int _blinkCount = 0;

  /// Prior frame for simple mean-EAR “closed” edge ([_trySelectZoneOnMeanEarClosedEdge]); separate from [BlinkDetector] FSM.
  bool _wasBlinking = false;

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
  bool _visionChannelError = false;

  /// Average left / right EAR while eyes open ([OpenEarCalibrator]); drives [normalizedEarPair].
  double? _leftOpenEar;
  double? _rightOpenEar;

  /// Last `leftNorm` / `rightNorm` from [normalizedEarPair] for overlay (updated when face + baselines).
  double? _lastLeftNorm;
  double? _lastRightNorm;

  /// Mean `(left+right)/2` open baseline minus current mean EAR ([earFatigueLevel]); `null` until calibrated.
  double? _earFatigueLevel;

  /// [attentionWithFatigueBonus] applied to native [VisionFrame.attentionScore] for overlay / UX.
  int _displayAttentionScore = 0;

  /// Last native `attentionScore` from Android (before fatigue bonus).
  int _nativeAttentionScore = 0;

  bool _likelyFake = false;
  bool _fakeStaticGaze = false;
  bool _fakePerfectStability = false;
  bool _fakeNoBlink = false;

  UserEngagementState _userEngagementState = UserEngagementState.attentive;

  bool get _isCalibrationReady => isCalibrationReadyFromSamples(
        gazeYaw: GazeYawCalibrationSamples(
          gazeMeasuredLeft: _gazeMeasuredLeft,
          gazeMeasuredRight: _gazeMeasuredRight,
          neutralHeadYaw: _neutralHeadYaw,
        ),
        leftOpenEar: _leftOpenEar,
        rightOpenEar: _rightOpenEar,
      );

  bool get _isCalibrationBusy =>
      isCalibrationBusy(_calibrationPhase);

  String get _calibrationPhaseLabel =>
      calibrationPhaseLabel(_calibrationPhase);

  void _setCalibrationPhase(CalibrationPhase phase) {
    if (_calibrationPhase == phase) return;
    if (!mounted) return;
    setState(() => _calibrationPhase = phase);
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
    final plan = calibrationBeginCapturePlan(CalibrationBeginCaptureKind.leftGaze);
    setState(() {
      if (plan.pendingCaptureLeft != null) {
        _pendingCaptureLeft = plan.pendingCaptureLeft!;
      }
      _calibrationPhase = plan.phase;
    });
  }

  void _beginRightCalibration() {
    if (defaultTargetPlatform != TargetPlatform.android || !mounted) return;
    final plan = calibrationBeginCapturePlan(CalibrationBeginCaptureKind.rightGaze);
    setState(() {
      if (plan.pendingCaptureRight != null) {
        _pendingCaptureRight = plan.pendingCaptureRight!;
      }
      _calibrationPhase = plan.phase;
    });
  }

  /// Animates to 1.0 via [AnimatedScale] after first frame.
  double _previewScale = _kPreviewScaleRevealStart;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _proofBridge.startSession(
      ProofSessionContext.start(startedAt: DateTime.now().toUtc()),
    );
    _intentEngine = IntentEngine(LearningStore(), System.bus);
    _intentPredictor =
        GazeCollectiveIntentPredictor(_intentEngine.learningStore.collectiveZones);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _previewScale = 1.0);
      unawaited(widget.cameraSession.startStream(_onCameraImage));
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _proofBridge.setForeground(state == AppLifecycleState.resumed);
  }

  @override
  void dispose() {
    if (_proofBridge.isActive &&
        (_proofBridge.emitter.collector?.totalFrames ?? 0) > 0) {
      try {
        _proofBridge.sealAndEmit(
          artifactId: 'PP-LIVE-END',
          vslSnapshot: _verificationSnapshot,
        );
      } catch (e) {
        debugPrint('PROOF_SEAL_ON_DISPOSE_FAILED: $e');
      }
    }
    WidgetsBinding.instance.removeObserver(this);
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

  Future<void> _requestHeadNeutralCalibration() => _bridge.calibrateHeadPose();

  /// Stores [neutralYaw] = current raw yaw on the next frame; also tells native to zero relative yaw.
  Future<void> _requestNeutralYawAndSample() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    if (!mounted) return;
    final plan = calibrationBeginCapturePlan(
      CalibrationBeginCaptureKind.neutralHeadYaw,
    );
    setState(() {
      if (plan.pendingCaptureNeutralYaw != null) {
        _pendingCaptureNeutralYaw = plan.pendingCaptureNeutralYaw!;
      }
      _calibrationPhase = plan.phase;
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
      _userEngagementState = UserEngagementState.attentive;
      _openEarCalibrator.start();
      _calibrationPhase = CalibrationPhase.samplingOpenEar;
    });
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
    _debugNotifier.value = _debugNotifier.value.copyWith(selected: zone);
    _selectedAnnouncedForStint = true;
    _intentEngine.syncDwellReady(true);
    final zoneStart = _zoneStart;
    if (zoneStart != null) {
      _proofBridge.recordDwellSatisfied(
        zone: zone,
        zoneStartMs: zoneStart.millisecondsSinceEpoch,
        nowMs: DateTime.now().millisecondsSinceEpoch,
      );
    }
    debugPrint('DWELL_READY: $zone');
  }

  void _sealProofPacketDebug() {
    debugPrint('PROOF_SEAL_TAP');
    if (!_proofBridge.isActive) {
      debugPrint('PROOF_SEAL_FAILED: no active proof session');
      return;
    }
    try {
      final event = _proofBridge.sealAndEmit(
        artifactId:
            'PP-LIVE-${DateTime.now().toUtc().millisecondsSinceEpoch}',
        vslSnapshot: _verificationSnapshot,
      );
      debugPrint(
        'PROOF_SEALED: ${event.artifactId} session=${event.sessionId}',
      );
      _proofBridge.startSession(
        ProofSessionContext.start(startedAt: DateTime.now().toUtc()),
      );
    } catch (e) {
      debugPrint('PROOF_SEAL_FAILED: $e');
    }
  }

  /// Applies zone label side effects only — callers must pass safety gates first.
  bool _applyZoneSelectSideEffects(String zone) {
    if (!_isTrackingState) return false;
    _selectedAnnouncedForStint = true;
    _displaySelectedZone = zone;
    _debugNotifier.value = _debugNotifier.value.copyWith(selected: zone);
    _intentEngine.learningStore.collectiveZones.recordSelection(zone);
    final IntentInfluence? inf = _influenceNotifier.value;
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

  /// Zone select through [PopActionExecutor] safety chain (Stage 3 keystone).
  bool _requestZoneSelect(
    String zone, {
    required double confidence,
    required bool likelyFake,
    required int nowMs,
  }) {
    var applied = false;
    final gate = _popActionExecutor.tryZoneSelect(
      zone: zone,
      confidence: confidence,
      fixationState: _fixationState,
      dwellProgress: _dwellProgress,
      dwellMs: _dwellProgressMs,
      nowMs: nowMs,
      isTracking: _isTrackingState,
      calibrationBusy: _isCalibrationBusy,
      visionError: _visionChannelError,
      userIsDistracted: _userEngagementState == UserEngagementState.zoningOut,
      autonomyLevel: _autonomyLevel,
      stabilityVariance: _pipeline.varianceX(),
      riskScore: 0.0,
      likelyFake: likelyFake,
      onAllowed: () {
        applied = _applyZoneSelectSideEffects(zone);
      },
    );
    if (gate != AutonomousActionGateResult.allowed) {
      debugPrint('ZONE_SELECT_BLOCKED: $zone gate=${gate.name}');
    }
    return applied;
  }

  void _onCameraImage(CameraImage image) {
    if (!mounted) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    _ensurePerfWindow(now);
    _framePerf.cameraInputCount++;
    _pipelinePerf.recordCameraInput(now);
    if (now - _lastFrameMs < _kFrameSpacingMs) {
      _framePerf.droppedThrottle++;
      _pipelinePerf.recordDrop(PipelineDropKind.throttle, now);
      _maybeLogPerfSummary(now);
      return;
    } // ~12 FPS (stable)
    _lastFrameMs = now;
    if (_processingFrame) {
      _framePerf.droppedBusy++;
      _pipelinePerf.recordDrop(PipelineDropKind.busy, now);
      _maybeLogPerfSummary(now);
      return;
    }
    _frameArrivalMs = now;
    _processingFrame = true;
    _maybeLogPerfSummary(now);
    unawaited(_updateFrame(image));
  }

  /// One frame: native face → gaze → normalize → zone → blink → intent → attention → UI.
  Future<void> _updateFrame(CameraImage image) async {
    final totalSw = Stopwatch()..start();
    var dartPostMs = 0.0;
    var pipelineValid = false;
    try {
      if (!mounted) return;
      if (defaultTargetPlatform != TargetPlatform.android) return;

      _visionChannelError = false;
      if (_frameCoordinator.shouldAdaptiveSkip(
        nativeTotalMs: _lastNativeTotalMs,
        budgetMs: kNativeProcessBudgetMs,
      )) {
        _frameCoordinator.droppedAdaptiveSkip++;
        return;
      }
      final fresh = await _processFace(image);
      final postprocessSw = Stopwatch()..start();
      final now = DateTime.now().millisecondsSinceEpoch;
      final held = resolveHeldFace(
        fresh: fresh,
        nowMs: now,
        lastFaceSeenMs: _lastFaceSeenMs,
        lastHeldFace: _lastHeldFace,
        faceHoldMs: _faceHoldMs,
      );
      VisionFrame? face = held.face;
      if (held.refreshHoldState) {
        _lastFaceSeenMs = held.holdAnchorMs!;
        _faceLocked = true;
        _lastHeldFace = face;
      }

      _lastNativeTotalMs = face?.nativeTotalMs ?? fresh?.nativeTotalMs;
      if (face != null) {
        _lostFacePaused = false;
        if (_frameCoordinator.isStale(now)) {
          _clearZoneTracking();
          _popActionExecutor.reset();
        }
      }
      _frameCoordinator.markProcessed(now);

      final isValidFrame = face != null;
      final faceDetected = face != null;

      if (!isValidFrame) {
        _framePerf.droppedInvalid++;
        _pipelinePerf.recordDrop(PipelineDropKind.invalid, now);
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
        _verificationStability.reset();
        _verificationSnapshot = VerificationStabilitySnapshot.empty;
        _pipelinePerf.reset();
        _pipelinePerfSnapshot = PipelinePerformanceSnapshot.empty;
        _gazeSessionSamples = 0;
        _popActionExecutor.reset();
        _frameCoordinator.reset();
        _lostFacePaused = true;
        _lastNativeTotalMs = null;
        smoothGazeX = 0;
        smoothGazeY = 0;
        final d = _debugNotifier.value;
        if (d.motion != EyeMotionState.noFace) {
          _debugNotifier.value = d.copyWith(motion: EyeMotionState.noFace);
        }
        _proofBridge.onStableGazeTick(
          nowMs: now,
          stable: false,
          zone: _currentZone ?? 'CENTER',
          confidence: 0,
        );
        final verificationDirty = _feedVerificationStability(
          nowMs: now,
          blinkDetected: false,
          validFrame: false,
        );
        _feedProofSession(
          nowMs: now,
          validFrame: false,
          blinkDetected: false,
          likelyFake: false,
        );
        if (verificationDirty && mounted) setState(() {});
        postprocessSw.stop();
        dartPostMs = postprocessSw.elapsedMicroseconds / 1000.0;
        _emitPipelinePerfSample(
          timestampMs: now,
          dartPostMs: dartPostMs,
          totalMs: totalSw.elapsedMicroseconds / 1000.0,
          validFrame: false,
        );
        return;
      }

      final drift = _intentEngine.learningStore.profile.calibrationDrift;
      final driftGaze = resolveDriftAdjustedGaze(
        gazeXRaw: face.gazeX,
        gazeYRaw: face.gazeY?.toDouble(),
        calibrationDrift: drift,
      );
      double? effectiveGazeX = driftGaze.rawX;
      double? effectiveGazeY = driftGaze.rawY;
      final rawX = effectiveGazeX;
      final rawY = effectiveGazeY;
      if (rawX == null || rawY == null) {
        _framePerf.droppedInvalid++;
        _pipelinePerf.recordDrop(PipelineDropKind.invalid, now);
        postprocessSw.stop();
        dartPostMs = postprocessSw.elapsedMicroseconds / 1000.0;
        _emitPipelinePerfSample(
          timestampMs: now,
          dartPostMs: dartPostMs,
          totalMs: totalSw.elapsedMicroseconds / 1000.0,
          validFrame: false,
        );
        return;
      }
      if (!rawX.isFinite || !rawY.isFinite) {
        _framePerf.droppedInvalid++;
        _pipelinePerf.recordDrop(PipelineDropKind.invalid, now);
        postprocessSw.stop();
        dartPostMs = postprocessSw.elapsedMicroseconds / 1000.0;
        _emitPipelinePerfSample(
          timestampMs: now,
          dartPostMs: dartPostMs,
          totalMs: totalSw.elapsedMicroseconds / 1000.0,
          validFrame: false,
        );
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

      final rawMeanBaseline =
          rawMeanOpenEarBaseline(_leftOpenEar, _rightOpenEar);

      final frameConf = resolvePipelineFrameConfidence(
        headYaw: face.headYaw,
        headPitch: face.headPitch,
        hasLandmarks: face.landmarks.isNotEmpty,
        leftEar: face.leftEar ?? 0,
        rightEar: face.rightEar ?? 0,
      );
      final filterAlpha = frameConf.filterAlpha;

      final tick = runPipelineAndTrackingTick(
        pipeline: _pipeline,
        tracking: _trackingEngine,
        x: rawX,
        y: rawY,
        now: now,
        blink: _isBlinking,
        headYaw: face.headYaw,
        headPitch: face.headPitch,
        filterAlpha: filterAlpha,
        faceDetected: faceDetected,
      );
      final result = tick.result;
      final isValid = tick.isValid;
      final qualityClamped = tick.qualityClamped;
      Offset? pipelineGaze;

      if (!isValid) {
        zoneOverlayDirty |= _clearZoneTracking();
        _pointerController.reset(); // important
        _influenceNotifier.value = null;
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
            gazeBand: _zoneFromGaze(px),
          ),
        );
        if (_kVerbosePerFrameLogs && now % 500 < 50) {
          debugPrint(
            'state: $_fixationState | quality: ${result.quality}',
          );
        }
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
        _latestPredictions = predictions;
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
          debugPrint("GazeX: $gazeX");
        }
        final bool stable =
            _gazeTraceBuffer.hasEnough &&
            (result.varX ?? 1) < 0.00003 &&
            (result.varY ?? 1) < 0.00003;

        final stableFixation =
            stable && _fixationState == FixationState.fixation;
        _proofBridge.onStableGazeTick(
          nowMs: now,
          stable: stableFixation,
          zone: _zoneFromGaze(smoothGazeX),
          confidence: (result.quality ?? 1.0).clamp(0.0, 1.0),
        );
        if (stableFixation) {
          zoneOverlayDirty |= updateZone(smoothGazeX);
        } else if (_currentZone != null && !_dwellSatisfiedForStint) {
          _zoneStart = DateTime.now();
          if (_dwellProgress != 0) {
            _dwellProgress = 0;
            zoneOverlayDirty = true;
          }
        }

        final gb = _zoneFromGaze(smoothGazeX);
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
        _influenceNotifier.value = _influenceZoneDisplay != null
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
      final double? ear = meanEarFromPairIfFinite(leftEar: face.leftEar, rightEar: face.rightEar);
      final blink = updateBlink(ear, rawMeanBaseline: rawMeanBaseline);
      zoneOverlayDirty |= _trySelectZoneOnBlinkEdge(
        isBlinking: blink['isBlinking']! as bool,
        hasFace: face.landmarks.isNotEmpty,
        now: now,
        faceConfidence: face.faceConfidence,
        likelyFake: face.likelyFake,
      );
      final nextBlinking = blink['isBlinking']! as bool;
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
          headPenalty: (1.0 - frameConf.headConfidence).clamp(0.0, 1.0).toDouble(),
        );

        if (attention != null) {
          _pointerController.baselineX = _baselineX;
          _pointerController.baselineY = _baselineY;
          _pointerController.setLayoutSize(_viewSize);
          final pointerPosition =
              _pointerController.update(attention.gaze, attention.stability);
          if (pointerPosition != null) {
            var pointer = pointerPosition;
            final inf = _influenceNotifier.value;
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
            _pointerNotifier.value = pointer;
          }
        }
      }

      zoneOverlayDirty |= _computeAttention(
        face: face,
        normalizedGazeX: norm.normalizedGazeX,
        nextBlinking: nextBlinking,
      );

      final nextAttentionDisplay = attentionWithFatigueBonus(
        nativeAttention: face.attentionScore,
        fatigueLevel: _earFatigueLevel,
      );
      if (nextAttentionDisplay != _displayAttentionScore ||
          face.attentionScore != _nativeAttentionScore) {
        zoneOverlayDirty = true;
      }

      final intent = _detectIntent(blink['blinkCount']! as int);
      var nextCount = intent.nextCount;
      zoneOverlayDirty |= intent.dirty;

      zoneOverlayDirty |= _feedVerificationStability(
        nowMs: now,
        zone: isValid ? (_currentZone ?? _zoneFromGaze(smoothGazeX)) : null,
        gazeX: isValid ? smoothGazeX : driftGaze.rawX,
        normalizedGazeX: norm.normalizedGazeX,
        meanEar: ear,
        blinkDetected: nextBlinking,
        validFrame: isValid,
        dwellReady: _dwellSatisfiedForStint,
      );
      _feedProofSession(
        nowMs: now,
        validFrame: isValid,
        blinkDetected: nextBlinking,
        likelyFake: face.likelyFake,
      );

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
      dartPostMs = postprocessSw.elapsedMicroseconds / 1000.0;
      pipelineValid = isValid;
      _framePerf.postprocessTotalMs += dartPostMs;
      _framePerf.postprocessSamples++;
      _framePerf.processedCount++;
      _emitPipelinePerfSample(
        timestampMs: now,
        dartPostMs: dartPostMs,
        totalMs: totalSw.elapsedMicroseconds / 1000.0,
        validFrame: pipelineValid,
      );
      _maybeLogPerfSummary(now);
    } on PlatformException catch (e) {
      _visionChannelError = true;
      debugPrint('processFrame: ${e.message}');
    } catch (e) {
      _visionChannelError = true;
      debugPrint('processFrame failed: $e');
    } finally {
      _processingFrame = false;
    }
  }

  void _emitPipelinePerfSample({
    required int timestampMs,
    required double dartPostMs,
    required double totalMs,
    required bool validFrame,
  }) {
    if (!_lastFacePipelineTimed) return;
    _lastFacePipelineTimed = false;
    final snap = _pipelinePerf.ingest(
      PipelineProcessedFrameSample(
        timestampMs: timestampMs,
        captureMs: _lastPipelineCaptureMs > 0 ? _lastPipelineCaptureMs : null,
        encodeMs: _lastPipelineEncodeMs,
        channelMs: _lastPipelineChannelMs,
        nativeDecodeMs: _lastPipelineNativeDecodeMs,
        nativeProcessMs: _lastPipelineNativeProcessMs,
        nativeTotalMs: _lastPipelineNativeTotalMs,
        dartPostMs: dartPostMs,
        totalMs: totalMs,
        validFrame: validFrame,
      ),
    );
    _pipelinePerfSnapshot = snap;
    if (mounted && kShowPerfHud) setState(() {});
  }

  Future<VisionFrame?> _processFace(CameraImage image) async {
    if (!mounted) return null;
    final encodeStartMs = DateTime.now().millisecondsSinceEpoch;
    _lastPipelineCaptureMs = _frameArrivalMs > 0
        ? (encodeStartMs - _frameArrivalMs).toDouble()
        : 0;
    final encodeSw = Stopwatch()..start();
    final VisionFrame? face;
    if (shouldUseExperimentalYPlaneTransport()) {
      final rotation =
          widget.cameraSession.controller.description.sensorOrientation;
      final payload = cameraImageToVisionChannelPayload(
        image,
        rotationDegrees: rotation,
      );
      encodeSw.stop();
      _lastPipelineEncodeMs = encodeSw.elapsedMicroseconds / 1000.0;
      _framePerf.encodeTotalMs += _lastPipelineEncodeMs;
      _framePerf.encodeSamples++;
      final channelSw = Stopwatch()..start();
      face = await _bridge.processFramePayload(payload);
      channelSw.stop();
      _lastPipelineChannelMs = channelSw.elapsedMicroseconds / 1000.0;
    } else {
      final bytes = cameraImageToJpegBytes(image);
      encodeSw.stop();
      _lastPipelineEncodeMs = encodeSw.elapsedMicroseconds / 1000.0;
      _framePerf.encodeTotalMs += _lastPipelineEncodeMs;
      _framePerf.encodeSamples++;
      final channelSw = Stopwatch()..start();
      face = await _bridge.processFrame(bytes);
      channelSw.stop();
      _lastPipelineChannelMs = channelSw.elapsedMicroseconds / 1000.0;
    }
    _framePerf.channelTotalMs += _lastPipelineChannelMs;
    _framePerf.channelSamples++;
    _lastFacePipelineTimed = true;
    _lastPipelineNativeDecodeMs = null;
    _lastPipelineNativeProcessMs = null;
    _lastPipelineNativeTotalMs = null;
    if (face == null) return null;
    if (face.nativeDecodeMs != null) {
      _framePerf.lastNativeDecodeMs = face.nativeDecodeMs!;
      _lastPipelineNativeDecodeMs = face.nativeDecodeMs;
    }
    if (face.nativeProcessMs != null) {
      _framePerf.lastNativeProcessMs = face.nativeProcessMs!;
      _lastPipelineNativeProcessMs = face.nativeProcessMs;
    }
    if (face.nativeTotalMs != null) {
      _framePerf.lastNativeTotalMs = face.nativeTotalMs!;
      _lastPipelineNativeTotalMs = face.nativeTotalMs;
    }
    if (kDebugMode && _kVerbosePerFrameLogs) {
      final lStr =
          face.leftEar != null ? face.leftEar!.toStringAsFixed(4) : 'n/a';
      final rStr =
          face.rightEar != null ? face.rightEar!.toStringAsFixed(4) : 'n/a';
      debugPrint('EAR L: $lStr | EAR R: $rStr');
      debugPrint('Landmarks: ${face.landmarks.length}');
      debugPrint(
        'LeftEye: ${face.leftEye.length} | RightEye: ${face.rightEye.length}',
      );
    }
    return face;
  }

  void _computeGaze(VisionFrame face) {
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
  /// **Calibration tuning:** capture quality (multi-frame median, fixation gate) and
  /// wiring normalized gaze into [getZone]/dwell — see docs/technical/CALIBRATION_TUNING_PLAN.md.
  ///
  /// [effectiveGazeX] is live gaze from the current frame while a face is active, or null on hard loss.
  ({double? normalizedGazeX, bool calibrationDirty}) _normalize(
    VisionFrame face, {
    required double? effectiveGazeX,
  }) {
    var calibrationDirty = false;
    final gazeX = effectiveGazeX;
    if (shouldApplyLeftGazeSample(
      pendingLeft: _pendingCaptureLeft,
      gazeX: gazeX,
    )) {
      _gazeMeasuredLeft = gazeX;
      _pendingCaptureLeft = false;
      calibrationDirty = true;
      debugPrint('Gaze min (look-left) captured: $gazeX');
      _refreshCalibrationStateMachine();
    }
    if (shouldApplyRightGazeSample(
      pendingRight: _pendingCaptureRight,
      gazeX: gazeX,
    )) {
      _gazeMeasuredRight = gazeX;
      _pendingCaptureRight = false;
      calibrationDirty = true;
      debugPrint('Gaze max (look-right) captured: $gazeX');
      _refreshCalibrationStateMachine();
    }
    final headYawRaw = face.headYawRaw;
    if (shouldApplyNeutralHeadYawSample(
      pendingNeutral: _pendingCaptureNeutralYaw,
      headYawRaw: headYawRaw,
    )) {
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

  /// Calibrated gaze → zone band, then dwell lock via [resolveZoneDwellAdvance].
  bool updateZone(double gazeX) {
    final zone = _zoneFromGaze(gazeX);
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
    if (_currentZone != null || _zoneStart != null) {
      final nowMs = DateTime.now().millisecondsSinceEpoch;
      _proofBridge.recordZoneTransition(
        fromZone: _currentZone,
        fromZoneStartMs: _zoneStart?.millisecondsSinceEpoch,
        nowMs: nowMs,
        wasSatisfied: _dwellSatisfiedForStint,
      );
      zoneOverlayDirty = true;
    }
    _currentZone = null;
    _zoneStart = null;
    _dwellSatisfiedForStint = false;
    _intentEngine.syncDwellReady(false);
    _dwellProgress = 0;
    _selectedAnnouncedForStint = false;
    _displaySelectedZone = '';
    _debugNotifier.value = _debugNotifier.value.copyWith(selected: '');
    _wasBlinking = false;
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

  /// On band change, resets `_zoneStart`; same band dwells until `_zoneDwellMs` then [_markDwellSatisfied].
  bool _advanceZoneDwell(String zone) {
    var zoneOverlayDirty = false;
    if (_debugNotifier.value.zone != zone) {
      _debugNotifier.value = _debugNotifier.value.copyWith(zone: zone);
    }
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final result = resolveZoneDwellAdvance(
      zone: zone,
      currentZone: _currentZone,
      zoneStartMs: _zoneStart?.millisecondsSinceEpoch,
      nowMs: nowMs,
      zoneDwellMs: _zoneDwellMs,
      dwellReleaseMs: _dwellReleaseMs,
      dwellSatisfiedForStint: _dwellSatisfiedForStint,
      dwellProgress: _dwellProgress,
      selectedAnnouncedForStint: _selectedAnnouncedForStint,
      displaySelectedZone: _displaySelectedZone,
    );
    if (result.zoneBandChanged) {
      _proofBridge.recordZoneTransition(
        fromZone: _currentZone,
        fromZoneStartMs: _zoneStart?.millisecondsSinceEpoch,
        nowMs: nowMs,
        wasSatisfied: _dwellSatisfiedForStint,
      );
    }
    if (result.callSyncDwellReadyFalse) {
      _intentEngine.syncDwellReady(false);
    }
    if (result.shouldMarkDwellSatisfied) {
      _markDwellSatisfied(zone);
      return true;
    }
    if (result.zoneBandChanged) {
      _currentZone = result.nextCurrentZone;
      _zoneStart = DateTime.fromMillisecondsSinceEpoch(result.nextZoneStartMs!);
      _dwellSatisfiedForStint = result.nextDwellSatisfiedForStint;
      _dwellProgress = result.nextDwellProgress;
      _selectedAnnouncedForStint = result.nextSelectedAnnouncedForStint;
      _displaySelectedZone = result.nextDisplaySelectedZone;
      if (result.resetWasBlinking) _wasBlinking = false;
      _debugNotifier.value = _debugNotifier.value.copyWith(selected: '');
      zoneOverlayDirty = true;
    } else if (result.zoneOverlayDirty) {
      _dwellSatisfiedForStint = result.nextDwellSatisfiedForStint;
      _dwellProgress = result.nextDwellProgress;
      zoneOverlayDirty = true;
    }
    return zoneOverlayDirty;
  }

  String? _headPitchBandFromFace(VisionFrame face) {
    final headPitch = face.headPitch;
    return headPitch != null ? getHeadPitchBand(headPitch) : null;
  }

  /// Returns true when `_headPitchBand` should update.
  bool _refreshHeadPose(VisionFrame face) {
    final next = _headPitchBandFromFace(face);
    final dirty = next != _headPitchBand;
    return dirty;
  }

  /// Face presence, open-EAR calibration, normalized EAR overlay; returns overlay dirty.
  bool _refreshLandmarksAndEarBaselines(VisionFrame face) {
    var zoneOverlayDirty = false;
    final hasFace = face.hasFace;
    final leftEar = face.leftEar;
    final rightEar = face.rightEar;

    if (!hasFace && _earFatigueLevel != null) {
      _earFatigueLevel = null;
      zoneOverlayDirty = true;
    }

    if (shouldApplyOpenEarCalibratorFrame(
      openEarCalibrating: _openEarCalibrating,
      hasFace: hasFace,
      leftEar: leftEar,
      rightEar: rightEar,
    )) {
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

  /// Blink edge from [BlinkDetector] FSM (single authoritative blink path).
  /// Fixation + dwell→zone policy: [IntentEngine.process] only.
  bool _trySelectZoneOnBlinkEdge({
    required bool isBlinking,
    required bool hasFace,
    required int now,
    required double faceConfidence,
    required bool likelyFake,
  }) {
    if (!hasFace) {
      _wasBlinking = false;
      return false;
    }
    final confidence = faceConfidence.clamp(0.0, 1.0).toDouble();
    if (confidence < 0.65) return false;
    final fixation = _fixationState == FixationState.fixation;
    var dirty = false;
    if (fixation && !_wasBlinking && isBlinking) {
      System.bus.emit(
        BlinkEvent(
          type: EyeMotionState.blink,
          timestamp: now,
          confidence: faceConfidence.clamp(0.0, 1.0),
        ),
      );
    }
    final zone = _intentEngine.process(
      IntentEvent.dwellBlinkEdge(
        fixation: fixation,
        wasBlinking: _wasBlinking,
        isBlinking: isBlinking,
        dwellSatisfiedForStint: _dwellSatisfiedForStint,
        currentZone: _currentZone,
        selectedAnnouncedForStint: _selectedAnnouncedForStint,
      ),
    );
    if (zone != null) {
      if (!_isTrackingState) {
        _wasBlinking = isBlinking;
        return false;
      }
      HapticFeedback.heavyImpact();
      if (_requestZoneSelect(
        zone,
        confidence: confidence,
        likelyFake: likelyFake,
        nowMs: now,
      )) {
        dirty = true;
        debugPrint('BLINK_EDGE_SELECT: $zone');
      }
    }
    _wasBlinking = isBlinking;
    return dirty;
  }

  /// EAR fatigue, slow baseline drift, and [UserEngagementState]; returns overlay dirty.
  bool _computeAttention({
    required VisionFrame face,
    required double? normalizedGazeX,
    required bool nextBlinking,
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
      final baselineMean = rawMeanOpenEarBaseline(l0, r0)!;
      final currentMean = rawMeanOpenEarBaseline(leftEar, rightEar)!;
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
    return zoneOverlayDirty;
  }

  void _queueConfirmation(ActionRequest r) {
    _autonomousConfirmTimer?.cancel();
    _autonomousConfirmTimer = Timer(const Duration(seconds: 15), () {
      if (!mounted) return;
      if (_pendingAutonomousConfirm != null) {
        setState(() {
          _pendingAutonomousConfirm = null;
          _autonomousConfirmTimer = null;
        });
        debugPrint('AUTONOMOUS_CONFIRM: timeout');
      }
    });
    setState(() {
      _pendingAutonomousConfirm = r;
    });
    debugPrint('AUTONOMOUS_CONFIRM: queued ${r.action.type.name} ${r.action.targetZone}');
  }

  void _clearPendingAutonomousConfirm() {
    _autonomousConfirmTimer?.cancel();
    _autonomousConfirmTimer = null;
    _pendingAutonomousConfirm = null;
  }

  int _recentAutonomousCommitsLast1s(int nowMs) {
    _autonomousCommitMsWindow.removeWhere((t) => nowMs - t > 1000);
    return _autonomousCommitMsWindow.length;
  }

  int _timeSinceLastAutonomousMs(int nowMs) {
    final last = _lastAutonomousCommitMs;
    if (last == null) return 1 << 30;
    return (nowMs - last).clamp(0, 1 << 30);
  }

  ActionContext _buildActionContextForIntent({
    IntentAction? action,
    IntentActionType? actionType,
    String? target,
    required double confidence,
    required int nowMs,
    required double simulationRisk,
  }) {
    final UIActionType resolvedType;
    final String resolvedTarget;
    if (action != null) {
      resolvedType = action.type;
      resolvedTarget = action.targetZone;
    } else if (actionType != null && target != null) {
      resolvedType = actionType;
      resolvedTarget = target;
    } else {
      throw ArgumentError(
        'Provide action or both actionType and target.',
      );
    }
    return ActionContext(
      actionType: resolvedType,
      target: resolvedTarget,
      confidence: confidence,
      // UISandbox twin risk — GovernanceKernel / SafetyKernel read this; do not pre-block in main.
      riskScore: simulationRisk,
      userTrust: _autonomyLevel,
      fixationState: _fixationState,
      dwellProgress: _dwellProgress,
      dwellMs: _dwellProgressMs,
      timeSinceLastActionMs: _timeSinceLastAutonomousMs(nowMs),
      recentActionsLast1s: _recentAutonomousCommitsLast1s(nowMs),
      isReversible: true,
      timestampMs: nowMs,
      autonomyLevel: _autonomyLevel,
      stabilityVariance: _pipeline.varianceX(),
    );
  }

  /// Shared autonomous path: [UISandbox] simulates → [ActionContext.riskScore] = twin
  /// [SandboxSimulation.riskScore] → [AutonomousExecutionKernel.tryExecute] →
  /// [_applyAutonomousSideEffects].
  ///
  /// [action.confidence] must already reflect any prediction boost from the caller.
  ({
    AutonomousActionGateResult gate,
    SandboxSimulation simulation,
    int nowMs,
  }) _executeAutonomousIntentChain(IntentAction action) {
    if (!_isTrackingState) {
      final state = UIStateSnapshot(
        gaze: Offset(smoothGazeX, smoothGazeY),
        activeZone: _activeZoneForPipeline,
        motionState: _fixationState,
        stability: _pipeline.varianceX(),
      );
      final simulation = _sandbox.simulate(action, state);
      final nowMs = DateTime.now().millisecondsSinceEpoch;
      return (
        gate: AutonomousActionGateResult.blockedPrefilter,
        simulation: simulation,
        nowMs: nowMs,
      );
    }

    final state = UIStateSnapshot(
      gaze: Offset(smoothGazeX, smoothGazeY),
      activeZone: _activeZoneForPipeline,
      motionState: _fixationState,
      stability: _pipeline.varianceX(),
    );
    final simulation = _sandbox.simulate(action, state);
    final nowMs = DateTime.now().millisecondsSinceEpoch;

    final prefilter = KernelEvaluationInput(
      type: action.type,
      targetZone: action.targetZone,
      confidence: action.confidence,
      timestamp: nowMs,
      dwellMs: _dwellProgressMs,
      autonomyLevel: _autonomyLevel,
      system: SystemState(
        calibrationActive: _isCalibrationBusy,
        errorState: _visionChannelError,
        userIsDistracted:
            _userEngagementState == UserEngagementState.zoningOut,
      ),
    );

    final ctx = _buildActionContextForIntent(
      action: action,
      confidence: action.confidence,
      nowMs: nowMs,
      simulationRisk: simulation.riskScore,
    );

    final gateResult = _autonomousExecution.tryExecute(
      prefilter,
      ctx,
      () {
        _cameFromKernel = true;
        try {
          _applyAutonomousSideEffects(action.type, action.targetZone);
        } finally {
          _cameFromKernel = false;
        }
      },
    );
    if (gateResult == AutonomousActionGateResult.allowed) {
      _lastAutonomousCommitMs = nowMs;
      _autonomousCommitMsWindow.add(nowMs);
    }
    return (gate: gateResult, simulation: simulation, nowMs: nowMs);
  }

  /// Autonomous confirm: [UISandbox] risk in [ActionContext] → [AutonomousExecutionKernel.tryExecute] → [ActionMemory].
  ///
  /// Prefilter, governance, and safety run inside [_autonomousExecution]; twin risk is [ctx.riskScore].
  void _processIntentAction(IntentAction action) {
    if (!_isTrackingState) {
      debugPrint(
        'TRACKING_GATE_BLOCK: intent commit skipped while state=${_trackingEngine.state.name}',
      );
      return;
    }
    final matched = matchesPrediction(action, _latestPredictions);
    if (matched) {
      _updatePredictionWeight('temporal_predictor', 1.0);
    } else {
      _updatePredictionWeight('temporal_predictor', 0.3);
    }

    final boostedConfidence = matched
        ? (action.confidence + 0.1).clamp(0.0, 1.0)
        : action.confidence;

    final boostedAction = IntentAction(
      type: action.type,
      targetZone: action.targetZone,
      confidence: boostedConfidence,
      sourceTimestamp: action.sourceTimestamp,
    );

    final chain = _executeAutonomousIntentChain(boostedAction);
    final gateResult = chain.gate;
    final simulation = chain.simulation;
    final nowMs = chain.nowMs;

    final allowExecution = gateResult == AutonomousActionGateResult.allowed;
    final ui = boostedAction.toUiAction();
    final recordedAtMs = nowMs;

    if (!allowExecution) {
      _holdAction(boostedAction, simulation);
    }

    final memory = ActionMemory(
      action: ui,
      recordedAtMs: recordedAtMs,
      prediction: simulation,
      actualSuccess: allowExecution,
      fixationAtExecute: _fixationState,
      smoothGazeXAtExecute: smoothGazeX,
    );
    _actionHistory.add(memory);
    while (_actionHistory.length > _kMaxActionHistory) {
      _actionHistory.removeAt(0);
    }
    _learningEngine.reset();
    _actionHistory.forEach(_updateLearning);
    _learningEngine.applyCollective(
      kCollectivePriorHints,
      _actionHistory.length.clamp(0, 1000),
    );
    _clearPendingAutonomousConfirm();
  }

  void _updateLearning(ActionMemory memory) {
    _learningEngine.ingest(
      action: memory.action,
      predictedRisk: memory.prediction.riskScore,
      success: memory.actualSuccess,
    );
  }

  /// Sole side-effect entry after [AutonomousExecutionKernel.tryExecute] allows.
  ///
  /// Guarded by [_executionLock] so only one re-entrant path can run physical effects at a time.
  /// Do not call from new code — only from the [execute] closure inside [_executeAutonomousIntentChain].
  void _applyAutonomousSideEffects(
    IntentActionType type,
    String target,
  ) {
    assert(() {
      if (!_cameFromKernel) {
        throw Exception("Unsafe execution path detected");
      }
      return true;
    }());

    if (_executionLock) return;
    _executionLock = true;

    try {
      switch (type) {
        case IntentActionType.tap:
          _pointerController.click();
          break;

        case IntentActionType.openZone:
          _applyZoneSelectSideEffects(target);
          break;

        default:
          break;
      }
    } finally {
      _executionLock = false;
    }
  }

  /// Gate blocked: no side effects; extend with retry / queue policy if needed.
  void _holdAction(IntentAction action, SandboxSimulation simulation) {
    debugPrint(
      'HOLD: ${action.type.name} ${action.targetZone} '
      'safe=${simulation.safe} risk=${simulation.riskScore.toStringAsFixed(2)}',
    );
  }

  /// Blink-count UX: 1=select locked zone, 2=confirm, 3+=cancel. May reset `_blinkDetector`.
  ///
  /// Outer fixation guard is legacy (also gates confirm/cancel); zone **select** for count==1
  /// still goes only through [_intentEngine.process] — do not add parallel fixation→[_selectZone].
  ({int nextCount, bool dirty}) _detectIntent(int nextCount) {
    if (_fixationState != FixationState.fixation) {
      return (nextCount: nextCount, dirty: false);
    }
    var zoneOverlayDirty = false;
    if (nextCount > _blinkCount) {
      if (nextCount == 1) {
        if (!_isTrackingState) {
          return (nextCount: nextCount, dirty: false);
        }
        final lockedZone = _intentEngine.process(
          IntentEvent.blinkCountSelect(
            fixation: _fixationState == FixationState.fixation,
            nextBlinkCount: nextCount,
            prevBlinkCount: _blinkCount,
            displaySelectedZone: _displaySelectedZone,
          ),
        );
        if (lockedZone != null) {
          if (_requestZoneSelect(
            lockedZone,
            confidence: kMinGovernanceConfidence,
            likelyFake: false,
            nowMs: DateTime.now().millisecondsSinceEpoch,
          )) {
            HapticFeedback.lightImpact();
            zoneOverlayDirty = true;
            debugPrint('BLINK_SELECT: $lockedZone');
          }
        }
      } else if (nextCount == 2) {
        if (!_isTrackingState) {
          return (nextCount: nextCount, dirty: false);
        }
        final pending = _pendingAutonomousConfirm;
        if (pending != null) {
          _processIntentAction(IntentAction.fromUiAction(pending.action));
        }
        debugPrint('BLINK_CONFIRM: ${_currentZone ?? 'no zone'}');
        HapticFeedback.heavyImpact();
        _blinkDetector.reset();
        nextCount = 0;
        _selectedAnnouncedForStint = false;
        _displaySelectedZone = '';
        _debugNotifier.value = _debugNotifier.value.copyWith(selected: '');
        _dwellSatisfiedForStint = false;
        _intentEngine.syncDwellReady(false);
        _dwellProgress = 0;
        _wasBlinking = false;
        if (_currentZone != null) {
          _zoneStart = DateTime.now();
        }
        zoneOverlayDirty = true;
      } else if (nextCount >= 3) {
        if (_pendingAutonomousConfirm != null) {
          _clearPendingAutonomousConfirm();
          debugPrint('AUTONOMOUS_CONFIRM: cancelled (triple blink)');
        }
        debugPrint('BLINK_CANCEL');
        HapticFeedback.heavyImpact();
        _blinkDetector.reset();
        nextCount = 0;
        _selectedAnnouncedForStint = false;
        _displaySelectedZone = '';
        _debugNotifier.value = _debugNotifier.value.copyWith(selected: '');
        _dwellSatisfiedForStint = false;
        _intentEngine.syncDwellReady(false);
        _dwellProgress = 0;
        _wasBlinking = false;
        zoneOverlayDirty = true;
      }
    }
    return (nextCount: nextCount, dirty: zoneOverlayDirty);
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
      _debugNotifier.value = dbg.copyWith(motion: nextMotion);
    }

    if (_kVerbosePerFrameLogs) {
      debugPrint('Blink: $nextBlinking | Count: $nextCount');
    }
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
        _blinkCountNotifier.value = nextCount;
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

  double _processedFpsEstimate(int nowMs) {
    _ensurePerfWindow(nowMs);
    final windowMs = (nowMs - _framePerf.windowStartMs).clamp(1, 60000);
    return _framePerf.processedCount / (windowMs / 1000.0);
  }

  /// Mirrors live frame authority into [ProofSessionCollector] (same signals as VSL).
  void _feedProofSession({
    required int nowMs,
    required bool validFrame,
    required bool blinkDetected,
    required bool likelyFake,
  }) {
    if (!_proofBridge.isActive) return;
    _proofBridge.onFrame(
      timestampMs: nowMs,
      validFrame: validFrame,
      processedFps: _processedFpsEstimate(nowMs),
      blinkDetected: blinkDetected,
      likelyFake: likelyFake,
    );
  }

  /// Feeds the verification rolling window; does not alter gaze, dwell, or intent.
  bool _feedVerificationStability({
    required int nowMs,
    String? zone,
    double? gazeX,
    double? normalizedGazeX,
    double? meanEar,
    required bool blinkDetected,
    required bool validFrame,
    bool dwellReady = false,
  }) {
    final snap = _verificationStability.ingest(
      VerificationSignalSample(
        timestampMs: nowMs,
        zone: zone,
        gazeX: gazeX,
        normalizedGazeX: normalizedGazeX,
        meanEar: meanEar,
        blinkDetected: blinkDetected,
        validFrame: validFrame,
        processedFps: _processedFpsEstimate(nowMs),
        dwellReady: dwellReady,
      ),
    );
    final changed = snap.confidenceBand != _verificationSnapshot.confidenceBand ||
        snap.stableZone != _verificationSnapshot.stableZone ||
        (snap.validFrameRatio - _verificationSnapshot.validFrameRatio).abs() >
            0.05;
    _verificationSnapshot = snap;
    return changed;
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
    debugPrint(
      '[frame_perf] fps(camera=${cameraFps.toStringAsFixed(1)}, processed=${processedFps.toStringAsFixed(1)}) '
      'drop(throttle=${_framePerf.droppedThrottle}, busy=${_framePerf.droppedBusy}, invalid=${_framePerf.droppedInvalid}) '
      'ms(avg encode=${avgEncodeMs.toStringAsFixed(2)}, channel=${avgChannelMs.toStringAsFixed(2)}, post=${avgPostprocessMs.toStringAsFixed(2)}) '
      'native(last decode=${_framePerf.lastNativeDecodeMs.toStringAsFixed(2)}, process=${_framePerf.lastNativeProcessMs.toStringAsFixed(2)}, total=${_framePerf.lastNativeTotalMs.toStringAsFixed(2)})',
    );
    _framePerf.resetWindow(nowMs);
  }

  @override
  Widget build(BuildContext context) {
    _viewSize = MediaQuery.sizeOf(context);
    _overlaySafeTop = MediaQuery.paddingOf(context).top;
    final preview = widget.cameraSession.controller.value.previewSize;
    if (preview == null) {
      return const ColoredBox(color: Colors.black);
    }
    // Preview buffer is typically landscape; swap for portrait cover fit.
    final previewW = preview.height;
    final previewH = preview.width;

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
                    child: CameraPreview(widget.cameraSession.controller),
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
                          showSelectionLabel: false,
                          influenceListenable: _influenceNotifier,
                        );
                      },
                    );
                  },
                ),
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
                  elevation: 4,
                  borderRadius: BorderRadius.circular(8),
                  clipBehavior: Clip.antiAlias,
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
                      const Divider(height: 8, color: Colors.white24),
                      TextButton(
                        onPressed: _sealProofPacketDebug,
                        child: const Text(
                          'Seal Proof',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_lostFacePaused)
            Positioned(
              top: _overlaySafeTop + 48,
              left: 16,
              right: 16,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orangeAccent.withValues(alpha: 0.6)),
                ),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Text(
                    'Tracking paused — face not detected. Recalibrate or look at the camera.',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          if (_displaySelectedZone.isNotEmpty)
            Positioned(
              left: 16,
              bottom: 160,
              child: SafeArea(
                child: TextButton(
                  onPressed: () {
                    setState(() {
                      _displaySelectedZone = '';
                      _selectedAnnouncedForStint = false;
                      _debugNotifier.value =
                          _debugNotifier.value.copyWith(selected: '');
                    });
                  },
                  child: const Text(
                    'Undo zone select',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ),
              ),
            ),
          if (_currentZone != null &&
              _zoneStart != null &&
              !_selectedAnnouncedForStint)
            Positioned(
              right: 12,
              bottom: 24,
              child: SafeArea(
                child: SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    value: _dwellSatisfiedForStint ? 1 : _dwellProgress,
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
            child: SafeArea(
              child: GestureDetector(
                onLongPress: defaultTargetPlatform == TargetPlatform.android
                    ? _requestHeadNeutralCalibration
                    : null,
                child: ConstrainedBox(
                  // Lab HUD: bounded so telemetry stays readable on narrow phones (e.g. 1080×2340).
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.sizeOf(context).width * 0.55,
                    maxHeight: MediaQuery.sizeOf(context).height * 0.45,
                  ),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: SingleChildScrollView(
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
                              'Authenticity: likelyFake=$_likelyFake '
                              '(staticGaze=$_fakeStaticGaze perfectStab=$_fakePerfectStability noBlink=$_fakeNoBlink)\n'
                              'EAR blink close (dyn): ${rawMeanOpenEarBaseline(_leftOpenEar, _rightOpenEar) != null ? dynamicEarCloseThreshold(rawMeanOpenEarBaseline(_leftOpenEar, _rightOpenEar)!).toStringAsFixed(3) : '—'} '
                              '(0.7×meanOpen)\n'
                              'Blinks: dwell, then close eyes (mean EAR<0.08) to select · 2=confirm · 3+=cancel\n'
                              'Blink: $_isBlinking | Count: $blinkCount\n'
                              'Blink drop: leftDrop=${_blinkLeftDrop?.toStringAsFixed(3) ?? '—'} '
                              'rightDrop=${_blinkRightDrop?.toStringAsFixed(3) ?? '—'} '
                              'isRightDominant=${_blinkIsRightDominant == null ? '—' : _blinkIsRightDominant!}\n'
                              'Zone: ${_currentZone ?? '—'}'
                              '${_currentZone != null && _zoneStart != null && !_selectedAnnouncedForStint ? (_dwellSatisfiedForStint ? ' (blink to select)' : ' (dwell…)') : ''}'
                              '${_selectedAnnouncedForStint && _currentZone != null ? ' ✓' : ''}\n'
                              'Pitch: ${_headPitchBand ?? '—'}\n'
                              '--- Verification stability (observe) ---\n'
                              'Band: ${_verificationSnapshot.confidenceBand.label} · '
                              'stable=${_verificationSnapshot.stableZone.label}\n'
                              'valid=${(_verificationSnapshot.validFrameRatio * 100).toStringAsFixed(0)}% '
                              'zone=${(_verificationSnapshot.zoneConsistency * 100).toStringAsFixed(0)}% '
                              'fps=${(_verificationSnapshot.fpsConfidence * 100).toStringAsFixed(0)}% '
                              'blink=${(_verificationSnapshot.blinkConfidence * 100).toStringAsFixed(0)}%\n'
                              '${_verificationSnapshot.reason}\n'
                              '--- Pipeline perf (observe) ---\n'
                              '${_pipelinePerfSnapshot.hudLines}\n'
                              '${defaultTargetPlatform == TargetPlatform.android ? 'Long-press: head yaw only · Cal L/R/N: gaze + yaw₀.' : ''}',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
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
                  ),
                ),
              ),
            ),
          ),
          ValueListenableBuilder<KernelTelemetry?>(
            valueListenable: _attentionKernel.telemetryNotifier,
            builder: (context, t, _) {
              if (t == null) return const SizedBox.shrink();
              return Positioned(
                right: 12,
                bottom: 24,
                child: SafeArea(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.sizeOf(context).width * 0.38,
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0x88000000),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DefaultTextStyle(
                        style: const TextStyle(color: Colors.white, fontSize: 11),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('CONF: ${t.confidence.toStringAsFixed(2)}'),
                            Text('STAB: ${t.stability.toStringAsFixed(2)}'),
                            Text('HEAD: ${t.headPenalty.toStringAsFixed(2)}'),
                            Text('VEL: ${t.velocityPenalty.toStringAsFixed(2)}'),
                            Text('FIX: ${t.fixationDuration}ms'),
                            Text('STATE: ${t.isFixating}'),
                            Text('PASS: ${t.passed}'),
                            Text(
                              'REASON: ${t.reason}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
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
