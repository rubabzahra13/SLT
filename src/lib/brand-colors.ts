/** Shared SLT brand palette — blue-led with orange as secondary accent */
export const BRAND_BLUE = "#52c8ee";
export const BRAND_ORANGE = "#f07840";

export const CHART_SEGMENT_COLORS = [
  BRAND_BLUE,
  BRAND_ORANGE,
  "#7ad8f7",
  "#3a9ec4",
  "#8b939e",
  "#6b7a8a",
] as const;

export function chartSegmentColor(index: number): string {
  return CHART_SEGMENT_COLORS[index % CHART_SEGMENT_COLORS.length];
}

export type BrandAccent = "blue" | "orange";
