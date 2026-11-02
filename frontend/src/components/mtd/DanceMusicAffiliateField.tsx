"use client";

import clsx from "clsx";
import {
  DANCE_MUSIC_AFFILIATE_OPTIONS,
  formatDanceMusicAffiliates,
  normalizeDanceMusicAffiliates,
  parseDanceMusicAffiliates,
  toggleDanceMusicAffiliate,
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
  const selected = normalizeDanceMusicAffiliates(
    parseDanceMusicAffiliates(value)
  );
  const hasNonCompliant = selected.includes("Non compliant");
  const hasCover = selected.some(
    (item) =>
      item === "Power Music Covers" || item === "Unleash the Beats Covers"
  );

  const toggle = (option: DanceMusicAffiliateOption) => {
    onChange(
      formatDanceMusicAffiliates(toggleDanceMusicAffiliate(selected, option))
    );
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-col gap-2 rounded-lg border border-brand-line/50 bg-brand-bg/40 px-3 py-2.5"
    >
      {DANCE_MUSIC_AFFILIATE_OPTIONS.map((option) => {
        const checked = selected.includes(option);
        // Covers may both be on; Non compliant is exclusive with either cover.
        const disabled =
          option === "Non compliant"
            ? hasCover && !checked
            : hasNonCompliant && !checked;
        return (
          <label
            key={option}
            className={clsx(
              "flex items-center gap-2.5 text-[13px]",
              disabled
                ? "cursor-not-allowed text-brand-ink-tertiary"
                : "cursor-pointer text-brand-ink"
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(option)}
              className={clsx(
                "h-4 w-4 rounded border-brand-line text-brand-orange",
                "focus:ring-brand-orange/40",
                disabled && "opacity-50"
              )}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}
