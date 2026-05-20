import { requiresMemoryConsent } from "./i-command-memory";
import { privacyLabel, shouldEnterPrivateMode } from "./i-command-privacy";

import type {
  ICommandActionType,
  ICommandParseResult,
  ICommandRouteResult,
} from "./i-command.types";

export function routeICommand(parse: ICommandParseResult): ICommandRouteResult {
  if (!parse.isICommand) {
    return {
      actionType: "none",
      uxState: "idle",
      title: "Ask anything to i",
      message: "Begin with i to command the platform.",
      requiresConfirmation: false,
      requiresMemoryConsent: false,
    };
  }

  if (parse.safetyFlags.some((flag) => flag !== "none")) {
    return routeSafety(parse);
  }

  const actionType = detectActionType(parse);
  const requiresMemory = requiresMemoryConsent(parse);
  const privateMode = shouldEnterPrivateMode(parse);

  return {
    actionType,
    uxState: privateMode ? "private_mode" : "understanding",
    title: titleForAction(actionType),
    message: messageForAction(actionType, parse),
    requiresConfirmation: requiresConfirmation(actionType),
    requiresMemoryConsent: requiresMemory,
    suggestedActionLabel: labelForAction(actionType),
    nextRoute: routeForAction(actionType),
    payload: {
      body: parse.body,
      entities: parse.entities,
      privacy: privacyLabel(parse.privacyLevel),
    },
  };
}

function routeSafety(parse: ICommandParseResult): ICommandRouteResult {
  return {
    actionType: "safety_escalation",
    uxState: "blocked",
    title: "i is here with you",
    message:
      "This sounds serious. i can help you stabilize and connect you to immediate support.",
    requiresConfirmation: false,
    requiresMemoryConsent: false,
    suggestedActionLabel: "Get support now",
    nextRoute: "/i/safety",
    payload: {
      safetyFlags: parse.safetyFlags,
      body: parse.body,
    },
  };
}

function detectActionType(parse: ICommandParseResult): ICommandActionType {
  switch (parse.domain) {
    case "private_self":
      return "open_private_session";

    case "wallet_economy":
      if (parse.verb === "pay") return "prepare_payment";
      if (parse.verb === "earn" || /\bearn\b/i.test(parse.body)) return "open_earn";
      return "open_wallet";

    case "studio_creation":
      if (parse.verb === "post") return "prepare_post";
      return "open_studio";

    case "originality_protection":
      return "protect_media";

    case "health":
      return "open_health_plan";

    case "career":
      return "open_career_plan";

    case "finance":
      return "open_finance_plan";

    case "relationships":
      return "open_relationship_reflection";

    case "navigation":
      return "open_navigation";

    default:
      return "ask_clarifying_question";
  }
}

function requiresConfirmation(actionType: ICommandActionType): boolean {
  return [
    "prepare_payment",
    "prepare_post",
    "protect_media",
  ].includes(actionType);
}

function titleForAction(actionType: ICommandActionType): string {
  switch (actionType) {
    case "open_private_session":
      return "between you and i";
    case "prepare_payment":
      return "i can prepare that payment";
    case "open_earn":
      return "i found your earning path";
    case "open_wallet":
      return "i opened your wallet";
    case "open_studio":
      return "i opened Studio";
    case "prepare_post":
      return "i can prepare this post";
    case "protect_media":
      return "i can protect this";
    case "open_health_plan":
      return "i can help with your health";
    case "open_career_plan":
      return "i can help with your career";
    case "open_finance_plan":
      return "i can help with your money";
    case "open_relationship_reflection":
      return "i can help you think this through";
    case "open_navigation":
      return "i can take you there";
    case "ask_clarifying_question":
      return "i needs one detail";
    default:
      return "i understands";
  }
}

function messageForAction(
  actionType: ICommandActionType,
  parse: ICommandParseResult,
): string {
  switch (actionType) {
    case "open_private_session":
      return "This stays between you and i unless you choose to save something.";

    case "prepare_payment":
      return parse.entities.amount && parse.entities.personName
        ? `i will prepare ${formatAmount(parse.entities.amount)} for ${parse.entities.personName}.`
        : "Tell i who and how much.";

    case "open_earn":
      return "i will show the best ways to earn from your available offers.";

    case "open_wallet":
      return "i will open your balance, payments, conversions, and withdrawals.";

    case "open_studio":
      return "i will help create, edit, and prepare your media.";

    case "prepare_post":
      return "i will prepare the post, caption, rights, and originality checks.";

    case "protect_media":
      return "i will generate proof, fingerprint the media, and prepare originality protection.";

    case "open_health_plan":
      return "i can help organize a realistic health path. Medical issues may require a professional.";

    case "open_career_plan":
      return "i can help map your next career move and turn it into steps.";

    case "open_finance_plan":
      return "i can help organize your money situation. Financial decisions require caution.";

    case "open_relationship_reflection":
      return "i can help you see the pattern, decide what matters, and prepare what to say.";

    case "ask_clarifying_question":
      return "i understood the signal, but needs a clearer command.";

    default:
      return "i is understanding.";
  }
}

function labelForAction(actionType: ICommandActionType): string {
  switch (actionType) {
    case "open_private_session":
      return "Start private session";
    case "prepare_payment":
      return "Review payment";
    case "open_earn":
      return "Open Earn";
    case "open_wallet":
      return "Open Wallet";
    case "open_studio":
      return "Open Studio";
    case "prepare_post":
      return "Prepare post";
    case "protect_media":
      return "Protect this";
    case "open_health_plan":
      return "Build health plan";
    case "open_career_plan":
      return "Build career plan";
    case "open_finance_plan":
      return "Build money plan";
    case "open_relationship_reflection":
      return "Reflect privately";
    case "ask_clarifying_question":
      return "Clarify";
    default:
      return "Continue";
  }
}

function routeForAction(actionType: ICommandActionType): string | undefined {
  switch (actionType) {
    case "open_private_session":
      return "/i/private";
    case "open_wallet":
    case "prepare_payment":
      return "/wallet";
    case "open_earn":
      return "/earn";
    case "open_studio":
    case "prepare_post":
      return "/studio";
    case "protect_media":
      return "/originality";
    case "open_health_plan":
      return "/i/health";
    case "open_career_plan":
      return "/i/career";
    case "open_finance_plan":
      return "/i/finance";
    case "open_relationship_reflection":
      return "/i/private";
    default:
      return undefined;
  }
}

function formatAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
