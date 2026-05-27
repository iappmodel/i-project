import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import {
  getTargetAtPosition,
  useScreenTargets,
  getTriggerLabel,
} from '../../hooks/useScreenTargets';
import type {
  ScreenTarget,
  GestureTrigger,
  SimpleGestureTrigger,
  GetTargetAtPositionOptions,
} from '../../hooks/useScreenTargets';
import { COMBO_ACTION_LABELS, type ComboAction } from '../../hooks/useGestureCombos';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { loadRemoteControlSettings } from '../../hooks/useBlinkRemoteControl';
import '../../styles/vision-target-overlay.css';

const GAZE_SMOOTHING_ALPHA = 0.28;
const DEFAULT_DWELL_MS = 1500;
const DWELL_GAZE_AND_BLINK_RATIO = 0.55;
const HIT_AREA_SCALE = 1.12;
const CALIBRATION_HINT_SESSION_KEY = 'target_overlay_calibration_hint_seen';

interface TargetOverlayProps {
  enabled: boolean;
  gazePosition?: { x: number; y: number } | null;
  onTargetAction?: (command: ComboAction) => void;
  className?: string;
  /** Show a small gaze cursor dot at current smoothed position (helps with calibration feedback). */
  showGazeCursor?: boolean;
  /** Expand hit area for easier activation (multiplier on target radius). Default from accessibility or 1.12. */
  hitAreaScale?: number;
  /** Show one-time calibration hint when overlay is first enabled. */
  showCalibrationHint?: boolean;
}

export const TargetOverlay: React.FC<TargetOverlayProps> = ({
  enabled,
  gazePosition,
  onTargetAction,
  className,
  showGazeCursor = false,
  hitAreaScale: hitAreaScaleProp,
  showCalibrationHint = true,
}) => {
  const { enabledTargets, recordInteraction } = useScreenTargets();
  const haptics = useHapticFeedback();
  const { reducedMotion, highContrast } = useAccessibility();
  const [hoveredTarget, setHoveredTarget] = useState<ScreenTarget | null>(null);
  const [activationProgress, setActivationProgress] = useState<Record<string, number>>({});
  const [successTarget, setSuccessTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const gazeTimerRef = useRef<Record<string, number>>({});
  const [eventGazePosition, setEventGazePosition] = useState<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const combinedStateRef = useRef<Record<string, { idx: number; lastTs: number }>>({});
  const [calibrationActive, setCalibrationActive] = useState(false);
  const smoothedGazeRef = useRef<{ x: number; y: number } | null>(null);
  const [dwellMs, setDwellMs] = useState(DEFAULT_DWELL_MS);
  const [calibrationHintVisible, setCalibrationHintVisible] = useState(false);
  const hitOptionsRef = useRef<GetTargetAtPositionOptions>({
    hitAreaScale: hitAreaScaleProp ?? HIT_AREA_SCALE,
    overlapPreference: 'smallest',
  });

  hitOptionsRef.current.hitAreaScale = hitAreaScaleProp ?? HIT_AREA_SCALE;

  // Sync dwell time from remote control settings
  useEffect(() => {
    const sync = () => {
      const settings = loadRemoteControlSettings();
      setDwellMs(Math.max(600, Math.min(3500, settings.gazeHoldTime)));
    };
    sync();
    window.addEventListener('remoteControlSettingsChanged', sync);
    return () => window.removeEventListener('remoteControlSettingsChanged', sync);
  }, []);

  // One-time calibration hint (per session)
  useEffect(() => {
    if (!enabled || !showCalibrationHint || enabledTargets.length === 0) return;
    if (sessionStorage.getItem(CALIBRATION_HINT_SESSION_KEY)) return;
    setCalibrationHintVisible(true);
    const t = setTimeout(() => {
      setCalibrationHintVisible(false);
      sessionStorage.setItem(CALIBRATION_HINT_SESSION_KEY, '1');
    }, 6000);
    return () => clearTimeout(t);
  }, [enabled, showCalibrationHint, enabledTargets.length]);

  // Suspend overlay while calibration is running to prevent phantom target activations
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { active?: boolean } | undefined;
      setCalibrationActive(Boolean(detail?.active));
    };
    window.addEventListener('calibrationMode', handler as EventListener);
    return () => window.removeEventListener('calibrationMode', handler as EventListener);
  }, []);

  const rawGaze = calibrationActive ? null : (gazePosition ?? eventGazePosition);

  // Gaze smoothing (EMA) for stable hit-testing and optional cursor
  const effectiveGaze = (() => {
    if (!rawGaze) {
      smoothedGazeRef.current = null;
      return null;
    }
    const prev = smoothedGazeRef.current;
    const smooth = prev
      ? {
          x: prev.x * (1 - GAZE_SMOOTHING_ALPHA) + rawGaze.x * GAZE_SMOOTHING_ALPHA,
          y: prev.y * (1 - GAZE_SMOOTHING_ALPHA) + rawGaze.y * GAZE_SMOOTHING_ALPHA,
        }
      : { x: rawGaze.x, y: rawGaze.y };
    smoothedGazeRef.current = smooth;
    return smooth;
  })();

  const isTriggerSupported = (trigger: GestureTrigger): boolean => {
    if (typeof trigger !== 'string') {
      return trigger.steps.every(step => isTriggerSupported(step));
    }
    return (
      trigger === 'gazeActivated' ||
      trigger === 'gazeAndBlink' ||
      trigger === 'singleBlink' ||
      trigger === 'doubleBlink' ||
      trigger === 'tripleBlink' ||
      trigger === 'leftWink' ||
      trigger === 'rightWink' ||
      trigger === 'bothBlink' ||
      trigger === 'lipRaiseLeft' ||
      trigger === 'lipRaiseRight' ||
      trigger === 'faceTurnLeft' ||
      trigger === 'faceTurnRight' ||
      trigger === 'eyebrowLeftLift' ||
      trigger === 'eyebrowRightLift' ||
      trigger === 'eyebrowsBothLift' ||
      trigger === 'smirkSmile' ||
      trigger === 'fullSmile' ||
      trigger === 'slowBlink' ||
      trigger === 'screenTap' ||
      trigger === 'screenDoubleTap' ||
      trigger === 'phoneTiltLeft' ||
      trigger === 'phoneTiltRight' ||
      trigger === 'phoneTiltForward' ||
      trigger === 'phoneTiltBack' ||
      trigger === 'handPinch' ||
      trigger === 'handPoint' ||
      trigger === 'handOpenPalm' ||
      trigger === 'headNod'
    );
  };

  // Listen for gaze broadcasts from remote control engine (pixel coordinates)
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number } | undefined;
      if (detail && typeof detail.x === 'number' && typeof detail.y === 'number') {
        setEventGazePosition({ x: detail.x, y: detail.y });
      }
    };
    window.addEventListener('remoteGazePosition', handler);
    return () => window.removeEventListener('remoteGazePosition', handler);
  }, [enabled]);

  const triggerTarget = useCallback(
    (target: ScreenTarget) => {
      haptics.success();
      recordInteraction(target.id, true);
      onTargetAction?.(target.command);

      const label = COMBO_ACTION_LABELS[target.command] ?? target.label;
      setAnnouncement(`Activated: ${label}`);
      setTimeout(() => setAnnouncement(null), 1200);

      setSuccessTarget(target.id);
      setTimeout(() => setSuccessTarget(null), reducedMotion ? 400 : 800);
    },
    [haptics, recordInteraction, onTargetAction, reducedMotion]
  );

  // Gaze-based hit testing with smoothed gaze and expanded hit area
  useEffect(() => {
    if (!enabled || !effectiveGaze || enabledTargets.length === 0) {
      setHoveredTarget(null);
      combinedStateRef.current = {};
      return;
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const hit = getTargetAtPosition(
      enabledTargets,
      effectiveGaze.x,
      effectiveGaze.y,
      screenWidth,
      screenHeight,
      hitOptionsRef.current
    );

    if (hit) {
      setHoveredTarget(hit);

      const isGazeDwell = hit.trigger === 'gazeActivated' || hit.trigger === 'gazeAndBlink';
      const requiredTime =
        hit.trigger === 'gazeActivated' ? dwellMs : Math.round(dwellMs * DWELL_GAZE_AND_BLINK_RATIO);

      if (isGazeDwell) {
        const now = Date.now();
        if (!gazeTimerRef.current[hit.id]) {
          gazeTimerRef.current[hit.id] = now;
        }
        const elapsed = now - gazeTimerRef.current[hit.id];
        const progress = Math.min(1, elapsed / requiredTime);
        setActivationProgress({ [hit.id]: progress });

        if (progress >= 1 && hit.trigger === 'gazeActivated') {
          triggerTarget(hit);
          gazeTimerRef.current[hit.id] = 0;
          setActivationProgress({});
        }
      } else {
        setActivationProgress({});
      }
    } else {
      setHoveredTarget(null);
      gazeTimerRef.current = {};
      setActivationProgress(prev => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
      combinedStateRef.current = {};
    }
  }, [enabled, effectiveGaze, enabledTargets, dwellMs, triggerTarget]);

  const advanceCombined = useCallback((target: ScreenTarget, trigger: SimpleGestureTrigger) => {
    if (typeof target.trigger === 'string' || target.trigger.type !== 'combined') return;
    const steps = target.trigger.steps;
    if (!steps.length) return;
    const now = Date.now();
    const state = combinedStateRef.current[target.id] || { idx: 0, lastTs: 0 };
    if (now - state.lastTs > 1200) {
      state.idx = 0;
    }
    const expected = steps[state.idx];
    if (trigger === expected) {
      state.idx += 1;
      state.lastTs = now;
      if (state.idx >= steps.length) {
        combinedStateRef.current[target.id] = { idx: 0, lastTs: 0 };
        triggerTarget(target);
        return;
      }
    } else if (trigger === steps[0]) {
      state.idx = 1;
      state.lastTs = now;
    } else {
      state.idx = 0;
      state.lastTs = 0;
    }
    combinedStateRef.current[target.id] = state;
  }, [triggerTarget]);

  // Blink-pattern triggers (single/double/triple + gazeAndBlink)
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { count?: number } | undefined;
      const count = detail?.count;
      if (count !== 1 && count !== 2 && count !== 3) return;
      const hovered = hoveredTarget;
      if (!hovered) return;
      const matches =
        (hovered.trigger === 'singleBlink' && count === 1) ||
        (hovered.trigger === 'doubleBlink' && count === 2) ||
        (hovered.trigger === 'tripleBlink' && count === 3);
      const gazeAndBlinkReady =
        hovered.trigger === 'gazeAndBlink' && (activationProgress[hovered.id] || 0) >= 1 && count === 1;
      if (matches || gazeAndBlinkReady) {
        triggerTarget(hovered);
        if (hovered.trigger === 'gazeAndBlink') {
          gazeTimerRef.current[hovered.id] = Date.now();
          setActivationProgress(prev => ({ ...prev, [hovered.id]: 0 }));
        }
      } else if (typeof hovered.trigger !== 'string' && hovered.trigger.type === 'combined') {
        const trigger: SimpleGestureTrigger = count === 1 ? 'singleBlink' : count === 2 ? 'doubleBlink' : 'tripleBlink';
        advanceCombined(hovered, trigger);
      } else {
        recordInteraction(hovered.id, false);
      }
    };
    window.addEventListener('remoteBlinkPattern', handler);
    return () => window.removeEventListener('remoteBlinkPattern', handler);
  }, [enabled, hoveredTarget, activationProgress, triggerTarget, recordInteraction]);

  // Gesture triggers (smile/smirk/lip/eyebrow/head/slow blink)
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { trigger?: GestureTrigger } | undefined;
      const trigger = detail?.trigger;
      if (!trigger || typeof trigger !== 'string') return;
      const hovered = hoveredTarget;
      if (!hovered) return;
      if (hovered.trigger === trigger) {
        triggerTarget(hovered);
      } else if (typeof hovered.trigger !== 'string' && hovered.trigger.type === 'combined') {
        advanceCombined(hovered, trigger);
      } else {
        recordInteraction(hovered.id, false);
      }
    };
    window.addEventListener('remoteGestureTrigger', handler);
    return () => window.removeEventListener('remoteGestureTrigger', handler);
  }, [enabled, hoveredTarget, triggerTarget, recordInteraction]);

  // Touch-based triggers (tap / double tap while gazing at target)
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = () => {
      const hovered = hoveredTarget;
      if (!hovered) return;
      const now = Date.now();
      if (hovered.trigger === 'screenTap') {
        triggerTarget(hovered);
        return;
      }
      if (hovered.trigger === 'screenDoubleTap') {
        if (now - lastTapRef.current < 450) {
          lastTapRef.current = 0;
          triggerTarget(hovered);
        } else {
          lastTapRef.current = now;
        }
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [enabled, hoveredTarget, triggerTarget]);

  if (!enabled || enabledTargets.length === 0 || calibrationActive) return null;

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;

  return (
    <div className={cn('vision-target-layer', className)} aria-hidden="false">
      {/* Screen reader announcement for target activation */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic
        className="sr-only"
        aria-relevant="text"
      >
        {announcement}
      </div>

      {enabledTargets.map(target => {
        const isHovered = hoveredTarget?.id === target.id;
        const isSuccess = successTarget === target.id;
        const progress = activationProgress[target.id] || 0;
        const sizePx = (target.size / 100) * screenWidth;
        const circumference = 2 * Math.PI * (sizePx / 2 - 2);
        const isGazeDwell = target.trigger === 'gazeActivated' || target.trigger === 'gazeAndBlink';
        const requiredDwell = target.trigger === 'gazeActivated' ? dwellMs : Math.round(dwellMs * DWELL_GAZE_AND_BLINK_RATIO);
        const remainingMs = isHovered && isGazeDwell && progress < 1
          ? Math.ceil((1 - progress) * requiredDwell)
          : 0;

        return (
          <div
            key={target.id}
            className={cn(
              'vision-target-node',
              isHovered && !reducedMotion && 'vision-target-node--hovered',
              isSuccess && !reducedMotion && 'vision-target-node--success',
            )}
            style={{
              left: `${target.position.x * 100}%`,
              top: `${target.position.y * 100}%`,
              width: sizePx,
              height: sizePx,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Background circle */}
            <div
              className={cn(
                'vision-target-ring',
                isSuccess && 'vision-target-ring--success',
                isHovered && !isSuccess && 'vision-target-ring--hovered',
                highContrast && isHovered && !isSuccess && 'vision-target-ring--hovered',
              )}
            />

            {/* Activation progress ring (smooth fill) */}
            {progress > 0 && !isSuccess && (
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
                viewBox={`0 0 ${sizePx} ${sizePx}`}
                aria-hidden
              >
                <circle
                  cx={sizePx / 2}
                  cy={sizePx / 2}
                  r={sizePx / 2 - 2}
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth={highContrast ? 4 : 3}
                  strokeDasharray={`${progress * circumference} ${circumference}`}
                />
              </svg>
            )}

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isSuccess ? (
                <span className="vision-target-label" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="vision-target-label">
                  {COMBO_ACTION_LABELS[target.command]?.split(' ')[0] || target.label}
                </span>
              )}
            </div>

            {/* Hover label + optional remaining time for gaze dwell */}
            {isHovered && !isSuccess && (
              <div className="vision-target-hint" style={{ top: '100%' }}>
                {getTriggerLabel(target.trigger)}
                {!isTriggerSupported(target.trigger) && <span className="opacity-80"> (training)</span>}
                {isGazeDwell && remainingMs > 0 && (
                  <span className="opacity-90 ml-1">
                    · {remainingMs >= 1000 ? `${(remainingMs / 1000).toFixed(1)}s` : `${remainingMs}ms`}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Optional gaze cursor (smoothed position) */}
      {showGazeCursor && effectiveGaze && (
        <div
          className="vision-target-gaze-cursor"
          style={{
            left: effectiveGaze.x,
            top: effectiveGaze.y,
          }}
          aria-hidden
        />
      )}

      {/* Calibration hint (one-time per session) */}
      {calibrationHintVisible && (
        <div className="vision-target-calibration-hint" role="status">
          For best accuracy, calibrate gaze in Remote Control settings.
        </div>
      )}
    </div>
  );
};

export default TargetOverlay;
