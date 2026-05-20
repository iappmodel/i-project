import { ALPHABET_COIN_REGISTRY } from "../../data/alphabet/coin-registry";
import type {
  CoinCode,
  CoinDefinition
} from "../../types/alphabet/coin.types";

export function getCoinDefinition(code: CoinCode): CoinDefinition {
  const coin = ALPHABET_COIN_REGISTRY.find((item) => item.code === code);

  if (!coin) {
    throw new Error(`Unknown coin code: ${code}`);
  }

  return coin;
}

export function canCoinSpend(code: CoinCode): boolean {
  return getCoinDefinition(code).isSpendable;
}

export function canCoinConvertToICoin(code: CoinCode): boolean {
  return getCoinDefinition(code).canConvertToICoin;
}

export function canCoinConvertToVCoin(code: CoinCode): boolean {
  return getCoinDefinition(code).canConvertToVCoin;
}

export function isCoinScoreBased(code: CoinCode): boolean {
  return getCoinDefinition(code).isScoreBased;
}

export function isCoinIdentityBased(code: CoinCode): boolean {
  return getCoinDefinition(code).isIdentityBased;
}

export function isCoinAccessBased(code: CoinCode): boolean {
  return getCoinDefinition(code).isAccessBased;
}

export function isCoinSystemOnly(code: CoinCode): boolean {
  return getCoinDefinition(code).isSystemOnly;
}

export function shouldNeverConvertDirectlyToMoney(code: CoinCode): boolean {
  return getCoinDefinition(code).shouldNeverConvertDirectlyToMoney;
}

export function getSpendableCoins(): CoinDefinition[] {
  return ALPHABET_COIN_REGISTRY.filter((coin) => coin.isSpendable);
}

export function getScoreBasedCoins(): CoinDefinition[] {
  return ALPHABET_COIN_REGISTRY.filter((coin) => coin.isScoreBased);
}

export function getIdentityBasedCoins(): CoinDefinition[] {
  return ALPHABET_COIN_REGISTRY.filter((coin) => coin.isIdentityBased);
}

export function getAccessBasedCoins(): CoinDefinition[] {
  return ALPHABET_COIN_REGISTRY.filter((coin) => coin.isAccessBased);
}

export function getCoinsConvertibleToICoin(): CoinDefinition[] {
  return ALPHABET_COIN_REGISTRY.filter((coin) => coin.canConvertToICoin);
}

export function getCoinsConvertibleToVCoin(): CoinDefinition[] {
  return ALPHABET_COIN_REGISTRY.filter((coin) => coin.canConvertToVCoin);
}
