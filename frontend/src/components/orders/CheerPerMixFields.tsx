"use client";

import type { ReactNode } from "react";
import {
  formatRequestedProducerDisplay,
  RequestedProducerField,
} from "@/components/mtd/RequestedProducerField";
import {
  PackageTypeField,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import { MixLengthField } from "@/components/mtd/MixLengthField";
import {
  DanceStyleField,
  normalizeDanceStyle,
} from "@/components/mtd/DanceStyleField";
import {
  GamedayStyleField,
  normalizeGamedayStyle,
} from "@/components/mtd/GamedayStyleField";
import {
  DetailInput,
  DetailTextarea,
  InlineDateInput,
} from "@/components/mtd/InlineFields";
import { getAddOrderMultiMixFields } from "@/lib/add-order-mixes";
import { rawFieldValue } from "@/lib/order-detail-fields";
import type { Order, Producer } from "@/types";

type CheerPerMixFieldsProps = {
  order: Order;
  /** Per-mix overlay values. */
  mix: Partial<Order>;
  producers: Producer[];
  editable?: boolean;
  onChange: (key: string, value: string) => void;
};

function FieldShell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className || "flex min-w-0 flex-col"}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * Add Order multi-mix slot fields (cheer or dance) — only keys already on
 * the active form subtype, rendered inside one Mix Information section.
 */
export function CheerPerMixFields({
  order,
  mix,
  producers,
  editable = true,
  onChange,
}: CheerPerMixFieldsProps) {
  const display = { ...order, ...mix } as Order;
  const fields = getAddOrderMultiMixFields(order);

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => {
        const raw = rawFieldValue(display, field.key);

        if (field.key === "teamName") {
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <DetailInput
                  value={raw}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">{raw || "—"}</p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "division") {
          return (
            <FieldShell
              key={field.key}
              label={field.label}
              className="flex min-w-0 flex-col sm:col-span-2 lg:col-span-3"
            >
              {editable ? (
                <DetailTextarea
                  value={raw}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="whitespace-pre-wrap text-[13px] text-brand-ink">
                  {raw || "—"}
                </p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "style") {
          const styleVariant =
            display.danceFormSubtype === "jazz-kick" ? "jazz-kick" : "tpv";
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <DanceStyleField
                  value={normalizeDanceStyle(raw, styleVariant) || raw}
                  variant={styleVariant}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">
                  {normalizeDanceStyle(raw, styleVariant) || raw || "—"}
                </p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "styleOfGamedayMix") {
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <GamedayStyleField
                  value={normalizeGamedayStyle(raw) || raw}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">
                  {normalizeGamedayStyle(raw) || raw || "—"}
                </p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "requestedEditor") {
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <RequestedProducerField
                  value={raw || "First Available"}
                  producers={producers}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">
                  {formatRequestedProducerDisplay(raw) || "—"}
                </p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "packageType") {
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <PackageTypeField
                  value={raw}
                  formType={display.formType || "school-all-star-cheer"}
                  cheerSubtype={display.cheerFormSubtype}
                  danceSubtype={display.danceFormSubtype}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">
                  {packageTypeDisplayValue(raw) || "—"}
                </p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "timeLengthOfMix") {
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <MixLengthField
                  value={raw}
                  formType={display.formType || "school-all-star-cheer"}
                  cheerSubtype={display.cheerFormSubtype}
                  danceSubtype={display.danceFormSubtype}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">{raw || "—"}</p>
              )}
            </FieldShell>
          );
        }

        if (field.key === "mixEndDate") {
          return (
            <FieldShell key={field.key} label={field.label}>
              {editable ? (
                <InlineDateInput
                  value={raw}
                  onChange={(value) => onChange(field.key, value)}
                />
              ) : (
                <p className="text-[13px] text-brand-ink">{raw || "—"}</p>
              )}
            </FieldShell>
          );
        }

        return null;
      })}
    </div>
  );
}
