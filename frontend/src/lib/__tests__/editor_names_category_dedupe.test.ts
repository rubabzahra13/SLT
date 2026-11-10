import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getEditorNamesForCategory } from "../editor-assignment";
import type { Producer } from "../../types";

function makeProducer(
  overrides: Partial<Producer> & Pick<Producer, "id" | "name" | "initials">
): Producer {
  return {
    email: `${overrides.initials.toLowerCase()}@example.com`,
    categories: ["Pom", "Gameday"],
    avatar: "",
    mixesThisWeek: 0,
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    extraDays: [],
    maxMixesPerDay: 2,
    maxProducerCostPerDay: null,
    ...overrides,
  };
}

describe("getEditorNamesForCategory", () => {
  it("collapses legacy G and GP aliases into one Griffin chip", () => {
    const producers: Producer[] = [
      makeProducer({ id: "cm", name: "Casey", initials: "CM" }),
      makeProducer({ id: "g-legacy", name: "Griffin", initials: "G" }),
      makeProducer({ id: "gp", name: "Griffin Parker", initials: "GP" }),
      makeProducer({ id: "r", name: "Riley", initials: "R" }),
    ];

    const names = getEditorNamesForCategory(producers, "Pom");
    const gpCount = names.filter((n) => n === "GP").length;
    assert.equal(gpCount, 1, `expected one GP, got ${JSON.stringify(names)}`);
    assert.ok(!names.includes("G"), "raw G alias must not remain");
    assert.deepEqual(
      names.filter((n) => ["CM", "GP", "R"].includes(n)).sort(),
      ["CM", "GP", "R"]
    );
  });
});
