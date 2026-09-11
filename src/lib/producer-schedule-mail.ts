import { formatDisplayDate } from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import {
  PRODUCER_SCHEDULE_COLUMNS,
  type ProducerFacingScheduleRow,
} from "@/lib/export-csv";
import type { Producer } from "@/types";

export type ScheduleMailDraft = {
  to: string;
  toName: string;
  subject: string;
  greeting: string;
  intro: string;
  footer: string;
  signature: string;
  attachmentFilename: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlMultiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function cellValue(row: ProducerFacingScheduleRow, key: string): string {
  const value = row[key];
  return String(value ?? "—");
}

export function scheduleAttachmentFilename(producerName: string): string {
  return `Schedule_${producerName.replace(/\s+/g, "_")}_${todayIso()}.xls`;
}

export function buildScheduleMailDraft(
  producer: Producer,
  mixCount: number,
  categoryLabel?: string
): ScheduleMailDraft {
  const firstName = producer.name.split(" ")[0] || producer.name;
  const scope = categoryLabel ? ` for ${categoryLabel}` : "";
  const mixLabel = `${mixCount} ongoing mix${mixCount === 1 ? "" : "es"}`;

  return {
    to: producer.email,
    toName: producer.name,
    subject: `Your current schedule - ${formatDisplayDate(todayIso())}`,
    greeting: `Hi ${firstName},`,
    intro: `Here is your current schedule${scope} (${mixLabel}).`,
    footer:
      "Please review the schedule below and reach out if anything looks off or you have questions. An Excel copy is also attached.",
    signature: "Thanks,\nSounds Like That",
    attachmentFilename: scheduleAttachmentFilename(producer.name),
  };
}

export function renderScheduleRowsPlainText(
  rows: ProducerFacingScheduleRow[]
): string {
  if (rows.length === 0) {
    return "No ongoing scheduled mixes.";
  }

  return rows
    .map((row, index) => {
      const fields = PRODUCER_SCHEDULE_COLUMNS.map(
        (column) => `${column.label}: ${cellValue(row, column.key)}`
      );
      return [`Mix ${index + 1}`, ...fields].join("\n");
    })
    .join("\n\n");
}

export function renderScheduleMailPlainText(
  draft: ScheduleMailDraft,
  rows: ProducerFacingScheduleRow[]
): string {
  return [
    draft.greeting,
    "",
    draft.intro,
    "",
    renderScheduleRowsPlainText(rows),
    "",
    draft.footer,
    "",
    draft.signature,
  ].join("\n");
}

function renderScheduleRowsHtmlTable(rows: ProducerFacingScheduleRow[]): string {
  const headerCells = PRODUCER_SCHEDULE_COLUMNS.map(
    (column) =>
      `<th style="padding:10px 12px;border:1px solid rgba(15,30,45,0.12);background:rgba(82,200,238,0.12);font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(15,20,25,0.55);text-align:left;white-space:nowrap;">${escapeHtml(column.label)}</th>`
  ).join("");

  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="${PRODUCER_SCHEDULE_COLUMNS.length}" style="padding:16px 12px;border:1px solid rgba(15,30,45,0.08);font-size:13px;color:rgba(15,20,25,0.45);text-align:center;">No ongoing scheduled mixes.</td></tr>`
      : rows
          .map((row, index) => {
            const cells = PRODUCER_SCHEDULE_COLUMNS.map((column) => {
              const value = cellValue(row, column.key);
              const isProgram = column.key === "programName";
              const isStatus = column.key === "status";
              const color = isProgram
                ? "#0f1419"
                : isStatus
                  ? "#e86a17"
                  : "rgba(15,20,25,0.64)";
              const weight = isProgram || isStatus ? "600" : "400";
              return `<td style="padding:10px 12px;border:1px solid rgba(15,30,45,0.08);font-size:12px;line-height:1.4;color:${color};font-weight:${weight};white-space:nowrap;background:${index % 2 === 0 ? "#ffffff" : "#fafbfc"};">${escapeHtml(value)}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");

  return `<div style="margin:0 0 24px;overflow-x:auto;border-radius:12px;border:1px solid rgba(15,30,45,0.1);">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;min-width:720px;border-collapse:collapse;background:#ffffff;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}

/** Modern HTML body for Gmail — includes an Excel-style schedule table. */
export function renderScheduleMailHtml(
  draft: ScheduleMailDraft,
  rows: ProducerFacingScheduleRow[]
): string {
  const signatureHtml = htmlMultiline(draft.signature);
  const scheduleTableHtml = renderScheduleRowsHtmlTable(rows);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(draft.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:960px;background:#ffffff;border-radius:16px;border:1px solid rgba(15,30,45,0.1);overflow:hidden;box-shadow:0 4px 24px rgba(15,20,25,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#1f8fb3 0%,#52c8ee 100%);padding:28px 32px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.88);">Sounds Like That</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Producer Schedule</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${escapeHtml(draft.toName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f1419;">${escapeHtml(draft.greeting)}</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.64);">${escapeHtml(draft.intro)}</p>
              ${scheduleTableHtml}
              <p style="margin:0;font-size:13px;line-height:1.65;color:rgba(15,20,25,0.64);">${escapeHtml(draft.footer)}</p>
              <p style="margin:16px 0 0;font-size:13px;line-height:1.65;color:#0f1419;">${signatureHtml}</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:rgba(15,20,25,0.38);">Sent via SLT Admin</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Excel-compatible HTML attachment — opens directly in Microsoft Excel. */
export function generateScheduleExcelAttachment(
  rows: ProducerFacingScheduleRow[]
): string {
  const headerCells = PRODUCER_SCHEDULE_COLUMNS.map(
    (column) => `<th>${escapeHtml(column.label)}</th>`
  ).join("");

  const bodyRows = rows
    .map((row) => {
      const cells = PRODUCER_SCHEDULE_COLUMNS.map(
        (column) => `<td>${escapeHtml(cellValue(row, column.key))}</td>`
      ).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Schedule</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
<style>
table { border-collapse: collapse; }
th, td { border: 1px solid #cccccc; padding: 6px 8px; font-size: 11pt; white-space: nowrap; }
th { background: #eef7fb; font-weight: bold; }
</style>
</head>
<body>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body>
</html>`;
}

export function stringToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** @deprecated Use stringToBase64 */
export function csvToBase64(csv: string): string {
  return stringToBase64(csv);
}
