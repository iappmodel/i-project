import { describe, expect, it } from "vitest";
import { assertPopsUserCopySafe, reviewPopsUserCopy } from "./pops-copy-reviewer";

describe("reviewPopsUserCopy", () => {
  it('marks "Moment verified" safe', () => {
    expect(reviewPopsUserCopy("Moment verified").safe).toBe(true);
  });

  it('marks "Fraud detected" unsafe', () => {
    const r = reviewPopsUserCopy("Fraud detected");
    expect(r.safe).toBe(false);
    expect(r.violations).toContain("fraud detected");
  });

  it('marks "No raw camera or audio was stored" safe', () => {
    expect(reviewPopsUserCopy("No raw camera or audio was stored").safe).toBe(true);
  });

  it('marks "Eye tracking active" unsafe', () => {
    expect(reviewPopsUserCopy("Eye tracking active").safe).toBe(false);
  });
});

describe("assertPopsUserCopySafe", () => {
  it("throws on violations", () => {
    expect(() => assertPopsUserCopySafe("Suspicious user")).toThrow();
  });
});
