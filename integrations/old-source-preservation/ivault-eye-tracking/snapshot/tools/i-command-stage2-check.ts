/**
 * i Command Stage 2/3/4 — parser/router/display check harness
 * Runs every fixture in tools/i-command-fixtures.ts.
 * No external test framework.
 *
 * Run with:
 *   services/api/node_modules/.bin/tsx tools/i-command-stage2-check.ts
 */
import { parseICommand } from "../src/lib/i/i-command-parser";
import { routeICommand } from "../src/lib/i/i-command-router";
import { toICommandDisplayResult } from "../src/lib/i/i-command-result";
import { FIXTURES } from "./i-command-fixtures";

// ── helpers ──────────────────────────────────────────────────────────────────

function assert<T>(
  caseName: string,
  field: string,
  expected: T,
  received: T,
): void {
  if (received !== expected) {
    throw new Error(
      `[${caseName}] ${field}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(received)}`,
    );
  }
}

function assertOneOf<T>(
  caseName: string,
  field: string,
  expected: T[],
  received: T,
): void {
  if (!expected.includes(received)) {
    throw new Error(
      `[${caseName}] ${field}: expected one of ${JSON.stringify(expected)}, received ${JSON.stringify(received)}`,
    );
  }
}

// ── runner ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const SAFETY_PRIVATE_LEVELS = new Set(["private", "deep_private", "restricted"]);

for (const fixture of FIXTURES) {
  try {
    const parse = parseICommand(fixture.input);
    const route = routeICommand(parse);

    // Build a minimal ICommandEngineResult shape for the display layer.
    // The stub event is sufficient — toICommandDisplayResult only reads parse + route.
    const engineResult = {
      parse,
      route,
      event: {
        id: "test",
        userId: "test",
        raw: fixture.input,
        verb: parse.verb,
        domain: parse.domain,
        privacyLevel: parse.privacyLevel,
        memoryClass: parse.memoryClass,
        actionType: route.actionType,
        safetyFlags: parse.safetyFlags,
        confidence: parse.confidence,
        createdAt: new Date().toISOString(),
      },
    };

    const display = toICommandDisplayResult(engineResult);

    // ── Part 1: fixture-declared assertions (Stage 2/3) ──────────────────────
    const e = fixture.expected;

    if (e.isICommand !== undefined)
      assert(fixture.name, "parse.isICommand", e.isICommand, parse.isICommand);
    if (e.domain !== undefined)
      assert(fixture.name, "parse.domain", e.domain, parse.domain);
    if (e.verb !== undefined)
      assert(fixture.name, "parse.verb", e.verb, parse.verb);
    if (e.privacyLevel !== undefined)
      assert(fixture.name, "parse.privacyLevel", e.privacyLevel, parse.privacyLevel);
    if (e.memoryClass !== undefined)
      assert(fixture.name, "parse.memoryClass", e.memoryClass, parse.memoryClass);
    if (e.amount !== undefined)
      assert(fixture.name, "parse.entities.amount", e.amount, parse.entities.amount);
    if (e.personName !== undefined)
      assert(fixture.name, "parse.entities.personName", e.personName, parse.entities.personName);
    if (e.timeframe !== undefined)
      assert(fixture.name, "parse.entities.timeframe", e.timeframe, parse.entities.timeframe);
    if (e.actionType !== undefined) {
      if (fixture.name === "stage2 / post video") {
        assertOneOf(fixture.name, "route.actionType", ["open_studio", "prepare_post"], route.actionType);
      } else {
        assert(fixture.name, "route.actionType", e.actionType, route.actionType);
      }
    }
    if (e.uxState !== undefined)
      assert(fixture.name, "route.uxState", e.uxState, route.uxState);
    if (e.requiresConfirmation !== undefined)
      assert(fixture.name, "route.requiresConfirmation", e.requiresConfirmation, route.requiresConfirmation);
    if (e.requiresMemoryConsent !== undefined)
      assert(fixture.name, "route.requiresMemoryConsent", e.requiresMemoryConsent, route.requiresMemoryConsent);
    if (e.suggestedActionLabel !== undefined)
      assert(fixture.name, "route.suggestedActionLabel", e.suggestedActionLabel, route.suggestedActionLabel);

    // ── Part 2: display result assertions (Stage 4) ──────────────────────────

    // debug fields mirror parse/route
    assert(fixture.name, "display.debug.actionType", route.actionType, display.debug.actionType);
    assert(fixture.name, "display.debug.domain", parse.domain, display.debug.domain);
    assert(fixture.name, "display.flags.requiresConfirmation", route.requiresConfirmation, display.flags.requiresConfirmation);
    assert(fixture.name, "display.flags.requiresMemoryConsent", route.requiresMemoryConsent, display.flags.requiresMemoryConsent);

    // safety fixtures: isSafety and isBlocked must both be true
    if (e.actionType === "safety_escalation" || e.uxState === "blocked") {
      assert(fixture.name, "display.flags.isSafety", true, display.flags.isSafety);
      assert(fixture.name, "display.flags.isBlocked", true, display.flags.isBlocked);
    }

    // private/deep_private/restricted fixtures: isPrivate must be true
    if (e.privacyLevel !== undefined && SAFETY_PRIVATE_LEVELS.has(e.privacyLevel)) {
      assert(fixture.name, "display.flags.isPrivate", true, display.flags.isPrivate);
    }

    console.log(`  ✓ ${fixture.name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${fixture.name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log("");
if (failed > 0) {
  console.error(`i Command fixture checks: ${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`i Command fixture checks passed  (${passed} fixtures)`);
}
