/** Canonical music / order-form links used in customer emails. */

export type MusicResourceLink = {
  key: string;
  label: string;
  url: string;
};

export const MUSIC_RESOURCE_LINKS: MusicResourceLink[] = [
  {
    key: "powerMusicTrax",
    label: "Power Music Trax",
    url: "https://www.powermusictrax.com/",
  },
  {
    key: "unleashTheBeats",
    label: "Unleash the Beats",
    url: "https://www.unleashthebeats.com/",
  },
  {
    key: "songsForCheer",
    label: "Songs For Cheer",
    url: "https://www.songsforcheer.com/",
  },
  {
    key: "orderForm",
    label: "All Star Cheer Order",
    url: "https://www.powermusiccheer.com/slt/cheerchoices/allstarcheerrates/allstarcheerorder",
  },
];

export const MUSIC_RESOURCE_LINK_BY_KEY: Record<string, MusicResourceLink> =
  Object.fromEntries(MUSIC_RESOURCE_LINKS.map((entry) => [entry.key, entry]));

/** Plain-text block of the three song-licensing sites (labels only; URLs are linked in preview/HTML). */
export function formatSongResourceLinksPlain(): string {
  return MUSIC_RESOURCE_LINKS.filter((entry) => entry.key !== "orderForm")
    .map((entry) => entry.label)
    .join("\n\n");
}

export function musicResourceTemplateVars(): Record<string, string> {
  const vars: Record<string, string> = {
    musicAffiliateLinks: formatSongResourceLinksPlain(),
  };
  for (const entry of MUSIC_RESOURCE_LINKS) {
    vars[entry.key] = entry.url;
    vars[`${entry.key}Label`] = entry.label;
    vars[`${entry.key}Link`] = `${entry.label}: ${entry.url}`;
  }
  return vars;
}

/** Escape HTML, then turn known labels + raw URLs into anchors. */
export function linkifyMailHtml(text: string): string {
  const parts = splitMailTextWithLinks(text);
  return parts
    .map((part) => {
      if (part.type === "link") {
        const label = part.label
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        return `<a href="${part.url}" style="color:#1f8fb3;text-decoration:underline;" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }
      return part.value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\n/g, "<br />");
    })
    .join("");
}

export type MailTextPart =
  | { type: "text"; value: string }
  | { type: "link"; label: string; url: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split plain mail text into text + link parts for React preview. */
export function splitMailTextWithLinks(text: string): MailTextPart[] {
  if (!text) return [];

  type Hit = { start: number; end: number; label: string; url: string };
  const hits: Hit[] = [];

  for (const entry of MUSIC_RESOURCE_LINKS) {
    const labeled = `${entry.label}: ${entry.url}`;
    let from = 0;
    const lower = text.toLowerCase();
    const needle = labeled.toLowerCase();
    while (from < text.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      hits.push({
        start: idx,
        end: idx + labeled.length,
        label: entry.label,
        url: entry.url,
      });
      from = idx + labeled.length;
    }
  }

  for (const entry of MUSIC_RESOURCE_LINKS) {
    let from = 0;
    const lower = text.toLowerCase();
    const needle = entry.url.toLowerCase();
    while (from < text.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      const overlaps = hits.some((h) => idx < h.end && idx + entry.url.length > h.start);
      if (!overlaps) {
        hits.push({
          start: idx,
          end: idx + entry.url.length,
          label: entry.url,
          url: entry.url,
        });
      }
      from = idx + entry.url.length;
    }
  }

  for (const entry of MUSIC_RESOURCE_LINKS) {
    const re = new RegExp(`(?<![\\w/])${escapeRegExp(entry.label)}(?![\\w])`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = hits.some((h) => start < h.end && end > h.start);
      if (!overlaps) {
        hits.push({ start, end, label: entry.label, url: entry.url });
      }
    }
  }

  // Generic http(s) URLs not already covered.
  const urlRe = /https?:\/\/[^\s<>"')\]]+/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRe.exec(text)) !== null) {
    const start = urlMatch.index;
    const end = start + urlMatch[0].length;
    const overlaps = hits.some((h) => start < h.end && end > h.start);
    if (!overlaps) {
      hits.push({ start, end, label: urlMatch[0], url: urlMatch[0] });
    }
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const parts: MailTextPart[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    if (hit.start > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, hit.start) });
    }
    parts.push({ type: "link", label: hit.label, url: hit.url });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    parts.push({ type: "text", value: text.slice(cursor) });
  }
  return parts;
}
