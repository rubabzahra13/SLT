import { MAX_GMAIL_ATTACHMENT_BASE64_CHARS } from "@/lib/gmail-attachments";

/**
 * Eagerly build every producer’s statement only for tiny Send scopes.
 * 2-week boards can still be huge — stay on-demand past this many producers.
 */
export const STATEMENT_EAGER_PRODUCER_CAP = 3;

/** Confirm before blasting this many separate Gmail sends. */
export const STATEMENT_BULK_SEND_CONFIRM_CAP = 5;

/** Skip embedding full Excel when raw attachment would blow the request cap. */
export const STATEMENT_EXCEL_RAW_SAFE_CHARS = Math.floor(
  MAX_GMAIL_ATTACHMENT_BASE64_CHARS * 0.7
);

/** Rough in-memory cost signal for statement line items. */
export function estimateStatementPayloadChars(rowCount: number): number {
  // ~400 chars/row for CSV-ish; Excel HTML is heavier — bias high.
  return Math.max(0, rowCount) * 900;
}

export function shouldBuildStatementRowsEagerly(producerCount: number): boolean {
  return producerCount <= STATEMENT_EAGER_PRODUCER_CAP;
}

export function shouldConfirmBulkStatementSend(targetCount: number): boolean {
  return targetCount >= STATEMENT_BULK_SEND_CONFIRM_CAP;
}

export type StatementMailAttachment = {
  filename: string;
  content_base64: string;
  mime_type: string;
};

/**
 * Pick the smallest email attachment that fits under Vercel’s body cap.
 * Returns null when even CSV is too large — caller should send body-only
 * and trigger a local CSV download instead.
 */
export function pickStatementMailAttachment(args: {
  producerName: string;
  excelHtml: string;
  csvText: string;
  excelFilename: string;
  csvFilename: string;
  toBase64: (value: string) => string;
}): StatementMailAttachment | null {
  const excelB64 = args.toBase64(args.excelHtml);
  if (excelB64.length <= MAX_GMAIL_ATTACHMENT_BASE64_CHARS) {
    return {
      filename: args.excelFilename,
      content_base64: excelB64,
      mime_type: "application/vnd.ms-excel",
    };
  }

  const csvB64 = args.toBase64(args.csvText);
  if (csvB64.length <= MAX_GMAIL_ATTACHMENT_BASE64_CHARS) {
    return {
      filename: args.csvFilename,
      content_base64: csvB64,
      mime_type: "text/csv",
    };
  }

  return null;
}
