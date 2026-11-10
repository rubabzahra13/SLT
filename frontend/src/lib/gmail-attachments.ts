/**
 * Vercel function request bodies cap at 4.5MB. Leave headroom for JSON
 * envelope (to/subject/html) around the base64 attachment.
 */
export const MAX_GMAIL_ATTACHMENT_BASE64_CHARS = 3_000_000;

export function assertGmailAttachmentWithinLimit(
  contentBase64: string,
  label: string
): void {
  if (contentBase64.length <= MAX_GMAIL_ATTACHMENT_BASE64_CHARS) return;
  const mb = (contentBase64.length / (1024 * 1024)).toFixed(1);
  throw new Error(
    `${label} attachment is too large to email (${mb} MB). Download the CSV instead, then send a smaller period.`
  );
}
