import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import {
  findProducerByAssignmentKey,
  formatRequestedEditorLabel,
  getRequestedEditorFromRecord,
} from "@/lib/editor-assignment";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { getOrderRequirements } from "@/lib/order-requirements";
import { parsePackage } from "@/lib/package";
import {
  applyEmailTemplate,
  DEFAULT_EMAIL_TEMPLATES,
  type EmailTemplateCopy,
} from "@/lib/email-templates";
import {
  formatSongResourceLinksPlain,
  linkifyMailHtml,
  musicResourceTemplateVars,
} from "@/lib/music-resource-links";
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
  variant?: "producer" | "customer";
  programLine?: string;
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
  selectedFields: ForwardMailField[],
  template: EmailTemplateCopy = DEFAULT_EMAIL_TEMPLATES.producer_order
): ForwardMailDraft {
  const programName = formatMailText(titleCase(record.programName));
  const firstName = editor?.name?.split(/\s+/)[0] || "there";
  const vars = {
    programName,
    firstName,
    editorName: editor?.name ?? "",
  };

  return {
    to: editor?.email ?? "",
    toName: editor?.name ?? "",
    subject: formatMailText(applyEmailTemplate(template.subject, vars)),
    programName,
    greeting: applyEmailTemplate(template.greeting, vars),
    intro: applyEmailTemplate(template.intro, vars),
    sections: groupSelectedFields(selectedFields).map((section) => ({
      title: formatMailText(section.title),
      fields: section.fields.map((field) => ({
        label: formatMailText(field.label),
        value: formatMailText(field.value),
      })),
    })),
    footer: applyEmailTemplate(template.footer, vars),
    signature: applyEmailTemplate(template.signature, vars),
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
  const lines: string[] = [];
  if (draft.greeting.trim()) lines.push(draft.greeting, "");
  if (draft.intro.trim()) lines.push(draft.intro, "");

  const embedsRequiredData = draft.variant === "customer" && draft.sections.length === 0;

  if (draft.variant === "customer" && draft.programLine && !embedsRequiredData) {
    lines.push(draft.programLine, "", draft.sections[0]?.title || "Missing items", "");
  }

  for (const section of draft.sections) {
    if (draft.variant === "customer") {
      for (const field of section.fields) {
        lines.push(`${field.label} - ${field.value}`, "");
      }
    } else {
      lines.push(...renderSectionPlainText(section), "");
    }
  }

  if (draft.footer.trim()) lines.push(draft.footer, "");
  if (draft.signature.trim()) lines.push(draft.signature);
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
  return linkifyMailHtml(value);
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
  const isCustomer = draft.variant === "customer";
  const embedsRequiredData = isCustomer && draft.sections.length === 0;
  const sectionsHtml = isCustomer
    ? draft.sections
        .flatMap((section) =>
          section.fields.map((field) => {
            return `<div style="margin:0 0 16px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f1419;text-transform:uppercase;letter-spacing:0.02em;">${escapeHtml(field.label)}</p>
              <p style="margin:0;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.72);">${htmlMultiline(field.value)}</p>
            </div>`;
          })
        )
        .join("")
    : draft.sections.map(renderSectionHtml).join("");
  const signatureHtml = htmlMultiline(draft.signature);
  const introHtml = htmlMultiline(draft.intro);
  const footerHtml = htmlMultiline(draft.footer);
  const headerTitle = isCustomer ? "Action Required" : "Order Details";

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
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">${escapeHtml(headerTitle)}</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${escapeHtml(draft.programName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              ${
                draft.greeting.trim()
                  ? `<p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f1419;">${escapeHtml(draft.greeting)}</p>`
                  : ""
              }
              ${
                draft.intro.trim()
                  ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.64);">${introHtml}</p>`
                  : ""
              }
              ${
                isCustomer && draft.programLine && !embedsRequiredData
                  ? `<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.02em;color:#0f1419;">${escapeHtml(draft.programLine)}</p>
                     <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#0f1419;">${escapeHtml(draft.sections[0]?.title || "Missing items")}</p>`
                  : ""
              }
              ${sectionsHtml}
              ${
                draft.footer.trim()
                  ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.65;color:rgba(15,20,25,0.64);">${footerHtml}</p>`
                  : ""
              }
              ${
                draft.signature.trim()
                  ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.65;color:#0f1419;">${signatureHtml}</p>`
                  : ""
              }
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

export type CustomerMailContact = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function pushUniqueContact(
  contacts: CustomerMailContact[],
  id: string,
  name: string,
  email: string | undefined | null,
  role: string
) {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes("@")) return;
  if (contacts.some((c) => c.email.toLowerCase() === trimmed.toLowerCase())) return;
  contacts.push({
    id,
    name: name.trim() || role,
    email: trimmed,
    role,
  });
}

function slugForEmail(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return slug || "demo";
}

function dummyCustomerEmail(role: string, seed: string): string {
  return `${role}.${slugForEmail(seed)}@demogym.com`;
}

export function resolveCustomerMailContacts(
  record: MTDRecord,
  linkedOrder?: Order | null
): CustomerMailContact[] {
  const order = (linkedOrder ?? {}) as Order & Record<string, string | undefined>;
  const contacts: CustomerMailContact[] = [];
  const seed =
    record.programName ||
    record.contactName ||
    record.id ||
    "order";

  pushUniqueContact(
    contacts,
    "billing",
    order.billingPersonName || record.contactName || "Demo Billing",
    order.billingPersonEmail ||
      order.emailAddress ||
      dummyCustomerEmail("billing", seed),
    "Billing"
  );
  pushUniqueContact(
    contacts,
    "coach",
    order.coachName || record.contactName || "Demo Coach",
    order.coachEmail ||
      order.coachEmailAddress ||
      dummyCustomerEmail("coach", seed),
    "Coach"
  );
  pushUniqueContact(
    contacts,
    "contact",
    record.contactName || "Demo Contact",
    order.emailAddress ||
      order.billingPersonEmail ||
      order.coachEmail ||
      dummyCustomerEmail("contact", seed),
    "Contact"
  );

  return contacts;
}

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}TH`;
  switch (day % 10) {
    case 1:
      return `${day}ST`;
    case 2:
      return `${day}ND`;
    case 3:
      return `${day}RD`;
    default:
      return `${day}TH`;
  }
}

function formatCustomerDeadline(date: Date, style: "long" | "short"): string {
  if (style === "short") {
    return ordinalDay(date.getDate());
  }
  const weekday = date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase()
    .replace(/\./g, "");
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase()
    .replace(/\./g, "");
  const day = ordinalDay(date.getDate());
  const year = date.getFullYear();
  return `${weekday}, ${month} ${day}, ${year}`;
}

export function formatCustomerDeadlineFields(date: Date): {
  day: string;
  completeDate: string;
} {
  return {
    day: formatCustomerDeadline(date, "short"),
    completeDate: formatCustomerDeadline(date, "long"),
  };
}

export function customerSubmissionDeadlineIso(record: MTDRecord): string {
  const date = resolveCustomerSubmissionDeadline(record);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sunday before the mix production week (or next Sunday if no mix date). */
export function resolveCustomerSubmissionDeadline(record: MTDRecord): Date {
  const iso = record.mixStartDate?.trim();
  if (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    if (y && m && d) {
      const start = new Date(y, m - 1, d);
      const day = start.getDay();
      if (day === 0) {
        start.setDate(start.getDate() - 7);
      } else {
        start.setDate(start.getDate() - day);
      }
      return start;
    }
  }

  const today = new Date();
  const day = today.getDay();
  const add = day === 0 ? 7 : 7 - day;
  today.setDate(today.getDate() + add);
  return today;
}

export function buildCustomerProgramLine(record: MTDRecord): string {
  const parsed = parsePackage(record.package || "");
  const parts = [
    titleCase(record.programName).toUpperCase(),
    parsed.tier !== "-" ? parsed.tier.toUpperCase() : "",
    parsed.limit !== "-" ? parsed.limit : "",
    parsed.split !== "-" ? parsed.split.toUpperCase() : "",
  ].filter(Boolean);
  return formatMailText(parts.join("  "));
}

function orderFormPackageHint(record: MTDRecord): string {
  const tier = parsePackage(record.package || "").tier;
  if (!tier || tier === "-") return "the correct package";
  return `the ${tier.toUpperCase()} PACKAGE`;
}

function missingItemCopy(
  id: string,
  record: MTDRecord
): { label: string; value: string } | null {
  switch (id) {
    case "form":
      return {
        label: "COMPLETED ORDER FORM",
        value: `Complete with songs, notes and voiceovers. Please choose ${orderFormPackageHint(record)} when submitting this order form. Link to order form here: All Star Cheer Order`,
      };
    case "cs":
    case "eight_count":
      return {
        label: "8 COUNT SHEETS",
        value:
          "Please use the 8 count sheets attached to this email and make sure to have the section names listed on the left column.",
      };
    case "video":
      return {
        label: "HARD MARK OF FULL OUT VIDEO",
        value:
          "Please send your video either by email to megan@soundslikethat.com or by text (while connected to Wi-Fi) to (909) 736-4848. Do not send a YouTube link. Our music editing software requires the actual video file to be attached so the editor can import it directly into the program and properly sync the music with the choreography.",
      };
    case "songs":
      return {
        label: "A LIST OF SONGS",
        value: `We are requiring this because of a high volume of revisions. This is due to the client not choosing songs, then not liking the songs that the editor chose for them. We are trying to eliminate as many unnecessary changes as possible. You can list more than we need to use in the mix to still be able to give the editor choices.

${formatSongResourceLinksPlain()}`,
      };
    case "notes":
      return {
        label: "NOTES / VOICEOVERS",
        value:
          "Please submit your routine notes and any custom voiceover requests so the editor has clear direction for the mix.",
      };
    case "mix":
      return {
        label: "TIME OF MIX",
        value:
          "Please confirm the time length of your mix so we can lock production timing.",
      };
    default:
      return null;
  }
}

export function buildMissingDataMailFieldGroups(
  record: MTDRecord
): ForwardMailFieldGroup[] {
  const reqs = getOrderRequirements(record);
  const missing = reqs.all.filter((item) => item.isApplicable && item.state === "red");
  const missingIds = new Set(missing.map((item) => item.id));
  const fields: ForwardMailField[] = [];
  const seen = new Set<string>();

  const pushCopy = (id: string) => {
    if (seen.has(id)) return;
    const copy = missingItemCopy(id, record);
    if (!copy) return;
    seen.add(id);
    fields.push({
      key: `missing-${id}`,
      label: copy.label,
      value: copy.value,
      section: "Missing items",
    });
  };

  // Client template leads with the order form when production materials are incomplete.
  if (
    missingIds.has("songs") ||
    missingIds.has("notes") ||
    missingIds.has("mix") ||
    missingIds.size > 0
  ) {
    pushCopy("form");
  }

  for (const item of missing) {
    pushCopy(item.id);
  }

  if (fields.length === 0 && reqs.isWaitingForData) {
    pushCopy("form");
  }

  if (fields.length === 0) return [];
  return [{ title: "Missing items", fields }];
}

export function customerMailIncludesEightCountSheets(
  selectedKeys: string[]
): boolean {
  return selectedKeys.some(
    (key) => key === "missing-cs" || key === "missing-eight_count"
  );
}

export const EIGHT_COUNT_SHEETS_PDF_PATH = "/slt-8-count-sheets.pdf";
export const EIGHT_COUNT_SHEETS_PDF_FILENAME = "SLT 8 count sheets.pdf";
/** Pre-rendered page images for the in-app preview (see scripts/render-eight-count.mjs). */
export const EIGHT_COUNT_SHEETS_PREVIEW_MANIFEST =
  "/eight-count-sheets/manifest.json";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Load the public 8-count sheets PDF for Gmail attachment. */
export async function loadEightCountSheetsAttachment(): Promise<{
  filename: string;
  content_base64: string;
  mime_type: string;
}> {
  const response = await fetch(EIGHT_COUNT_SHEETS_PDF_PATH);
  if (!response.ok) {
    throw new Error("Could not load the 8 count sheets PDF.");
  }
  const buffer = await response.arrayBuffer();
  return {
    filename: EIGHT_COUNT_SHEETS_PDF_FILENAME,
    content_base64: arrayBufferToBase64(buffer),
    mime_type: "application/pdf",
  };
}

export function buildCustomerMissingDataDraft(
  record: MTDRecord,
  contact: CustomerMailContact | undefined,
  selectedFields: ForwardMailField[],
  template: EmailTemplateCopy = DEFAULT_EMAIL_TEMPLATES.customer_missing_data,
  options?: { sectionTitle?: string; deadline?: Date }
): ForwardMailDraft {
  const programName = formatMailText(titleCase(record.programName));
  const deadline =
    options?.deadline ?? resolveCustomerSubmissionDeadline(record);
  const completeDate = formatCustomerDeadline(deadline, "long");
  const day = formatCustomerDeadline(deadline, "short");
  const programLine = buildCustomerProgramLine(record);
  const sectionTitle = options?.sectionTitle ?? "Missing items";
  const requiredData = formatCustomerRequiredData(
    selectedFields,
    programLine,
    sectionTitle
  );
  const embedsRequiredData = /\{\{\s*requiredData\s*\}\}/i.test(
    [template.subject, template.greeting, template.intro, template.footer, template.signature]
      .filter((part): part is string => typeof part === "string")
      .join("\n")
  );
  const vars = {
    programName,
    day,
    completeDate,
    programLine,
    contactName: contact?.name ?? "",
    requiredData,
    ...musicResourceTemplateVars(),
  };

  return {
    to: contact?.email ?? "",
    toName: contact?.name ?? "",
    subject: applyEmailTemplate(template.subject, vars),
    programName,
    programLine,
    variant: "customer",
    greeting: applyEmailTemplate(template.greeting, vars),
    intro: applyEmailTemplate(template.intro, vars),
    sections: embedsRequiredData
      ? []
      : [
          {
            title: sectionTitle,
            fields: selectedFields.map((field) => ({
              label: formatMailText(field.label),
              value: formatMailText(field.value),
            })),
          },
        ],
    footer: formatMailText(applyEmailTemplate(template.footer, vars)),
    signature: applyEmailTemplate(template.signature, vars),
  };
}

function formatCustomerRequiredData(
  selectedFields: ForwardMailField[],
  programLine: string,
  sectionTitle: string
): string {
  const lines: string[] = [];
  if (programLine.trim()) {
    lines.push(programLine, "", sectionTitle, "");
  } else {
    lines.push(sectionTitle, "");
  }
  for (const field of selectedFields) {
    lines.push(
      `${formatMailText(field.label)} - ${formatMailText(field.value)}`,
      ""
    );
  }
  return lines.join("\n").trimEnd();
}

