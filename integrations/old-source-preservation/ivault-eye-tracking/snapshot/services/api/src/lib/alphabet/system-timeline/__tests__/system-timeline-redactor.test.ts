import { describe, expect, it } from "vitest";
import { redactSystemTimelinePayload } from "../system-timeline-redactor";

describe("system-timeline-redactor", () => {
  it("redacts secrets", () => {
    const result = redactSystemTimelinePayload({
      accountNumber: "123",
      status: "ok"
    });

    expect(result).toEqual({
      accountNumber: "[REDACTED_SECRET]",
      status: "ok"
    });
  });

  it("masks service-only keys by default", () => {
    const result = redactSystemTimelinePayload({
      providerRawPayload: { status: "failed" }
    });

    expect(result).toEqual({
      providerRawPayload: "[SERVICE_ONLY]"
    });
  });

  it("allows service-only fields when explicitly included", () => {
    const result = redactSystemTimelinePayload(
      {
        internalSummary: "secret internal text"
      },
      {
        includeServiceOnly: true,
        includeRawPayloads: true
      }
    );

    expect(result).toEqual({
      internalSummary: "secret internal text"
    });
  });

  it("hides keys containing raw when raw payloads disabled", () => {
    const result = redactSystemTimelinePayload({
      someRawDump: "x"
    });

    expect(result).toEqual({
      someRawDump: "[RAW_PAYLOAD_HIDDEN]"
    });
  });
});
