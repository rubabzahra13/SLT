"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

/** Gameday customer-form "Style of Gameday Mix" SoftSelect options. */
export const GAMEDAY_STYLE_OPTIONS = [
  "Pom",
  "Hip Hop",
  "Jazz",
  "Kick",
  "Cheer",
] as const;

export function normalizeGamedayStyle(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const exact = GAMEDAY_STYLE_OPTIONS.find(
    (opt) => opt.toLowerCase() === raw.toLowerCase()
  );
  if (exact) return exact;
  const lower = raw.toLowerCase();
  if (lower.includes("hip")) return "Hip Hop";
  if (lower.includes("jazz")) return "Jazz";
  if (lower.includes("kick")) return "Kick";
  if (lower.includes("cheer")) return "Cheer";
  if (lower.includes("pom")) return "Pom";
  return raw;
}

type GamedayStyleFieldProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function GamedayStyleField({
  value,
  onChange,
  "aria-label": ariaLabel = "Style of Gameday Mix",
}: GamedayStyleFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeGamedayStyle(value);
  const options = useMemo(() => {
    const base = GAMEDAY_STYLE_OPTIONS.map((opt) => ({
      value: opt,
      label: opt,
    }));
    if (
      normalized &&
      !GAMEDAY_STYLE_OPTIONS.some((opt) => opt === normalized)
    ) {
      return [{ value: normalized, label: normalized }, ...base];
    }
    return base;
  }, [normalized]);

  return (
    <SoftSelect
      aria-label={ariaLabel}
      size="md"
      placeholder="Select style…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeGamedayStyle(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
