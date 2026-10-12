"use client";

import clsx from "clsx";

/** POM / dance customer-form affiliate checkboxes. */
export const DANCE_MUSIC_AFFILIATE_OPTIONS = [
  "Power Music Covers",
  "Unleash the Beats Covers",
  "Non compliant",
] as const;

export type DanceMusicAffiliateOption =
  (typeof DANCE_MUSIC_AFFILIATE_OPTIONS)[number];

function splitSelections(raw: string): string[] {
  return raw
    .split(/[,;/|]+|\s+&\s+|\s+\+\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseDanceMusicAffiliates(value: string): string[] {
  const parts = splitSelections(value || "");
  const selected: string[] = [];
  for (const opt of DANCE_MUSIC_AFFILIATE_OPTIONS) {
    const hit = parts.some((part) => {
      const lower = part.toLowerCase();
      const optLower = opt.toLowerCase();
      if (lower === optLower) return true;
      if (opt === "Non compliant" && /non[\s-]?compliant/i.test(part)) {
        return true;
      }
      if (
        opt === "Power Music Covers" &&
        /power\s*music\s*covers?/i.test(part)
      ) {
        return true;
      }
      if (
        opt === "Unleash the Beats Covers" &&
        /unleash.*covers?/i.test(part)
      ) {
        return true;
      }
      return false;
    });
    if (hit) selected.push(opt);
  }
  return selected;
}

export function formatDanceMusicAffiliates(selected: string[]): string {
  return selected.join(", ");
}

type DanceMusicAffiliateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function DanceMusicAffiliateField({
  value,
  onChange,
  "aria-label": ariaLabel = "Music Affiliate",
}: DanceMusicAffiliateFieldProps) {
  const selected = parseDanceMusicAffiliates(value);

  const toggle = (option: DanceMusicAffiliateOption) => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(formatDanceMusicAffiliates(next));
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-col gap-2 rounded-lg border border-brand-line/50 bg-brand-bg/40 px-3 py-2.5"
    >
      {DANCE_MUSIC_AFFILIATE_OPTIONS.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2.5 text-[13px] text-brand-ink"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(option)}
              className={clsx(
                "h-4 w-4 rounded border-brand-line text-brand-orange",
                "focus:ring-brand-orange/40"
              )}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}
