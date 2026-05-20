export type CoinCode =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

export type CoinName =
  | "aCoin"
  | "bCoin"
  | "cCoin"
  | "dCoin"
  | "eCoin"
  | "fCoin"
  | "gCoin"
  | "hCoin"
  | "iCoin"
  | "jCoin"
  | "kCoin"
  | "lCoin"
  | "mCoin"
  | "nCoin"
  | "oCoin"
  | "pCoin"
  | "qCoin"
  | "rCoin"
  | "sCoin"
  | "tCoin"
  | "uCoin"
  | "vCoin"
  | "wCoin"
  | "xCoin"
  | "yCoin"
  | "zCoin";

export type CoinCategory =
  | "core_economic"
  | "human_development"
  | "creator_contribution"
  | "identity_trust_governance"
  | "system_protective"
  | "elite_achievement";

export type CoinBalanceState =
  | "pending"
  | "available"
  | "locked"
  | "restricted"
  | "identity"
  | "score"
  | "expired"
  | "revoked"
  | "converted"
  | "settled";

export type CoinVisibility =
  | "public"
  | "private"
  | "tier_only"
  | "admin_only"
  | "hidden";

export interface CoinDefinition {
  code: CoinCode;
  name: CoinName;
  letter: CoinCode;
  coreMeaning: string;
  measures: string;
  category: CoinCategory;
  isSpendable: boolean;
  isScoreBased: boolean;
  isIdentityBased: boolean;
  isAccessBased: boolean;
  isSystemOnly: boolean;
  canConvertToICoin: boolean;
  canConvertToVCoin: boolean;
  shouldNeverConvertDirectlyToMoney: boolean;
  affectsUValue: boolean;
  affectsTrust: boolean;
  defaultVisibility: CoinVisibility;
  userFacingExplanation: string;
  internalExplanation: string;
  mythicSentence: string;
}
