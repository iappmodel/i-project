import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("health", () => {
  it("returns healthy", async () => {
    const res = await api().get("/health").expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe("healthy");
  });
});
