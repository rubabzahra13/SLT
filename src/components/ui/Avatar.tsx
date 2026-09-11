"use client";

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
  ring?: boolean;
  className?: string;
};

const sizeMap: Record<AvatarSize, { box: string; font: string }> = {
  xs: { box: "h-6 w-6 min-w-[24px]", font: "text-[10px]" },
  sm: { box: "h-8 w-8 min-w-[32px]", font: "text-[11px]" },
  md: { box: "h-10 w-10 min-w-[40px]", font: "text-[13px]" },
  lg: { box: "h-[52px] w-[52px] min-w-[52px]", font: "text-[15px]" },
  xl: { box: "h-16 w-16 min-w-[64px]", font: "text-[18px]" },
};

function resolveInitials(
  producer?: Producer | null,
  initials?: string | null,
  name?: string | null,
  alt?: string | null,
  src?: string | null
): string {
  if (initials) return initials.trim().toUpperCase();
  if (producer?.initials) return producer.initials.trim().toUpperCase();

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

export function Avatar({
  producer,
  initials,
  name,
  color,
  src,
  alt,
  size = "md",
  ring,
  className,
}: AvatarProps) {
  const displayInitials = resolveInitials(producer, initials, name, alt, src);
  const bgColor = color || producer?.color || getProducerColor(displayInitials);
  const { box, font } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={clsx(
        "shrink-0 select-none overflow-hidden rounded-full font-bold flex items-center justify-center shadow-xs transition-transform",
        box,
        ring && "ring-2 ring-brand-line ring-offset-2 ring-offset-brand-surface",
        className
      )}
      style={{ backgroundColor: bgColor }}
      title={name || alt || producer?.name || displayInitials}
    >
      <span
        className={clsx("leading-none font-extrabold tracking-tight text-white", font)}
        style={{
          textShadow:
            "0 1px 2px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.85)",
        }}
      >
        {displayInitials}
      </span>
    </div>
  );
}
