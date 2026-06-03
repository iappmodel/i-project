import { SETTLEMENT_CURRENCY_V1 } from "./settlement-amount.constants.js";
import type { SettlementCurrency } from "./settlement-amount.constants.js";

export interface OfferSettlementTerms {
  offerId: string;
  baseRewardMinor: number;
  currency: SettlementCurrency;
}

export interface OfferSettlementTermsProvider {
  getByOfferId(offerId: string): OfferSettlementTerms | null;
}

export const DEFAULT_FIXTURE_OFFER_ID = "nike-pegasus-41-watch";
export const DEFAULT_FIXTURE_BASE_REWARD_MINOR = 100;

export const DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS: OfferSettlementTerms = {
  offerId: DEFAULT_FIXTURE_OFFER_ID,
  baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  currency: SETTLEMENT_CURRENCY_V1
};

const DEMO_FEED_OFFER_TERMS: OfferSettlementTerms[] = [
  {
    offerId: "demo-1-watch",
    baseRewardMinor: 1200,
    currency: SETTLEMENT_CURRENCY_V1
  },
  {
    offerId: "immersive-demo-rafaelo-sunset-watch",
    baseRewardMinor: 1200,
    currency: SETTLEMENT_CURRENCY_V1
  }
];

export class InMemoryOfferSettlementTermsProvider implements OfferSettlementTermsProvider {
  constructor(
    private readonly termsByOfferId: Record<string, OfferSettlementTerms> = {
      [DEFAULT_FIXTURE_OFFER_ID]: DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS,
      ...Object.fromEntries(DEMO_FEED_OFFER_TERMS.map((t) => [t.offerId, t]))
    }
  ) {}

  getByOfferId(offerId: string): OfferSettlementTerms | null {
    return this.termsByOfferId[offerId] ?? null;
  }
}

export function createDefaultOfferSettlementTermsProvider(): InMemoryOfferSettlementTermsProvider {
  return new InMemoryOfferSettlementTermsProvider();
}
