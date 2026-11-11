import { describe, expect, it } from "vitest"
import { PRODUCT_HOME_SCREEN } from "./productEntryScreen"

describe("productEntryScreen", () => {
  it("uses immersive feed as product home", () => {
    expect(PRODUCT_HOME_SCREEN).toBe("immersive-feed")
  })
})
