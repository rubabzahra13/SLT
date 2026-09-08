"use client";

import { useEffect, useState } from "react";
import { DollarSign, Info, Sparkles, Tag, X } from "lucide-react";
import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { formatPrice } from "@/lib/data";
import {
  ALL_STAR_CHEER_RATE_CARD,
  SCHOOL_CHEER_RATE_CARD,
  YOUTH_REC_CHEER_RATE_CARD,
  POM_RATE_CARD,
  HIP_HOP_RATE_CARD,
  TEAM_PERFORMANCE_VARIETY_RATE_CARD,
  GAMEDAY_RATE_CARD,
  JAZZ_KICK_RATE_CARD,
  MARCHING_BAND_RATE_CARD,
  SPORTS_ENTERTAINMENT_RATE_CARD,
  SCHOOL_ANTHEM_RATE_CARD,
} from "@/lib/pricing-engine";
import type { MTDRecord, Order } from "@/types";

export type CategoryKey =
  | "All-Star Cheer"
  | "School Cheer"
  | "Youth Rec Cheer"
  | "Pom"
  | "Hip Hop"
  | "Team Performance & Variety"
  | "Gameday"
  | "Jazz/Kick"
  | "Marching Band"
  | "Sports Entertainment"
  | "School Anthems";

export type SchoolCheerSubtypeKey = "school-cheer-viroc-yes" | "school-cheer-viroc-no";

export type AddOnItem = {
  name: string;
  price: string;
  note?: string;
};

export type CategoryConfig = {
  key: CategoryKey;
  label: string;
  hasSubtypes: boolean;
  hasTierTimeDimension: boolean;
  addOns: AddOnItem[];
};

const CATEGORIES: CategoryConfig[] = [
  {
    key: "All-Star Cheer",
    label: "All-Star Cheer",
    hasSubtypes: false,
    hasTierTimeDimension: true,
    addOns: [],
  },
  {
    key: "School Cheer",
    label: "School Cheer",
    hasSubtypes: true,
    hasTierTimeDimension: true,
    addOns: [
      {
        name: "Rally Mix",
        price: "+$350 (flat, stacks on top of any tier above)",
      },
    ],
  },
  {
    key: "Youth Rec Cheer",
    label: "Youth Rec Cheer",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Extend 2 8ct Phrase/Raps",
        price: "+$25 (flat)",
      },
      {
        name: "Processing 8ct Sheets",
        price: "+$50 (flat)",
      },
    ],
  },
  {
    key: "Pom",
    label: "Pom",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Traditional VO",
        price: "+$25 (flat)",
      },
      {
        name: "Themed VO (up to 5)",
        price: "+$75 (flat)",
      },
    ],
  },
  {
    key: "Hip Hop",
    label: "Hip Hop",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Traditional VO",
        price: "+$25 (flat)",
      },
      {
        name: "Themed VO (up to 5)",
        price: "+$75 (flat)",
      },
    ],
  },
  {
    key: "Team Performance & Variety",
    label: "Team Performance & Variety",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Traditional VO",
        price: "+$25 (flat)",
      },
      {
        name: "Themed VO (up to 5)",
        price: "+$75 (flat)",
      },
    ],
  },
  {
    key: "Gameday",
    label: "Gameday",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Traditional VO",
        price: "+$25 (flat)",
      },
      {
        name: "Themed VO (up to 5)",
        price: "+$75 (flat)",
      },
    ],
  },
  {
    key: "Jazz/Kick",
    label: "Jazz/Kick",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Traditional VO",
        price: "+$25 (flat)",
      },
      {
        name: "Themed VO (up to 5)",
        price: "+$75 (flat)",
      },
    ],
  },
  {
    key: "Marching Band",
    label: "Marching Band",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Sheet Music Add",
        price: "+$50 (flat)",
      },
      {
        name: "Add Vocals",
        price: "+$75 (flat)",
      },
    ],
  },
  {
    key: "Sports Entertainment",
    label: "Sports Entertainment",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [
      {
        name: "Rush Order (needed in under 7 days)",
        price: "+$100 (flat)",
      },
    ],
  },
  {
    key: "School Anthems",
    label: "School Anthems",
    hasSubtypes: false,
    hasTierTimeDimension: false,
    addOns: [],
  },
];

export function getCategoryAndSubtypeFromContext(
  order?: Order | null,
  rec?: MTDRecord | null
): { category: CategoryKey; subtype?: SchoolCheerSubtypeKey } {
  if (order) {
    if (order.formType === "school-all-star-cheer") {
      const sub = order.cheerFormSubtype;
      if (sub === "school-cheer-viroc-yes" || sub === "school-cheer-viroc-no") {
        return { category: "School Cheer", subtype: sub };
      }
      if (sub === "youth-rec-cheer") {
        return { category: "Youth Rec Cheer" };
      }
      return { category: "All-Star Cheer" };
    }
    if (order.formType === "school-all-star-dance" || (order.formType as string) === "dance") {
      const sub = order.danceFormSubtype;
      if (sub === "pom") return { category: "Pom" };
      if (sub === "hip-hop") return { category: "Hip Hop" };
      if (sub === "team-performance-variety")
        return { category: "Team Performance & Variety" };
      if (sub === "gameday") return { category: "Gameday" };
      if (sub === "jazz-kick") return { category: "Jazz/Kick" };
      return { category: "Pom" };
    }
    if (order.formType === "marching-band") {
      return { category: "Marching Band" };
    }
    if (order.formType === "sports-entertainment") {
      return { category: "Sports Entertainment" };
    }
    if (
      order.formType === ("school-anthem" as any) ||
      (order.formType as string) === "school-anthems"
    ) {
      return { category: "School Anthems" };
    }
  }

  if (rec) {
    const recCategory = (rec.category || "").toLowerCase();
    const recPkg = (rec.package || "").toLowerCase();

    if (recCategory.includes("marching")) return { category: "Marching Band" };
    if (recCategory.includes("sports")) return { category: "Sports Entertainment" };
    if (recCategory.includes("anthem")) return { category: "School Anthems" };
    if (recCategory.includes("dance")) {
      if (recPkg.includes("pom")) return { category: "Pom" };
      if (recPkg.includes("hip hop")) return { category: "Hip Hop" };
      if (recPkg.includes("tp") || recPkg.includes("team"))
        return { category: "Team Performance & Variety" };
      if (recPkg.includes("gameday") || recPkg.includes("performance"))
        return { category: "Gameday" };
      if (recPkg.includes("jazz") || recPkg.includes("kick"))
        return { category: "Jazz/Kick" };
      return { category: "Pom" };
    }
    if (recCategory.includes("school")) {
      if (recPkg.includes("viroc no"))
        return { category: "School Cheer", subtype: "school-cheer-viroc-no" };
      return { category: "School Cheer", subtype: "school-cheer-viroc-yes" };
    }
    if (recCategory.includes("youth") || recCategory.includes("rec"))
      return { category: "Youth Rec Cheer" };
    if (recCategory.includes("cheer")) return { category: "All-Star Cheer" };
  }

  return { category: "All-Star Cheer" };
}

function getCategoryData(category: CategoryKey) {
  switch (category) {
    case "All-Star Cheer":
      return {
        type: "tier-time" as const,
        rows: ALL_STAR_CHEER_RATE_CARD.map((r) => ({
          tier: r.tier,
          limit: r.limit,
          customer: r.customer,
          compliant: r.compliant,
          nonCompliant: r.nonCompliant,
          isTitanium: r.isTitanium,
        })),
      };
    case "School Cheer":
      return {
        type: "tier-time" as const,
        rows: SCHOOL_CHEER_RATE_CARD.map((r) => ({
          tier: r.tier,
          limit: r.limit,
          customer: r.customer,
          compliant: r.compliant,
          nonCompliant: r.nonCompliant,
          isTitanium: r.isTitanium,
        })),
      };
    case "Youth Rec Cheer":
      return {
        type: "flat-package" as const,
        rows: YOUTH_REC_CHEER_RATE_CARD.map((r) => ({
          package: `${r.tier} ${r.limit}`,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: false,
          isUnpriced: false,
        })),
      };
    case "Pom":
      return {
        type: "flat-package" as const,
        rows: POM_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
          isUnpriced: false,
        })),
      };
    case "Hip Hop":
      return {
        type: "flat-package" as const,
        rows: HIP_HOP_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
          isUnpriced: false,
        })),
      };
    case "Team Performance & Variety":
      return {
        type: "flat-package" as const,
        rows: TEAM_PERFORMANCE_VARIETY_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
          isUnpriced: false,
        })),
      };
    case "Gameday":
      return {
        type: "flat-package" as const,
        rows: GAMEDAY_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
          isUnpriced: false,
        })),
      };
    case "Jazz/Kick":
      return {
        type: "flat-package" as const,
        rows: JAZZ_KICK_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
          isUnpriced: false,
        })),
      };
    case "Marching Band":
      return {
        type: "flat-package" as const,
        rows: MARCHING_BAND_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
          isUnpriced: false,
        })),
      };
    case "Sports Entertainment":
      return {
        type: "flat-package" as const,
        rows: SPORTS_ENTERTAINMENT_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer,
          compliant: r.compliant,
          nonCompliant: r.nonCompliant,
          alwaysFixedPayroll: false,
          isUnpriced: Boolean(r.isUnpriced || r.customer === null),
        })),
      };
    case "School Anthems":
      return {
        type: "flat-package" as const,
        rows: SCHOOL_ANTHEM_RATE_CARD.map((r) => ({
          package: r.package,
          customer: r.customer as number | null,
          compliant: r.compliant as number | null,
          nonCompliant: r.nonCompliant as number | null,
          alwaysFixedPayroll: true,
          isUnpriced: false,
        })),
      };
    default:
      return null;
  }
}

export function getCategoryAndSubtypeFromActiveTabFilters(
  form?: string | null,
  cheerSubtype?: string | null,
  danceSubtype?: string | null
): { category: CategoryKey; subtype?: SchoolCheerSubtypeKey } {
  if (form === "school-all-star-cheer") {
    if (cheerSubtype === "school-cheer-viroc-yes") {
      return { category: "School Cheer", subtype: "school-cheer-viroc-yes" };
    }
    if (cheerSubtype === "school-cheer-viroc-no") {
      return { category: "School Cheer", subtype: "school-cheer-viroc-no" };
    }
    if (cheerSubtype === "youth-rec-cheer") {
      return { category: "Youth Rec Cheer" };
    }
    if (cheerSubtype === "all-star-cheer") {
      return { category: "All-Star Cheer" };
    }
    return { category: "All-Star Cheer" };
  }

  if (form === "school-all-star-dance") {
    if (danceSubtype === "pom") return { category: "Pom" };
    if (danceSubtype === "hip-hop") return { category: "Hip Hop" };
    if (danceSubtype === "team-performance-variety")
      return { category: "Team Performance & Variety" };
    if (danceSubtype === "gameday") return { category: "Gameday" };
    if (danceSubtype === "jazz-kick") return { category: "Jazz/Kick" };
    return { category: "Pom" };
  }

  if (form === "marching-band") {
    return { category: "Marching Band" };
  }

  if (form === "sports-entertainment") {
    return { category: "Sports Entertainment" };
  }

  if (
    form === ("school-anthem" as any) ||
    (form as string) === "school-anthems"
  ) {
    return { category: "School Anthems" };
  }

  return { category: "All-Star Cheer" };
}

export type SetPricingModalProps = {
  open: boolean;
  prices?: Record<string, number>;
  secretMenuPrices?: any;
  onClose: () => void;
  onSave?: (prices: Record<string, number>, secretMenuPrices: any) => void;
  order?: Order | null;
  record?: MTDRecord | null;
  form?: string | null;
  cheerSubtype?: string | null;
  danceSubtype?: string | null;
  initialCategory?: CategoryKey;
  initialSubtype?: SchoolCheerSubtypeKey;
};

export function SetPricingModal({
  open,
  onClose,
  order,
  record,
  form,
  cheerSubtype,
  danceSubtype,
  initialCategory,
  initialSubtype,
}: SetPricingModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("All-Star Cheer");
  const [selectedSubtype, setSelectedSubtype] = useState<SchoolCheerSubtypeKey>(
    "school-cheer-viroc-yes"
  );

  useEffect(() => {
    if (!open) return;
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      if (initialSubtype) setSelectedSubtype(initialSubtype);
    } else if (form) {
      const ctx = getCategoryAndSubtypeFromActiveTabFilters(form, cheerSubtype, danceSubtype);
      setSelectedCategory(ctx.category);
      if (ctx.subtype) setSelectedSubtype(ctx.subtype);
    } else {
      const ctx = getCategoryAndSubtypeFromContext(order, record);
      setSelectedCategory(ctx.category);
      if (ctx.subtype) setSelectedSubtype(ctx.subtype);
    }
  }, [open, order, record, form, cheerSubtype, danceSubtype, initialCategory, initialSubtype]);

  if (!open) return null;

  const categoryConfig =
    CATEGORIES.find((c) => c.key === selectedCategory) ?? CATEGORIES[0];
  const categoryData = getCategoryData(selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim/90 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-reference-title"
        style={{ height: "80vh", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-neutral-400 bg-white shadow-2xl"
      >
        {/* Modal Header */}
        <div className="shrink-0 border-b-2 border-neutral-300 bg-neutral-100 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20">
                <DollarSign className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h2
                  id="pricing-reference-title"
                  className="text-[20px] font-bold tracking-[-0.02em] text-neutral-900"
                >
                  Pricing Reference Table
                </h2>
                <p className="text-[12px] text-neutral-600">
                  Filterable reference lookup table mirroring original client pricing sheets.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Level 1 Category Tabs */}
          <div className="mt-4">
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-600 mb-1.5">
              Order Form / Category
            </label>
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-neutral-200/80 border border-neutral-300 max-h-24 overflow-y-auto">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={clsx(
                      "rounded-lg px-3 py-1 text-[12px] font-semibold transition shrink-0",
                      active
                        ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-300"
                        : "text-neutral-700 hover:bg-white/70 hover:text-neutral-900"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2 Subtype Controls (Only rendered if category has subtypes) */}
          {categoryConfig.hasSubtypes && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-600">
                Subtype:
              </span>
              <div className="inline-flex rounded-lg bg-neutral-200/90 p-0.5 border border-neutral-300">
                <button
                  type="button"
                  onClick={() => setSelectedSubtype("school-cheer-viroc-yes")}
                  className={clsx(
                    "rounded-md px-3 py-1 text-[12px] font-semibold transition",
                    selectedSubtype === "school-cheer-viroc-yes"
                      ? "bg-brand-blue text-white shadow-sm"
                      : "text-neutral-700 hover:text-neutral-900"
                  )}
                >
                  VIROC Yes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubtype("school-cheer-viroc-no")}
                  className={clsx(
                    "rounded-md px-3 py-1 text-[12px] font-semibold transition",
                    selectedSubtype === "school-cheer-viroc-no"
                      ? "bg-brand-blue text-white shadow-sm"
                      : "text-neutral-700 hover:text-neutral-900"
                  )}
                >
                  VIROC No
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body - Fixed Flex Layout without outer scrollbar */}
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4 space-y-4 overflow-hidden">
          {!categoryData || categoryData.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
              <Info className="h-8 w-8 text-neutral-400" />
              <p className="mt-3 text-[14px] font-semibold text-neutral-800">
                No pricing configured for this order form
              </p>
              <p className="mt-1 text-[12px] text-neutral-500">
                Please select another category from the filter above.
              </p>
            </div>
          ) : (
            <>
              {/* Reference Table Box with Flex-1 Min-H-0 Single Scrollbar */}
              <div className="flex-1 min-h-[200px] overflow-y-auto rounded-lg border-2 border-neutral-400 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="sticky top-0 z-20 bg-neutral-200">
                    <tr className="bg-neutral-200 text-[11px] font-bold uppercase tracking-[0.06em] text-neutral-900 border-b-2 border-neutral-400">
                      {categoryData.type === "tier-time" ? (
                        <>
                          <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900">
                            Tier
                          </th>
                          <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900">
                            Time Limit
                          </th>
                        </>
                      ) : (
                        <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900">
                          Package
                        </th>
                      )}
                      <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-right bg-neutral-200 text-neutral-900">
                        Customer Price
                      </th>
                      <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-emerald-200 text-emerald-950 font-bold">
                        Music Affiliate — Compliant (Payroll Price)
                      </th>
                      <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-rose-200 text-rose-950 font-bold">
                        Music Affiliate — Non-Compliant (Payroll Price)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-900">
                    {categoryData.type === "tier-time"
                      ? categoryData.rows.map((row, idx) => {
                          const isTitanium = row.isTitanium;
                          return (
                            <tr
                              key={`${row.tier}-${row.limit}-${idx}`}
                              className="even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900">
                                {row.tier}
                              </td>
                              <td className="border border-neutral-300 px-3.5 py-2 font-semibold tabular-nums text-neutral-700">
                                {row.limit}
                              </td>
                              <td className="border border-neutral-300 px-3.5 py-2 text-right font-bold tabular-nums text-neutral-900">
                                {formatPrice(row.customer)}
                              </td>
                              {isTitanium || row.compliant === row.nonCompliant ? (
                                <td
                                  colSpan={2}
                                  className="border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-brand-blue" />
                                    {formatPrice(row.compliant)}{" "}
                                    <span className="text-[11px] font-normal text-neutral-600">
                                      (always)
                                    </span>
                                  </span>
                                </td>
                              ) : (
                                <>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40">
                                    {formatPrice(row.compliant)}
                                  </td>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20">
                                    {formatPrice(row.nonCompliant)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      : categoryData.rows.map((row, idx) => {
                          const isUnpriced = row.isUnpriced || row.customer === null;
                          const alwaysFixed =
                            row.alwaysFixedPayroll ||
                            (!isUnpriced && row.compliant === row.nonCompliant);

                          return (
                            <tr
                              key={`${row.package}-${idx}`}
                              className="even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900">
                                {row.package}
                              </td>
                              <td className="border border-neutral-300 px-3.5 py-2 text-right font-bold tabular-nums text-neutral-900">
                                {isUnpriced ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                    <Info className="h-3 w-3 text-amber-600 shrink-0" />
                                    TBD via email — needs manual quote
                                  </span>
                                ) : (
                                  formatPrice(row.customer!)
                                )}
                              </td>
                              {isUnpriced ? (
                                <td
                                  colSpan={2}
                                  className="border border-neutral-300 px-3.5 py-2 text-center text-[12px] font-medium text-neutral-500 bg-amber-50/10"
                                >
                                  —
                                </td>
                              ) : alwaysFixed ? (
                                <td
                                  colSpan={2}
                                  className="border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-brand-blue" />
                                    {formatPrice(row.compliant!)}{" "}
                                    <span className="text-[11px] font-normal text-neutral-600">
                                      (always)
                                    </span>
                                  </span>
                                </td>
                              ) : (
                                <>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40">
                                    {formatPrice(row.compliant!)}
                                  </td>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20">
                                    {formatPrice(row.nonCompliant!)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {/* Separated Add-Ons Section */}
              {categoryConfig.addOns.length > 0 && (
                <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-orange" />
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900">
                      Add-Ons ({selectedCategory})
                    </h3>
                  </div>
                  <p className="mt-0.5 text-[12px] text-neutral-600">
                    Add-ons are modeled separately from base package prices and stack on top of the rate card amounts above.
                  </p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-neutral-300 bg-white">
                    {categoryConfig.addOns.map((addon) => (
                      <div
                        key={addon.name}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px] border-b border-neutral-200 last:border-b-0"
                      >
                        <span className="font-bold text-neutral-900">{addon.name}</span>
                        <span className="font-bold text-brand-orange">{addon.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance & Music Affiliate Reference Footer */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-[12px] text-neutral-700">
                <Info className="h-4 w-4 shrink-0 text-brand-blue mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-900">
                    Music Affiliate Terminology & Compliance Rules:
                  </span>{" "}
                  Compliant Music Affiliate providers include{" "}
                  <span className="font-semibold text-neutral-900">
                    Power Music, Power Music + Unleash the Beats, Unleash the Beats, Library Music
                  </span>{" "}
                  (plus <span className="font-semibold text-neutral-900">Power Music Covers</span> &{" "}
                  <span className="font-semibold text-neutral-900">Unleash the Beats Covers</span> for Dance forms).
                  Any other music affiliate value is treated as non-compliant.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t-2 border-neutral-300 bg-neutral-100 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-900 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-neutral-800"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
}

