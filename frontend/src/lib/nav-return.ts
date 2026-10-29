/** Safe in-app return path from ?return= (reject protocol-relative / external). */
export function safeReturnHref(
  raw: string | null | undefined,
  fallback: string | null = null
): string | null {
  const value = String(raw || "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function returnNavLabel(href: string): string {
  if (href.startsWith("/producers")) {
    if (/[?&]delete=/.test(href)) return "← Back to delete producer";
    return "← Back to Producers";
  }
  if (href.startsWith("/mtd")) return "← Back to MTD";
  if (href.startsWith("/orders")) return "← Back to Orders";
  if (href.startsWith("/payroll")) return "← Back to Payroll";
  if (href.startsWith("/schedule")) return "← Back to Schedule";
  return "← Back";
}

/** Append ?return= (or &return=) for deep-links that should offer a back path. */
export function withReturnParam(href: string, returnTo: string | null | undefined): string {
  const safe = safeReturnHref(returnTo);
  if (!safe) return href;
  const url = new URL(href, "http://local.invalid");
  url.searchParams.set("return", safe);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function producersDeleteReturnHref(producerId: string): string {
  const params = new URLSearchParams({ delete: producerId });
  return `/producers?${params.toString()}`;
}
