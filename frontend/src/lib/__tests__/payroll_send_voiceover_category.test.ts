import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";
import {
  filterPayrollAddonsForForm,
  getPayrollSendProducerNames,
  voiceoverMatchesFormFilter,
} from "../payroll-send-filters";

const ben = {
  id: "ben",
  name: "Ben",
  initials: "B",
  email: "ben@example.com",
  categories: ["Cheer", "Sports Entertainment"],
  avatar: "",
  color: "#6366f1",
  mixesThisWeek: 0,
  nextAvailable: "Today",
  status: "available",
  workDays: ["mon"],
  maxMixesPerDay: 5,
  extraDays: [],
} as unknown as Producer;

const cheerOrder = {
  id: "ord-cheer",
  formType: "school-all-star-cheer",
  cheerFormSubtype: "all-star-cheer",
  contactName: "Coach",
  programName: "Elite Cheer",
  price: 500,
  status: "completed",
  needsAttention: false,
  createdAt: "2026-09-10T10:00:00Z",
} as Order;

const seOrder = {
  id: "ord-se",
  formType: "sports-entertainment",
  contactName: "Arena",
  programName: "Arena Show",
  price: 800,
  status: "completed",
  needsAttention: false,
  createdAt: "2026-09-11T10:00:00Z",
} as Order;

const cheerRec = {
  id: "mtd-cheer",
  orderId: "ord-cheer",
  contactName: "Coach",
  programName: "Elite Cheer",
  invoice: "INV-1",
  package: "GOLD 2:00",
  assignedProducer: "Ben",
  mixStartDate: "2026-09-01",
  mixEndDate: "2026-09-05",
  completedAt: "2026-09-10",
  inPayroll: true,
  status: "completed",
  category: "Cheer",
} as unknown as MTDRecord;

const seRec = {
  id: "mtd-se",
  orderId: "ord-se",
  contactName: "Arena",
  programName: "Arena Show",
  invoice: "INV-2",
  package: "SHOW",
  assignedProducer: "Ben",
  mixStartDate: "2026-09-02",
  mixEndDate: "2026-09-06",
  completedAt: "2026-09-11",
  inPayroll: true,
  status: "completed",
  category: "Sports Entertainment",
} as unknown as MTDRecord;

const cheerVo: PayrollAddon = {
  id: "vo-cheer",
  programName: "Elite Cheer",
  orderId: "ord-cheer",
  mtdId: "mtd-cheer",
  category: "Cheer",
  addonType: "voiceover",
  amount: 40,
  rateSource: "predefined",
  producerId: "ben",
  producerInitials: "B",
  createdAt: "2026-09-10T12:00:00Z",
};

const seLinkedVo: PayrollAddon = {
  id: "vo-se",
  programName: "Arena Show",
  orderId: "ord-se",
  mtdId: "mtd-se",
  category: "Cheer", // legacy bucket — link decides form scope
  addonType: "voiceover",
  amount: 40,
  rateSource: "predefined",
  producerId: "ben",
  producerInitials: "B",
  createdAt: "2026-09-11T12:00:00Z",
};

const orderById = new Map<string, Order>([
  ["ord-cheer", cheerOrder],
  ["ord-se", seOrder],
]);

const allRecords = [cheerRec, seRec];
const period = { start: "2026-09-01", end: "2026-09-30" };

describe("Send Statements voiceover category scoping", () => {
  it("keeps cheer voiceovers on cheer tab and hides them on sports entertainment", () => {
    assert.equal(
      voiceoverMatchesFormFilter(
        cheerVo,
        "school-all-star-cheer",
        "all-star-cheer",
        "all",
        allRecords,
        orderById
      ),
      true
    );
    assert.equal(
      voiceoverMatchesFormFilter(
        cheerVo,
        "sports-entertainment",
        "all",
        "all",
        allRecords,
        orderById
      ),
      false
    );
  });

  it("keeps SE-linked voiceovers on sports entertainment only", () => {
    assert.equal(
      voiceoverMatchesFormFilter(
        seLinkedVo,
        "sports-entertainment",
        "all",
        "all",
        allRecords,
        orderById
      ),
      true
    );
    assert.equal(
      voiceoverMatchesFormFilter(
        seLinkedVo,
        "school-all-star-cheer",
        "all-star-cheer",
        "all",
        allRecords,
        orderById
      ),
      false
    );
  });

  it("filters addon lists and send producer VO inclusion by form", () => {
    const seAddons = filterPayrollAddonsForForm(
      [cheerVo, seLinkedVo],
      "sports-entertainment",
      "all",
      "all",
      allRecords,
      orderById
    );
    assert.deepEqual(
      seAddons.map((a) => a.id),
      ["vo-se"]
    );

    const cheerAddons = filterPayrollAddonsForForm(
      [cheerVo, seLinkedVo],
      "school-all-star-cheer",
      "all-star-cheer",
      "all",
      allRecords,
      orderById
    );
    assert.deepEqual(
      cheerAddons.map((a) => a.id),
      ["vo-cheer"]
    );

    // SE tab with only cheer mixes filtered out — VO-only SE producer still listed
    // when SE VO exists; cheer VO alone must not invent an SE statement.
    const seNamesFromCheerVoOnly = getPayrollSendProducerNames(
      [],
      orderById,
      [ben],
      "sports-entertainment",
      "all",
      "all",
      period,
      [cheerVo],
      allRecords
    );
    assert.deepEqual(seNamesFromCheerVoOnly, []);

    const seNamesWithSeVo = getPayrollSendProducerNames(
      [seRec],
      orderById,
      [ben],
      "sports-entertainment",
      "all",
      "all",
      period,
      [cheerVo, seLinkedVo],
      allRecords
    );
    assert.deepEqual(seNamesWithSeVo, ["Ben"]);
  });
});
