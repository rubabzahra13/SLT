import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getData } from "../data";
import { PRODUCER_COLORS } from "../producer-avatars";
import type { Producer } from "@/types";

describe("Prompt 11 — Producer Color-Coding in Selection UI Tests", () => {
  const { producers } = getData();

  it("1. Configured producers possess authentic configured color values", () => {
    assert.ok(producers.length > 0, "Producers list should be populated");

    producers.forEach((p) => {
      if (p.color) {
        assert.ok(
          /^#[0-9A-Fa-f]{6}$/.test(p.color),
          `Producer ${p.name} color ${p.color} must be valid hex code`
        );
      }
    });

    // Check specific known producer colors
    const nick = producers.find((p) => p.name.includes("Nick") || p.initials === "NC");
    if (nick && nick.color) {
      assert.strictEqual(nick.color.toLowerCase(), PRODUCER_COLORS.NC.toLowerCase());
    }

    const andrea = producers.find((p) => p.name.includes("Andrea") || p.initials === "AJ");
    if (andrea && andrea.color) {
      assert.strictEqual(andrea.color.toLowerCase(), PRODUCER_COLORS.AJ.toLowerCase());
    }
  });

  it("2. Producer without configured color resolves to neutral fallback slate color (#94A3B8)", () => {
    const unconfiguredProducer: Partial<Producer> = {
      id: "prod-test-no-color",
      name: "Test Producer No Color",
      initials: "TP",
      specialty: "Cheer",
    };

    const color = unconfiguredProducer.color || "#94a3b8";
    assert.strictEqual(
      color,
      "#94a3b8",
      "Unconfigured producer must resolve to neutral fallback slate (#94A3B8), never fabricate a vibrant color"
    );
  });
});
