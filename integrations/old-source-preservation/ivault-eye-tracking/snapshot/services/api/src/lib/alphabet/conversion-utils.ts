import type {
  CoinConversion,
  ConversionContext,
  ConversionRule
} from "../../types/alphabet/conversion.types";
import {
  canCoinConvertToICoin,
  canCoinConvertToVCoin,
  shouldNeverConvertDirectlyToMoney
} from "./coin-utils";

export function validateCoinConversion(
  context: ConversionContext,
  rule: ConversionRule
): { valid: boolean; reason?: string } {
  const isActive = (rule as { active?: boolean }).active ?? true;
  const minTrustTier = (rule as { minTrustTier?: number }).minTrustTier ?? 0;
  const minQualityScore = (rule as { minQualityScore?: number }).minQualityScore ?? 0;
  const requiresBudgetSource = (rule as { requiresBudgetSource?: boolean }).requiresBudgetSource ?? false;

  if (!isActive) {
    return { valid: false, reason: "Conversion rule is inactive." };
  }

  if (
    context.sourceCoin !== rule.sourceCoin ||
    context.targetCoin !== rule.targetCoin
  ) {
    return { valid: false, reason: "Conversion rule does not match requested pair." };
  }

  if (context.sourceAmount <= 0) {
    return { valid: false, reason: "Source amount must be greater than zero." };
  }

  if (context.trustTier < minTrustTier) {
    return { valid: false, reason: "Trust tier too low for conversion." };
  }

  if (context.qualityScore < minQualityScore) {
    return { valid: false, reason: "Quality score too low for conversion." };
  }

  if (requiresBudgetSource && !context.hasBudgetSource) {
    return { valid: false, reason: "Conversion requires a funded budget source." };
  }

  if (context.targetCoin === "I" && !canCoinConvertToICoin(context.sourceCoin)) {
    return { valid: false, reason: "Source coin cannot convert to iCoin." };
  }

  if (context.targetCoin === "V" && !canCoinConvertToVCoin(context.sourceCoin)) {
    return { valid: false, reason: "Source coin cannot convert to vCoin." };
  }

  if (
    context.targetCoin === "V" &&
    shouldNeverConvertDirectlyToMoney(context.sourceCoin)
  ) {
    return {
      valid: false,
      reason: "Source coin should never convert directly into spendable value."
    };
  }

  return { valid: true };
}

export function calculateConversionTargetAmount(params: {
  sourceAmount: number;
  baseRate: number;
  qualityMultiplier: number;
  trustMultiplier: number;
  riskMultiplier: number;
  ageMultiplier: number;
}): number {
  const raw =
    params.sourceAmount *
    params.baseRate *
    params.qualityMultiplier *
    params.trustMultiplier *
    params.riskMultiplier *
    params.ageMultiplier;

  return Math.max(0, Number(raw.toFixed(6)));
}

export function createCoinConversion(params: {
  conversionId: string;
  userId: string;
  context: ConversionContext;
  rule: ConversionRule;
  qualityMultiplier: number;
  trustMultiplier: number;
  riskMultiplier: number;
  ageMultiplier: number;
}): CoinConversion {
  const baseRate =
    (params.rule as { baseRate?: number }).baseRate ??
    (params.rule as { baseConversionRate?: number }).baseConversionRate ??
    0;

  const targetAmount = calculateConversionTargetAmount({
    sourceAmount: params.context.sourceAmount,
    baseRate,
    qualityMultiplier: params.qualityMultiplier,
    trustMultiplier: params.trustMultiplier,
    riskMultiplier: params.riskMultiplier,
    ageMultiplier: params.ageMultiplier
  });

  return {
    conversionId: params.conversionId,
    userId: params.userId,
    sourceCoin: params.context.sourceCoin,
    targetCoin: params.context.targetCoin,
    sourceAmount: params.context.sourceAmount,
    targetAmount,
    baseRate,
    qualityMultiplier: params.qualityMultiplier,
    trustMultiplier: params.trustMultiplier,
    riskMultiplier: params.riskMultiplier,
    ageMultiplier: params.ageMultiplier,
    status: "requested",
    createdAt: new Date().toISOString(),
    settledAt: null
  };
}
