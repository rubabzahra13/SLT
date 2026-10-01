export type EmailTemplateId =
  | "customer_missing_data"
  | "customer_incorrect_data"
  | "producer_order"
  | "producer_payroll"
  | "producer_schedule";

export type EmailTemplateCopy = {
  subject: string;
  greeting: string;
  intro: string;
  footer: string;
  signature: string;
};

export type EmailTemplateDefinition = EmailTemplateCopy & {
  id: EmailTemplateId;
  label: string;
  description: string;
  placeholders: string[];
};

export type EmailTemplatesState = Record<EmailTemplateId, EmailTemplateCopy>;

export const EMAIL_TEMPLATES_STORAGE_KEY = "slt_email_templates";

const CUSTOMER_DEFAULT_FOOTER = `All items must be submitted by this date to keep your mix on next week's production schedule. If you're unable to meet the deadline or complete the tasks listed, please let me know as soon as possible. Our schedule is very tight during the busy season, and delays may result in your mix being moved to the end of our calendar. If we're able to shift it back by one week, we'll certainly try, but unfortunately, we can't guarantee availability. Once everything is received, I'll confirm your invoice and make sure the editor has all the necessary details to move forward.

Thank you so much for choosing us for your music needs. We're excited to work with you! Wishing you a fantastic week ahead!`;

const CUSTOMER_DEFAULT_SIGNATURE = `Cheerfully,
Megan Marlow
HEAD OF BUSINESS OPERATIONS
SOUNDS LIKE THAT, INC.
Office phone: (909) 736-4848, Mon-Fri 9 am-5 pm EST

www.soundslikethat.com`;

const CUSTOMER_DEFAULT_INTRO = `This is your only reminder that your mix is scheduled for production next week - yay! 🎉 To ensure we stay on track for your mix's completion, I'll need the following items submitted by {{completeDate}}

{{requiredData}}`;

const CUSTOMER_INCORRECT_INTRO = `Thank you for sending materials for {{programName}}. Unfortunately, what we received is not correct / not usable for production, so I'll need you to resubmit the item(s) listed below by {{completeDate}}.

{{requiredData}}`;

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    id: "customer_missing_data",
    label: "Customer · Missing data",
    description: "Orders tab email when API materials are still missing",
    placeholders: [
      "programName",
      "day",
      "completeDate",
      "requiredData",
      "programLine",
      "contactName",
    ],
    subject:
      "{{programName}} Your Mix is Scheduled for Next Week - Action Required by {{day}}",
    greeting: "Hi there!!!",
    intro: CUSTOMER_DEFAULT_INTRO,
    footer: CUSTOMER_DEFAULT_FOOTER,
    signature: CUSTOMER_DEFAULT_SIGNATURE,
  },
  {
    id: "customer_incorrect_data",
    label: "Customer · Incorrect data",
    description:
      "Orders tab follow-up when submitted materials need to be corrected and resent",
    placeholders: [
      "programName",
      "day",
      "completeDate",
      "requiredData",
      "programLine",
      "contactName",
    ],
    subject:
      "{{programName}} Action Required - Please Resubmit Correct Materials by {{day}}",
    greeting: "Hi there!!!",
    intro: CUSTOMER_INCORRECT_INTRO,
    footer: CUSTOMER_DEFAULT_FOOTER,
    signature: CUSTOMER_DEFAULT_SIGNATURE,
  },
  {
    id: "producer_order",
    label: "Producer · Order details",
    description: "Orders tab forward-order email to an editor",
    placeholders: ["programName", "firstName", "editorName"],
    subject: "SLT Order: {{programName}}",
    greeting: "Hi {{firstName}},",
    intro: "Please find the order details for {{programName}} below.",
    footer: "If you have any questions, reply to this thread.",
    signature: "Best regards,\nSounds Like That Admin",
  },
  {
    id: "producer_payroll",
    label: "Producer · Payroll",
    description: "Payroll send email with statement attachment",
    placeholders: [
      "firstName",
      "producerName",
      "periodLabel",
      "mixLabel",
      "scope",
    ],
    subject: "Your payroll statement - {{periodLabel}}",
    greeting: "Hi {{firstName}},",
    intro:
      "Here is your payroll statement{{scope}} ({{mixLabel}}) for {{periodLabel}}.",
    footer:
      "Please review the statement below and reach out if anything looks off or you have questions. An Excel copy is also attached.",
    signature: "Thanks,\nSounds Like That",
  },
  {
    id: "producer_schedule",
    label: "Producer · Schedule",
    description: "Schedule send email with schedule attachment",
    placeholders: [
      "firstName",
      "producerName",
      "todayLabel",
      "mixLabel",
      "scope",
    ],
    subject: "Your current schedule - {{todayLabel}}",
    greeting: "Hi {{firstName}},",
    intro: "Here is your current schedule{{scope}} ({{mixLabel}}).",
    footer:
      "Please review the schedule below and reach out if anything looks off or you have questions. An Excel copy is also attached.",
    signature: "Thanks,\nSounds Like That",
  },
];

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplatesState =
  Object.fromEntries(
    EMAIL_TEMPLATE_DEFINITIONS.map((entry) => [
      entry.id,
      {
        subject: entry.subject,
        greeting: entry.greeting,
        intro: entry.intro,
        footer: entry.footer,
        signature: entry.signature,
      },
    ])
  ) as EmailTemplatesState;

/** Rename legacy deadline placeholders in saved templates. */
export function migrateEmailTemplateTokens(text: string): string {
  let next = text
    .replace(/\{\{\s*deadlineShort\s*\}\}/gi, "{{day}}")
    .replace(/\{\{\s*deadlineLong\s*\}\}/gi, "{{completeDate}}");

  // Collapse accidental duplicate openings (e.g. "Hi there!!!\n\nHi there!!!")
  next = next.replace(/^(Hi there!!!\s*\n+)+\s*/i, "Hi there!!!\n\n");

  // Re-attach deadline tokens that were emptied out of classic sentence endings.
  if (!/\{\{\s*day\s*\}\}/i.test(next)) {
    next = next.replace(/(Action Required by)\s*$/gim, "$1 {{day}}");
  }
  if (!/\{\{\s*completeDate\s*\}\}/i.test(next)) {
    next = next.replace(
      /(submitted by)(\s*)(?=\n|All items|\{\{|$)/i,
      "$1 {{completeDate}}$2"
    );
  }

  // Insert required-data slot after the complete-date sentence when missing.
  if (!/\{\{\s*requiredData\s*\}\}/i.test(next)) {
    next = next.replace(
      /(\{\{\s*completeDate\s*\}\})(\s*)(?=\n|All items|$)/i,
      "$1\n\n{{requiredData}}$2"
    );
  }

  // Drop duplicated footer/signature blocks that got packed into the body twice.
  const footerAnchor = "All items must be submitted by this date";
  const firstFooter = next.indexOf(footerAnchor);
  if (firstFooter >= 0) {
    const secondFooter = next.indexOf(footerAnchor, firstFooter + footerAnchor.length);
    if (secondFooter >= 0) {
      next = next.slice(0, secondFooter).trimEnd();
    }
  }
  const sigAnchor = "Cheerfully,";
  const firstSig = next.indexOf(sigAnchor);
  if (firstSig >= 0) {
    const secondSig = next.indexOf(sigAnchor, firstSig + sigAnchor.length);
    if (secondSig >= 0) {
      next = next.slice(0, secondSig).trimEnd();
    }
  }

  return next;
}

function textContainsBlock(haystack: string, block: string): boolean {
  const needle = block.trim().slice(0, 48);
  if (!needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function asCopy(value: unknown, fallback: EmailTemplateCopy): EmailTemplateCopy {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Partial<EmailTemplateCopy>;
  /** Empty string is intentional (single-document editor clears greeting/footer/signature). */
  const requiredField = (stored: string | undefined, defaultValue: string) =>
    migrateEmailTemplateTokens(
      typeof stored === "string" && stored.trim() ? stored : defaultValue
    );
  const optionalField = (stored: string | undefined, defaultValue: string) =>
    migrateEmailTemplateTokens(
      typeof stored === "string" ? stored : defaultValue
    );

  const subject = requiredField(raw.subject, fallback.subject);
  let greeting = optionalField(raw.greeting, fallback.greeting);
  let intro = requiredField(raw.intro, fallback.intro);
  let footer = optionalField(raw.footer, fallback.footer);
  let signature = optionalField(raw.signature, fallback.signature);

  // After single-document edits, intro holds the full body.
  const greetingTrim = greeting.trim();
  if (
    greetingTrim &&
    intro.trim().toLowerCase().startsWith(greetingTrim.toLowerCase())
  ) {
    greeting = "";
  }
  if (footer.trim() && textContainsBlock(intro, footer)) {
    footer = "";
  }
  if (signature.trim() && textContainsBlock(intro, signature)) {
    signature = "";
  }

  return {
    subject,
    greeting,
    intro,
    footer,
    signature,
  };
}

export function normalizeEmailTemplates(
  value: unknown
): EmailTemplatesState {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<Record<EmailTemplateId, unknown>>)
      : {};
  const next = { ...DEFAULT_EMAIL_TEMPLATES };
  for (const def of EMAIL_TEMPLATE_DEFINITIONS) {
    next[def.id] = asCopy(raw[def.id], DEFAULT_EMAIL_TEMPLATES[def.id]);
  }
  return next;
}

const PLACEHOLDER_KEY_PATTERN = "[a-zA-Z][a-zA-Z0-9_]*";

export function formatPlaceholderLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toUpperCase();
}

export function isValidPlaceholderKey(key: string): boolean {
  return new RegExp(`^${PLACEHOLDER_KEY_PATTERN}$`).test(key.trim());
}

export function extractPlaceholdersFromText(text: string): string[] {
  const keys = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    keys.add(match[1]);
  }
  return [...keys].sort();
}

export function emailTemplateUsesAnyPlaceholder(
  template: EmailTemplateCopy,
  keys: string[]
): boolean {
  const blob = [
    template.subject,
    template.greeting,
    template.intro,
    template.footer,
    template.signature,
  ]
    .filter((part): part is string => typeof part === "string")
    .join("\n");
  const found = extractPlaceholdersFromText(blob);
  return keys.some((key) => found.includes(key));
}

/** Catalog keys first, then any extras found in the document. */
export function mergeTemplatePlaceholderKeys(
  catalog: string[],
  text: string
): string[] {
  const ordered = [...catalog];
  const seen = new Set(catalog);
  for (const key of extractPlaceholdersFromText(text)) {
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

export function countPlaceholderInText(text: string, key: string): number {
  const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
  return [...text.matchAll(re)].length;
}

export function removePlaceholderFromText(text: string, key: string): string {
  const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
  return text.replace(re, "");
}

export function insertPlaceholderToken(
  text: string,
  key: string,
  selectionStart: number,
  selectionEnd: number
): { text: string; cursor: number } {
  const token = `{{${key}}}`;
  const next = text.slice(0, selectionStart) + token + text.slice(selectionEnd);
  return { text: next, cursor: selectionStart + token.length };
}

export function parsePackedEmailDocument(text: string): {
  subject: string;
  body: string;
} {
  const raw = text.replace(/\r\n/g, "\n").trim();
  const match = raw.match(/^Subject:\s*(.*?)(?:\n\n([\s\S]*))?$/i);
  if (match) {
    return {
      subject: match[1]?.trim() ?? "",
      body: (match[2] ?? "").trim(),
    };
  }
  return { subject: "", body: raw };
}

export function applyEmailTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

/** Flatten a structured template into one editable email document. */
export function packEmailTemplate(template: EmailTemplateCopy): string {
  let greeting = (typeof template.greeting === "string" ? template.greeting : "").trim();
  let intro = (typeof template.intro === "string" ? template.intro : "").trim();
  let footer = (typeof template.footer === "string" ? template.footer : "").trim();
  let signature = (typeof template.signature === "string" ? template.signature : "").trim();

  // Saved single-document bodies already include greeting/footer/signature; don't repeat.
  if (greeting && intro.toLowerCase().startsWith(greeting.toLowerCase())) {
    greeting = "";
  }
  if (footer && textContainsBlock(intro, footer)) {
    footer = "";
  }
  if (signature && textContainsBlock(intro, signature)) {
    signature = "";
  }

  const body = [greeting, intro, footer, signature]
    .map((part) => (typeof part === "string" ? part : "").trim())
    .filter(Boolean)
    .join("\n\n");
  const subject = (typeof template.subject === "string" ? template.subject : "").trim();
  return migrateEmailTemplateTokens(`Subject: ${subject}\n\n${body}`.trim());
}

/**
 * Parse the single-document editor back into structured fields.
 * Everything after the subject line is stored as the email body (`intro`);
 * greeting/footer/signature are cleared so the message stays one continuous email.
 */
export function unpackEmailTemplate(
  text: string,
  fallback: EmailTemplateCopy
): EmailTemplateCopy {
  const raw = text.replace(/\r\n/g, "\n").trim();
  if (!raw) return { ...fallback };

  const subjectMatch = raw.match(/^Subject:\s*(.*?)(?:\n\n([\s\S]*))?$/i);
  if (subjectMatch) {
    const subject = subjectMatch[1]?.trim() || fallback.subject;
    const body = (subjectMatch[2] ?? "").trim();
    return {
      subject,
      greeting: "",
      intro: body || fallback.intro,
      footer: "",
      signature: "",
    };
  }

  return {
    subject: fallback.subject,
    greeting: "",
    intro: raw,
    footer: "",
    signature: "",
  };
}

export function getEmailTemplateDefinition(
  id: EmailTemplateId
): EmailTemplateDefinition {
  return (
    EMAIL_TEMPLATE_DEFINITIONS.find((entry) => entry.id === id) ??
    EMAIL_TEMPLATE_DEFINITIONS[0]
  );
}
