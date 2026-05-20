import { useCallback, useMemo, useRef, useState } from "react";
import { PopsWalletActionProofService, toPopsWalletActionProofClientView } from "./pops-wallet-action-proof.service";
import {
  getWalletActionPrimaryCopy,
  getWalletActionSecondaryCopy,
  POPS_WALLET_ACTION_USER_COPY
} from "./pops-wallet-security-copy";
import {
  type PopsWalletActionEvaluationContext,
  type PopsWalletActionProof,
  type PopsWalletActionProofClientView
} from "./pops-wallet-security.types";

export type UsePopsWalletActionResult = {
  /** Full proof for trusted pipelines / server handoff — includes fraudRisk. */
  lastProof: PopsWalletActionProof | null;
  /** Safe for UI and client logs — omits fraudRisk. */
  clientView: PopsWalletActionProofClientView | null;
  primaryCopy: string;
  secondaryCopy: string | undefined;
  verifyWalletAction: (ctx: PopsWalletActionEvaluationContext) => PopsWalletActionProofClientView;
  reset: () => void;
};

/**
 * React hook: run P.O.P.S wallet-action proofing for conversions, tips, payouts, etc.
 * Does not perform payment authorization — only presence, intent, and continuity checks.
 */
export function usePopsWalletAction(): UsePopsWalletActionResult {
  const serviceRef = useRef(new PopsWalletActionProofService());
  const [lastProof, setLastProof] = useState<PopsWalletActionProof | null>(null);

  const verifyWalletAction = useCallback((ctx: PopsWalletActionEvaluationContext) => {
    const proof = serviceRef.current.evaluate(ctx);
    setLastProof(proof);
    return toPopsWalletActionProofClientView(proof);
  }, []);

  const clientView = useMemo(() => (lastProof ? toPopsWalletActionProofClientView(lastProof) : null), [lastProof]);

  const primaryCopy = useMemo(() => {
    if (!lastProof) {
      return POPS_WALLET_ACTION_USER_COPY.CONFIRM_ACTION;
    }
    return getWalletActionPrimaryCopy(lastProof.decision);
  }, [lastProof]);

  const secondaryCopy = useMemo(() => {
    if (!lastProof) {
      return POPS_WALLET_ACTION_USER_COPY.VERIFYING;
    }
    return getWalletActionSecondaryCopy(lastProof.decision);
  }, [lastProof]);

  const reset = useCallback(() => {
    setLastProof(null);
  }, []);

  return {
    lastProof,
    clientView,
    primaryCopy,
    secondaryCopy,
    verifyWalletAction,
    reset
  };
}
