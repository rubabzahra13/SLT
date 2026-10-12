"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

export const TEAM_COED_OPTIONS = ["Coed", "All-Girl"] as const;

export function normalizeTeamCoedAllGirl(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("coed")) return "Coed";
  if (lower.includes("girl")) return "All-Girl";
  return raw;
}

type TeamCoedFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TeamCoedField({ value, onChange }: TeamCoedFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeTeamCoedAllGirl(value);
  const options = useMemo(() => {
    const base = TEAM_COED_OPTIONS.map((opt) => ({ value: opt, label: opt }));
    if (normalized && !TEAM_COED_OPTIONS.includes(normalized as (typeof TEAM_COED_OPTIONS)[number])) {
      return [{ value: normalized, label: normalized }, ...base];
    }
    return base;
  }, [normalized]);

  return (
    <SoftSelect
      aria-label="My team is"
      size="md"
      placeholder="Select…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeTeamCoedAllGirl(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
