/**
 * Authoritative producer colors mapping supplied by the client.
 * Enforced centrally across the application.
 */
export const PRODUCER_COLORS: Record<string, string> = {
  CM: "#ed7d31",
  MS: "#0a0c10",
  NC: "#c00000",
  BV: "#002060",
  MT: "#bf8f00",
  JB: "#548235",
  MM: "#ffc000",
  SS: "#0000ff",
  AJ: "#00b0f0",
  LV: "#ff00ff",
  JM: "#00ff00",
  SV: "#0070c0",
  RF: "#edbcfc",
  JOP: "#cc4125",
  JD: "#cc66ff",
  CC: "#008080",
  GP: "#00b050",
  // Legacy / fallback seed initials
  JP: "#7c3aed",
  R: "#e11d48",
  G: "#059669",
};

/** Blend a hex color with alpha for card surfaces and borders. */
export function hexAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getProducerColor(initialsOrName?: string | null): string {
  if (!initialsOrName) return "#ed7d31";
  const key = initialsOrName.toUpperCase().trim();
  if (PRODUCER_COLORS[key]) {
    return PRODUCER_COLORS[key];
  }

  // Handle names like "Casey" -> "CM"
  const firstName = initialsOrName.toLowerCase().trim().split(/\s+/)[0];
  const nameMap: Record<string, string> = {
    casey: "CM",
    matt: "MS",
    nate: "NC",
    mark: "MM",
    brent: "BV",
    shelley: "SS",
    autumn: "AJ",
    logan: "LV",
    rory: "RF",
    jackie: "JM",
    joseph: "JOP",
    griffin: "GP",
    justin: "JD",
    jacob: "JP",
    max: "MT",
    cory: "CC",
    jared: "JB",
    riley: "R",
  };

  if (nameMap[firstName] && PRODUCER_COLORS[nameMap[firstName]]) {
    return PRODUCER_COLORS[nameMap[firstName]];
  }

  return "#ed7d31";
}

export type ProducerAvatarOption = {
  id: string;
  label: string;
  src: string;
};

/** Curated avatar swatches for the producer color picker. */
export const PRODUCER_COLOR_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#0F172A", label: "Ink" },
  { hex: "#334155", label: "Slate" },
  { hex: "#64748B", label: "Steel" },
  { hex: "#94A3B8", label: "Mist" },
  { hex: "#DC2626", label: "Red" },
  { hex: "#C00000", label: "Crimson" },
  { hex: "#EA580C", label: "Ember" },
  { hex: "#ED7D31", label: "Orange" },
  { hex: "#D97706", label: "Amber" },
  { hex: "#CA8A04", label: "Gold" },
  { hex: "#BF8F00", label: "Brass" },
  { hex: "#FFC000", label: "Sun" },
  { hex: "#16A34A", label: "Green" },
  { hex: "#059669", label: "Emerald" },
  { hex: "#00B050", label: "Leaf" },
  { hex: "#548235", label: "Forest" },
  { hex: "#0D9488", label: "Teal" },
  { hex: "#008080", label: "Sea" },
  { hex: "#0891B2", label: "Cyan" },
  { hex: "#0EA5E9", label: "Sky" },
  { hex: "#00B0F0", label: "Azure" },
  { hex: "#2563EB", label: "Blue" },
  { hex: "#0070C0", label: "Ocean" },
  { hex: "#002060", label: "Navy" },
  { hex: "#4F46E5", label: "Indigo" },
  { hex: "#7C3AED", label: "Violet" },
  { hex: "#CC66FF", label: "Orchid" },
  { hex: "#DB2777", label: "Rose" },
  { hex: "#E11D48", label: "Berry" },
  { hex: "#FF00FF", label: "Magenta" },
  { hex: "#EDBCFC", label: "Lilac" },
  { hex: "#CC4125", label: "Rust" },
];

/** Hex color options for the producer avatar picker (unique palette values). */
export const PRODUCER_COLOR_OPTIONS: string[] = Array.from(
  new Set([
    ...PRODUCER_COLOR_SWATCHES.map((swatch) => swatch.hex),
    ...Object.values(PRODUCER_COLORS),
  ])
);

export const PRODUCER_AVATARS: ProducerAvatarOption[] = PRODUCER_COLOR_OPTIONS.map(
  (hex, index) => ({
    id: `ava-${index + 1}`,
    label: hex,
    src: hex,
  })
);

export function producerColorLabel(hex: string): string {
  const match = PRODUCER_COLOR_SWATCHES.find(
    (swatch) => swatch.hex.toLowerCase() === hex.trim().toLowerCase()
  );
  return match?.label ?? hex.toUpperCase();
}

/** True when a hex background needs a dark checkmark for contrast. */
export function isLightProducerColor(hex: string): boolean {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return false;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 >= 160;
}

export function isProducerColorHex(value?: string | null): boolean {
  if (!value) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

export function resolveProducerColor(
  initialsOrName?: string | null,
  preferred?: string | null
): string {
  if (isProducerColorHex(preferred)) return preferred!.trim();
  return getProducerColor(initialsOrName);
}

export function defaultAvatarSrc(): string {
  return "#ed7d31";
}
