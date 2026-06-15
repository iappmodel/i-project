# INVENTION_023 — Merchant Checkout Funnel with Attention Wallet

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Marketplace & Commerce
**Date:** 2026-06-15

## Problem Solved

There is no established checkout system that allows consumers to pay merchants using currency earned through verified attention (watching ads, engaging with content). Existing payment funnels either use traditional fiat (credit card, bank transfer) or cryptocurrency, but none integrate an attention-economy wallet where the payment source is biometrically verified engagement. Additionally, existing mobile checkout flows lack a server-authoritative, multi-step funnel with comprehensive event logging, idempotent operations, tip-aware flows, and biometric confirmation (Face ID/PIN) — all built on attention-derived currency.

## Current Industry Approach

Mobile payment systems (Apple Pay, Google Pay) handle fiat-currency checkout with biometric confirmation but have no concept of attention-derived currency. Crypto payment processors (BitPay, Coinbase Commerce) accept blockchain tokens but not attention-economy coins. Creator tipping platforms (YouTube Super Chat, TikTok gifts) enable one-directional tips but not full merchant checkout flows. No existing system provides a complete checkout funnel (resolve → draft → confirm → tip → status) that uses attention-wallet balances, supports multiple checkout modes with merchant-category-aware planning, includes pre-confirm and post-confirm tipping with multiple tip strategies, and logs every state transition as a structured event.

## How [ i ] Solves It

The [ i ] Merchant Checkout Funnel implements a five-step server-authoritative checkout pipeline built on Supabase edge functions. The **resolve** step receives a checkout scenario (merchant info, entry type, wallet snapshot, user preferences, accessibility settings) and computes a session plan: resolved checkout mode, tip plan (timing, mode, presets), screen sequence, analytics dimensions, and a quote (amount, tip, currency). The **draft** step allows the user to modify the checkout (e.g., change payment source, adjust tip) while maintaining session integrity. The **confirm** step requires biometric authentication (Face ID or PIN), generates a payment ID and transaction ID, builds a receipt, and records the payment with idempotency protection. The **tip** step handles post-confirm tip submission with its own idempotency, amount computation from a tip selection, and separate tip record creation. The **payment-status** step provides read access to payment records by payment ID or session ID. Every step logs structured checkout events with comprehensive metadata (entry type, merchant ID, merchant category, checkout mode, mode visibility, tip mode, tip timing, amounts, auto-convert eligibility, metadata objects). Idempotency tables prevent duplicate payments even under network failures or retries.

## System Description

The system consists of five Supabase edge functions sharing a common utility module (`_shared/merchant_checkout.ts`) that provides: `createServiceRoleClient()` for authenticated Supabase access, `requireUserId()` for auth enforcement, `readJson()` for type-safe body parsing, `HttpError` for structured error responses, `jsonResponse()` for consistent response formatting, `resolveSession()` for session planning, `loadCheckoutSession()` / `saveCheckoutSession()` for session persistence, `patchSessionDraft()` for draft updates with auto-convert eligibility detection, `buildConfirmReceipt()` for payment confirmation with ID generation, `buildTipResult()` for tip computation, `saveCheckoutPayment()` for payment record creation, `saveCheckoutTip()` for tip record creation, `logCheckoutEvent()` for structured event logging, and `getIdempotentCheckoutResponse()` / `saveIdempotentCheckoutResponse()` for replay protection. The **merchant-checkout-resolve** function receives a MerchantCheckoutScenario (merchant info including ID and category, entry configuration with entry type, amount, currency), MerchantCheckoutUserPreferences, MerchantCheckoutWalletSnapshot, and MerchantCheckoutAccessibility. The resolver computes a session record with: checkout mode (resolved from merchant category and user preferences), screen sequence (which UI screens to show in what order), tip plan (mode: "percentage" | "fixed" | "disabled", timing: "pre_confirm" | "post_confirm", presets), modeBadge (visibility control), quote (amountMinor, tipMinor, currencyCode), and analyticsDimensions. The session is persisted server-side with an expiration time. The **merchant-checkout-draft** function loads an existing session, applies user modifications through `patchSessionDraft()` (updating draft state, tip plan, payment source selection), detects auto-convert eligibility (whether the user can pay with a different currency auto-converted), and logs the update event. The **merchant-checkout-confirm** function loads the session, requires FACE_ID or PIN auth method, generates a paymentId and transactionId via `buildConfirmReceipt()`, persists the payment record with "SUCCEEDED" status, and returns the receipt. Idempotency is enforced per-session per-scope ("confirm" or "tip") — if the same session was already confirmed, the cached response is returned. The **merchant-checkout-tip** function loads the session, computes tip amount from a TipSelection, creates a tip record, and returns the tip ID and transaction ID. The **merchant-checkout-payment-status** function provides lookup by paymentId or checkoutSessionId, returning payment status, receipt, and timestamps. Additional functions exist for event logging (`merchant-checkout-event`), funnel analytics (`merchant-checkout-funnel`), and user preferences (`merchant-checkout-preferences`).

## Technical Components

- `app/supabase/functions/merchant-checkout-resolve/index.ts` — Session creation: scenario analysis, mode resolution, screen planning, quote computation
- `app/supabase/functions/merchant-checkout-draft/index.ts` — Session modification: draft patching, auto-convert detection, event logging
- `app/supabase/functions/merchant-checkout-confirm/index.ts` — Payment confirmation: biometric auth, receipt generation, idempotent payment creation
- `app/supabase/functions/merchant-checkout-tip/index.ts` — Post-confirm tipping: tip computation, idempotent tip creation
- `app/supabase/functions/merchant-checkout-payment-status/index.ts` — Payment lookup by ID or session
- `app/supabase/functions/merchant-checkout-event/index.ts` — Structured checkout event logging
- `app/supabase/functions/merchant-checkout-funnel/index.ts` — Funnel analytics
- `app/supabase/functions/merchant-checkout-preferences/index.ts` — User checkout preferences
- `app/supabase/functions/_shared/merchant_checkout.ts` — Shared utilities: session management, receipt building, payment persistence, idempotency, event logging
- `app/src/features/merchantCheckout/types.ts` — TypeScript types for scenarios, plans, quotes, drafts, accessibility, wallet snapshots
- Tables: `merchant_checkout_sessions`, `merchant_checkout_events`, `merchant_checkout_payments`, `merchant_checkout_tips`, `merchant_checkout_idempotency`

## Data Flow

1. User initiates checkout at a merchant (e.g., scans QR code, taps NFC, or selects merchant in app).
2. Client sends checkout scenario (merchant info, entry type, amount, currency, wallet snapshot, preferences, accessibility) to **merchant-checkout-resolve**.
3. Server resolves the checkout plan: mode (attention-wallet, split, fiat fallback), screen sequence, tip plan (timing, presets), quote, and analytics dimensions.
4. Session is persisted server-side with expiration; client receives checkoutSessionId, plan, quote, and draft.
5. User may modify the checkout (e.g., select payment source, adjust tip) through **merchant-checkout-draft**, which patches the session and logs the change.
6. User confirms payment through **merchant-checkout-confirm** with biometric auth (Face ID or PIN).
7. Server checks idempotency (returns cached response if already confirmed), builds receipt with payment ID and transaction ID, persists payment record.
8. If tip timing is "post_confirm," user submits tip through **merchant-checkout-tip** with a TipSelection.
9. Server computes tip amount, creates tip record with idempotency protection.
10. At any point, payment status can be queried through **merchant-checkout-payment-status** by payment ID or session ID.
11. Every step logs structured events to `merchant_checkout_events` with comprehensive metadata.

## User Flow

1. User walks into a partnered coffee shop and scans a QR code on the counter.
2. The [ i ] app opens the checkout flow showing: merchant name, item/amount, and a "Pay with Attention Wallet" option.
3. The resolved plan displays the amount in iCoins, an optional tip section (percentage presets: 10%, 15%, 20%, custom), and the user's available balance.
4. User reviews the checkout, optionally adjusts the tip or payment source (auto-convert from viCoin if iCoin balance is low).
5. User taps "Confirm" and authenticates with Face ID.
6. A receipt is displayed: amount paid, tip added, transaction ID, timestamp.
7. If the merchant's tip plan uses post-confirm timing, a tip prompt appears after the receipt.
8. User can check payment status at any time in their transaction history.
9. The coffee shop receives the payment in their merchant dashboard.

## Economic Flow

1. Attention-earned currency (iCoin, viCoin) flows from the user's wallet to the merchant.
2. The checkout resolver determines the optimal payment mode based on the user's wallet balance, merchant category, and user preferences.
3. Auto-convert functionality allows paying with one currency type even if the merchant prefers another, with server-computed conversion rates.
4. Tips add value to the transaction, flowing to the merchant (or staff) as a separate line item.
5. The merchant receives funds in their merchant account, which can be settled to fiat through the platform's settlement infrastructure.
6. Every transaction is logged with comprehensive event data for analytics, fraud detection, and reconciliation.
7. This creates a complete economic loop: users earn attention currency through verified engagement → spend it at real merchants → merchants settle to fiat.

## Fraud Prevention

- **Biometric confirmation:** Every payment requires Face ID or PIN authentication, preventing unauthorized transactions.
- **Idempotency enforcement:** Each confirm and tip operation checks for cached responses before processing, preventing duplicate payments even under network failures or client retries.
- **Server-authoritative session management:** The checkout session, including amount, currency, and merchant details, is persisted and loaded server-side. The client cannot modify the quote without going through the draft endpoint.
- **Structured event logging:** Every state transition (resolve, draft update, confirm, tip, status check) is logged with comprehensive metadata, creating a full audit trail.
- **Session expiration:** Checkout sessions expire after a configurable time, preventing stale sessions from being confirmed long after resolution.
- **User-session binding:** All operations verify that the checkout session belongs to the authenticated user via `requireUserId()`.
- **Rate limiting and CORS:** Standard rate limiting and strict CORS headers protect against automated attacks.
- **Payment record persistence:** Confirmed payments are recorded with status, receipt, and timestamps, enabling reconciliation and dispute resolution.

## Unique Elements

1. **Attention-wallet-funded merchant checkout** — A complete checkout funnel where the payment source is currency earned through biometrically verified attention, not fiat or cryptocurrency.
2. **Multi-step server-authoritative funnel** — Five distinct server-side stages (resolve → draft → confirm → tip → status) with session persistence, each idempotent and event-logged.
3. **Merchant-category-aware checkout planning** — The resolver computes checkout mode, screen sequence, and tip plan based on merchant category and user preferences, creating category-optimized checkout experiences.
4. **Dual-timing tip architecture** — Tips can be configured as pre-confirm (included in the payment amount) or post-confirm (separate transaction after receipt), each with their own idempotency scope.
5. **Auto-convert payment source** — The system detects when the user can pay with an alternate currency via auto-conversion, expanding payment flexibility without requiring the user to manually convert currencies.
6. **Comprehensive structured event logging** — Every checkout event includes entry type, merchant ID, merchant category, checkout mode, mode visibility, tip mode, tip timing, amounts, auto-convert status, and metadata objects, creating a rich analytics and audit dataset.

## Potential Patent Claims

1. A method for processing merchant payments using attention-economy currency, comprising: receiving a checkout scenario including merchant information, entry type, amount, and a wallet snapshot showing balances of attention-derived currencies; resolving a checkout plan including payment mode, screen sequence, and tip plan based on merchant category and wallet state; persisting a server-side checkout session with a quote denominated in attention-economy currency; receiving biometric authentication confirmation (Face ID or PIN); generating a payment identifier and receipt with idempotency protection; and debiting the user's attention wallet balance through an atomic transaction.
2. A system for multi-step merchant checkout with attention-wallet integration, comprising: a session resolver that computes checkout mode, tip plan, and screen sequence from a merchant-category-aware planning engine; a draft updater that patches session state with auto-convert eligibility detection; a payment confirmer that requires biometric authentication and enforces idempotency per session; a tip processor with separate idempotency scope supporting pre-confirm and post-confirm timing; a status monitor providing payment lookup by multiple identifiers; and a structured event logger that records comprehensive metadata for each stage.
3. A computer-implemented method for auto-converting attention currencies during merchant checkout, comprising: detecting that a user's balance in a first attention currency is insufficient for a checkout amount; determining that the user holds sufficient balance in a second attention currency; computing a conversion rate between the first and second currencies; presenting an auto-convert option in the checkout flow; upon user confirmation, atomically converting the necessary amount from the second currency to the first and completing the payment; and logging the auto-convert event with both currency amounts and the conversion rate.

## Potential Competitors

- **Apple Pay / Google Pay** — Fiat checkout with biometric auth; no attention-economy currency
- **Coinbase Commerce** — Crypto checkout; no attention-derived currency
- **Square / Block** — Merchant checkout but fiat-only
- **PayPal** — General-purpose checkout; no attention wallet
- **Stripe** — Payment infrastructure; no attention-economy integration
- **Brave (BAT)** — Attention token but no merchant checkout funnel; only creator tipping
- **Venmo** — Peer-to-peer and some merchant payments; no attention-derived currency

## Related Files

- `app/supabase/functions/merchant-checkout-resolve/index.ts`
- `app/supabase/functions/merchant-checkout-draft/index.ts`
- `app/supabase/functions/merchant-checkout-confirm/index.ts`
- `app/supabase/functions/merchant-checkout-tip/index.ts`
- `app/supabase/functions/merchant-checkout-payment-status/index.ts`
- `app/supabase/functions/merchant-checkout-event/index.ts`
- `app/supabase/functions/merchant-checkout-funnel/index.ts`
- `app/supabase/functions/merchant-checkout-preferences/index.ts`
- `app/supabase/functions/_shared/merchant_checkout.ts`
- `app/src/features/merchantCheckout/types.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 9 |
| Business Value | 10 |
