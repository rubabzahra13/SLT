/** Shared SLT brand palette — blue-led with orange as secondary accent */
export const BRAND_BLUE = "#52c8ee";
export const BRAND_ORANGE = "#f07840";

/** Sidebar-aligned deep tones */
export const BRAND_CHARCOAL = "#0c0f14";
export const BRAND_CHARCOAL_ELEVATED = "#141820";
export const BRAND_CHARCOAL_MID = "#1a2430";
export const BRAND_SIGNATURE = "#1f8fb3";
export const BRAND_BLUE_DEEP = "#2a8fb0";
export const BRAND_ORANGE_DEEP = "#c45528";

export const CHART_SEGMENT_COLORS = [
  BRAND_SIGNATURE,
  BRAND_BLUE,
  BRAND_BLUE_DEEP,
  BRAND_CHARCOAL_MID,
  BRAND_ORANGE,
] as const;

export function chartSegmentColor(index: number): string {
  return CHART_SEGMENT_COLORS[index % CHART_SEGMENT_COLORS.length];
}

/** Gradient stops keyed by brand color — aligned with sidebar accents */
export const CHART_GRADIENTS: Record<string, [string, string]> = {
  "#0c0f14": ["#1a2430", "#0c0f14"],
  "#141820": ["#1f2430", "#141820"],
  "#1a2430": ["#2a8fb0", "#1a2430"],
  "#1f8fb3": ["#52c8ee", "#1f8fb3"],
  "#52c8ee": ["#7ad8f7", "#2a8fb0"],
  "#2a8fb0": ["#52c8ee", "#1f8fb3"],
  "#f07840": ["#f9a03f", "#e0652e"],
  "#c45528": ["#f07840", "#c45528"],
  "#059669": ["#34d399", "#059669"],
  "#6b7280": ["#aab2bd", "#6b7280"],
};

export function chartGradientStops(color: string): [string, string] {
  return CHART_GRADIENTS[color.toLowerCase()] ?? [color, color];
}

/** CSS linear-gradient string for a base brand color (for div bars). */
export function chartGradient(color: string, angle = 135): string {
  const [from, to] = chartGradientStops(color);
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

export type BrandAccent = "blue" | "orange";
