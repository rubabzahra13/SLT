/**
 * Collection Email Generator
 *
 * Generates dynamic customer collection emails for orders in the "Waiting for Data" state.
 * Only RED (applicable + missing) requirement items appear in the email.
 * GREEN and WHITE items are excluded.
 */

import { getOrderRequirements } from "@/lib/order-requirements";
import type { MTDRecord, Order } from "@/types";

// ---------------------------------------------------------------------------
// Deadline Calculation
// ---------------------------------------------------------------------------

/**
 * Returns the date of the next upcoming Sunday (never today even if today is Sunday).
 */
export function getNextSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilSunday);
  return next;
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "TH";
  switch (day % 10) {
    case 1: return "ST";
    case 2: return "ND";
    case 3: return "RD";
    default: return "TH";
  }
}

/**
 * Formats the next Sunday as: "SUNDAY, SEPTEMBER 27TH, 2026"
 */
export function formatDeadline(date: Date): string {
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `SUNDAY, ${month} ${day}${ordinalSuffix(day)}, ${year}`;
}

// ---------------------------------------------------------------------------
// Missing Item Wording
// ---------------------------------------------------------------------------

/**
 * Canonical wording for each missing requirement.
 * Key = requirement ID from getOrderRequirements().
 */
const ITEM_WORDING: Record<string, string> = {
  songs: `A LIST OF SONGS – Please provide a list of songs for the mix. You can list more songs than we need to use so the editor has options when building the mix.`,
  mix: `TIME OF MIX – Please provide the desired time length of the mix.`,
  cs: `8 COUNT SHEETS – Please use the 8 count sheets attached to this email and make sure to have the section names listed on the left column.`,
  video: `HARD MARK OF FULL OUT VIDEO – Please send your video either by email to megan@soundslikethat.com or by text (while connected to Wi-Fi) to (909) 736-4848. Do not send a YouTube link. Our music editing software requires the actual video file to be attached so the editor can import it directly into the program and properly sync the music with the choreography.`,
  notes: `NOTES – Please provide any notes or special instructions needed for this mix.`,
  compliancy: `COMPLIANCY – Please provide the Music Affiliate/compliancy information for this mix.`,
};

// ---------------------------------------------------------------------------
// Draft Type
// ---------------------------------------------------------------------------

export type CollectionEmailDraft = {
  to: string;
  subject: string;
  deadlineLabel: string;
  missingItems: string[];
  /** True when 8-count sheets are required and missing — PDF must be attached */
  needs8CountPdf: boolean;
  bodyPlainText: string;
  bodyHtml: string;
};

// ---------------------------------------------------------------------------
// Resolve Coach Email
// ---------------------------------------------------------------------------

/**
 * Attempts to resolve the coach email from the linked Order.
 * Returns the email string or null if not available.
 */
export function resolveCoachEmail(
  record: MTDRecord,
  linkedOrder: Order | null | undefined
): string | null {
  if (linkedOrder) {
    if (linkedOrder.coachEmail?.trim()) return linkedOrder.coachEmail.trim();
    if (linkedOrder.coachEmailAddress?.trim()) return linkedOrder.coachEmailAddress.trim();
    if ((linkedOrder as any).emailAddress?.trim()) return (linkedOrder as any).emailAddress.trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds the full collection email draft for the given MTD record + linked order.
 * Uses getOrderRequirements() as the single source of truth for which items are missing.
 */
export function buildCollectionEmailDraft(
  record: MTDRecord,
  linkedOrder: Order | null | undefined,
  coachEmail: string
): CollectionEmailDraft {
  const deadline = getNextSunday();
  const deadlineLabel = formatDeadline(deadline);
  const subject = `Your Mix is Scheduled for Next Week – Action Required by ${deadlineLabel}`;

  // Use the same requirements engine as the UI — single source of truth
  const reqs = getOrderRequirements(record);

  const missingIds: string[] = [];

  // Collect RED items (applicable + missing)
  for (const item of reqs.all) {
    if (item.state === "red") {
      // Normalise eight_count -> cs
      missingIds.push(item.id === "eight_count" ? "cs" : item.id);
    }
  }

  // Compliancy is a background check in getOrderRequirements — use the exposed flag
  if (!reqs.compliancyMet) {
    if (!missingIds.includes("compliancy") && !missingIds.includes("form")) {
      missingIds.push("compliancy");
    }
  }

  // Deduplicate and map to wording
  const seen = new Set<string>();
  const missingItems: string[] = [];
  let needs8CountPdf = false;

  for (const id of missingIds) {
    if (seen.has(id)) continue;
    seen.add(id);

    const wording = ITEM_WORDING[id];
    if (wording) {
      missingItems.push(wording);
    }
    if (id === "cs") {
      needs8CountPdf = true;
    }
  }

  const bodyPlainText = buildPlainText(deadlineLabel, missingItems);
  const bodyHtml = buildSimpleHtml(subject, deadlineLabel, missingItems);

  return {
    to: coachEmail,
    subject,
    deadlineLabel,
    missingItems,
    needs8CountPdf,
    bodyPlainText,
    bodyHtml,
  };
}

// ---------------------------------------------------------------------------
// Plain text body
// ---------------------------------------------------------------------------

const SIGNATURE = `Cheerfully,
Megan Marlow
HEAD OF BUSINESS OPERATIONS
SOUNDS LIKE THAT, INC.
Office phone: (909) 736-4848, Mon-Fri 9 am-5 pm EST
www.soundslikethat.com`;

function buildPlainText(deadline: string, items: string[]): string {
  const itemLines = items.map((item) => `• ${item}`).join("\n\n");

  return [
    "Hi there!!!",
    "",
    `This is your only reminder that your mix is scheduled for production next week—yay! 🎉 To ensure we stay on track for your mix's completion, I'll need the following items submitted by ${deadline}.`,
    "",
    itemLines,
    "",
    `All items must be submitted by this date to keep your mix on next week's production schedule. If you're unable to meet the deadline or complete the tasks listed, please let me know as soon as possible. Our schedule is very tight during the busy season, and delays may result in your mix being moved to the end of our calendar. If we're able to shift it back by one week, we'll certainly try—but unfortunately, we can't guarantee availability.`,
    "",
    `Once everything is received, I'll confirm your invoice and make sure the editor has all the necessary details to move forward. Thank you so much for choosing us for your music needs—we're excited to work with you! Wishing you a fantastic week ahead!`,
    "",
    SIGNATURE,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Simple plain-style HTML body (no card layout, no colour headers)
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Splits an item string on the first em-dash (–) separator.
 * Returns [label, description] where description may be empty.
 */
function splitItemWording(item: string): [string, string] {
  const idx = item.indexOf("–");
  if (idx === -1) return [item.trim(), ""];
  return [item.slice(0, idx).trim(), item.slice(idx + 1).trim()];
}

function buildSimpleHtml(subject: string, deadline: string, items: string[]): string {
  const itemsHtml = items
    .map((item) => {
      const [label, desc] = splitItemWording(item);
      return `<p style="margin:0 0 12px;"><strong>${escapeHtml(label)}</strong>${desc ? ` – ${escapeHtml(desc)}` : ""}</p>`;
    })
    .join("\n");

  const signatureLines = SIGNATURE.split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#222222;">
  <div style="max-width:600px;padding:24px;">

    <p style="margin:0 0 16px;">Hi there!!!</p>

    <p style="margin:0 0 16px;">This is your only reminder that your mix is scheduled for production next week—yay! 🎉 To ensure we stay on track for your mix's completion, I'll need the following items submitted by <strong>${escapeHtml(deadline)}</strong>.</p>

    <div style="margin:0 0 20px;padding-left:8px;border-left:3px solid #b91c1c;">
      ${itemsHtml}
    </div>

    <p style="margin:0 0 16px;">All items must be submitted by this date to keep your mix on next week's production schedule. If you're unable to meet the deadline or complete the tasks listed, please let me know as soon as possible. Our schedule is very tight during the busy season, and delays may result in your mix being moved to the end of our calendar. If we're able to shift it back by one week, we'll certainly try—but unfortunately, we can't guarantee availability.</p>

    <p style="margin:0 0 24px;">Once everything is received, I'll confirm your invoice and make sure the editor has all the necessary details to move forward. Thank you so much for choosing us for your music needs—we're excited to work with you! Wishing you a fantastic week ahead!</p>

    <p style="margin:0;line-height:1.8;">${signatureLines}</p>

  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Clipboard text
// ---------------------------------------------------------------------------

export function buildCollectionEmailClipboardText(draft: CollectionEmailDraft): string {
  return [
    `To: ${draft.to}`,
    `Subject: ${draft.subject}`,
    "",
    draft.bodyPlainText,
  ].join("\n");
}
