import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTimeLimitOptions,
  matchesTimeLimitFilter,
  recordMixLength,
} from "../mtd-filters";
import type { MTDRecord } from "@/types";

function rec(overrides: Partial<MTDRecord>): MTDRecord {
  return {
    id: "r1",
    programName: "Test",
    package: "GOLD",
    ...overrides,
  } as MTDRecord;
}

describe("Mix Length table filter (cheer SoftSelect)", () => {
  it("reads mix lengths from timeLengthOfMix when package is tier-only", () => {
    const records = [
      rec({ id: "1", package: "GOLD", timeLengthOfMix: "2:30" }),
      rec({ id: "2", package: "PLATINUM", timeLengthOfMix: "1:30" }),
      rec({ id: "3", package: "GOLD", timeLengthOfMix: "2:30" }),
      rec({ id: "4", package: "TITANIUM", timeLengthOfMix: "2:00" }),
      rec({ id: "5", package: "GOLD", timeLengthOfMix: "" }),
    ];

    assert.equal(recordMixLength(records[0]), "2:30");
    assert.equal(recordMixLength(records[4]), "");

    const options = buildTimeLimitOptions(records);
    assert.equal(options[0].value, "All");
    assert.equal(options[0].count, 5);

    const lengths = options.slice(1).map((o) => o.value);
    assert.deepEqual(lengths, ["1:30", "2:00", "2:30"]);
    assert.equal(options.find((o) => o.value === "2:30")?.count, 2);
  });

  it("falls back to legacy GOLD 2:30 package strings", () => {
    const legacy = rec({ package: "GOLD 2:00", timeLengthOfMix: "" });
    assert.equal(recordMixLength(legacy), "2:00");
    assert.equal(matchesTimeLimitFilter(legacy, "2:00"), true);
  });

  it("normalizes Magento bare minutes and groups Other", () => {
    const bare = rec({ timeLengthOfMix: "2" });
    assert.equal(recordMixLength(bare), "2:00");

    const other = rec({
      timeLengthOfMix:
        "Other - please specify the time needed in your notes section",
    });
    assert.equal(recordMixLength(other), "Other");
    assert.equal(matchesTimeLimitFilter(other, "Other"), true);
  });
});
