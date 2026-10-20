"use client";

import clsx from "clsx";
import {
  DANCE_MUSIC_AFFILIATE_OPTIONS,
  formatDanceMusicAffiliates,
  parseDanceMusicAffiliates,
  type DanceMusicAffiliateOption,
} from "@/lib/dance-music-affiliate";

export {
  DANCE_MUSIC_AFFILIATE_OPTIONS,
  formatDanceMusicAffiliates,
  parseDanceMusicAffiliates,
  type DanceMusicAffiliateOption,
};

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
