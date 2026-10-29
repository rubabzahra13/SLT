import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findVoiceoverProgramMatch,
  voiceoverProgramNames,
} from "../voiceover-program-options";
import type { MTDRecord, Order } from "@/types";

function order(partial: Partial<Order> & Pick<Order, "id" | "formType">): Order {
  return {
    programName: "",
    schoolProgramName: "",
    ...partial,
  } as Order;
}

describe("voiceover program options", () => {
  it("lists the identity column for every category, including orders not on Payroll", () => {
    const orders = [
      order({
        id: "cheer",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        gymName: "Elite Gym",
        status: "new",
      }),
      order({
        id: "viroc",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        schoolName: "VIROC High",
        status: "in_mtd",
      }),
      order({
        id: "school",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        schoolName: "School Cheer HS",
      }),
      order({
        id: "youth",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "youth-rec-cheer",
        schoolProgramName: "Rec Stars",
      }),
      order({
        id: "pom",
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        schoolProgramName: "Pom Program",
      }),
      order({
        id: "hiphop",
        formType: "school-all-star-dance",
        danceFormSubtype: "hip-hop",
        schoolProgramName: "Hip Hop Studio",
      }),
      order({
        id: "band",
        formType: "marching-band",
        schoolProgramName: "Lake Band",
      }),
      order({
        id: "se",
        formType: "sports-entertainment",
        organizationName: "Arena Org",
      }),
      order({
        id: "anthem",
        formType: "school-anthem",
        schoolOrganizationName: "Anthem School",
      }),
    ];

    const names = voiceoverProgramNames(orders, []);
    for (const expected of [
      "Elite Gym",
      "VIROC High",
      "School Cheer HS",
      "Rec Stars",
      "Pom Program",
      "Hip Hop Studio",
      "Lake Band",
      "Arena Org",
      "Anthem School",
    ]) {
      assert.ok(names.includes(expected), `missing ${expected}`);
    }
  });

  it("includes an MTD row that is not on an order and matches it back", () => {
    const rec = {
      id: "mtd-only",
      programName: "Board Only Program",
    } as MTDRecord;
    const names = voiceoverProgramNames([], [rec]);
    assert.deepEqual(names, ["Board Only Program"]);
    const match = findVoiceoverProgramMatch("board only program", [], [rec]);
    assert.equal(match.record?.id, "mtd-only");
    assert.equal(match.order, null);
  });

  it("links a name to the order even when it is not a payroll mix", () => {
    const orders = [
      order({
        id: "ord-1",
        formType: "sports-entertainment",
        organizationName: "Arena Org",
        status: "new",
      }),
    ];
    const match = findVoiceoverProgramMatch("Arena Org", orders, []);
    assert.equal(match.order?.id, "ord-1");
  });
});
