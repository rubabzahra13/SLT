"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Info, Pencil, Sparkles, Tag, X } from "lucide-react";
import clsx from "clsx";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { HoverTip } from "@/components/ui/HoverTip";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import {
  applySecretMenuPerSongRates,
  getDefaultSecretMenuPricing,
  getSecretMenuPerSongRates,
  parseIntegerInput,
  parsePriceInput,
  type SecretMenuPricing,
} from "@/lib/pricing";
import {
  affiliateIdsEqual,
  getCategoryPricingSnapshot,
  getVisibleMusicAffiliateOptions,
  loadPricingReferenceStore,
  savePricingReferenceStore,
  updateCategoryPricingSnapshot,
  type CategoryKey,
  type CategoryPricingSnapshot,
  type FlatPackagePricingRow,
  normalizeCompliantAffiliateLabelOverride,
  resolveCompliantAffiliateLabel,
  stripAddOnFlatSuffix,
  type PricingReferenceAddOn,
  type PricingReferenceRow,
  type TierTimePricingRow,
} from "@/lib/pricing-reference";
import type { MTDRecord, Order } from "@/types";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
  type CheerFormSubtype,
  type DanceFormSubtype,
  type OrderFormType,
} from "@/types";

export type { CategoryKey } from "@/lib/pricing-reference";

export type SchoolCheerSubtypeKey = "school-cheer-viroc-yes" | "school-cheer-viroc-no";

function cloneCategorySnapshot(snapshot: CategoryPricingSnapshot): CategoryPricingSnapshot {
  return {
    compliantAffiliateIds: [...snapshot.compliantAffiliateIds],
    compliantAffiliateLabels: snapshot.compliantAffiliateLabels
      ? { ...snapshot.compliantAffiliateLabels }
      : {},
    addOns: snapshot.addOns.map((addon) => ({ ...addon })),
    rows: snapshot.rows.map((row) => ({ ...row })),
  };
}

const nameInputClassName =
  "w-full min-w-[96px] rounded-md border border-neutral-300 px-2 py-1 text-center text-[12px] font-bold text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15";

function ManualQuotePriceCell() {
  return (
    <HoverTip content="This package is not on the standard rate card. Price is quoted manually via email.">
      <span className="inline-flex cursor-help flex-col items-center gap-0.5">
        <span className="text-[12px] font-bold tabular-nums tracking-wide text-amber-700">
          TBD
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-neutral-500">
          Manual quote
        </span>
      </span>
    </HoverTip>
  );
}

function priceInputValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function PriceCell({
  value,
  editing,
  onChange,
  className,
}: {
  value: number | null;
  editing: boolean;
  onChange: (next: number | null) => void;
  className?: string;
}) {
  if (!editing) {
    return <>{value === null ? "N/A" : formatPrice(value)}</>;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={priceInputValue(value)}
      onChange={(event) => onChange(parsePriceInput(event.target.value))}
      className={clsx(
        "w-full min-w-[72px] rounded-md border border-neutral-300 bg-white px-2 py-1 text-center text-[12px] font-semibold tabular-nums text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15",
        className
      )}
    />
  );
}

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

function getFiltersFromCategory(
  category: CategoryKey,
  subtype?: SchoolCheerSubtypeKey
): {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtype;
  danceSubtype: DanceFormSubtype;
} {
  switch (category) {
    case "All-Star Cheer":
      return {
        form: "school-all-star-cheer",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "pom",
      };
    case "School Cheer":
      return {
        form: "school-all-star-cheer",
        cheerSubtype: subtype ?? "school-cheer-viroc-yes",
        danceSubtype: "pom",
      };
    case "Youth Rec Cheer":
      return {
        form: "school-all-star-cheer",
        cheerSubtype: "youth-rec-cheer",
        danceSubtype: "pom",
      };
    case "Pom":
      return {
        form: "school-all-star-dance",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "pom",
      };
    case "Hip Hop":
      return {
        form: "school-all-star-dance",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "hip-hop",
      };
    case "Team Performance & Variety":
      return {
        form: "school-all-star-dance",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "team-performance-variety",
      };
    case "Gameday":
      return {
        form: "school-all-star-dance",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "gameday",
      };
    case "Jazz/Kick":
      return {
        form: "school-all-star-dance",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "jazz-kick",
      };
    case "Marching Band":
      return {
        form: "marching-band",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "pom",
      };
    case "Sports Entertainment":
      return {
        form: "sports-entertainment",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "pom",
      };
    case "School Anthems":
      return {
        form: "school-anthem",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "pom",
      };
    default:
      return {
        form: "school-all-star-cheer",
        cheerSubtype: "all-star-cheer",
        danceSubtype: "pom",
      };
  }
}

const DEFAULT_PRICING_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_PRICING_DANCE_SUBTYPE: DanceFormSubtype = "pom";

function normalizePricingCheerSubtype(value?: string | null): CheerFormSubtype {
  return CHEER_FORM_SUBTABS.some((tab) => tab.id === value)
    ? (value as CheerFormSubtype)
    : DEFAULT_PRICING_CHEER_SUBTYPE;
}

function normalizePricingDanceSubtype(value?: string | null): DanceFormSubtype {
  return DANCE_FORM_SUBTABS.some((tab) => tab.id === value)
    ? (value as DanceFormSubtype)
    : DEFAULT_PRICING_DANCE_SUBTYPE;
}

type PricingViewTab = "reference" | "secret-menu";

type SecretMenuDraft = {
  basePrice: string;
  costPerSong: string;
  minutesPerSong: string;
};

function secretMenuDraftFromPricing(pricing: SecretMenuPricing): SecretMenuDraft {
  const rates = getSecretMenuPerSongRates(pricing);
  return {
    basePrice: String(pricing.basePrice),
    costPerSong: String(rates.costPerSong),
    minutesPerSong: String(rates.minutesPerSong),
  };
}

function parseSecretMenuDraft(
  draft: SecretMenuDraft,
  source: SecretMenuPricing
): SecretMenuPricing {
  const current = getSecretMenuPerSongRates(source);
  const basePrice = parsePriceInput(draft.basePrice) ?? source.basePrice;
  const costPerSong = parsePriceInput(draft.costPerSong) ?? current.costPerSong;
  const minutesPerSong =
    parseIntegerInput(draft.minutesPerSong) ?? current.minutesPerSong;

  return applySecretMenuPerSongRates(source, {
    basePrice,
    costPerSong,
    minutesPerSong,
  });
}

export type SetPricingModalProps = {
  open: boolean;
  prices?: Record<string, number>;
  secretMenuPrices?: SecretMenuPricing;
  onClose: () => void;
  onSave?: (prices: Record<string, number>, secretMenuPrices: SecretMenuPricing) => void;
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
  secretMenuPrices: secretMenuPricesProp,
  onSave,
  order,
  record,
  form,
  cheerSubtype,
  danceSubtype,
  initialCategory,
  initialSubtype,
}: SetPricingModalProps) {
  const { secretMenuPrices: secretMenuPricesState, setSecretMenuPrices } = useAppState();
  const secretMenuPrices = secretMenuPricesProp ?? secretMenuPricesState;

  const [activeViewTab, setActiveViewTab] = useState<PricingViewTab>("reference");
  const [isEditingSecretMenu, setIsEditingSecretMenu] = useState(false);
  const [secretDraft, setSecretDraft] = useState<SecretMenuDraft>(() =>
    secretMenuDraftFromPricing(getDefaultSecretMenuPricing())
  );
  const [pricingForm, setPricingForm] = useState<OrderFormType>("school-all-star-cheer");
  const [pricingCheerSubtype, setPricingCheerSubtype] =
    useState<CheerFormSubtype>(DEFAULT_PRICING_CHEER_SUBTYPE);
  const [pricingDanceSubtype, setPricingDanceSubtype] =
    useState<DanceFormSubtype>(DEFAULT_PRICING_DANCE_SUBTYPE);
  const [referenceStore, setReferenceStore] = useState(() => loadPricingReferenceStore());
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [isEditingCompliant, setIsEditingCompliant] = useState(false);
  const [draftSnapshot, setDraftSnapshot] = useState<CategoryPricingSnapshot | null>(null);
  const [compliantDraft, setCompliantDraft] = useState<string[]>([]);
  const [savedCompliantIds, setSavedCompliantIds] = useState<string[]>([]);
  const [savedCompliantLabels, setSavedCompliantLabels] = useState<
    Partial<Record<string, string>>
  >({});
  const [savedNonCompliantLabels, setSavedNonCompliantLabels] = useState<
    Partial<Record<string, string>>
  >({});
  const [compliantLabelDraft, setCompliantLabelDraft] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!open) return;
    if (initialCategory) {
      const filters = getFiltersFromCategory(initialCategory, initialSubtype);
      setPricingForm(filters.form);
      setPricingCheerSubtype(normalizePricingCheerSubtype(filters.cheerSubtype));
      setPricingDanceSubtype(normalizePricingDanceSubtype(filters.danceSubtype));
    } else if (order || record) {
      const ctx = getCategoryAndSubtypeFromContext(order, record);
      const filters = getFiltersFromCategory(ctx.category, ctx.subtype);
      setPricingForm(filters.form);
      setPricingCheerSubtype(normalizePricingCheerSubtype(filters.cheerSubtype));
      setPricingDanceSubtype(normalizePricingDanceSubtype(filters.danceSubtype));
    } else if (form) {
      setPricingForm(form as OrderFormType);
      setPricingCheerSubtype(normalizePricingCheerSubtype(cheerSubtype));
      setPricingDanceSubtype(normalizePricingDanceSubtype(danceSubtype));
    } else {
      const ctx = getCategoryAndSubtypeFromContext(order, record);
      const filters = getFiltersFromCategory(ctx.category, ctx.subtype);
      setPricingForm(filters.form);
      setPricingCheerSubtype(normalizePricingCheerSubtype(filters.cheerSubtype));
      setPricingDanceSubtype(normalizePricingDanceSubtype(filters.danceSubtype));
    }
  }, [open, order, record, form, cheerSubtype, danceSubtype, initialCategory, initialSubtype]);

  useEffect(() => {
    if (!open) return;
    setReferenceStore(loadPricingReferenceStore());
    setIsEditingPricing(false);
    setIsEditingCompliant(false);
    setDraftSnapshot(null);
    setActiveViewTab("reference");
    setIsEditingSecretMenu(false);
    setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
  }, [open, secretMenuPrices]);

  const selectedCategory = useMemo(
    () =>
      getCategoryAndSubtypeFromActiveTabFilters(
        pricingForm,
        pricingCheerSubtype,
        pricingDanceSubtype
      ).category,
    [pricingForm, pricingCheerSubtype, pricingDanceSubtype]
  );

  useEffect(() => {
    if (!open) return;
    setIsEditingPricing(false);
    setIsEditingCompliant(false);
    setDraftSnapshot(null);
    const snapshot = getCategoryPricingSnapshot(selectedCategory, referenceStore);
    setCompliantDraft(snapshot.compliantAffiliateIds);
    setSavedCompliantIds(snapshot.compliantAffiliateIds);
    setSavedCompliantLabels(snapshot.compliantAffiliateLabels ?? {});
    setSavedNonCompliantLabels(snapshot.nonCompliantAffiliateLabels ?? {});
    setCompliantLabelDraft({});
  }, [open, selectedCategory, referenceStore]);

  const activeSnapshot = useMemo(() => {
    if (isEditingPricing && draftSnapshot) return draftSnapshot;
    return getCategoryPricingSnapshot(selectedCategory, referenceStore);
  }, [draftSnapshot, isEditingPricing, referenceStore, selectedCategory]);

  const isTierTime = activeSnapshot.rows[0]?.kind === "tier-time";
  const affiliateOptions = useMemo(
    () => getVisibleMusicAffiliateOptions(selectedCategory),
    [selectedCategory]
  );
  const compliantLabelsDirty = useMemo(
    () =>
      affiliateOptions.some((option) => {
        const saved = resolveCompliantAffiliateLabel(
          option.id,
          savedCompliantLabels,
          savedNonCompliantLabels
        );
        const draft =
          compliantLabelDraft[option.id] ??
          resolveCompliantAffiliateLabel(
            option.id,
            savedCompliantLabels,
            savedNonCompliantLabels
          );
        return saved !== draft.trim();
      }),
    [
      affiliateOptions,
      compliantLabelDraft,
      savedCompliantLabels,
      savedNonCompliantLabels,
    ]
  );
  const compliantDirty =
    !affiliateIdsEqual(compliantDraft, savedCompliantIds) || compliantLabelsDirty;
  const compliantSelections = useMemo(
    () =>
      affiliateOptions.map((option) => ({
        ...option,
        label: isEditingCompliant
          ? (compliantLabelDraft[option.id] ??
            resolveCompliantAffiliateLabel(
              option.id,
              savedCompliantLabels,
              savedNonCompliantLabels
            ))
          : resolveCompliantAffiliateLabel(
              option.id,
              savedCompliantLabels,
              savedNonCompliantLabels
            ),
        checked: (isEditingCompliant ? compliantDraft : savedCompliantIds).includes(
          option.id
        ),
      })),
    [
      affiliateOptions,
      compliantDraft,
      compliantLabelDraft,
      isEditingCompliant,
      savedCompliantIds,
      savedCompliantLabels,
      savedNonCompliantLabels,
    ]
  );

  const startEditing = useCallback(() => {
    setIsEditingCompliant(false);
    setCompliantDraft([...savedCompliantIds]);
    const snapshot = getCategoryPricingSnapshot(selectedCategory, referenceStore);
    setDraftSnapshot(cloneCategorySnapshot(snapshot));
    setIsEditingPricing(true);
  }, [referenceStore, savedCompliantIds, selectedCategory]);

  const cancelEditing = useCallback(() => {
    setDraftSnapshot(null);
    setIsEditingPricing(false);
  }, []);

  const startEditingCompliant = useCallback(() => {
    setIsEditingPricing(false);
    setDraftSnapshot(null);
    setCompliantDraft([...savedCompliantIds]);
    setCompliantLabelDraft(
      Object.fromEntries(
        getVisibleMusicAffiliateOptions(selectedCategory).map((option) => [
          option.id,
          resolveCompliantAffiliateLabel(
            option.id,
            savedCompliantLabels,
            savedNonCompliantLabels
          ),
        ])
      )
    );
    setIsEditingCompliant(true);
  }, [
    savedCompliantIds,
    savedCompliantLabels,
    savedNonCompliantLabels,
    selectedCategory,
  ]);

  const cancelEditingCompliant = useCallback(() => {
    setCompliantDraft([...savedCompliantIds]);
    setCompliantLabelDraft({});
    setIsEditingCompliant(false);
  }, [savedCompliantIds]);

  const savePricingEdits = useCallback(() => {
    if (!draftSnapshot) return;
    const next = updateCategoryPricingSnapshot(referenceStore, selectedCategory, {
      rows: draftSnapshot.rows,
      addOns: draftSnapshot.addOns,
    });
    savePricingReferenceStore(next);
    setReferenceStore(next);
    setDraftSnapshot(null);
    setIsEditingPricing(false);
  }, [draftSnapshot, referenceStore, selectedCategory]);

  const saveCompliantAffiliates = useCallback(() => {
    const visibleIds = new Set(affiliateOptions.map((option) => option.id));
    const nextIds = compliantDraft.filter((id) => visibleIds.has(id));
    const nextLabels: Partial<Record<string, string>> = {};
    const nextNonCompliantLabels: Partial<Record<string, string>> = {};
    for (const option of affiliateOptions) {
      const draftLabel =
        compliantLabelDraft[option.id] ??
        resolveCompliantAffiliateLabel(
          option.id,
          savedCompliantLabels,
          savedNonCompliantLabels
        );
      const override = normalizeCompliantAffiliateLabelOverride(
        option.id,
        draftLabel
      );
      if (!override) continue;
      if (option.alwaysNonCompliant) {
        nextNonCompliantLabels[option.id] = override;
      } else {
        nextLabels[option.id] = override;
      }
    }
    const next = updateCategoryPricingSnapshot(referenceStore, selectedCategory, {
      compliantAffiliateIds: nextIds,
      compliantAffiliateLabels: nextLabels,
      nonCompliantAffiliateLabels: nextNonCompliantLabels,
    });
    savePricingReferenceStore(next);
    setReferenceStore(next);
    setCompliantDraft(nextIds);
    setSavedCompliantIds(nextIds);
    setSavedCompliantLabels(nextLabels);
    setSavedNonCompliantLabels(nextNonCompliantLabels);
    setCompliantLabelDraft({});
    setIsEditingCompliant(false);
  }, [
    affiliateOptions,
    compliantDraft,
    compliantLabelDraft,
    referenceStore,
    savedCompliantLabels,
    savedNonCompliantLabels,
    selectedCategory,
  ]);

  const toggleCompliantAffiliate = useCallback((id: string) => {
    setCompliantDraft((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  }, []);

  const updateCompliantLabel = useCallback((id: string, label: string) => {
    setCompliantLabelDraft((current) => ({ ...current, [id]: label }));
  }, []);

  const updateDraftAddOn = useCallback(
    (index: number, patch: Partial<PricingReferenceAddOn>) => {
      setDraftSnapshot((current) => {
        if (!current) return current;
        return {
          ...current,
          addOns: current.addOns.map((addon, addonIndex) =>
            addonIndex === index ? { ...addon, ...patch } : addon
          ),
        };
      });
    },
    []
  );

  const updateDraftRow = useCallback(
    (index: number, patch: Partial<PricingReferenceRow>) => {
      setDraftSnapshot((current) => {
        if (!current) return current;
        return {
          ...current,
          rows: current.rows.map((row, rowIndex) =>
            rowIndex === index ? ({ ...row, ...patch } as PricingReferenceRow) : row
          ),
        };
      });
    },
    []
  );

  const startEditingSecretMenu = useCallback(() => {
    setIsEditingPricing(false);
    setIsEditingCompliant(false);
    setDraftSnapshot(null);
    setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    setIsEditingSecretMenu(true);
  }, [secretMenuPrices]);

  const cancelEditingSecretMenu = useCallback(() => {
    setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    setIsEditingSecretMenu(false);
  }, [secretMenuPrices]);

  const saveSecretMenuEdits = useCallback(() => {
    const next = parseSecretMenuDraft(secretDraft, secretMenuPrices);
    setSecretMenuPrices(next);
    onSave?.({}, next);
    setIsEditingSecretMenu(false);
  }, [onSave, secretDraft, secretMenuPrices, setSecretMenuPrices]);

  const switchViewTab = useCallback(
    (tab: PricingViewTab) => {
      setActiveViewTab(tab);
      setIsEditingPricing(false);
      setIsEditingCompliant(false);
      setDraftSnapshot(null);
      setIsEditingSecretMenu(false);
      setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    },
    [secretMenuPrices]
  );

  const secretMenuPerSongRates = useMemo(
    () => getSecretMenuPerSongRates(secretMenuPrices),
    [secretMenuPrices]
  );

  if (!open) return null;

  const hasPricingRows = activeSnapshot.rows.length > 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
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
                  {activeViewTab === "reference"
                    ? "Pricing Reference Table"
                    : "Secret Menu Pricing"}
                </h2>
                <p className="text-[12px] text-neutral-600">
                  {activeViewTab === "reference"
                    ? "Filterable reference lookup table mirroring original client pricing sheets."
                    : "Set base price plus the per-song extra cost and editing time."}
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

          <div className="mt-4 border-b border-neutral-300">
            <Tabs
              options={[
                { value: "reference", label: "Reference table" },
                { value: "secret-menu", label: "Secret menu" },
              ]}
              value={activeViewTab}
              onChange={(value) => switchViewTab(value as PricingViewTab)}
              accent="orange"
            />
          </div>

          {activeViewTab === "reference" ? (
          <div className="mt-4">
            <div className="inline-flex flex-wrap items-center gap-2.5">
              <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
                <FilterMenu
                  label="Form"
                  hideLabel
                  grouped
                  portal
                  portalZIndex={120}
                  value={pricingForm}
                  onChange={(value) => {
                    const nextForm = value as OrderFormType;
                    setPricingForm(nextForm);
                    if (nextForm === "school-all-star-cheer") {
                      setPricingCheerSubtype((current) =>
                        normalizePricingCheerSubtype(current)
                      );
                    }
                    if (nextForm === "school-all-star-dance") {
                      setPricingDanceSubtype((current) =>
                        normalizePricingDanceSubtype(current)
                      );
                    }
                  }}
                  accent="blue"
                  options={ORDER_FORM_TABS.map(({ id, label }) => ({
                    value: id,
                    label,
                  }))}
                />

                {pricingForm === "school-all-star-cheer" ? (
                  <FilterMenu
                    label="Cheer"
                    hideLabel
                    grouped
                    portal
                    portalZIndex={120}
                    value={pricingCheerSubtype}
                    onChange={(value) =>
                      setPricingCheerSubtype(value as CheerFormSubtype)
                    }
                    accent="orange"
                    options={CHEER_FORM_SUBTABS.map(({ id, label }) => ({
                      value: id,
                      label,
                    }))}
                  />
                ) : null}

                {pricingForm === "school-all-star-dance" ? (
                  <FilterMenu
                    label="Dance"
                    hideLabel
                    grouped
                    portal
                    portalZIndex={120}
                    value={pricingDanceSubtype}
                    onChange={(value) =>
                      setPricingDanceSubtype(value as DanceFormSubtype)
                    }
                    accent="orange"
                    options={DANCE_FORM_SUBTABS.map(({ id, label }) => ({
                      value: id,
                      label,
                    }))}
                  />
                ) : null}
              </div>
            </div>
          </div>
          ) : null}
        </div>

        {/* Modal Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {activeViewTab === "secret-menu" ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900">
                    Secret menu
                  </h3>
                  <p className="mt-0.5 text-[12px] text-neutral-600">
                    {secretMenuPrices.menuTitle}
                  </p>
                </div>
                {!isEditingSecretMenu ? (
                  <button
                    type="button"
                    onClick={startEditingSecretMenu}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                    Edit secret menu
                  </button>
                ) : (
                  <span className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-orange">
                    Editing
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border-2 border-neutral-400 bg-white shadow-sm">
                <div className="border-b-2 border-neutral-300 bg-neutral-100 px-4 py-3">
                  <p className="text-[13px] font-bold text-neutral-900">
                    {secretMenuPrices.packageName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-600">
                    {secretMenuPrices.menuTitle}
                  </p>
                </div>

                <div className="divide-y divide-neutral-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[12px] font-bold text-neutral-900">Base package price</p>
                      <p className="text-[11px] text-neutral-500">Starting price before extra songs</p>
                    </div>
                    {isEditingSecretMenu ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={secretDraft.basePrice}
                        onChange={(event) =>
                          setSecretDraft((current) => ({
                            ...current,
                            basePrice: event.target.value,
                          }))
                        }
                        className="w-28 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-[12px] font-bold tabular-nums text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                        aria-label={`Base price for ${secretMenuPrices.packageName}`}
                      />
                    ) : (
                      <span className="text-[14px] font-bold tabular-nums text-neutral-900">
                        {formatPrice(secretMenuPrices.basePrice)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[12px] font-bold text-neutral-900">Extra cost per song</p>
                      <p className="text-[11px] text-neutral-500">Added for each additional song</p>
                    </div>
                    {isEditingSecretMenu ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={secretDraft.costPerSong}
                        onChange={(event) =>
                          setSecretDraft((current) => ({
                            ...current,
                            costPerSong: event.target.value,
                          }))
                        }
                        className="w-28 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-[12px] font-bold tabular-nums text-brand-blue outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                        aria-label="Extra cost per song"
                      />
                    ) : (
                      <span className="text-[14px] font-bold tabular-nums text-brand-blue">
                        +{formatPrice(secretMenuPerSongRates.costPerSong)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[12px] font-bold text-neutral-900">Editing time per song</p>
                      <p className="text-[11px] text-neutral-500">Minutes added for each extra song</p>
                    </div>
                    {isEditingSecretMenu ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={secretDraft.minutesPerSong}
                          onChange={(event) =>
                            setSecretDraft((current) => ({
                              ...current,
                              minutesPerSong: event.target.value,
                            }))
                          }
                          className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-[12px] font-bold tabular-nums text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                          aria-label="Editing minutes per song"
                        />
                        <span className="text-[11px] font-semibold text-neutral-500">min</span>
                      </span>
                    ) : (
                      <span className="text-[14px] font-bold tabular-nums text-neutral-900">
                        +{secretMenuPerSongRates.minutesPerSong} min
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm">
                <p className="text-[13px] font-bold text-neutral-900">How this works</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">
                  Set the base package price, then the extra cost and editing time added for
                  each additional song. Totals scale automatically from those per-song rates.
                </p>
              </div>
            </div>
          ) : !hasPricingRows ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
              <Info className="h-8 w-8 text-neutral-400" />
              <p className="mt-3 text-[14px] font-semibold text-neutral-800">
                No pricing configured for this order form
              </p>
              <p className="mt-1 text-[12px] text-neutral-500">
                Please select another form from the filters above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900">
                    Rate card
                  </h3>
                  <p className="mt-0.5 text-[12px] text-neutral-600">
                    Reference prices for {selectedCategory}
                  </p>
                </div>
                {!isEditingPricing ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={isEditingCompliant}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                    Edit pricing
                  </button>
                ) : (
                  <span className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-orange">
                    Editing
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border-2 border-neutral-400 bg-white shadow-sm">
                <table className="w-full border-collapse text-center text-[12px]">
                  <thead className="sticky top-0 z-20 bg-neutral-200">
                    <tr className="bg-neutral-200 text-[11px] font-bold uppercase tracking-[0.06em] text-neutral-900 border-b-2 border-neutral-400">
                      {isTierTime ? (
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
                      <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-neutral-200 text-neutral-900">
                        Customer Price
                      </th>
                      <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-emerald-200 text-emerald-950 font-bold">
                        Music Affiliate: Compliant (Payroll Price)
                      </th>
                      <th className="sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-rose-200 text-rose-950 font-bold">
                        Music Affiliate: Non-Compliant (Payroll Price)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-900">
                    {isTierTime
                      ? activeSnapshot.rows.map((row, idx) => {
                          if (row.kind !== "tier-time") return null;
                          const tierRow = row as TierTimePricingRow;
                          const isTitanium = tierRow.isTitanium;
                          return (
                            <tr
                              key={`${tierRow.tier}-${tierRow.limit}-${idx}`}
                              className="even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900">
                                {isEditingPricing ? (
                                  <input
                                    type="text"
                                    value={tierRow.tier}
                                    onChange={(event) =>
                                      updateDraftRow(idx, { tier: event.target.value })
                                    }
                                    className={nameInputClassName}
                                  />
                                ) : (
                                  tierRow.tier
                                )}
                              </td>
                              <td className="border border-neutral-300 px-3.5 py-2 font-semibold tabular-nums text-neutral-700">
                                {isEditingPricing ? (
                                  <input
                                    type="text"
                                    value={tierRow.limit}
                                    onChange={(event) =>
                                      updateDraftRow(idx, { limit: event.target.value })
                                    }
                                    className={nameInputClassName}
                                  />
                                ) : (
                                  tierRow.limit
                                )}
                              </td>
                              <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900">
                                <PriceCell
                                  editing={isEditingPricing}
                                  value={tierRow.customer}
                                  onChange={(next) =>
                                    updateDraftRow(idx, {
                                      customer: next ?? tierRow.customer,
                                    })
                                  }
                                />
                              </td>
                              {isTitanium || tierRow.compliant === tierRow.nonCompliant ? (
                                <td
                                  colSpan={2}
                                  className="border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900"
                                >
                                  <span className="inline-flex items-center justify-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-brand-blue" />
                                    <PriceCell
                                      editing={isEditingPricing}
                                      value={tierRow.compliant}
                                      onChange={(next) =>
                                        updateDraftRow(idx, {
                                          compliant: next ?? tierRow.compliant,
                                          nonCompliant: next ?? tierRow.nonCompliant,
                                        })
                                      }
                                    />
                                    {!isEditingPricing ? (
                                      <span className="text-[11px] font-normal text-neutral-600">
                                        (always)
                                      </span>
                                    ) : null}
                                  </span>
                                </td>
                              ) : (
                                <>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40">
                                    <PriceCell
                                      editing={isEditingPricing}
                                      value={tierRow.compliant}
                                      onChange={(next) =>
                                        updateDraftRow(idx, {
                                          compliant: next ?? tierRow.compliant,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20">
                                    <PriceCell
                                      editing={isEditingPricing}
                                      value={tierRow.nonCompliant}
                                      onChange={(next) =>
                                        updateDraftRow(idx, {
                                          nonCompliant: next ?? tierRow.nonCompliant,
                                        })
                                      }
                                    />
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      : activeSnapshot.rows.map((row, idx) => {
                          if (row.kind !== "flat-package") return null;
                          const packageRow = row as FlatPackagePricingRow;
                          const isUnpriced =
                            packageRow.isUnpriced || packageRow.customer === null;
                          const alwaysFixed =
                            packageRow.alwaysFixedPayroll ||
                            (!isUnpriced &&
                              packageRow.compliant === packageRow.nonCompliant);

                          return (
                            <tr
                              key={`${packageRow.package}-${idx}`}
                              className="even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900">
                                {isEditingPricing ? (
                                  <input
                                    type="text"
                                    value={packageRow.package}
                                    onChange={(event) =>
                                      updateDraftRow(idx, { package: event.target.value })
                                    }
                                    className={nameInputClassName}
                                  />
                                ) : (
                                  packageRow.package
                                )}
                              </td>
                              <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900">
                                {isUnpriced && !isEditingPricing ? (
                                  <ManualQuotePriceCell />
                                ) : (
                                  <PriceCell
                                    editing={isEditingPricing}
                                    value={packageRow.customer}
                                    onChange={(next) =>
                                      updateDraftRow(idx, { customer: next })
                                    }
                                  />
                                )}
                              </td>
                              {isUnpriced && !isEditingPricing ? (
                                <td
                                  colSpan={2}
                                  className="border border-neutral-300 bg-amber-50/10 px-3.5 py-2 text-center text-[12px] font-medium text-neutral-500"
                                >
                                  N/A
                                </td>
                              ) : alwaysFixed ? (
                                <td
                                  colSpan={2}
                                  className="border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900"
                                >
                                  <span className="inline-flex items-center justify-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-brand-blue" />
                                    <PriceCell
                                      editing={isEditingPricing}
                                      value={packageRow.compliant}
                                      onChange={(next) =>
                                        updateDraftRow(idx, {
                                          compliant: next,
                                          nonCompliant: next,
                                        })
                                      }
                                    />
                                    {!isEditingPricing ? (
                                      <span className="text-[11px] font-normal text-neutral-600">
                                        (always)
                                      </span>
                                    ) : null}
                                  </span>
                                </td>
                              ) : (
                                <>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40">
                                    <PriceCell
                                      editing={isEditingPricing}
                                      value={packageRow.compliant}
                                      onChange={(next) =>
                                        updateDraftRow(idx, { compliant: next })
                                      }
                                    />
                                  </td>
                                  <td className="border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20">
                                    <PriceCell
                                      editing={isEditingPricing}
                                      value={packageRow.nonCompliant}
                                      onChange={(next) =>
                                        updateDraftRow(idx, { nonCompliant: next })
                                      }
                                    />
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {activeSnapshot.addOns.length > 0 && (
                <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-orange" />
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900">
                      Add-Ons ({selectedCategory})
                    </h3>
                  </div>
                  <p className="mt-0.5 text-[12px] text-neutral-600">
                    Add-ons stack on top of the rate card amounts above.
                  </p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-neutral-300 bg-white">
                    {activeSnapshot.addOns.map((addon, idx) => (
                      <div
                        key={`${addon.name}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2.5 text-[12px] last:border-b-0"
                      >
                        {isEditingPricing ? (
                          <input
                            type="text"
                            value={addon.name}
                            onChange={(event) =>
                              updateDraftAddOn(idx, { name: event.target.value })
                            }
                            className="min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-[12px] font-bold text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                          />
                        ) : (
                          <span className="font-bold text-neutral-900">{addon.name}</span>
                        )}
                        <div className="flex items-center gap-2">
                          {isEditingPricing ? (
                            <input
                              type="text"
                              value={stripAddOnFlatSuffix(addon.price)}
                              onChange={(event) =>
                                updateDraftAddOn(idx, { price: event.target.value })
                              }
                              className="min-w-[72px] rounded-md border border-neutral-300 px-2 py-1 text-center text-[12px] font-bold text-brand-orange outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                            />
                          ) : (
                            <span className="font-bold text-brand-orange">
                              {stripAddOnFlatSuffix(addon.price)}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                            flat
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 shrink-0 text-brand-blue" />
                      <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900">
                        Music affiliates ({selectedCategory})
                      </h3>
                    </div>
                    <p className="mt-0.5 text-[12px] text-neutral-600">
                      {isEditingCompliant
                        ? "Check which affiliate values count as compliant for payroll pricing."
                        : "Affiliate values marked non-compliant use the non-compliant payroll column above."}
                    </p>
                  </div>
                  {!isEditingCompliant ? (
                    <button
                      type="button"
                      onClick={startEditingCompliant}
                      disabled={isEditingPricing}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                      Edit affiliates
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-orange">
                      Editing
                    </span>
                  )}
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-neutral-300 bg-white">
                  {compliantSelections.map((option, idx) =>
                    isEditingCompliant ? (
                      <div
                        key={option.id}
                        className={clsx(
                          "flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2.5 text-[12px] last:border-b-0 transition hover:bg-neutral-50/80",
                          option.checked && "bg-emerald-50/30"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={() => toggleCompliantAffiliate(option.id)}
                            className="h-4 w-4 shrink-0 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/20"
                          />
                          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <input
                              type="text"
                              value={option.label}
                              onChange={(event) =>
                                updateCompliantLabel(option.id, event.target.value)
                              }
                              onClick={(event) => event.stopPropagation()}
                              className="min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-[12px] font-bold text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                            />
                            {option.danceOnly ? (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                                Dance forms
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span
                          className={clsx(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]",
                            option.checked
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200/80"
                          )}
                        >
                          {option.checked ? "Compliant" : "Non-compliant"}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={option.id}
                        className={clsx(
                          "flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2.5 text-[12px] last:border-b-0",
                          idx % 2 === 1 && "bg-neutral-50/50"
                        )}
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-bold text-neutral-900">{option.label}</span>
                          {option.danceOnly ? (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                              Dance forms
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={clsx(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]",
                            option.checked
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200/80"
                          )}
                        >
                          {option.checked ? "Compliant" : "Non-compliant"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditingPricing || isEditingCompliant || isEditingSecretMenu ? (
          <div className="shrink-0 flex items-center justify-end gap-3 border-t-2 border-neutral-300 bg-neutral-100 px-6 py-3.5">
            {isEditingSecretMenu ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditingSecretMenu}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel edits
                </button>
                <button
                  type="button"
                  onClick={saveSecretMenuEdits}
                  className="rounded-xl bg-brand-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-blue-hover"
                >
                  Save secret menu
                </button>
              </>
            ) : null}
            {isEditingCompliant ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditingCompliant}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel edits
                </button>
                <button
                  type="button"
                  onClick={saveCompliantAffiliates}
                  disabled={!compliantDirty}
                  className="rounded-xl bg-brand-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  Save compliance
                </button>
              </>
            ) : null}
            {isEditingPricing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel edits
                </button>
                <button
                  type="button"
                  onClick={savePricingEdits}
                  className="rounded-xl bg-brand-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-blue-hover"
                >
                  Save pricing
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

