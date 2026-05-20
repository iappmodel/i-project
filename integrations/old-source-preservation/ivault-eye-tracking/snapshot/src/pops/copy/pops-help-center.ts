export interface PopsHelpCenterFaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

/** Help center FAQ entries (public-facing). */
export const POPS_HELP_CENTER_FAQ: readonly PopsHelpCenterFaqItem[] = [
  {
    id: "what-is-pops",
    question: "What is P.O.P.S?",
    answer:
      "P.O.P.S is the Proof Of Presence System. It verifies that a real human moment happened before rewards or campaign actions are counted."
  },
  {
    id: "is-pops-eye-tracking",
    question: "Is P.O.P.S eye-tracking?",
    answer:
      "No. Eye or visual presence can be one optional signal for some high-value moments, but P.O.P.S uses multiple signals like screen activity, content progress, interaction timing, app state, and campaign rules."
  },
  {
    id: "does-pops-record-face",
    question: "Does P.O.P.S record my face?",
    answer:
      "Not by default. Raw camera data is not stored by default. If a reward ever requires stronger verification, the app must explain it before use."
  },
  {
    id: "does-pops-record-audio",
    question: "Does P.O.P.S record audio?",
    answer:
      "Not by default. Most rewards do not need audio. If local audio features are ever used, the app should explain the purpose and avoid storing raw audio."
  },
  {
    id: "why-reward-pending",
    question: "Why is my reward pending?",
    answer:
      "Some rewards require verification before release. P.O.P.S checks that the moment met the offer requirements."
  },
  {
    id: "why-reward-held",
    question: "Why was my reward held?",
    answer: "The moment needs more review before the reward can be released."
  },
  {
    id: "why-reward-denied",
    question: "Why was my reward denied?",
    answer: "The moment did not meet the verification requirements for that offer."
  },
  {
    id: "can-i-appeal",
    question: "Can I appeal?",
    answer: "Yes, held or denied reward decisions can be disputed when dispute support is enabled."
  },
  {
    id: "can-i-see-what-was-used",
    question: "Can I see what was used?",
    answer:
      "Yes. Money-affecting P.O.P.S sessions create privacy receipts showing signal categories used and whether raw data was stored."
  }
] satisfies readonly PopsHelpCenterFaqItem[];

export function popsHelpCenterFaqById(id: string): PopsHelpCenterFaqItem | undefined {
  return POPS_HELP_CENTER_FAQ.find((item) => item.id === id);
}
