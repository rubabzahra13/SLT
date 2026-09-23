"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EIGHT_COUNT_SHEETS_PREVIEW_MANIFEST = exports.EIGHT_COUNT_SHEETS_PDF_FILENAME = exports.EIGHT_COUNT_SHEETS_PDF_PATH = void 0;
exports.buildForwardOrderMailFieldGroups = buildForwardOrderMailFieldGroups;
exports.flattenForwardMailFields = flattenForwardMailFields;
exports.defaultSelectedForwardMailKeys = defaultSelectedForwardMailKeys;
exports.resolveDefaultEditorKey = resolveDefaultEditorKey;
exports.buildForwardOrderMailSubject = buildForwardOrderMailSubject;
exports.buildForwardMailDraft = buildForwardMailDraft;
exports.renderForwardMailPlainText = renderForwardMailPlainText;
exports.buildForwardOrderMailBody = buildForwardOrderMailBody;
exports.buildForwardMailClipboardText = buildForwardMailClipboardText;
exports.renderForwardMailHtml = renderForwardMailHtml;
exports.resolveCustomerMailContacts = resolveCustomerMailContacts;
exports.formatCustomerDeadlineFields = formatCustomerDeadlineFields;
exports.customerSubmissionDeadlineIso = customerSubmissionDeadlineIso;
exports.resolveCustomerSubmissionDeadline = resolveCustomerSubmissionDeadline;
exports.buildCustomerProgramLine = buildCustomerProgramLine;
exports.buildMissingDataMailFieldGroups = buildMissingDataMailFieldGroups;
exports.customerMailIncludesEightCountSheets = customerMailIncludesEightCountSheets;
exports.loadEightCountSheetsAttachment = loadEightCountSheetsAttachment;
exports.buildCustomerMissingDataDraft = buildCustomerMissingDataDraft;
const data_1 = require("@/lib/data");
const dates_1 = require("@/lib/dates");
const editor_assignment_1 = require("@/lib/editor-assignment");
const order_detail_fields_1 = require("@/lib/order-detail-fields");
const order_detail_sections_1 = require("@/lib/order-detail-sections");
const order_requirements_1 = require("@/lib/order-requirements");
const package_1 = require("@/lib/package");
const email_templates_1 = require("@/lib/email-templates");
const music_resource_links_1 = require("@/lib/music-resource-links");
function formatMailText(value) {
    return value
        .replace(/\s*[—–]\s*/g, " - ")
        .replace(/[—–]/g, "-");
}
function hasDisplayValue(value) {
    const trimmed = value?.trim();
    return Boolean(trimmed && trimmed !== "—" && trimmed !== "N/A");
}
function mtdWorkflowFields(record, producers, linkedOrder) {
    const items = [
        {
            key: "mtd-program",
            label: "Program",
            value: (0, data_1.titleCase)(record.programName),
            section: "Assignment & scheduling",
        },
        {
            key: "mtd-contact",
            label: "Contact",
            value: (0, data_1.titleCase)(record.contactName),
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
            value: (0, editor_assignment_1.formatRequestedEditorLabel)(record, producers, linkedOrder),
            section: "Assignment & scheduling",
        },
        {
            key: "mtd-assigned-editor",
            label: "Assigned editor",
            value: record.assignedProducer
                ? (0, editor_assignment_1.findProducerByAssignmentKey)(record.assignedProducer, producers)?.name ??
                    record.assignedProducer
                : "",
            section: "Assignment & scheduling",
        },
        {
            key: "mtd-mix-start",
            label: "Mix start date",
            value: record.mixStartDate
                ? (0, dates_1.formatDisplayDate)((0, dates_1.toIsoDateString)(record.mixStartDate) ?? record.mixStartDate)
                : "",
            section: "Assignment & scheduling",
        },
        {
            key: "mtd-mix-end",
            label: "Mix end date",
            value: record.mixEndDate
                ? (0, dates_1.formatDisplayDate)((0, dates_1.toIsoDateString)(record.mixEndDate) ?? record.mixEndDate)
                : "",
            section: "Assignment & scheduling",
        },
        {
            key: "mtd-price",
            label: "Package price",
            value: record.price ? (0, data_1.formatPrice)(record.price) : "",
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
function buildForwardOrderMailFieldGroups(record, linkedOrder, orderById, producers) {
    const order = linkedOrder ?? (0, order_detail_fields_1.orderFromMTDRecord)(record, linkedOrder, orderById);
    const groups = [];
    const workflow = mtdWorkflowFields(record, producers, linkedOrder);
    if (workflow.length > 0) {
        groups.push({ title: "Assignment & scheduling", fields: workflow });
    }
    for (const section of (0, order_detail_sections_1.getOrderDetailSections)(order)) {
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
function flattenForwardMailFields(groups) {
    return groups.flatMap((group) => group.fields);
}
function defaultSelectedForwardMailKeys(groups) {
    return flattenForwardMailFields(groups).map((field) => field.key);
}
function resolveDefaultEditorKey(record, producers, linkedOrder) {
    if (record.assignedProducer) {
        const assigned = (0, editor_assignment_1.findProducerByAssignmentKey)(record.assignedProducer, producers);
        if (assigned)
            return assigned.id;
    }
    const requested = (0, editor_assignment_1.getRequestedEditorFromRecord)(record, producers, linkedOrder);
    const requestedProducer = (0, editor_assignment_1.findProducerByAssignmentKey)(requested, producers);
    if (requestedProducer)
        return requestedProducer.id;
    return producers[0]?.id ?? "";
}
function buildForwardOrderMailSubject(record) {
    return formatMailText(`SLT Order: ${(0, data_1.titleCase)(record.programName)}`);
}
function groupSelectedFields(selectedFields) {
    const sections = [];
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
function buildForwardMailDraft(record, editor, selectedFields, template = email_templates_1.DEFAULT_EMAIL_TEMPLATES.producer_order) {
    const programName = formatMailText((0, data_1.titleCase)(record.programName));
    const firstName = editor?.name?.split(/\s+/)[0] || "there";
    const vars = {
        programName,
        firstName,
        editorName: editor?.name ?? "",
    };
    return {
        to: editor?.email ?? "",
        toName: editor?.name ?? "",
        subject: formatMailText((0, email_templates_1.applyEmailTemplate)(template.subject, vars)),
        programName,
        greeting: (0, email_templates_1.applyEmailTemplate)(template.greeting, vars),
        intro: (0, email_templates_1.applyEmailTemplate)(template.intro, vars),
        sections: groupSelectedFields(selectedFields).map((section) => ({
            title: formatMailText(section.title),
            fields: section.fields.map((field) => ({
                label: formatMailText(field.label),
                value: formatMailText(field.value),
            })),
        })),
        footer: (0, email_templates_1.applyEmailTemplate)(template.footer, vars),
        signature: (0, email_templates_1.applyEmailTemplate)(template.signature, vars),
    };
}
function padLabel(label, width) {
    return label.padEnd(width, " ");
}
function renderSectionPlainText(section) {
    const lines = [section.title.toUpperCase(), "─".repeat(32)];
    const labelWidth = Math.min(28, Math.max(...section.fields.map((field) => field.label.length), 8));
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
function renderForwardMailPlainText(draft) {
    const lines = [];
    if (draft.greeting.trim())
        lines.push(draft.greeting, "");
    if (draft.intro.trim())
        lines.push(draft.intro, "");
    const embedsRequiredData = draft.variant === "customer" && draft.sections.length === 0;
    if (draft.variant === "customer" && draft.programLine && !embedsRequiredData) {
        lines.push(draft.programLine, "", draft.sections[0]?.title || "Missing items", "");
    }
    for (const section of draft.sections) {
        if (draft.variant === "customer") {
            for (const field of section.fields) {
                lines.push(`${field.label} - ${field.value}`, "");
            }
        }
        else {
            lines.push(...renderSectionPlainText(section), "");
        }
    }
    if (draft.footer.trim())
        lines.push(draft.footer, "");
    if (draft.signature.trim())
        lines.push(draft.signature);
    return lines.join("\n").trimEnd();
}
function buildForwardOrderMailBody(record, editor, selectedFields) {
    return renderForwardMailPlainText(buildForwardMailDraft(record, editor, selectedFields));
}
function buildForwardMailClipboardText(draft) {
    return [
        `To: ${draft.toName} <${draft.to}>`,
        `Subject: ${draft.subject}`,
        "",
        renderForwardMailPlainText(draft),
    ].join("\n");
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function htmlMultiline(value) {
    return (0, music_resource_links_1.linkifyMailHtml)(value);
}
function renderSectionHtml(section) {
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
function renderForwardMailHtml(draft) {
    const isCustomer = draft.variant === "customer";
    const embedsRequiredData = isCustomer && draft.sections.length === 0;
    const sectionsHtml = isCustomer
        ? draft.sections
            .flatMap((section) => section.fields.map((field) => {
            return `<div style="margin:0 0 16px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f1419;text-transform:uppercase;letter-spacing:0.02em;">${escapeHtml(field.label)}</p>
              <p style="margin:0;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.72);">${htmlMultiline(field.value)}</p>
            </div>`;
        }))
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
              ${draft.greeting.trim()
        ? `<p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f1419;">${escapeHtml(draft.greeting)}</p>`
        : ""}
              ${draft.intro.trim()
        ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:rgba(15,20,25,0.64);">${introHtml}</p>`
        : ""}
              ${isCustomer && draft.programLine && !embedsRequiredData
        ? `<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.02em;color:#0f1419;">${escapeHtml(draft.programLine)}</p>
                     <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#0f1419;">${escapeHtml(draft.sections[0]?.title || "Missing items")}</p>`
        : ""}
              ${sectionsHtml}
              ${draft.footer.trim()
        ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.65;color:rgba(15,20,25,0.64);">${footerHtml}</p>`
        : ""}
              ${draft.signature.trim()
        ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.65;color:#0f1419;">${signatureHtml}</p>`
        : ""}
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
function pushUniqueContact(contacts, id, name, email, role) {
    const trimmed = email?.trim();
    if (!trimmed || !trimmed.includes("@"))
        return;
    if (contacts.some((c) => c.email.toLowerCase() === trimmed.toLowerCase()))
        return;
    contacts.push({
        id,
        name: name.trim() || role,
        email: trimmed,
        role,
    });
}
function slugForEmail(value) {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 24);
    return slug || "demo";
}
function dummyCustomerEmail(role, seed) {
    return `${role}.${slugForEmail(seed)}@demogym.com`;
}
function resolveCustomerMailContacts(record, linkedOrder) {
    const order = (linkedOrder ?? {});
    const contacts = [];
    const seed = record.programName ||
        record.contactName ||
        record.id ||
        "order";
    pushUniqueContact(contacts, "billing", order.billingPersonName || record.contactName || "Demo Billing", order.billingPersonEmail ||
        order.emailAddress ||
        dummyCustomerEmail("billing", seed), "Billing");
    pushUniqueContact(contacts, "coach", order.coachName || record.contactName || "Demo Coach", order.coachEmail ||
        order.coachEmailAddress ||
        dummyCustomerEmail("coach", seed), "Coach");
    pushUniqueContact(contacts, "contact", record.contactName || "Demo Contact", order.emailAddress ||
        order.billingPersonEmail ||
        order.coachEmail ||
        dummyCustomerEmail("contact", seed), "Contact");
    return contacts;
}
function ordinalDay(day) {
    const mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13)
        return `${day}TH`;
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
function formatCustomerDeadline(date, style) {
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
function formatCustomerDeadlineFields(date) {
    return {
        day: formatCustomerDeadline(date, "short"),
        completeDate: formatCustomerDeadline(date, "long"),
    };
}
function customerSubmissionDeadlineIso(record) {
    const date = resolveCustomerSubmissionDeadline(record);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
/** Sunday before the mix production week (or next Sunday if no mix date). */
function resolveCustomerSubmissionDeadline(record) {
    const iso = record.mixStartDate?.trim();
    if (iso) {
        const [y, m, d] = iso.split("-").map(Number);
        if (y && m && d) {
            const start = new Date(y, m - 1, d);
            const day = start.getDay();
            if (day === 0) {
                start.setDate(start.getDate() - 7);
            }
            else {
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
function buildCustomerProgramLine(record) {
    const parsed = (0, package_1.parsePackage)(record.package || "");
    const parts = [
        (0, data_1.titleCase)(record.programName).toUpperCase(),
        parsed.tier !== "-" ? parsed.tier.toUpperCase() : "",
        parsed.limit !== "-" ? parsed.limit : "",
        parsed.split !== "-" ? parsed.split.toUpperCase() : "",
    ].filter(Boolean);
    return formatMailText(parts.join("  "));
}
function orderFormPackageHint(record) {
    const tier = (0, package_1.parsePackage)(record.package || "").tier;
    if (!tier || tier === "-")
        return "the correct package";
    return `the ${tier.toUpperCase()} PACKAGE`;
}
function missingItemCopy(id, record) {
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
                value: "Please use the 8 count sheets attached to this email and make sure to have the section names listed on the left column.",
            };
        case "video":
            return {
                label: "HARD MARK OF FULL OUT VIDEO",
                value: "Please send your video either by email to megan@soundslikethat.com or by text (while connected to Wi-Fi) to (909) 736-4848. Do not send a YouTube link. Our music editing software requires the actual video file to be attached so the editor can import it directly into the program and properly sync the music with the choreography.",
            };
        case "songs":
            return {
                label: "A LIST OF SONGS",
                value: `We are requiring this because of a high volume of revisions. This is due to the client not choosing songs, then not liking the songs that the editor chose for them. We are trying to eliminate as many unnecessary changes as possible. You can list more than we need to use in the mix to still be able to give the editor choices.

${(0, music_resource_links_1.formatSongResourceLinksPlain)()}`,
            };
        case "notes":
            return {
                label: "NOTES / VOICEOVERS",
                value: "Please submit your routine notes and any custom voiceover requests so the editor has clear direction for the mix.",
            };
        case "mix":
            return {
                label: "TIME OF MIX",
                value: "Please confirm the time length of your mix so we can lock production timing.",
            };
        default:
            return null;
    }
}
function buildMissingDataMailFieldGroups(record) {
    const reqs = (0, order_requirements_1.getOrderRequirements)(record);
    const missing = reqs.all.filter((item) => item.isApplicable && item.state === "red");
    const missingIds = new Set(missing.map((item) => item.id));
    const fields = [];
    const seen = new Set();
    const pushCopy = (id) => {
        if (seen.has(id))
            return;
        const copy = missingItemCopy(id, record);
        if (!copy)
            return;
        seen.add(id);
        fields.push({
            key: `missing-${id}`,
            label: copy.label,
            value: copy.value,
            section: "Missing items",
        });
    };
    // Client template leads with the order form when production materials are incomplete.
    if (missingIds.has("songs") ||
        missingIds.has("notes") ||
        missingIds.has("mix") ||
        missingIds.size > 0) {
        pushCopy("form");
    }
    for (const item of missing) {
        pushCopy(item.id);
    }
    if (fields.length === 0 && reqs.isWaitingForData) {
        pushCopy("form");
    }
    if (fields.length === 0)
        return [];
    return [{ title: "Missing items", fields }];
}
function customerMailIncludesEightCountSheets(selectedKeys) {
    return selectedKeys.some((key) => key === "missing-cs" || key === "missing-eight_count");
}
exports.EIGHT_COUNT_SHEETS_PDF_PATH = "/slt-8-count-sheets.pdf";
exports.EIGHT_COUNT_SHEETS_PDF_FILENAME = "SLT 8 count sheets.pdf";
/** Pre-rendered page images for the in-app preview (see scripts/render-eight-count.mjs). */
exports.EIGHT_COUNT_SHEETS_PREVIEW_MANIFEST = "/eight-count-sheets/manifest.json";
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}
/** Load the public 8-count sheets PDF for Gmail attachment. */
async function loadEightCountSheetsAttachment() {
    const response = await fetch(exports.EIGHT_COUNT_SHEETS_PDF_PATH);
    if (!response.ok) {
        throw new Error("Could not load the 8 count sheets PDF.");
    }
    const buffer = await response.arrayBuffer();
    return {
        filename: exports.EIGHT_COUNT_SHEETS_PDF_FILENAME,
        content_base64: arrayBufferToBase64(buffer),
        mime_type: "application/pdf",
    };
}
function buildCustomerMissingDataDraft(record, contact, selectedFields, template = email_templates_1.DEFAULT_EMAIL_TEMPLATES.customer_missing_data, options) {
    const programName = formatMailText((0, data_1.titleCase)(record.programName));
    const deadline = options?.deadline ?? resolveCustomerSubmissionDeadline(record);
    const completeDate = formatCustomerDeadline(deadline, "long");
    const day = formatCustomerDeadline(deadline, "short");
    const programLine = buildCustomerProgramLine(record);
    const sectionTitle = options?.sectionTitle ?? "Missing items";
    const requiredData = formatCustomerRequiredData(selectedFields, programLine, sectionTitle);
    const embedsRequiredData = /\{\{\s*requiredData\s*\}\}/i.test([template.subject, template.greeting, template.intro, template.footer, template.signature]
        .filter((part) => typeof part === "string")
        .join("\n"));
    const vars = {
        programName,
        day,
        completeDate,
        programLine,
        contactName: contact?.name ?? "",
        requiredData,
        ...(0, music_resource_links_1.musicResourceTemplateVars)(),
    };
    return {
        to: contact?.email ?? "",
        toName: contact?.name ?? "",
        subject: (0, email_templates_1.applyEmailTemplate)(template.subject, vars),
        programName,
        programLine,
        variant: "customer",
        greeting: (0, email_templates_1.applyEmailTemplate)(template.greeting, vars),
        intro: (0, email_templates_1.applyEmailTemplate)(template.intro, vars),
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
        footer: formatMailText((0, email_templates_1.applyEmailTemplate)(template.footer, vars)),
        signature: (0, email_templates_1.applyEmailTemplate)(template.signature, vars),
    };
}
function formatCustomerRequiredData(selectedFields, programLine, sectionTitle) {
    const lines = [];
    if (programLine.trim()) {
        lines.push(programLine, "", sectionTitle, "");
    }
    else {
        lines.push(sectionTitle, "");
    }
    for (const field of selectedFields) {
        lines.push(`${formatMailText(field.label)} - ${formatMailText(field.value)}`, "");
    }
    return lines.join("\n").trimEnd();
}
