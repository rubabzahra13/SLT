"use client";

import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { DANCE_FORM_SUBTABS, type DanceFormSubtype } from "@/types";

type OrderDanceSubTabsProps = {
  subtype: DanceFormSubtype;
  onChange: (subtype: DanceFormSubtype) => void;
  counts: Record<DanceFormSubtype, number>;
};

export function OrderDanceSubTabs({ subtype, onChange, counts }: OrderDanceSubTabsProps) {
  const teamPerfActive =
    subtype === "team-performance-variety" ||
    subtype === "gameday" ||
    subtype === "jazz-kick";

  const teamPerfTotal =
    (counts["team-performance-variety"] ?? 0) +
    (counts.gameday ?? 0) +
    (counts["jazz-kick"] ?? 0);

  return (
    <DottedScroll
      orientation="horizontal"
      className="border-b border-brand-line bg-brand-bg/20"
      scrollClassName="overflow-x-scroll scrollbar-hide"
      indicatorPlacement="below"
      contentClassName="flex w-max min-w-full px-4 py-2"
    >
      <nav className="flex gap-1" aria-label="Dance form types">
        <button
          type="button"
          onClick={() => onChange("pom")}
          className={clsx(
            "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            subtype === "pom"
              ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
              : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"
          )}
        >
          POM
          <span className="ml-1 tabular-nums text-brand-ink-tertiary">{counts.pom ?? 0}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("hip-hop")}
          className={clsx(
            "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            subtype === "hip-hop"
              ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
              : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"
          )}
        >
          Hip Hop
          <span className="ml-1 tabular-nums text-brand-ink-tertiary">{counts["hip-hop"] ?? 0}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-brand-surface/80 p-0.5 ring-1 ring-brand-line">
          <button
            type="button"
            onClick={() => onChange("team-performance-variety")}
            className={clsx(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              teamPerfActive
                ? "text-brand-ink-secondary"
                : "text-brand-ink-tertiary hover:text-brand-ink-secondary"
            )}
          >
            Team Performance & Variety
            <span className="ml-1 tabular-nums">{teamPerfTotal}</span>
          </button>
          <span className="text-brand-line-strong">|</span>
          <button
            type="button"
            onClick={() => onChange("team-performance-variety")}
            className={clsx(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              subtype === "team-performance-variety"
                ? "bg-brand-accent text-white"
                : "text-brand-ink-secondary hover:bg-brand-bg"
            )}
          >
            General
            <span
              className={clsx(
                "ml-1 tabular-nums",
                subtype === "team-performance-variety"
                  ? "text-white/80"
                  : "text-brand-ink-tertiary"
              )}
            >
              {counts["team-performance-variety"] ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange("gameday")}
            className={clsx(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              subtype === "gameday"
                ? "bg-brand-accent text-white"
                : "text-brand-ink-secondary hover:bg-brand-bg"
            )}
          >
            Gameday
            <span
              className={clsx(
                "ml-1 tabular-nums",
                subtype === "gameday" ? "text-white/80" : "text-brand-ink-tertiary"
              )}
            >
              {counts.gameday ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange("jazz-kick")}
            className={clsx(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              subtype === "jazz-kick"
                ? "bg-brand-accent text-white"
                : "text-brand-ink-secondary hover:bg-brand-bg"
            )}
          >
            Jazz/Kick
            <span
              className={clsx(
                "ml-1 tabular-nums",
                subtype === "jazz-kick" ? "text-white/80" : "text-brand-ink-tertiary"
              )}
            >
              {counts["jazz-kick"] ?? 0}
            </span>
          </button>
        </div>
      </nav>
    </DottedScroll>
  );
}

export { DANCE_FORM_SUBTABS };
