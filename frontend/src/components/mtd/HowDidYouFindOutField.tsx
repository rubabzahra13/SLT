"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

export const HOW_DID_YOU_FIND_OUT_OPTIONS = [
  "Return Customer",
  "Word of Mouth",
  "Google Search",
  "Social Media",
  "Let's Talk Cheer Podcast",
  "Other",
] as const;

type HowDidYouFindOutOption = (typeof HOW_DID_YOU_FIND_OUT_OPTIONS)[number];

export function normalizeHowDidYouFindOut(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const lower = raw.toLowerCase();
  for (const opt of HOW_DID_YOU_FIND_OUT_OPTIONS) {
    if (opt.toLowerCase() === lower) return opt;
  }
  if (lower.includes("return")) return "Return Customer";
  if (lower.includes("word of mouth") || lower === "wom") return "Word of Mouth";
  if (lower.includes("google")) return "Google Search";
  if (lower.includes("social")) return "Social Media";
  if (lower.includes("podcast") || lower.includes("let's talk")) {
    return "Let's Talk Cheer Podcast";
  }
  if (lower === "other" || lower.startsWith("other")) return "Other";
  return raw;
}

type HowDidYouFindOutFieldProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function HowDidYouFindOutField({
  value,
  onChange,
  "aria-label": ariaLabel = "How did you find out about Sounds Like That?",
}: HowDidYouFindOutFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeHowDidYouFindOut(value);
  const options = useMemo(() => {
    const base = HOW_DID_YOU_FIND_OUT_OPTIONS.map((opt) => ({
      value: opt,
      label: opt,
    }));
    if (
      normalized &&
      !HOW_DID_YOU_FIND_OUT_OPTIONS.includes(
        normalized as HowDidYouFindOutOption
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
        onChange(normalizeHowDidYouFindOut(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
