import {
  POPS_FALLBACK_METHOD,
  POPS_FALLBACK_REASON,
  POPS_FALLBACK_REASON_CODES,
  POPS_FALLBACK_REWARD_IMPACT,
  type PopsFallbackEvaluationInput,
  type PopsFallbackOption,
  type PopsFallbackReason
} from "./pops-fallback.types";

/** Short interruption: small confidence trim only. */
export const POPS_FALLBACK_INTERRUPTION_SHORT_MS = 30_000;
/** Long interruption: pause / close path. */
export const POPS_FALLBACK_INTERRUPTION_LONG_MS = 120_000;

/** Fraud-dominant sessions: fallback cannot imply auto-approval or trust bypass. */
export function isFraudDominantForFallback(fraudRisk: number): boolean {
  return fraudRisk >= 0.65;
}

export function isHighFraudBlock(fraudRisk: number): boolean {
  return fraudRisk >= 0.75;
}

function option(
  partial: Omit<PopsFallbackOption, "auditReasonCodes"> & { auditReasonCodes?: PopsFallbackOption["auditReasonCodes"] }
): PopsFallbackOption {
  return {
    auditReasonCodes: partial.auditReasonCodes ?? [],
    fallbackMethod: partial.fallbackMethod,
    priority: partial.priority,
    rewardImpact: partial.rewardImpact,
    requiresUserAction: partial.requiresUserAction,
    requiresAdminReview: partial.requiresAdminReview,
    internalRationale: partial.internalRationale
  };
}

function restrictOptionsForFraud(
  fraudRisk: number,
  options: PopsFallbackOption[]
): PopsFallbackOption[] {
  if (!isFraudDominantForFallback(fraudRisk)) return options;

  const disallowed: PopsFallbackOption["fallbackMethod"][] = [
    POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL,
    POPS_FALLBACK_METHOD.PARTIAL_REWARD
  ];

  let next = options.filter((o) => !disallowed.includes(o.fallbackMethod));

  if (isHighFraudBlock(fraudRisk)) {
    next = next.filter((o) =>
      [
        POPS_FALLBACK_METHOD.DELAYED_REVIEW,
        POPS_FALLBACK_METHOD.ADMIN_REVIEW,
        POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE,
        POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP,
        POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME
      ].includes(o.fallbackMethod)
    );
    if (next.length === 0) {
      next = [
        option({
          fallbackMethod: POPS_FALLBACK_METHOD.ADMIN_REVIEW,
          priority: 900,
          rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
          requiresUserAction: false,
          requiresAdminReview: true,
          internalRationale: "High fraud risk: only review or safe-deny paths.",
          auditReasonCodes: [POPS_FALLBACK_REASON_CODES.FRAUD_GATE_RESTRICTS_FALLBACK]
        }),
        option({
          fallbackMethod: POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE,
          priority: 910,
          rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED,
          requiresUserAction: false,
          requiresAdminReview: false,
          internalRationale: "High fraud risk: safe close without accusatory UX.",
          auditReasonCodes: [POPS_FALLBACK_REASON_CODES.FRAUD_GATE_RESTRICTS_FALLBACK]
        })
      ];
    }
  }

  return next.map((o) =>
    o.auditReasonCodes.includes(POPS_FALLBACK_REASON_CODES.FRAUD_GATE_RESTRICTS_FALLBACK)
      ? o
      : {
          ...o,
          auditReasonCodes: [...o.auditReasonCodes, POPS_FALLBACK_REASON_CODES.FRAUD_GATE_RESTRICTS_FALLBACK]
        }
  );
}

/** Rule 1–2: visual signal availability vs campaign requirement. */
export function optionsForVisualPath(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  const isVisualReason =
    input.fallbackReason === POPS_FALLBACK_REASON.VISUAL_SIGNAL_UNAVAILABLE ||
    input.fallbackReason === POPS_FALLBACK_REASON.PERMISSION_DECLINED;

  if (!isVisualReason) return [];

  if (input.visualRequirement === "optional" || input.visualRequirement === "off") {
    return [
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK,
        priority: 10,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.NONE,
        requiresUserAction: false,
        requiresAdminReview: false,
        internalRationale: "Optional visual missing: reweight other signals; no user punishment.",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.OPTIONAL_VISUAL_REDISTRIBUTED]
      })
    ];
  }

  if (!input.campaignAllowsFallbackPath) {
    return [
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE,
        priority: 500,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED,
        requiresUserAction: false,
        requiresAdminReview: false,
        internalRationale: "Required visual proof unavailable and campaign disallows alternate path.",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.REQUIRED_VISUAL_FALLBACK_PATH]
      }),
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
        priority: 480,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
        requiresUserAction: false,
        requiresAdminReview: true,
        internalRationale: "Required visual missing: hold for human review instead of auto-deny when policy allows queue.",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.REQUIRED_VISUAL_FALLBACK_PATH]
      })
    ];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME,
      priority: 20,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "Required visual missing: offer extended dwell as alternate proof.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.REQUIRED_VISUAL_FALLBACK_PATH]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP,
      priority: 30,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "Explicit tap confirmation substitutes motion/visual when campaign allows.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.REQUIRED_VISUAL_FALLBACK_PATH]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT,
      priority: 40,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "Replay final segment to satisfy attention continuity without camera.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.REQUIRED_VISUAL_FALLBACK_PATH]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
      priority: 100,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: true,
      internalRationale: "Required visual missing: conservative review hold.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.REQUIRED_VISUAL_FALLBACK_PATH]
    })
  ];
}

export function optionsForNetwork(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (
    input.fallbackReason !== POPS_FALLBACK_REASON.NETWORK_INTERRUPTION &&
    input.fallbackReason !== POPS_FALLBACK_REASON.OFFLINE_SYNC_REQUIRED
  ) {
    return [];
  }

  if (input.hasLocalEventBuffer) {
    return [
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
        priority: 15,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.NONE,
        requiresUserAction: false,
        requiresAdminReview: false,
        internalRationale: "Buffered events: reward stays pending until server verifies after sync.",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.NETWORK_OFFLINE_SYNC_PENDING]
      })
    ];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
      priority: 50,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: true,
      internalRationale: "Network loss without buffer: review pipeline.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.NETWORK_OFFLINE_SYNC_PENDING]
    })
  ];
}

export function optionsForInterruption(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (input.fallbackReason !== POPS_FALLBACK_REASON.USER_INTERRUPTED) return [];

  const ms = input.interruptionDurationMs ?? 0;
  if (ms > 0 && ms < POPS_FALLBACK_INTERRUPTION_SHORT_MS) {
    return [
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK,
        priority: 12,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.NONE,
        requiresUserAction: false,
        requiresAdminReview: false,
        internalRationale: "Short interruption: continue with slight confidence reduction (applied in service).",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.INTERRUPTION_SHORT_CONFIDENCE_TRIM]
      })
    ];
  }

  if (ms >= POPS_FALLBACK_INTERRUPTION_LONG_MS) {
    return [
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE,
        priority: 200,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED,
        requiresUserAction: false,
        requiresAdminReview: false,
        internalRationale: "Long interruption: pause/close session without fraud language.",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.INTERRUPTION_LONG_SESSION_PAUSED]
      }),
      option({
        fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
        priority: 190,
        rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
        requiresUserAction: false,
        requiresAdminReview: true,
        internalRationale: "Long interruption: optional review instead of hard deny for high-trust users.",
        auditReasonCodes: [POPS_FALLBACK_REASON_CODES.INTERRUPTION_LONG_SESSION_PAUSED]
      })
    ];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME,
      priority: 25,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "Medium interruption: require extra dwell to re-establish continuity.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.INTERRUPTION_SHORT_CONFIDENCE_TRIM]
    })
  ];
}

export function optionsForAccessibility(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (input.fallbackReason !== POPS_FALLBACK_REASON.ACCESSIBILITY_MODE || !input.accessibilityModeActive) {
    return [];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.CTA_CONFIRMATION,
      priority: 8,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "Accessibility: replace discriminatory visual/touch patterns with explicit in-app confirmation.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.ACCESSIBILITY_ALTERNATE_PROOF]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP,
      priority: 9,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "Accessibility: simple confirmation tap.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.ACCESSIBILITY_ALTERNATE_PROOF]
    })
  ];
}

export function optionsForLowBattery(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (input.fallbackReason !== POPS_FALLBACK_REASON.LOW_BATTERY_MODE || !input.lowBatteryModeActive) {
    return [];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK,
      priority: 11,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.NONE,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "Low battery: reduce capture frequency; mark degraded without direct user penalty.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.LOW_BATTERY_SENSOR_DEGRADED]
    })
  ];
}

export function optionsForServerTimeout(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (input.fallbackReason !== POPS_FALLBACK_REASON.SERVER_TIMEOUT || !input.serverTimeout) return [];

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
      priority: 14,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "Server timeout: pending review / retry — do not deny reward outright.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.SERVER_TIMEOUT_PENDING_REVIEW]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.ADMIN_REVIEW,
      priority: 16,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: true,
      internalRationale: "Server timeout with repeated failures: queue for ops review.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.SERVER_TIMEOUT_PENDING_REVIEW]
    })
  ];
}

export function optionsForScoringUnavailable(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (input.fallbackReason !== POPS_FALLBACK_REASON.SCORING_UNAVAILABLE || !input.scoringUnavailable) {
    return [];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
      priority: 13,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: true,
      internalRationale: "Scoring unavailable: never auto-approve; pending review + privacy receipt.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.SCORING_UNAVAILABLE_PENDING_REVIEW]
    })
  ];
}

export function optionsForMotionDegraded(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (
    input.fallbackReason !== POPS_FALLBACK_REASON.MOTION_SIGNAL_UNAVAILABLE &&
    input.fallbackReason !== POPS_FALLBACK_REASON.SENSOR_DEGRADED &&
    input.fallbackReason !== POPS_FALLBACK_REASON.APP_STATE_UNCERTAIN
  ) {
    return [];
  }

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK,
      priority: 18,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.NONE,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "Non-visual signals reweighted; degraded sensor is not fraud.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.OPTIONAL_VISUAL_REDISTRIBUTED]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME,
      priority: 35,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED,
      requiresUserAction: true,
      requiresAdminReview: false,
      internalRationale: "If continuity uncertain, add dwell for fairness.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.DEVICE_LIMITATION_PATH]
    })
  ];
}

export function optionsForPolicy(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (
    input.fallbackReason !== POPS_FALLBACK_REASON.PRIVACY_POLICY_RESTRICTED &&
    input.fallbackReason !== POPS_FALLBACK_REASON.REGION_POLICY_RESTRICTED
  ) {
    return [];
  }

  const baseCodes =
    input.fallbackReason === POPS_FALLBACK_REASON.REGION_POLICY_RESTRICTED
      ? [POPS_FALLBACK_REASON_CODES.REGION_POLICY_RESTRICTED]
      : [POPS_FALLBACK_REASON_CODES.PRIVACY_RECEIPT_FALLBACK_APPLIED];

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE,
      priority: 600,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "Policy restriction: safe close without storing disallowed signals.",
      auditReasonCodes: baseCodes
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
      priority: 590,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: true,
      internalRationale: "Policy edge case: human review with minimal data retention.",
      auditReasonCodes: baseCodes
    })
  ];
}

export function optionsForDeviceLimitation(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  if (input.fallbackReason !== POPS_FALLBACK_REASON.DEVICE_LIMITATION) return [];

  return [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.PARTIAL_REWARD,
      priority: 22,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.PARTIAL_REWARD_ALLOWED,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "Device cannot supply full proof stack: partial path preserves fairness.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.DEVICE_LIMITATION_PATH]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL,
      priority: 24,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "High trust + low fraud: allow trust-weighted approval when signals capped by device.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.DEVICE_LIMITATION_PATH]
    })
  ];
}

const reasonHandlers: Record<
  PopsFallbackReason,
  (input: PopsFallbackEvaluationInput) => PopsFallbackOption[]
> = {
  [POPS_FALLBACK_REASON.VISUAL_SIGNAL_UNAVAILABLE]: optionsForVisualPath,
  [POPS_FALLBACK_REASON.PERMISSION_DECLINED]: optionsForVisualPath,
  [POPS_FALLBACK_REASON.NETWORK_INTERRUPTION]: optionsForNetwork,
  [POPS_FALLBACK_REASON.OFFLINE_SYNC_REQUIRED]: optionsForNetwork,
  [POPS_FALLBACK_REASON.USER_INTERRUPTED]: optionsForInterruption,
  [POPS_FALLBACK_REASON.ACCESSIBILITY_MODE]: optionsForAccessibility,
  [POPS_FALLBACK_REASON.LOW_BATTERY_MODE]: optionsForLowBattery,
  [POPS_FALLBACK_REASON.SERVER_TIMEOUT]: optionsForServerTimeout,
  [POPS_FALLBACK_REASON.SCORING_UNAVAILABLE]: optionsForScoringUnavailable,
  [POPS_FALLBACK_REASON.MOTION_SIGNAL_UNAVAILABLE]: optionsForMotionDegraded,
  [POPS_FALLBACK_REASON.SENSOR_DEGRADED]: optionsForMotionDegraded,
  [POPS_FALLBACK_REASON.APP_STATE_UNCERTAIN]: optionsForMotionDegraded,
  [POPS_FALLBACK_REASON.PRIVACY_POLICY_RESTRICTED]: optionsForPolicy,
  [POPS_FALLBACK_REASON.REGION_POLICY_RESTRICTED]: optionsForPolicy,
  [POPS_FALLBACK_REASON.DEVICE_LIMITATION]: optionsForDeviceLimitation
};

/** Collect candidate fallback options for a degraded or missing-signal session. */
export function collectFallbackOptionsForReason(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  const handler = reasonHandlers[input.fallbackReason];
  const primary = handler ? handler(input) : [];

  if (primary.length > 0) {
    return restrictOptionsForFraud(input.fraudRisk, primary);
  }

  return restrictOptionsForFraud(input.fraudRisk, [
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
      priority: 100,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
      requiresUserAction: false,
      requiresAdminReview: true,
      internalRationale: "Generic degraded path: conservative review.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.PRIVACY_RECEIPT_FALLBACK_APPLIED]
    }),
    option({
      fallbackMethod: POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE,
      priority: 300,
      rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED,
      requiresUserAction: false,
      requiresAdminReview: false,
      internalRationale: "Generic safe deny when no better path.",
      auditReasonCodes: [POPS_FALLBACK_REASON_CODES.PRIVACY_RECEIPT_FALLBACK_APPLIED]
    })
  ]);
}
