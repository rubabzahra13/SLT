"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import {
  countrySelectOptions,
  normalizeCountryName,
} from "@/lib/countries";

type CountryFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CountryField({ value, onChange }: CountryFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeCountryName(value);
  const options = useMemo(
    () => countrySelectOptions(normalized || value),
    [normalized, value]
  );

  return (
    <SoftSelect
      aria-label="Country"
      size="md"
      searchable
      searchPlaceholder="Search countries…"
      placeholder="Select country…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeCountryName(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
