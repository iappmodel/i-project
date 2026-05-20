import {
  DOMAIN_KEYWORDS,
  I_COMMAND_PREFIXES,
  VERB_PATTERNS,
} from "./i-command-grammar";

import type {
  ICommandDomain,
  ICommandEntities,
  ICommandParseResult,
  ICommandVerb,
  IMemoryClass,
  IPrivacyLevel,
  ISafetyFlag,
} from "./i-command.types";

export function parseICommand(raw: string): ICommandParseResult {
  const normalized = normalize(raw);
  const isICommand = startsWithICommand(normalized);
  const body = isICommand ? stripIPrefix(normalized) : normalized;

  const verb = detectVerb(body);
  const domain = detectDomain(body, verb);
  const safetyFlags = detectSafetyFlags(body);
  const privacyLevel = detectPrivacyLevel(domain, body, safetyFlags);
  const memoryClass = detectMemoryClass(domain, body, safetyFlags);
  const entities = extractEntities(body);
  const confidence = computeConfidence({
    isICommand,
    verb,
    domain,
    safetyFlags,
  });

  return {
    isICommand,
    raw,
    normalized,
    body,
    verb,
    domain,
    privacyLevel,
    memoryClass,
    confidence,
    entities,
    safetyFlags,
  };
}

function normalize(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function startsWithICommand(input: string): boolean {
  const lower = input.toLowerCase();

  if (lower === "i") return true;

  return I_COMMAND_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function stripIPrefix(input: string): string {
  return input
    .replace(/^i[\s,.:;\n]+/i, "")
    .trim();
}

function detectVerb(body: string): ICommandVerb {
  for (const [verb, patterns] of Object.entries(VERB_PATTERNS)) {
    if (verb === "unknown") continue;

    if (patterns.some((pattern) => pattern.test(body))) {
      return verb as ICommandVerb;
    }
  }

  // fallback: look for explicit keywords
  if (/\bearn\b/i.test(body)) return "earn";
  if (/\bpost\b/i.test(body)) return "post";

  return "unknown";
}

function detectDomain(body: string, verb: ICommandVerb): ICommandDomain {
  const lower = body.toLowerCase();

  if (["pay", "withdraw", "convert"].includes(verb)) {
    return "wallet_economy";
  }

  if (verb === "earn" || /\bearn\b/i.test(body)) {
    return "wallet_economy";
  }

  if (["post", "make"].includes(verb) || /\bpost\b/i.test(body)) {
    return "studio_creation";
  }

  if (verb === "protect") {
    return "originality_protection";
  }

  if (verb === "confess" || verb === "feel") {
    return "private_self";
  }

  // Navigation: "show me ..." prefix is always navigation intent
  if (/^show me\b/i.test(body)) {
    return "navigation";
  }

  let bestDomain: ICommandDomain = "unknown";
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (domain === "unknown") continue;

    const score = keywords.reduce((count, keyword) => {
      return lower.includes(keyword) ? count + 1 : count;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain as ICommandDomain;
    }
  }

  return bestDomain;
}

function detectSafetyFlags(body: string): ISafetyFlag[] {
  const lower = body.toLowerCase();
  const flags: ISafetyFlag[] = [];

  if (
    lower.includes("kill myself") ||
    lower.includes("suicide") ||
    lower.includes("hurt myself") ||
    lower.includes("can't go on")
  ) {
    flags.push("self_harm");
  }

  if (
    lower.includes("hurt someone") ||
    lower.includes("kill someone") ||
    lower.includes("violence")
  ) {
    flags.push("violence");
  }

  if (
    lower.includes("overdose") ||
    lower.includes("heart attack") ||
    lower.includes("can't breathe") ||
    lower.includes("medical emergency")
  ) {
    flags.push("medical_emergency");
  }

  if (
    lower.includes("abuse") ||
    lower.includes("being hit") ||
    lower.includes("unsafe at home")
  ) {
    flags.push("abuse");
  }

  if (
    lower.includes("minor") ||
    lower.includes("child") ||
    lower.includes("underage")
  ) {
    flags.push("minor_safety");
  }

  if (lower.includes("panic") || lower.includes("breaking down")) {
    flags.push("severe_distress");
  }

  return flags.length > 0 ? flags : ["none"];
}

function detectPrivacyLevel(
  domain: ICommandDomain,
  body: string,
  safetyFlags: ISafetyFlag[],
): IPrivacyLevel {
  if (safetyFlags.some((flag) => flag !== "none")) {
    return "restricted";
  }

  const lower = body.toLowerCase();

  if (
    domain === "private_self" ||
    lower.includes("secret") ||
    lower.includes("confess") ||
    lower.includes("between us") ||
    lower.includes("private")
  ) {
    return "deep_private";
  }

  if (
    domain === "health" ||
    domain === "finance" ||
    domain === "relationships" ||
    domain === "career"
  ) {
    return "private";
  }

  if (domain === "wallet_economy") {
    return "personal";
  }

  return "public_safe";
}

function detectMemoryClass(
  domain: ICommandDomain,
  body: string,
  safetyFlags: ISafetyFlag[],
): IMemoryClass {
  if (safetyFlags.includes("self_harm") || safetyFlags.includes("abuse")) {
    return "restricted";
  }

  const lower = body.toLowerCase();

  if (
    lower.includes("remember this") ||
    lower.includes("save this") ||
    lower.includes("keep this")
  ) {
    return "sensitive";
  }

  if (domain === "private_self" || domain === "relationships") {
    return "sensitive";
  }

  if (domain === "health" || domain === "finance") {
    return "sensitive";
  }

  if (domain === "career") {
    return "goal";
  }

  if (lower.includes("i want to") || lower.includes("my goal")) {
    return "goal";
  }

  return "temporary";
}

function extractEntities(body: string): ICommandEntities {
  const amountMatch = body.match(/\$?(\d+(?:\.\d{1,2})?)/);
  const currencyMatch = body.match(/\b(icoin|icoins|vcoin|vcoins|usd|dollar|dollars)\b/i);

  return {
    amount: amountMatch ? Number(amountMatch[1]) : undefined,
    currency: currencyMatch?.[1]?.toLowerCase(),
    personName: extractPersonName(body),
    timeframe: extractTimeframe(body),
  };
}

function extractPersonName(body: string): string | undefined {
  const payMatch = body.match(/(?:pay|send|tip)\s+([A-Z][a-z]+|\w+)/i);
  return payMatch?.[1];
}

function extractTimeframe(body: string): string | undefined {
  const lower = body.toLowerCase();

  if (lower.includes("today")) return "today";
  if (lower.includes("tomorrow")) return "tomorrow";
  if (lower.includes("this week")) return "this_week";
  if (lower.includes("this month")) return "this_month";

  return undefined;
}

function computeConfidence(input: {
  isICommand: boolean;
  verb: ICommandVerb;
  domain: ICommandDomain;
  safetyFlags: ISafetyFlag[];
}): number {
  let score = 0;

  if (input.isICommand) score += 0.35;
  if (input.verb !== "unknown") score += 0.25;
  if (input.domain !== "unknown") score += 0.3;
  if (input.safetyFlags.some((flag) => flag !== "none")) score += 0.1;

  return Math.min(1, Number(score.toFixed(2)));
}
