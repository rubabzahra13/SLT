"use client";

import { useMemo, useRef, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import {
  FIRST_AVAILABLE_LABEL,
  formatRequestedProducerDisplay,
  isFirstAvailableRequest,
  producerFirstName,
} from "@/lib/editor-assignment";
import type { Producer } from "@/types";

export { formatRequestedProducerDisplay } from "@/lib/editor-assignment";

type SoftOption = { value: string; label: string };

type RequestedProducerFieldProps = {
  value: string;
  /** Value from the order when the form was first loaded (API / original submission). */
  originalValue?: string;
  producers: Producer[];
  onChange: (value: string) => void;
};

function sameOption(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function RequestedProducerField({
  value,
  originalValue,
  producers,
  onChange,
}: RequestedProducerFieldProps) {
  const [open, setOpen] = useState(false);
  const display = formatRequestedProducerDisplay(value, producers);

  // Lock the original API/form value for this edit session so it stays in the
  // menu even after the admin switches away (can switch back).
  const originalRawRef = useRef<string | null>(null);
  if (originalRawRef.current === null) {
    originalRawRef.current = (originalValue ?? value).trim();
  }
  const originalRaw = originalRawRef.current;
  const originalDisplay = formatRequestedProducerDisplay(
    originalRaw,
    producers
  );

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: SoftOption[] = [
      { value: FIRST_AVAILABLE_LABEL, label: FIRST_AVAILABLE_LABEL },
    ];
    seen.add(FIRST_AVAILABLE_LABEL.toLowerCase());

    const pushUnique = (opt: SoftOption) => {
      const key = opt.label.trim().toLowerCase();
      const valueKey = opt.value.trim().toLowerCase();
      if (!key || seen.has(key) || seen.has(valueKey)) return;
      seen.add(key);
      seen.add(valueKey);
      list.push(opt);
    };

    // Keep the original form/API value near the top so it can be restored.
    if (originalRaw && !isFirstAvailableRequest(originalRaw)) {
      pushUnique({
        value: originalRaw,
        label: originalDisplay || originalRaw,
      });
    }

    for (const producer of producers) {
      const first = producerFirstName(producer);
      if (!first) continue;
      pushUnique({ value: first, label: first });
    }

    // Current draft value if it isn't already represented.
    if (value.trim() && !isFirstAvailableRequest(value)) {
      pushUnique({
        value: value.trim(),
        label: display || value.trim(),
      });
    }

    return list;
  }, [producers, display, value, originalRaw, originalDisplay]);

  const selectValue = (() => {
    if (isFirstAvailableRequest(value)) return FIRST_AVAILABLE_LABEL;
    if (originalRaw && sameOption(value, originalRaw)) return originalRaw;
    const byLabel = options.find((opt) => sameOption(opt.label, display));
    if (byLabel) return byLabel.value;
    const byValue = options.find((opt) => sameOption(opt.value, value));
    if (byValue) return byValue.value;
    return display;
  })();

  return (
    <SoftSelect
      aria-label="Requested producer"
      size="md"
      searchable
      searchPlaceholder="Search producers…"
      placeholder="Select…"
      placement="below"
      value={selectValue}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        if (next === FIRST_AVAILABLE_LABEL || isFirstAvailableRequest(next)) {
          onChange(FIRST_AVAILABLE_LABEL);
        } else if (originalRaw && sameOption(next, originalRaw)) {
          onChange(originalRaw);
        } else {
          const matched = producers.find(
            (p) =>
              producerFirstName(p).toLowerCase() === next.trim().toLowerCase()
          );
          onChange(matched ? producerFirstName(matched) : next);
        }
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
