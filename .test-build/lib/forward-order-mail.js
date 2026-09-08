"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildForwardOrderMailFieldGroups = buildForwardOrderMailFieldGroups;
exports.flattenForwardMailFields = flattenForwardMailFields;
exports.defaultSelectedForwardMailKeys = defaultSelectedForwardMailKeys;
exports.resolveDefaultEditorKey = resolveDefaultEditorKey;
exports.buildForwardOrderMailSubject = buildForwardOrderMailSubject;
exports.buildForwardMailDraft = buildForwardMailDraft;
exports.renderForwardMailPlainText = renderForwardMailPlainText;
exports.buildForwardOrderMailBody = buildForwardOrderMailBody;
exports.buildForwardMailClipboardText = buildForwardMailClipboardText;
const data_1 = require("@/lib/data");
const dates_1 = require("@/lib/dates");
const editor_assignment_1 = require("@/lib/editor-assignment");
const order_detail_fields_1 = require("@/lib/order-detail-fields");
const order_detail_sections_1 = require("@/lib/order-detail-sections");
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
function buildForwardMailDraft(record, editor, selectedFields) {
    const programName = formatMailText((0, data_1.titleCase)(record.programName));
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
    const lines = [draft.greeting, "", draft.intro, ""];
    for (const section of draft.sections) {
        lines.push(...renderSectionPlainText(section), "");
    }
    lines.push(draft.footer, "", draft.signature);
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
