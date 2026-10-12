"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

const YES_NO_OPTIONS = ["Yes", "No"] as const;

export function normalizeYesNo(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "y" || lower.startsWith("yes")) return "Yes";
  if (lower === "n" || lower.startsWith("no")) return "No";
  return raw;
}

type YesNoFieldProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function YesNoField({
  value,
  onChange,
  "aria-label": ariaLabel = "Yes or No",
}: YesNoFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeYesNo(value);
  const options = useMemo(
    () => YES_NO_OPTIONS.map((opt) => ({ value: opt, label: opt })),
    []
  );

  return (
    <SoftSelect
      aria-label={ariaLabel}
      size="md"
      placeholder="Select…"
      placement="below"
      value={normalized}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeYesNo(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
