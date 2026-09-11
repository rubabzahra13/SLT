import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import {
  findProducerByAssignmentKey,
  formatRequestedEditorLabel,
  getRequestedEditorFromRecord,
} from "@/lib/editor-assignment";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import type { MTDRecord, Order, Producer } from "@/types";

export type ForwardMailField = {
  key: string;
  label: string;
  value: string;
  section: string;
};

export type ForwardMailFieldGroup = {
  title: string;
  fields: ForwardMailField[];
};

export type ForwardMailSection = {
  title: string;
  fields: { label: string; value: string }[];
};

export type ForwardMailDraft = {
  to: string;
  toName: string;
  subject: string;
  programName: string;
  greeting: string;
  intro: string;
  sections: ForwardMailSection[];
  footer: string;
  signature: string;
};

function formatMailText(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, " - ")
    .replace(/[—–]/g, "-");
}

function hasDisplayValue(value: string | undefined | null): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== "—" && trimmed !== "N/A");
}

function mtdWorkflowFields(
  record: MTDRecord,
  producers: Producer[],
  linkedOrder?: Order | null
): ForwardMailField[] {
  const items: ForwardMailField[] = [
    {
      key: "mtd-program",
      label: "Program",
      value: titleCase(record.programName),
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-contact",
      label: "Contact",
      value: titleCase(record.contactName),
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-package",
      label: "Package",
      value: record.package,
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-requested-editor",
      label: "Requested editor",
      value: formatRequestedEditorLabel(record, producers, linkedOrder),
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-assigned-editor",
      label: "Assigned editor",
      value: record.assignedProducer
        ? findProducerByAssignmentKey(record.assignedProducer, producers)?.name ??
          record.assignedProducer
        : "",
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-mix-start",
      label: "Mix start date",
      value: record.mixStartDate
        ? formatDisplayDate(toIsoDateString(record.mixStartDate) ?? record.mixStartDate)
        : "",
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-mix-end",
      label: "Mix end date",
      value: record.mixEndDate
        ? formatDisplayDate(toIsoDateString(record.mixEndDate) ?? record.mixEndDate)
        : "",
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-price",
      label: "Package price",
      value: record.price ? formatPrice(record.price) : "",
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-music-theme",
      label: "Music theme / songs",
      value: record.musicTheme,
      section: "Assignment & scheduling",
    },
    {
      key: "mtd-invoice",
      label: "Invoice #",
      value: record.invoice ?? "",
      section: "Assignment & scheduling",
    },
  ];

  return items.filter((item) => hasDisplayValue(item.value));
}

export function buildForwardOrderMailFieldGroups(
  record: MTDRecord,
  linkedOrder: Order | null | undefined,
  orderById: Map<string, Order>,
  producers: Producer[]
): ForwardMailFieldGroup[] {
  const order = linkedOrder ?? orderFromMTDRecord(record, linkedOrder, orderById);
  const groups: ForwardMailFieldGroup[] = [];

  const workflow = mtdWorkflowFields(record, producers, linkedOrder);
  if (workflow.length > 0) {
    groups.push({ title: "Assignment & scheduling", fields: workflow });
  }

  for (const section of getOrderDetailSections(order)) {
    const fields = section.fields
      .filter((field) => hasDisplayValue(field.value))
      .map((field) => ({
        key: `order-${field.key}`,
        label: field.label,
        value: field.value,
        section: section.title,
      }));

    if (fields.length > 0) {
      groups.push({ title: section.title, fields });
    }
  }

  return groups;
}

export function flattenForwardMailFields(
  groups: ForwardMailFieldGroup[]
): ForwardMailField[] {
  return groups.flatMap((group) => group.fields);
}

export function defaultSelectedForwardMailKeys(
  groups: ForwardMailFieldGroup[]
): string[] {
  return flattenForwardMailFields(groups).map((field) => field.key);
}

export function resolveDefaultEditorKey(
  record: MTDRecord,
  producers: Producer[],
  linkedOrder?: Order | null
): string {
  if (record.assignedProducer) {
    const assigned = findProducerByAssignmentKey(record.assignedProducer, producers);
    if (assigned) return assigned.id;
  }

  const requested = getRequestedEditorFromRecord(record, producers, linkedOrder);
  const requestedProducer = findProducerByAssignmentKey(requested, producers);
  if (requestedProducer) return requestedProducer.id;

  return producers[0]?.id ?? "";
}

export function buildForwardOrderMailSubject(record: MTDRecord): string {
  return formatMailText(`SLT Order: ${titleCase(record.programName)}`);
}

function groupSelectedFields(selectedFields: ForwardMailField[]): ForwardMailSection[] {
  const sections: ForwardMailSection[] = [];
  let currentTitle = "";

  for (const field of selectedFields) {
    if (field.section !== currentTitle) {
      sections.push({ title: field.section, fields: [] });
      currentTitle = field.section;
    }
    sections[sections.length - 1].fields.push({
      label: field.label,
      value: field.value,
    });
  }

  return sections;
}

export function buildForwardMailDraft(
  record: MTDRecord,
  editor: Producer | undefined,
  selectedFields: ForwardMailField[]
): ForwardMailDraft {
  const programName = formatMailText(titleCase(record.programName));
  const firstName = editor?.name?.split(/\s+/)[0] || "there";

  return {
    to: editor?.email ?? "",
    toName: editor?.name ?? "",
    subject: buildForwardOrderMailSubject(record),
    programName,
    greeting: `Hi ${firstName},`,
    intro: `Please find the order details for ${programName} below.`,
    sections: groupSelectedFields(selectedFields).map((section) => ({
      title: formatMailText(section.title),
      fields: section.fields.map((field) => ({
        label: formatMailText(field.label),
        value: formatMailText(field.value),
      })),
    })),
    footer: "If you have any questions, reply to this thread.",
    signature: "Best regards,\nSounds Like That Admin",
  };
}

function padLabel(label: string, width: number): string {
  return label.padEnd(width, " ");
}

function renderSectionPlainText(section: ForwardMailSection): string[] {
  const lines: string[] = [section.title.toUpperCase(), "─".repeat(32)];
  const labelWidth = Math.min(
    28,
    Math.max(...section.fields.map((field) => field.label.length), 8)
  );

  for (const field of section.fields) {
    const value = field.value.replace(/\s+/g, " ").trim();
    if (value.includes("\n")) {
      lines.push(`${padLabel(field.label, labelWidth)}`);
      for (const part of value.split("\n")) {
        lines.push(`  ${part.trim()}`);
      }
      continue;
    }
    lines.push(`${padLabel(`${field.label}:`, labelWidth + 1)} ${value}`);
  }

  return lines;
}

export function renderForwardMailPlainText(draft: ForwardMailDraft): string {
  const lines = [draft.greeting, "", draft.intro, ""];

  for (const section of draft.sections) {
    lines.push(...renderSectionPlainText(section), "");
  }

  lines.push(draft.footer, "", draft.signature);
  return lines.join("\n").trimEnd();
}

export function buildForwardOrderMailBody(
  record: MTDRecord,
  editor: Producer | undefined,
  selectedFields: ForwardMailField[]
): string {
  return renderForwardMailPlainText(
    buildForwardMailDraft(record, editor, selectedFields)
  );
}

export function buildForwardMailClipboardText(draft: ForwardMailDraft): string {
  return [
    `To: ${draft.toName} <${draft.to}>`,
    `Subject: ${draft.subject}`,
    "",
    renderForwardMailPlainText(draft),
  ].join("\n");
}

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

function renderSectionHtml(section: ForwardMailSection): string {
  const rows = section.fields
    .map((field, index) => {
      const isLast = index === section.fields.length - 1;
      const border = isLast ? "" : "border-bottom:1px solid rgba(15,30,45,0.06);";
      return `<tr>
        <td style="padding:10px 16px;${border}width:38%;font-size:12px;font-weight:600;color:rgba(15,20,25,0.55);vertical-align:top;">${escapeHtml(field.label)}</td>
        <td style="padding:10px 16px;${border}font-size:13px;line-height:1.5;color:#0f1419;vertical-align:top;">${htmlMultiline(field.value)}</td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#fafbfc;border-radius:12px;border:1px solid rgba(15,30,45,0.08);overflow:hidden;">
    <tr>
      <td colspan="2" style="padding:10px 16px 8px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1f8fb3;background:rgba(82,200,238,0.08);border-bottom:1px solid rgba(15,30,45,0.06);">${escapeHtml(section.title)}</td>
    </tr>
    ${rows}
  </table>`;
}

/** Modern HTML body for Gmail — table layout for broad client support. */
export function renderForwardMailHtml(draft: ForwardMailDraft): string {
  const sectionsHtml = draft.sections.map(renderSectionHtml).join("");
  const signatureHtml = htmlMultiline(draft.signature);

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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid rgba(15,30,45,0.1);overflow:hidden;box-shadow:0 4px 24px rgba(15,20,25,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#1f8fb3 0%,#52c8ee 100%);padding:28px 32px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.88);">Sounds Like That</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Order Details</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${escapeHtml(draft.programName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f1419;">${escapeHtml(draft.greeting)}</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.64);">${escapeHtml(draft.intro)}</p>
              ${sectionsHtml}
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
