/**
 * i Command Stage 3 — fixture library
 * All expected fields are optional; only present fields are asserted.
 */
export interface ICommandFixture {
  name: string;
  input: string;
  expected: {
    isICommand?: boolean;
    domain?: string;
    verb?: string;
    privacyLevel?: string;
    memoryClass?: string;
    actionType?: string;
    uxState?: string;
    requiresConfirmation?: boolean;
    requiresMemoryConsent?: boolean;
    suggestedActionLabel?: string;
    amount?: number;
    personName?: string;
    timeframe?: string;
  };
}

// ─── Safety shorthand (every safety fixture shares the same expected shape) ───
const SAFETY_EXPECTED = {
  privacyLevel: "restricted",
  actionType: "safety_escalation",
  uxState: "blocked",
  suggestedActionLabel: "Get support now",
} as const;

export const FIXTURES: ICommandFixture[] = [

  // ────────────────────────────────────────────────────────────────────────────
  // Stage 2 original 8 cases (unchanged)
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "stage2 / calm down",
    input: "i need to calm down",
    expected: {
      domain: "private_self",
      privacyLevel: "deep_private",
      actionType: "open_private_session",
    },
  },
  {
    name: "stage2 / earn today",
    input: "i want to earn today",
    expected: {
      domain: "wallet_economy",
      actionType: "open_earn",
      timeframe: "today",
    },
  },
  {
    name: "stage2 / pay Ana 10",
    input: "i pay Ana 10",
    expected: {
      domain: "wallet_economy",
      actionType: "prepare_payment",
      amount: 10,
      personName: "Ana",
      requiresConfirmation: true,
    },
  },
  {
    name: "stage2 / post video",
    input: "i want to post this video",
    expected: {
      domain: "studio_creation",
    },
  },
  {
    name: "stage2 / protect song",
    input: "i protect this song",
    expected: {
      domain: "originality_protection",
      actionType: "protect_media",
      requiresConfirmation: true,
    },
  },
  {
    name: "stage2 / need a job",
    input: "i need a job",
    expected: {
      domain: "career",
      actionType: "open_career_plan",
      memoryClass: "goal",
      requiresMemoryConsent: true,
    },
  },
  {
    name: "stage2 / hurt myself (safety)",
    input: "i want to hurt myself",
    expected: { ...SAFETY_EXPECTED },
  },
  {
    name: "stage2 / non-i-command",
    input: "hello platform",
    expected: {
      isICommand: false,
      actionType: "none",
      uxState: "idle",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Private / self
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "private / feel lost",
    input: "i feel lost",
    expected: {
      domain: "private_self",
      privacyLevel: "deep_private",
      actionType: "open_private_session",
    },
  },
  {
    name: "private / confess something private",
    input: "i confess something private",
    expected: {
      domain: "private_self",
      privacyLevel: "deep_private",
      actionType: "open_private_session",
    },
  },
  {
    name: "private / overwhelmed",
    input: "i am overwhelmed",
    expected: {
      domain: "private_self",
      privacyLevel: "deep_private",
      actionType: "open_private_session",
    },
  },
  {
    name: "private / become better",
    input: "i want to become better",
    expected: {
      domain: "private_self",
      actionType: "open_private_session",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Wallet / economy
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "wallet / withdraw 25",
    input: "i withdraw 25",
    expected: {
      domain: "wallet_economy",
      actionType: "open_wallet",
      amount: 25,
    },
  },
  {
    name: "wallet / convert 10 icoins",
    input: "i convert 10 icoins",
    expected: {
      domain: "wallet_economy",
      actionType: "open_wallet",
      amount: 10,
    },
  },
  {
    name: "wallet / tip Maria 5",
    input: "i tip Maria 5",
    expected: {
      domain: "wallet_economy",
      actionType: "prepare_payment",
      amount: 5,
      personName: "Maria",
      requiresConfirmation: true,
    },
  },
  {
    name: "wallet / open wallet",
    input: "i open wallet",
    expected: {
      domain: "wallet_economy",
      actionType: "open_wallet",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Studio / creation
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "studio / edit video",
    input: "i edit this video",
    expected: {
      domain: "studio_creation",
      actionType: "open_studio",
    },
  },
  {
    name: "studio / caption",
    input: "i make a caption for this",
    expected: {
      domain: "studio_creation",
      actionType: "open_studio",
    },
  },
  {
    name: "studio / post this",
    input: "i post this",
    expected: {
      domain: "studio_creation",
      actionType: "prepare_post",
      requiresConfirmation: true,
    },
  },
  {
    name: "studio / publish video",
    input: "i publish this video",
    expected: {
      domain: "studio_creation",
      requiresConfirmation: true,
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Originality / protection
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "originality / prove mine",
    input: "i prove this is mine",
    expected: {
      domain: "originality_protection",
      actionType: "protect_media",
      requiresConfirmation: true,
    },
  },
  {
    name: "originality / protect original song",
    input: "i protect my original song",
    expected: {
      domain: "originality_protection",
      actionType: "protect_media",
      requiresConfirmation: true,
    },
  },
  {
    name: "originality / check if stolen",
    input: "i check if this video was stolen",
    expected: {
      domain: "originality_protection",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Health
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "health / get healthier",
    input: "i want to get healthier",
    expected: {
      domain: "health",
      actionType: "open_health_plan",
    },
  },
  {
    name: "health / workout plan",
    input: "i need a workout plan",
    expected: {
      domain: "health",
      actionType: "open_health_plan",
    },
  },
  {
    name: "health / sleep help",
    input: "i need help with sleep",
    expected: {
      domain: "health",
      actionType: "open_health_plan",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Career
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "career / need a job",
    input: "i need a job",
    expected: {
      domain: "career",
      actionType: "open_career_plan",
      memoryClass: "goal",
      requiresMemoryConsent: true,
    },
  },
  {
    name: "career / fix resume",
    input: "i want to fix my resume",
    expected: {
      domain: "career",
      actionType: "open_career_plan",
    },
  },
  {
    name: "career / interview help",
    input: "i need interview help",
    expected: {
      domain: "career",
      actionType: "open_career_plan",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Finance
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "finance / need budget",
    input: "i need a budget",
    expected: {
      domain: "finance",
      actionType: "open_finance_plan",
    },
  },
  {
    name: "finance / debt help",
    input: "i need help with debt",
    expected: {
      domain: "finance",
      actionType: "open_finance_plan",
    },
  },
  {
    name: "finance / save money",
    input: "i want to save money",
    expected: {
      domain: "finance",
      actionType: "open_finance_plan",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Relationships
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "relationships / relationship help",
    input: "i need help with my relationship",
    expected: {
      domain: "relationships",
      actionType: "open_relationship_reflection",
    },
  },
  {
    name: "relationships / argument with friend",
    input: "i had an argument with my friend",
    expected: {
      domain: "relationships",
      actionType: "open_relationship_reflection",
    },
  },
  {
    name: "relationships / set a boundary",
    input: "i need to set a boundary",
    expected: {
      domain: "relationships",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "navigation / open settings",
    input: "i open settings",
    expected: {
      domain: "navigation",
      actionType: "open_navigation",
    },
  },
  {
    name: "navigation / go to profile",
    input: "i go to profile",
    expected: {
      domain: "navigation",
      actionType: "open_navigation",
    },
  },
  {
    name: "navigation / show me my wallet",
    input: "i show me my wallet",
    expected: {
      domain: "navigation",
      actionType: "open_navigation",
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Safety
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "safety / hurt myself",
    input: "i want to hurt myself",
    expected: { ...SAFETY_EXPECTED },
  },
  {
    name: "safety / can't breathe",
    input: "i can't breathe",
    expected: { ...SAFETY_EXPECTED },
  },
  {
    name: "safety / unsafe at home",
    input: "i am unsafe at home",
    expected: { ...SAFETY_EXPECTED },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Non-command
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "non-command / hello platform",
    input: "hello platform",
    expected: {
      isICommand: false,
      actionType: "none",
      uxState: "idle",
    },
  },
  {
    name: "non-command / can you open my wallet",
    input: "can you open my wallet",
    expected: {
      isICommand: false,
      actionType: "none",
      uxState: "idle",
    },
  },
];
