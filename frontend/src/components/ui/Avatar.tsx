"use client";

import type { CSSProperties } from "react";
import clsx from "clsx";
import { getProducerColor } from "@/lib/producer-avatars";
import { CANONICAL_PRODUCER_NAMES } from "@/lib/producers";
import type { Producer } from "@/types";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AvatarProps = {
  producer?: Producer | null;
  initials?: string | null;
  name?: string | null;
  color?: string | null;
  src?: string | null;
  alt?: string | null;
  size?: AvatarSize;
  /** @deprecated Gradient ring is always shown for UI consistency. */
  ring?: boolean;
  className?: string;
};

const sizeMap: Record<
  AvatarSize,
  { box: string; font: string; ring: string; gap: string }
> = {
  xs: {
    box: "h-6 w-6 min-w-[24px]",
    font: "text-[9px]",
    ring: "p-[1.5px]",
    gap: "p-px",
  },
  sm: {
    box: "h-8 w-8 min-w-[32px]",
    font: "text-[10px]",
    ring: "p-[1.5px]",
    gap: "p-px",
  },
  md: {
    box: "h-10 w-10 min-w-[40px]",
    font: "text-[12px]",
    ring: "p-[2px]",
    gap: "p-0.5",
  },
  lg: {
    box: "h-[52px] w-[52px] min-w-[52px]",
    font: "text-[14px]",
    ring: "p-[2px]",
    gap: "p-0.5",
  },
  xl: {
    box: "h-16 w-16 min-w-[64px]",
    font: "text-[16px]",
    ring: "p-[2.5px]",
    gap: "p-[3px]",
  },
};

function resolveInitials(
  producer?: Producer | null,
  initials?: string | null,
  name?: string | null,
  alt?: string | null,
  src?: string | null
): string {
  // Prefer live roster data when the producer was resolved — assignment keys on
  // Orders/MTD/Payroll rows can lag after an edit.
  if (producer?.initials?.trim()) {
    return producer.initials.trim().toUpperCase();
  }

  if (initials) return initials.trim().toUpperCase();

  const searchName = (name || alt || producer?.name || "").trim();
  if (searchName) {
    const firstWord = searchName.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && CANONICAL_PRODUCER_NAMES[firstWord]) {
      return CANONICAL_PRODUCER_NAMES[firstWord];
    }
    const parts = searchName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 3).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  if (src) {
    const match = src.match(/seed=([^&]+)/i);
    if (match) {
      const seed = decodeURIComponent(match[1]).toLowerCase();
      if (CANONICAL_PRODUCER_NAMES[seed]) {
        return CANONICAL_PRODUCER_NAMES[seed];
      }
      return seed.slice(0, 3).toUpperCase();
    }
  }

  return "??";
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function mixHex(hex: string, target: "#ffffff" | "#000000", amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const tr = target === "#ffffff" ? 255 : 0;
  const tg = target === "#ffffff" ? 255 : 0;
  const tb = target === "#ffffff" ? 255 : 0;
  const nr = Math.round(rgb.r + (tr - rgb.r) * amount);
  const ng = Math.round(rgb.g + (tg - rgb.g) * amount);
  const nb = Math.round(rgb.b + (tb - rgb.b) * amount);
  return `#${[nr, ng, nb].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Shift hue slightly so the ring reads as a multi-stop gradient, not a flat tint. */
function shiftHue(hex: string, degrees: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  h = (h + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(42, 143, 176, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function avatarFillStyle(baseColor: string): CSSProperties {
  const light = mixHex(baseColor, "#ffffff", 0.28);
  const deep = mixHex(baseColor, "#000000", 0.22);
  return {
    background: `radial-gradient(circle at 32% 28%, ${light} 0%, ${baseColor} 48%, ${deep} 100%)`,
    boxShadow:
      "inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -1px 2px rgba(0,0,0,0.18)",
  };
}

function contrastAccent(baseColor: string): string {
  // Complementary hue for a single punchy contrast stop in the ring.
  return mixHex(shiftHue(baseColor, 180), "#ffffff", 0.12);
}

function avatarRingStyle(baseColor: string): CSSProperties {
  const soft = mixHex(baseColor, "#ffffff", 0.35);
  const deep = mixHex(baseColor, "#000000", 0.28);
  const warm = mixHex(shiftHue(baseColor, 28), "#ffffff", 0.08);
  const contrast = contrastAccent(baseColor);
  return {
    background: `conic-gradient(from 210deg, ${soft} 0deg, ${baseColor} 75deg, ${warm} 130deg, ${contrast} 195deg, ${deep} 270deg, ${soft} 360deg)`,
    boxShadow: `0 0 0 1px ${rgbaFromHex(baseColor, 0.08)}, 0 6px 16px ${rgbaFromHex(baseColor, 0.22)}`,
  };
}

export function Avatar({
  producer,
  initials,
  name,
  color,
  src,
  alt,
  size = "md",
  className,
}: AvatarProps) {
  const displayInitials = resolveInitials(producer, initials, name, alt, src);
  const bgColor = color || producer?.color || getProducerColor(displayInitials);
  const { box, font, ring, gap } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={clsx(
        "avatar-gradient-ring shrink-0 rounded-full",
        ring,
        className
      )}
      style={avatarRingStyle(bgColor)}
      title={name || alt || producer?.name || displayInitials}
    >
      <div
        className={clsx(
          "avatar-gradient-ring-inner rounded-full bg-white",
          gap
        )}
      >
        <div
          className={clsx(
            "avatar-fill relative flex select-none items-center justify-center overflow-hidden rounded-full",
            box
          )}
          style={avatarFillStyle(bgColor)}
        >
          <span
            className={clsx(
              "avatar-initials relative z-[1] uppercase leading-none",
              font,
              displayInitials.length >= 3 && "tracking-normal"
            )}
          >
            {displayInitials}
          </span>
        </div>
      </div>
    </div>
  );
}
