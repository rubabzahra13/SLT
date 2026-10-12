"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

export const SPLIT_OR_NO_SPLIT_OPTIONS = ["Split", "No Split"] as const;

export function normalizeSplitOrNoSplit(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "split" || lower.startsWith("split")) return "Split";
  if (lower.includes("no")) return "No Split";
  return raw;
}

type SplitOrNoSplitFieldProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function SplitOrNoSplitField({
  value,
  onChange,
  "aria-label": ariaLabel = "Split or No Split",
}: SplitOrNoSplitFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeSplitOrNoSplit(value);
  const options = useMemo(() => {
    const base = SPLIT_OR_NO_SPLIT_OPTIONS.map((opt) => ({
      value: opt,
      label: opt,
    }));
    if (
      normalized &&
      !SPLIT_OR_NO_SPLIT_OPTIONS.includes(
        normalized as (typeof SPLIT_OR_NO_SPLIT_OPTIONS)[number]
      )
    ) {
      return [{ value: normalized, label: normalized }, ...base];
    }
    return base;
  }, [normalized]);

  return (
    <SoftSelect
      aria-label={ariaLabel}
      size="md"
      placeholder="Select…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeSplitOrNoSplit(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
