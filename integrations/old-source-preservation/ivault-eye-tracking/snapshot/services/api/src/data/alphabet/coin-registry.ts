import type { CoinDefinition } from "../../types/alphabet/coin.types";

export const ALPHABET_COIN_REGISTRY: CoinDefinition[] = [
  {
    code: "A",
    name: "aCoin",
    letter: "A",
    coreMeaning: "Attention",
    measures:
      "Verified human attention, presence, viewing quality, focus, and honest engagement with content, offers, learning, creators, brands, and platform experiences.",
    category: "core_economic",
    isSpendable: false,
    isScoreBased: false,
    isIdentityBased: false,
    isAccessBased: false,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "You earn aCoins when the system verifies that you truly paid attention.",
    internalExplanation:
      "Raw attention signal. May convert only after attention verification, fraud checks, campaign rules, and trust gates.",
    mythicSentence:
      "A is the coin of attention. It proves the user truly looked."
  },
  {
    code: "B",
    name: "bCoin",
    letter: "B",
    coreMeaning: "Belonging",
    measures:
      "Healthy community membership, constructive participation, loyalty to safe groups, and social continuity.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation:
      "bCoins show healthy belonging inside communities, cohorts, creator circles, and local groups.",
    internalExplanation:
      "Community health and belonging signal. Used for group access, social permissions, and community reputation.",
    mythicSentence:
      "B is the coin of belonging. It proves the group is better because the user is there."
  },
  {
    code: "C",
    name: "cCoin",
    letter: "C",
    coreMeaning: "Creation",
    measures:
      "Valid creative production, content creation, media creation, courses, tools, assets, and usable output.",
    category: "creator_contribution",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "public",
    userFacingExplanation:
      "cCoins show that you created something real and valid.",
    internalExplanation:
      "Creation existence and validity signal. Requires rights checks, spam checks, and artifact verification.",
    mythicSentence:
      "C is the coin of making. It proves the user added something to the world."
  },
  {
    code: "D",
    name: "dCoin",
    letter: "D",
    coreMeaning: "Discipline",
    measures:
      "Healthy consistency, follow-through, routines, habit stability, and responsible repetition.",
    category: "human_development",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "dCoins show healthy consistency toward valuable goals.",
    internalExplanation:
      "Habit and streak integrity signal. Must avoid addiction loops and empty streak farming.",
    mythicSentence:
      "D is the coin of return. It proves the user came back with purpose."
  },
  {
    code: "E",
    name: "eCoin",
    letter: "E",
    coreMeaning: "Engagement",
    measures:
      "Meaningful active interaction: comments, saves, shares, replies, follows, polls, quizzes, and community participation.",
    category: "core_economic",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: false,
    isAccessBased: false,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation: "eCoins show meaningful engagement, not spam.",
    internalExplanation:
      "Active engagement signal. Conversion requires quality, anti-spam, anti-brigading, and trust checks.",
    mythicSentence:
      "E is the coin of response. It proves the user touched the world back."
  },
  {
    code: "F",
    name: "fCoin",
    letter: "F",
    coreMeaning: "Focus",
    measures:
      "Sustained focus, deep attention, session integrity, and distraction resistance.",
    category: "human_development",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "fCoins show that your attention stayed stable and intentional.",
    internalExplanation:
      "Deep session-quality signal. Used as multiplier for learning, work, and attention sessions.",
    mythicSentence:
      "F is the coin of mental gravity. It proves the user did not only look — they stayed."
  },
  {
    code: "G",
    name: "gCoin",
    letter: "G",
    coreMeaning: "Growth",
    measures:
      "Measured improvement over time, progress, practice gains, and personal development.",
    category: "human_development",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation: "gCoins show verified improvement over time.",
    internalExplanation:
      "Before-effort-after progression signal. Conversion only through funded growth challenges.",
    mythicSentence:
      "G is the coin of becoming. It measures the distance between who the user was and who they are becoming."
  },
  {
    code: "H",
    name: "hCoin",
    letter: "H",
    coreMeaning: "Help",
    measures:
      "Useful assistance, guidance, mentorship, support, problem-solving, and care.",
    category: "creator_contribution",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation:
      "hCoins show that your help was useful to another person.",
    internalExplanation:
      "Verified helpfulness signal. Requires recipient outcome, quality, anti-collusion, and abuse checks.",
    mythicSentence:
      "H is the coin of help. It proves value passed from one human to another."
  },
  {
    code: "I",
    name: "iCoin",
    letter: "I",
    coreMeaning: "Identity",
    measures:
      "Verified identity, stable human presence, account legitimacy, personal continuity, and economic eligibility.",
    category: "core_economic",
    isSpendable: true,
    isScoreBased: false,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "iCoins are identity-linked value attached to a real accountable human.",
    internalExplanation:
      "Genesis coin. Anchors value, eligibility, wallet legitimacy, identity continuity, and trusted economic participation.",
    mythicSentence:
      "I is the coin of the self. It proves value belongs to a real human, not a shadow."
  },
  {
    code: "J",
    name: "jCoin",
    letter: "J",
    coreMeaning: "Judgment",
    measures:
      "Decision quality, discernment, moderation accuracy, review accuracy, and responsible choices.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation: "jCoins show reliable decision quality.",
    internalExplanation:
      "Decision reliability signal. Used for moderation weight, review credibility, and dispute influence.",
    mythicSentence:
      "J is the coin of discernment. It proves the user can be trusted not only to act — but to decide."
  },
  {
    code: "K",
    name: "kCoin",
    letter: "K",
    coreMeaning: "Knowledge",
    measures:
      "Verified knowledge, factual understanding, recall, applied information, and domain literacy.",
    category: "human_development",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation: "kCoins show what you actually know and can use.",
    internalExplanation:
      "Retained knowledge signal. Verified through recall, explanation, application, and source integrity.",
    mythicSentence:
      "K is the coin of knowing. It proves the user kept the truth and can use it."
  },
  {
    code: "L",
    name: "lCoin",
    letter: "L",
    coreMeaning: "Learning",
    measures:
      "Verified learning, comprehension, practice, course progress, and skill formation.",
    category: "human_development",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "lCoins show verified learning, not just watching educational content.",
    internalExplanation:
      "Learning process signal. Requires comprehension, recall, application, or progress verification.",
    mythicSentence:
      "L is the coin of learning. It proves attention became knowledge."
  },
  {
    code: "M",
    name: "mCoin",
    letter: "M",
    coreMeaning: "Mastery",
    measures:
      "Deep competence, repeated excellence, verified expertise, and durable skill.",
    category: "human_development",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "public",
    userFacingExplanation:
      "mCoins show repeated high-quality performance over time.",
    internalExplanation:
      "Durable skill signal. Requires repeated proof under meaningful difficulty.",
    mythicSentence:
      "M is the coin of mastery. It proves the user can actually do this."
  },
  {
    code: "N",
    name: "nCoin",
    letter: "N",
    coreMeaning: "Nobility",
    measures:
      "Verified pro-social action, fairness, protection, sacrifice, responsibility, and integrity.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation:
      "nCoins show verified noble action, not public performance.",
    internalExplanation:
      "Moral/pro-social signal. Must resist virtue-signaling, staged generosity, and false reporting.",
    mythicSentence:
      "N is the coin of nobility. It proves the user created value without extraction."
  },
  {
    code: "O",
    name: "oCoin",
    letter: "O",
    coreMeaning: "Originality",
    measures:
      "Novelty, authorship, invention, remix quality, and non-duplicative creative contribution.",
    category: "creator_contribution",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "public",
    userFacingExplanation: "oCoins show how original your contribution is.",
    internalExplanation:
      "Originality signal. Requires plagiarism checks, AI-content labeling, rights validation, and remix rules.",
    mythicSentence:
      "O is the coin of originality. It proves the user added something new."
  },
  {
    code: "P",
    name: "pCoin",
    letter: "P",
    coreMeaning: "Presence",
    measures:
      "Verified physical or digital attendance, check-ins, live participation, and showing up.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "pCoins show verified presence in meaningful places or moments.",
    internalExplanation:
      "Attendance and presence signal. Requires anti-spoofing, GPS/session proof, and privacy controls.",
    mythicSentence: "P is the coin of presence. It proves the user was there."
  },
  {
    code: "Q",
    name: "qCoin",
    letter: "Q",
    coreMeaning: "Quality",
    measures:
      "Quality of contribution, engagement, creation, help, learning, participation, and reviews.",
    category: "creator_contribution",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation: "qCoins show that what you did was actually good.",
    internalExplanation:
      "Value-density signal. Used as multiplier and anti-spam filter across the economy.",
    mythicSentence:
      "Q is the coin of excellence. It proves what the user did was real and good."
  },
  {
    code: "R",
    name: "rCoin",
    letter: "R",
    coreMeaning: "Reputation",
    measures:
      "Long-term reliability, credibility, review integrity, fulfilled commitments, and social proof.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation: "rCoins show repeated reliability over time.",
    internalExplanation:
      "Reputation graph signal. Used for marketplace confidence, review weight, and creator ranking.",
    mythicSentence: "R is the shadow your actions leave behind."
  },
  {
    code: "S",
    name: "sCoin",
    letter: "S",
    coreMeaning: "Safety",
    measures:
      "Safe behavior, risk reduction, protection of minors, scam resistance, and ecosystem safety.",
    category: "system_protective",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation: "sCoins show responsible safety contribution.",
    internalExplanation:
      "Safety and risk-reduction signal. Used for moderation, minor protections, fraud controls, and feature gates.",
    mythicSentence:
      "S is the shield coin. It proves the user protects the world where value lives."
  },
  {
    code: "T",
    name: "tCoin",
    letter: "T",
    coreMeaning: "Trust",
    measures:
      "Trustworthiness, honesty, low-risk behavior, identity stability, payment reliability, and permission safety.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: false,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation:
      "tCoins show how much the system can safely allow.",
    internalExplanation:
      "Permission and risk gate. Controls withdrawals, conversions, campaign eligibility, sensitive access, and payout speed.",
    mythicSentence:
      "T is the key coin. It decides how much reality the system is willing to open."
  },
  {
    code: "U",
    name: "uCoin",
    letter: "U",
    coreMeaning: "User Value",
    measures:
      "Accumulated long-term human value created through verified actions, trust, helpfulness, learning, originality, and contribution.",
    category: "identity_trust_governance",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "uCoins represent the value you build over time.",
    internalExplanation:
      "Long-term human value accumulator. Drives rare rewards, grants, protection, boosts, access, and platform citizenship.",
    mythicSentence:
      "U is the coin of accumulated human value. One day, value can return to the human who built it."
  },
  {
    code: "V",
    name: "vCoin",
    letter: "V",
    coreMeaning: "Value",
    measures:
      "Spendable platform value, verified rewards, campaign-funded earnings, creator income, and usable purchasing power.",
    category: "core_economic",
    isSpendable: true,
    isScoreBased: false,
    isIdentityBased: false,
    isAccessBased: false,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: false,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "vCoins are usable platform value after rewards become safe to spend.",
    internalExplanation:
      "Spendable platform value. Governed by source lots, pending holds, settlement, chargeback risk, age rules, and trust gates.",
    mythicSentence: "V is the coin of usable value."
  },
  {
    code: "W",
    name: "wCoin",
    letter: "W",
    coreMeaning: "Work",
    measures:
      "Verified effort, task completion, labor contribution, campaign work, service work, and useful execution.",
    category: "core_economic",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: false,
    isAccessBased: true,
    isSystemOnly: false,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation: "wCoins show completed useful work.",
    internalExplanation:
      "Verified task-completion signal. Conversion requires task review, quality checks, labor rules, and settlement.",
    mythicSentence: "W is the coin of effort made real."
  },
  {
    code: "X",
    name: "xCoin",
    letter: "X",
    coreMeaning: "Exchange",
    measures:
      "Fair exchange, transaction integrity, marketplace reliability, escrow behavior, and clean value transfer.",
    category: "core_economic",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: false,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "tier_only",
    userFacingExplanation: "xCoins show clean, fair exchange.",
    internalExplanation:
      "Marketplace integrity signal. Affects escrow, dispute weight, transaction limits, and settlement speed.",
    mythicSentence:
      "X is the coin of clean exchange. It proves value moved without betrayal."
  },
  {
    code: "Y",
    name: "yCoin",
    letter: "Y",
    coreMeaning: "Yield",
    measures:
      "Durable positive return from past actions, lasting contribution, creator output yield, learning yield, and community yield.",
    category: "creator_contribution",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "private",
    userFacingExplanation:
      "yCoins show that something you did kept creating value over time.",
    internalExplanation:
      "Durable value signal. Must not be framed as interest/passive income. Converts only from funded reward pools.",
    mythicSentence:
      "Y is the coin of lasting value. It proves what the user did kept giving."
  },
  {
    code: "Z",
    name: "zCoin",
    letter: "Z",
    coreMeaning: "Zenith",
    measures:
      "Peak achievement, rare excellence, elite trust, exceptional mastery, and top-tier identity status.",
    category: "elite_achievement",
    isSpendable: false,
    isScoreBased: true,
    isIdentityBased: true,
    isAccessBased: true,
    isSystemOnly: true,
    canConvertToICoin: true,
    canConvertToVCoin: true,
    shouldNeverConvertDirectlyToMoney: true,
    affectsUValue: true,
    affectsTrust: true,
    defaultVisibility: "public",
    userFacingExplanation: "zCoins show peak verified achievement.",
    internalExplanation:
      "Rare peak-status signal. Non-farmable, domain-specific, protected, and manually/audit verified.",
    mythicSentence:
      "Z is the summit coin. It proves the user did not only grow — they arrived."
  }
];
