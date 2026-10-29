import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveDanceExtraSongsQuantity,
  resolveDanceExtraSongTimeQuantity,
  producerStatementColumnsForRows,
  buildCsvString,
  type ProducerFacingPayrollRow,
} from "../export-csv";
import {
  generatePayrollExcelAttachment,
  renderPayrollRowsPlainText,
} from "../producer-payroll-mail";
import type { MTDRecord, Order } from "../../types";

describe("Dance extras → Send Statements", () => {
  it("reads qty from MTD board fields", () => {
    const rec = {
      extraSongsQuantity: 2,
      extraSongEditingTimeQuantity: 3,
    } as MTDRecord;
    assert.equal(resolveDanceExtraSongsQuantity(rec), 2);
    assert.equal(resolveDanceExtraSongTimeQuantity(rec), 3);
  });

  it("falls back to pricing_breakdown addons from complete-pricing", () => {
    const rec = {
      extraSongsQuantity: 0,
      extraSongEditingTimeQuantity: 0,
    } as MTDRecord;
    const order = {
      pricingBreakdown: {
        addons: [
          { addon_id: "extra_song", quantity: 2, payroll_amount: 30 },
          {
            addon_id: "extra_song_added_time_fee",
            quantity: 2,
            payroll_amount: 60,
          },
        ],
      },
    } as Order;
    assert.equal(resolveDanceExtraSongsQuantity(rec, order), 2);
    assert.equal(resolveDanceExtraSongTimeQuantity(rec, order), 2);
  });

  it("hides dance extra columns on cheer-only statements", () => {
    const rows = [
      {
        category: "School/All Star Cheer",
        subtype: "all-star-cheer",
        danceExtraSongs: "",
        danceExtraSongTime: "",
        voiceoverAddon: "None",
        rushFee: "None",
        miscellaneousAdjustment: "",
        producerRate: "0.7",
      },
    ] as ProducerFacingPayrollRow[];
    const cols = producerStatementColumnsForRows(rows);
    assert.ok(!cols.some((c) => c.key === "danceExtraSongs"));
    assert.ok(!cols.some((c) => c.key === "danceExtraSongsPayout"));
  });

  it("keeps dance extra columns on dance statements", () => {
    const rows = [
      {
        category: "School/All Star Dance",
        subtype: "pom",
        danceExtraSongs: "2",
        danceExtraSongTime: "2",
        voiceoverAddon: "None",
        rushFee: "None",
        miscellaneousAdjustment: "",
        producerRate: "0.7",
      },
    ] as ProducerFacingPayrollRow[];
    const cols = producerStatementColumnsForRows(rows);
    assert.ok(cols.some((c) => c.key === "danceExtraSongs"));
    assert.ok(cols.some((c) => c.key === "danceExtraSongsPayout"));
    assert.ok(!cols.some((c) => c.key === "voiceoverAddon"));
  });

  it("hides Voiceover Compensation on mix statements that include a VO add-on", () => {
    const rows = [
      {
        category: "School/All Star Cheer",
        subtype: "all-star-cheer",
        voiceoverAddon: "Cheer Voiceover $20",
        rushFee: "None",
        miscellaneousAdjustment: "",
        producerRate: "53%",
        voiceoverPayout: "$20",
        danceExtraSongs: "",
        danceExtraSongTime: "",
      },
    ] as ProducerFacingPayrollRow[];
    const cols = producerStatementColumnsForRows(rows);
    assert.ok(cols.some((c) => c.key === "voiceoverAddon"));
    assert.ok(!cols.some((c) => c.key === "voiceoverPayout"));
    assert.ok(!cols.some((c) => c.label === "Voiceover Compensation"));
  });

  it("Send email / Excel attachment columns match UI + Download CSV for cheer", () => {
    const cheerRows = [
      {
        completedDate: "2026-10-01",
        programName: "NABS QA",
        category: "School/All Star Cheer",
        subtype: "all-star-cheer",
        package: "GOLD 2:00",
        timeLimit: "2:00",
        voiceoverAddon: "None",
        rushFee: "None",
        danceExtraSongs: "",
        danceExtraSongTime: "",
        producerRate: "53%",
        voiceoverPayout: "$0",
        rushPayout: "$0",
        miscellaneousAdjustment: "",
        danceExtraSongsPayout: "",
        danceExtraSongTimePayout: "",
        totalPayout: "$450.50",
        producerName: "Test",
        recId: "r1",
        rawTotalPayout: 450.5,
      },
    ] as ProducerFacingPayrollRow[];

    const uiCols = producerStatementColumnsForRows(cheerRows);
    const csv = buildCsvString(uiCols, cheerRows);
    const excel = generatePayrollExcelAttachment(cheerRows);
    const plain = renderPayrollRowsPlainText(cheerRows);

    assert.ok(!uiCols.some((c) => c.key.startsWith("danceExtra")));
    assert.ok(!uiCols.some((c) => c.key === "voiceoverAddon"));
    assert.ok(!uiCols.some((c) => c.key === "voiceoverPayout"));
    assert.ok(!uiCols.some((c) => c.key === "rushFee"));

    for (const col of uiCols) {
      assert.ok(
        csv.includes(col.label),
        `CSV missing UI column ${col.label}`
      );
      assert.ok(
        excel.includes(col.label),
        `Excel attachment missing UI column ${col.label}`
      );
      assert.ok(
        plain.includes(col.label),
        `Plain email missing UI column ${col.label}`
      );
    }
    assert.equal(excel.includes("Dance Extra Songs"), false);
    assert.equal(plain.includes("Dance Extra Songs"), false);
    assert.equal(csv.includes("Dance Extra Songs"), false);
  });
});
