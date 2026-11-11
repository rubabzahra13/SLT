import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";
import {
  generatePayrollCsv,
  generateProducerFacingPayrollCsv,
  getProducerFacingPayrollRows,
  isVoiceoverOnlyStatement,
  producerStatementColumnsForRows,
} from "../export-csv";
import { getPayrollSendProducerNames } from "../payroll-send-filters";
import { groupVoiceoversByProducer } from "../voiceover-groups";

const griffin = {
  id: "griffin",
  name: "Griffin",
  initials: "GP",
  email: "griffin@example.com",
  categories: ["Cheer"],
  avatar: "",
  color: "#111",
  mixesThisWeek: 0,
  nextAvailable: "Today",
  status: "available",
  workDays: ["mon"],
  maxMixesPerDay: 5,
  extraDays: [],
} as unknown as Producer;

const ann = {
  id: "ann",
  name: "Ann",
  initials: "AJ",
  email: "ann@example.com",
  categories: ["Dance"],
  avatar: "",
  color: "#222",
  mixesThisWeek: 0,
  nextAvailable: "Today",
  status: "available",
  workDays: ["tue"],
  maxMixesPerDay: 5,
  extraDays: [],
} as unknown as Producer;

const producers = [griffin, ann];

function voiceover(patch: Partial<PayrollAddon> = {}): PayrollAddon {
  return {
    id: "vo-1",
    programName: "Elite Cheer",
    category: "Cheer",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    addonType: "voiceover",
    amount: 40,
    rateSource: "predefined",
    producerId: "griffin",
    producerInitials: "GP",
    originalProducerId: "ann",
    originalProducerInitials: "AJ",
    createdAt: "2026-09-12T12:00:00Z",
    ...patch,
  };
}

const records = [] as MTDRecord[];
const orders = [] as Order[];

describe("Original producer is context only", () => {
  it("pays and statements the voiceover producer, not the original producer", () => {
    const addon = voiceover();
    const griffinRows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [addon]
    );
    const annRows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Ann",
      undefined,
      [addon]
    );

    assert.equal(griffinRows.length, 1);
    assert.equal(griffinRows[0].rawTotalPayout, 40);
    assert.equal(griffinRows[0].producerName, "Griffin");
    assert.equal(griffinRows[0].voProducer, "Griffin");
    assert.equal(griffinRows[0].originalProducer, "Ann");
    assert.equal(annRows.length, 0);

    const names = getPayrollSendProducerNames(
      records,
      new Map(),
      producers,
      "school-all-star-cheer",
      "all-star-cheer",
      "all",
      { start: "2026-09-01", end: "2026-09-30" },
      [addon]
    );
    assert.deepEqual(names, ["Griffin"]);
  });

  it("writes VO Producer and Original Producer on the voiceover statement", () => {
    const rows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [voiceover()]
    );
    assert.equal(isVoiceoverOnlyStatement(rows), true);
    const labels = producerStatementColumnsForRows(rows).map((col) => col.label);
    assert.ok(labels.includes("VO Producer"));
    assert.ok(labels.includes("Original Producer"));
    assert.equal(labels.includes("Voiceover Compensation"), false);

    const csv = generateProducerFacingPayrollCsv(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [voiceover()]
    );
    const header = csv.split("\r\n")[0];
    assert.ok(header.includes("VO Producer"));
    assert.ok(header.includes("Original Producer"));
    assert.ok(csv.includes("Griffin"));
    assert.ok(csv.includes("Ann"));
  });

  it("keeps the recipient and amount when only the original producer changes", () => {
    const first = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [voiceover({ originalProducerId: "ann", originalProducerInitials: "AJ" })]
    );
    const second = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [
        voiceover({
          originalProducerId: "griffin",
          originalProducerInitials: "GP",
        }),
      ]
    );
    assert.equal(first[0].rawTotalPayout, second[0].rawTotalPayout);
    assert.equal(first[0].producerName, "Griffin");
    assert.equal(second[0].producerName, "Griffin");
    assert.equal(second[0].voProducer, "Griffin");
    assert.equal(second[0].originalProducer, "Griffin");
    assert.equal(
      getProducerFacingPayrollRows(
        records,
        orders,
        producers,
        "Ann",
        undefined,
        [
          voiceover({
            originalProducerId: "griffin",
            originalProducerInitials: "GP",
          }),
        ]
      ).length,
      0
    );
  });

  it("moves payroll when the voiceover producer changes", () => {
    const moved = voiceover({
      producerId: "ann",
      producerInitials: "AJ",
      originalProducerId: "griffin",
      originalProducerInitials: "GP",
    });
    const annRows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Ann",
      undefined,
      [moved]
    );
    const griffinRows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [moved]
    );
    assert.equal(annRows.length, 1);
    assert.equal(annRows[0].rawTotalPayout, 40);
    assert.equal(annRows[0].voProducer, "Ann");
    assert.equal(annRows[0].originalProducer, "Griffin");
    assert.equal(griffinRows.length, 0);
  });

  it("loads voiceovers with no original producer", () => {
    const legacy = voiceover({
      originalProducerId: null,
      originalProducerInitials: null,
    });
    const rows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Griffin",
      undefined,
      [legacy]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].originalProducer, "");
    assert.equal(rows[0].voProducer, "Griffin");
    assert.equal(rows[0].rawTotalPayout, 40);

    const csv = generatePayrollCsv(records, orders, producers, [legacy]);
    const header = csv.split("\r\n")[0];
    assert.ok(header.includes("VO Producer"));
    assert.ok(header.includes("Original Producer"));
    assert.ok(header.includes("Assigned Producer"));
  });

  it("groups the voiceover tab by voiceover producer only", () => {
    const rows = [
      voiceover({ id: "a", amount: 20 }),
      voiceover({
        id: "b",
        amount: 40,
        originalProducerId: "griffin",
        originalProducerInitials: "GP",
      }),
      voiceover({
        id: "c",
        amount: 25,
        producerId: "ann",
        producerInitials: "AJ",
        originalProducerId: null,
        originalProducerInitials: null,
      }),
      voiceover({
        id: "d",
        amount: 75,
        producerId: null,
        producerInitials: null,
        originalProducerId: "ann",
        originalProducerInitials: "AJ",
      }),
    ];
    const groups = groupVoiceoversByProducer(rows, producers);
    assert.deepEqual(
      groups.map((group) => group.name),
      ["Ann", "Griffin", "Unassigned"]
    );
    const griffinGroup = groups.find((group) => group.name === "Griffin");
    assert.equal(griffinGroup?.rows.length, 2);
    assert.equal(griffinGroup?.total, 60);
    const unassigned = groups.find((group) => group.key === "__unassigned__");
    assert.equal(unassigned?.rows.length, 1);
    assert.equal(unassigned?.rows[0].originalProducerId, "ann");
  });
});
