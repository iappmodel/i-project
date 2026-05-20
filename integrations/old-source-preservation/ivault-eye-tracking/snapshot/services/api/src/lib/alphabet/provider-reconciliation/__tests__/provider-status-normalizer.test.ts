import { describe, expect, it } from "vitest";
import { normalizeProviderWebhookPayload } from "../provider-status-normalizer";

describe("provider-status-normalizer", () => {
  it("normalizes succeeded status", () => {
    const result = normalizeProviderWebhookPayload({
      provider: "mock",
      rawBody: JSON.stringify({
        id: "evt_1",
        type: "transfer.succeeded",
        data: {
          providerTransferId: "tr_1",
          status: "succeeded"
        }
      })
    });

    expect(result.normalizedStatus).toBe("provider_succeeded");
    expect(result.providerTransferId).toBe("tr_1");
  });

  it("normalizes failed status", () => {
    const result = normalizeProviderWebhookPayload({
      provider: "mock",
      rawBody: JSON.stringify({
        id: "evt_1",
        data: {
          providerTransferId: "tr_1",
          status: "failed"
        }
      })
    });

    expect(result.normalizedStatus).toBe("provider_failed");
  });

  it("normalizes unknown status", () => {
    const result = normalizeProviderWebhookPayload({
      provider: "mock",
      rawBody: JSON.stringify({
        id: "evt_1",
        data: {
          providerTransferId: "tr_1",
          status: "something_weird"
        }
      })
    });

    expect(result.normalizedStatus).toBe("provider_unknown");
  });

  it("sanitizes secrets", () => {
    const result = normalizeProviderWebhookPayload({
      provider: "mock",
      rawBody: JSON.stringify({
        id: "evt_1",
        bankToken: "secret",
        data: {
          providerTransferId: "tr_1",
          status: "pending"
        }
      })
    });

    expect((result.sanitizedPayload as Record<string, unknown>).bankToken).toBeUndefined();
  });
});
