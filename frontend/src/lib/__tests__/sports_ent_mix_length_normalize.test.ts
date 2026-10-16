import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

describe("Sports Entertainment mix length normalize", () => {
  it("does not refill cleared Time Length from package label after override/save", () => {
    const cleared = normalizeOrder({
      id: "se-1",
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      packageType: "PRE-GAME / HALFTIME REMIXED",
      // Legacy pollution from older normalize runs that appended mix time.
      package: "PRE-GAME / HALFTIME REMIXED 2:00",
      timeLengthOfMix: "",
      customerName: "Nabeeha",
      contactName: "Nabeeha",
      programName: "ABC Org",
      organizationName: "ABC Org",
      musicTheme: "",
      editorRequest: "FA",
      price: 250,
      status: "new",
      createdAt: "2026-10-16",
      needsAttention: false,
      isManualEntry: false,
    } as Order);

    assert.strictEqual(cleared.timeLengthOfMix, "");
    assert.strictEqual(cleared.package, "PRE-GAME / HALFTIME REMIXED");
    assert.strictEqual(cleared.packageType, "PRE-GAME / HALFTIME REMIXED");
  });

  it("keeps an explicit SE Time Length without baking it into package", () => {
    const filled = normalizeOrder({
      id: "se-2",
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      packageType: "PRE-GAME / HALFTIME REMIXED",
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "2:00",
      customerName: "Nabeeha",
      contactName: "Nabeeha",
      programName: "ABC Org",
      organizationName: "ABC Org",
      musicTheme: "",
      editorRequest: "FA",
      price: 250,
      status: "new",
      createdAt: "2026-10-16",
      needsAttention: false,
      isManualEntry: false,
    } as Order);

    assert.strictEqual(filled.timeLengthOfMix, "2:00");
    assert.strictEqual(filled.package, "PRE-GAME / HALFTIME REMIXED");
  });
});
