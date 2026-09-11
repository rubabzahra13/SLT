"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollAttachmentFilename = payrollAttachmentFilename;
exports.buildPayrollMailDraft = buildPayrollMailDraft;
exports.renderPayrollRowsPlainText = renderPayrollRowsPlainText;
exports.renderPayrollMailPlainText = renderPayrollMailPlainText;
exports.renderPayrollMailHtml = renderPayrollMailHtml;
exports.generatePayrollExcelAttachment = generatePayrollExcelAttachment;
exports.stringToBase64 = stringToBase64;
const date_filters_1 = require("@/lib/date-filters");
const export_csv_1 = require("@/lib/export-csv");
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function htmlMultiline(value) {
    return escapeHtml(value).replace(/\n/g, "<br />");
}
function cellValue(row, key) {
    const value = row[key];
    return String(value ?? "—");
}
function payrollAttachmentFilename(producerName) {
    return `Payroll_Statement_${producerName.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.xls`;
}
function buildPayrollMailDraft(producer, mixCount, periodLabel, categoryLabel) {
    const firstName = producer.name.split(" ")[0] || producer.name;
    const scope = categoryLabel ? ` for ${categoryLabel}` : "";
    const mixLabel = `${mixCount} completed mix${mixCount === 1 ? "" : "es"}`;
    return {
        to: producer.email,
        toName: producer.name,
        subject: `Your payroll statement - ${periodLabel}`,
        greeting: `Hi ${firstName},`,
        intro: `Here is your payroll statement${scope} (${mixLabel}) for ${periodLabel}.`,
        footer: "Please review the statement below and reach out if anything looks off or you have questions. An Excel copy is also attached.",
        signature: "Thanks,\nSounds Like That",
        attachmentFilename: payrollAttachmentFilename(producer.name),
        periodLabel,
    };
}
function renderPayrollRowsPlainText(rows) {
    if (rows.length === 0) {
        return "No completed mixes in this pay period.";
    }
    return rows
        .map((row, index) => {
        const fields = export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((column) => `${column.label}: ${cellValue(row, column.key)}`);
        return [`Mix ${index + 1}`, ...fields].join("\n");
    })
        .join("\n\n");
}
function renderPayrollMailPlainText(draft, rows) {
    return [
        draft.greeting,
        "",
        draft.intro,
        "",
        renderPayrollRowsPlainText(rows),
        "",
        draft.footer,
        "",
        draft.signature,
    ].join("\n");
}
function renderPayrollRowsHtmlTable(rows) {
    const headerCells = export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((column) => `<th style="padding:10px 12px;border:1px solid rgba(15,30,45,0.12);background:rgba(82,200,238,0.12);font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(15,20,25,0.55);text-align:left;white-space:nowrap;">${escapeHtml(column.label)}</th>`).join("");
    const bodyRows = rows.length === 0
        ? `<tr><td colspan="${export_csv_1.PRODUCER_STATEMENT_COLUMNS.length}" style="padding:16px 12px;border:1px solid rgba(15,30,45,0.08);font-size:13px;color:rgba(15,20,25,0.45);text-align:center;">No completed mixes in this pay period.</td></tr>`
        : rows
            .map((row, index) => {
            const cells = export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((column) => {
                const value = cellValue(row, column.key);
                const isProgram = column.key === "programName";
                const isTotal = column.key === "totalPayout";
                const color = isProgram
                    ? "#0f1419"
                    : isTotal
                        ? "#16a34a"
                        : "rgba(15,20,25,0.64)";
                const weight = isProgram || isTotal ? "600" : "400";
                return `<td style="padding:10px 12px;border:1px solid rgba(15,30,45,0.08);font-size:12px;line-height:1.4;color:${color};font-weight:${weight};white-space:nowrap;background:${index % 2 === 0 ? "#ffffff" : "#fafbfc"};">${escapeHtml(value)}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
        })
            .join("");
    return `<div style="margin:0 0 24px;overflow-x:auto;border-radius:12px;border:1px solid rgba(15,30,45,0.1);">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;min-width:960px;border-collapse:collapse;background:#ffffff;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}
function renderPayrollMailHtml(draft, rows) {
    const signatureHtml = htmlMultiline(draft.signature);
    const tableHtml = renderPayrollRowsHtmlTable(rows);
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
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Payroll Statement</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${escapeHtml(draft.toName)} · ${escapeHtml(draft.periodLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f1419;">${escapeHtml(draft.greeting)}</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.64);">${escapeHtml(draft.intro)}</p>
              ${tableHtml}
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
function generatePayrollExcelAttachment(rows) {
    const headerCells = export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const bodyRows = rows
        .map((row) => {
        const cells = export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((column) => `<td>${escapeHtml(cellValue(row, column.key))}</td>`).join("");
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
<x:Name>Payroll</x:Name>
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
function stringToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}
