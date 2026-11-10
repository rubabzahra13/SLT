import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_GMAIL_ATTACHMENT_BASE64_CHARS } from "../gmail-attachments";
import {
  pickStatementMailAttachment,
  shouldBuildStatementRowsEagerly,
  shouldConfirmBulkStatementSend,
  STATEMENT_BULK_SEND_CONFIRM_CAP,
  STATEMENT_EAGER_PRODUCER_CAP,
} from "../statement-scale";
import { sortPayrollSendProducerNamesLean } from "../payroll-send-sort";

describe("statement-scale", () => {
  it("defers eager builds when many producers (2-week boards can still be large)", () => {
    assert.equal(shouldBuildStatementRowsEagerly(1), true);
    assert.equal(
      shouldBuildStatementRowsEagerly(STATEMENT_EAGER_PRODUCER_CAP),
      true
    );
    assert.equal(
      shouldBuildStatementRowsEagerly(STATEMENT_EAGER_PRODUCER_CAP + 1),
      false
    );
    assert.equal(
      shouldConfirmBulkStatementSend(STATEMENT_BULK_SEND_CONFIRM_CAP),
      true
    );
    assert.equal(
      shouldConfirmBulkStatementSend(STATEMENT_BULK_SEND_CONFIRM_CAP - 1),
      false
    );
  });

  it("sorts lean producer lists by name without row payloads", () => {
    const names = ["Casey", "Alex", "Blake"];
    assert.deepEqual(sortPayrollSendProducerNamesLean(names, "name_az"), [
      "Alex",
      "Blake",
      "Casey",
    ]);
    assert.deepEqual(sortPayrollSendProducerNamesLean(names, "name_za"), [
      "Casey",
      "Blake",
      "Alex",
    ]);
    assert.deepEqual(sortPayrollSendProducerNamesLean(names, "newest"), [
      "Alex",
      "Blake",
      "Casey",
    ]);
  });

  it("falls back Excel → CSV → null when attachment exceeds Gmail/Vercel cap", () => {
    const toBase64 = (value: string) => {
      const padded = Math.ceil(value.length / 3) * 4;
      return "a".repeat(padded);
    };

    const small = pickStatementMailAttachment({
      producerName: "Alex",
      excelHtml: "x".repeat(100),
      csvText: "csv",
      excelFilename: "a.xls",
      csvFilename: "a.csv",
      toBase64,
    });
    assert.equal(small?.mime_type, "application/vnd.ms-excel");

    const excelOver = "e".repeat(MAX_GMAIL_ATTACHMENT_BASE64_CHARS);
    const csvOk = "c".repeat(1_000);
    const mid = pickStatementMailAttachment({
      producerName: "Alex",
      excelHtml: excelOver,
      csvText: csvOk,
      excelFilename: "a.xls",
      csvFilename: "a.csv",
      toBase64,
    });
    assert.equal(mid?.mime_type, "text/csv");
    assert.equal(mid?.filename, "a.csv");

    const bothOver = pickStatementMailAttachment({
      producerName: "Alex",
      excelHtml: excelOver,
      csvText: excelOver,
      excelFilename: "a.xls",
      csvFilename: "a.csv",
      toBase64,
    });
    assert.equal(bothOver, null);
  });
});
