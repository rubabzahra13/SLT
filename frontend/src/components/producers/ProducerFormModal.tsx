"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { ProducerCategoryAddMenu } from "@/components/producers/ProducerCategoryAddMenu";
import { RemoveAddonRateModal } from "@/components/producers/RemoveAddonRateModal";
import { RemoveCategoryModal } from "@/components/producers/RemoveCategoryModal";
import { useAppState } from "@/context/AppStateContext";
import { findProducerCategoryGroup } from "@/lib/producer-category-groups";
import {
  isLightProducerColor,
  isProducerColorHex,
  PRODUCER_COLOR_SWATCHES,
  producerColorLabel,
  resolveProducerColor,
} from "@/lib/producer-avatars";
import { patchForReassignCategoryRemoved } from "@/lib/order-reassign";
import {
  collectAssignedMixesForProducerCategory,
  collectMixesUsingProducerAddonRate,
  collectUnpaidPayrollMixesForProducerCategory,
  type AssignedMixForProducer,
  type ProducerAddonRateKind,
} from "@/lib/producer-assigned-mixes";
import { initialsFromName, normalizeProducer } from "@/lib/producers";
import { Avatar } from "@/components/ui/Avatar";
import {
  DEFAULT_WORK_DAYS,
  WEEKDAYS,
  type Producer,
  type Weekday,
} from "@/types";

type ProducerFormModalProps = {
  open: boolean;
  onClose: () => void;
  producer?: Producer | null;
  onSave: (producer: Producer) => void | Promise<void>;
  readOnly?: boolean;
};

function toFractionRate(val: number | null | undefined): number | null {
  if (val == null || Number.isNaN(val)) return null;
  return val > 1 ? val / 100 : val;
}

function ratesPatchFromForm(form: FormState): Partial<Producer> {
  return {
    categories: form.categories,
    ratesByCategory: Object.fromEntries(
      Object.entries(form.categoryRates || {}).map(([cat, val]) => [
        cat,
        typeof val === "number" && val > 1 ? val / 100 : val,
      ])
    ),
    danceVoiceoverRate: toFractionRate(form.danceVoiceoverRate),
    cheerVoiceoverRate: toFractionRate(form.cheerVoiceoverRate),
    rushFeeRate: toFractionRate(form.rushFeeRate),
  };
}

type VoiceoverKind = "dance" | "cheer";

type FormState = {
  name: string;
  initials: string;
  email: string;
  categories: string[];
  categoryRates: Record<string, number>;
  avatar: string;
  color: string;
  workDays: Weekday[];
  danceVoiceoverRate: number | null;
  cheerVoiceoverRate: number | null;
  rushFeeRate: number | null;
};

function weekdayPill(day: Weekday): string {
  if (day === "sun") return "Su";
  if (day === "sat") return "Sa";
  if (day === "tue") return "Tu";
  if (day === "thu") return "Th";
  const match = WEEKDAYS.find((entry) => entry.id === day);
  return match?.short.charAt(0) ?? day.charAt(0).toUpperCase();
}

const VOICEOVER_OPTIONS: { id: VoiceoverKind; label: string; defaultRate: number }[] = [
  { id: "dance", label: "Dance Voiceover", defaultRate: 80 },
  { id: "cheer", label: "Cheer Voiceover", defaultRate: 100 },
];

const rowInput =
  "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";

function toPercentOrNull(raw: number | null | undefined, fallbackWhenMissing: number | null): number | null {
  if (raw == null) return fallbackWhenMissing;
  return raw <= 1 ? Math.round(raw * 100) : raw;
}

function emptyForm(): FormState {
  return {
    name: "",
    initials: "",
    email: "",
    categories: [],
    categoryRates: {},
    avatar: "",
    color: resolveProducerColor(null),
    workDays: [...DEFAULT_WORK_DAYS],
    danceVoiceoverRate: null,
    cheerVoiceoverRate: null,
    rushFeeRate: null,
  };
}

function fromProducer(producer: Producer): FormState {
  const norm = normalizeProducer(producer);
  const categories = norm.categories?.length ? [...norm.categories] : [];

  const categoryRates: Record<string, number> = {};
  for (const cat of categories) {
    const raw = norm.ratesByCategory?.[cat] ?? norm.defaultRate ?? 0.50;
    categoryRates[cat] = raw <= 1 ? Math.round(raw * 100) : raw;
  }

  const dVo = toPercentOrNull(norm.danceVoiceoverRate, null);
  const cVo = toPercentOrNull(norm.cheerVoiceoverRate, null);
  const rFee = toPercentOrNull(norm.rushFeeRate, null);

  return {
    name: norm.name,
    initials: norm.initials,
    email: norm.email,
    categories,
    categoryRates,
    avatar: norm.avatar,
    color: resolveProducerColor(
      norm.initials,
      norm.color || (isProducerColorHex(norm.avatar) ? norm.avatar : null)
    ),
    workDays:
      norm.workDays?.length > 0 ? [...norm.workDays] : [...DEFAULT_WORK_DAYS],
    danceVoiceoverRate: dVo,
    cheerVoiceoverRate: cVo,
    rushFeeRate: rFee,
  };
}

function formWithoutCategory(form: FormState, cat: string): FormState {
  const nextRates = { ...form.categoryRates };
  delete nextRates[cat];
  return {
    ...form,
    categories: form.categories.filter((c) => c !== cat),
    categoryRates: nextRates,
  };
}

function buildProducerPayload(
  form: FormState,
  producer: Producer | null | undefined,
  isEdit: boolean
): Producer {
  const initials = (form.initials || initialsFromName(form.name))
    .toUpperCase()
    .slice(0, 4);
  const selectedWorkDays = form.workDays ?? [...DEFAULT_WORK_DAYS];
  return {
    id: producer?.id || crypto.randomUUID(),
    uuid: producer?.uuid || producer?.id,
    name: form.name.trim(),
    initials,
    email: form.email.trim(),
    categories: form.categories,
    avatar: form.color,
    color: form.color,
    mixesThisWeek: producer?.mixesThisWeek ?? 0,
    workDays: isEdit
      ? producer?.workDays?.length
        ? producer.workDays
        : [...DEFAULT_WORK_DAYS]
      : [...selectedWorkDays],
    timeOff: producer?.timeOff ?? [],
    maxMixesPerDay: producer?.maxMixesPerDay ?? null,
    maxProducerCostPerDay: producer?.maxProducerCostPerDay ?? null,
    extraDays: producer?.extraDays ?? [],
    ...ratesPatchFromForm(form),
    compensationModel:
      producer?.compensationModel ?? "percentage_of_payroll_base",
  };
}

export function ProducerFormModal({
  open,
  onClose,
  producer,
  onSave,
  readOnly = false,
}: ProducerFormModalProps) {
  const router = useRouter();
  const { mtdRecords, activeOrders, updateMTD, updateOrder, addNotification } =
    useAppState();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [pendingRemoveCategory, setPendingRemoveCategory] = useState<
    string | null
  >(null);
  const [pendingCategoryReassigns, setPendingCategoryReassigns] = useState<
    { category: string; mixes: AssignedMixForProducer[] }[]
  >([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [pendingRemoveAddon, setPendingRemoveAddon] =
    useState<ProducerAddonRateKind | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const isEdit = Boolean(producer);
  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    setColorPickerOpen(false);
    setPendingRemoveCategory(null);
    setPendingCategoryReassigns([]);
    setSaveBusy(false);
    setPendingRemoveAddon(null);
    if (producer) {
      setForm(fromProducer(producer));
      setInitialsTouched(true);
    } else {
      setForm(emptyForm());
      setInitialsTouched(false);
    }
  }, [open, producer]);

  // Hot reload / older form snapshots may omit workDays — keep the picker safe.
  useEffect(() => {
    if (!open || isEdit) return;
    setForm((prev) =>
      prev.workDays ? prev : { ...prev, workDays: [...DEFAULT_WORK_DAYS] }
    );
  }, [open, isEdit]);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!colorPickerRef.current?.contains(event.target as Node)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorPickerOpen]);

  const categoryAssignedMixes = useMemo(() => {
    if (!producer || !pendingRemoveCategory) return [];
    return collectAssignedMixesForProducerCategory(
      producer,
      pendingRemoveCategory,
      activeOrders,
      mtdRecords
    );
  }, [producer, pendingRemoveCategory, activeOrders, mtdRecords]);

  const categoryUnpaidPayrollMixes = useMemo(() => {
    if (!producer || !pendingRemoveCategory) return [];
    return collectUnpaidPayrollMixesForProducerCategory(
      producer,
      pendingRemoveCategory,
      mtdRecords
    );
  }, [producer, pendingRemoveCategory, mtdRecords]);

  const addonRateBlockingMixes = useMemo(() => {
    if (!producer || !pendingRemoveAddon) return [];
    return collectMixesUsingProducerAddonRate(
      producer,
      pendingRemoveAddon,
      activeOrders,
      mtdRecords
    );
  }, [producer, pendingRemoveAddon, activeOrders, mtdRecords]);

  if (!open) return null;

  const selectedColor = isProducerColorHex(form.color)
    ? form.color.trim()
    : resolveProducerColor(form.initials || form.name, form.color);
  const selectedInSwatches = PRODUCER_COLOR_SWATCHES.some(
    (swatch) => swatch.hex.toLowerCase() === selectedColor.toLowerCase()
  );

  function setAvatarColor(hex: string) {
    setForm((prev) => ({
      ...prev,
      color: hex,
      avatar: hex,
    }));
  }

  function addCategory(cat: string) {
    if (readOnly || saveBusy) return;
    setPendingCategoryReassigns((prev) =>
      prev.filter((row) => row.category !== cat)
    );
    let nextForm: FormState | null = null;
    setForm((prev) => {
      if (prev.categories.includes(cat)) return prev;
      nextForm = {
        ...prev,
        categories: [...prev.categories, cat],
        categoryRates: {
          ...prev.categoryRates,
          [cat]: prev.categoryRates[cat] ?? 50,
        },
      };
      return nextForm;
    });
    // Persist immediately so Orders / MTD / Payroll see the new category.
    if (nextForm && producer?.id) {
      void Promise.resolve(
        onSave(buildProducerPayload(nextForm, producer, true))
      ).catch(() => {
        // Toast + rollback come from updateProducer.
      });
    }
  }

  function applyRemoveCategory(cat: string) {
    setForm((prev) => formWithoutCategory(prev, cat));
  }

  function requestRemoveCategory(cat: string) {
    if (readOnly || saveBusy) return;
    // New producers (or categories never saved) have no assigned/completed mixes.
    if (!producer?.id) {
      applyRemoveCategory(cat);
      return;
    }
    const assigned = collectAssignedMixesForProducerCategory(
      producer,
      cat,
      activeOrders,
      mtdRecords
    );
    const unpaid = collectUnpaidPayrollMixesForProducerCategory(
      producer,
      cat,
      mtdRecords
    );
    if (assigned.length === 0 && unpaid.length === 0) {
      applyRemoveCategory(cat);
      return;
    }
    setPendingRemoveCategory(cat);
  }

  function confirmRemoveCategoryWithReassign() {
    if (readOnly || saveBusy || !producer || !pendingRemoveCategory) {
      return;
    }
    if (categoryUnpaidPayrollMixes.length > 0) return;
    const category = pendingRemoveCategory;
    // Bin only updates the draft. Reassign + persist happen on Save.
    setPendingCategoryReassigns((prev) => [
      ...prev.filter((row) => row.category !== category),
      { category, mixes: categoryAssignedMixes },
    ]);
    applyRemoveCategory(category);
    setPendingRemoveCategory(null);
  }

  function flushPendingCategoryReassigns(): {
    mixCount: number;
    focusId?: string;
    labels: string[];
  } {
    if (pendingCategoryReassigns.length === 0) {
      return { mixCount: 0, labels: [] };
    }
    const mtdIds = new Set(
      mtdRecords.flatMap((r) =>
        [r.id, r.orderId, r.uuid, r.legacyId].filter(Boolean)
      )
    );
    const seen = new Set<string>();
    let mixCount = 0;
    let focusId: string | undefined;
    const labels: string[] = [];

    for (const { category, mixes } of pendingCategoryReassigns) {
      labels.push(category);
      const patch = patchForReassignCategoryRemoved(category);
      for (const rec of mixes) {
        if (seen.has(rec.id)) continue;
        seen.add(rec.id);
        mixCount += 1;
        if (!focusId) focusId = rec.id;
        if (mtdIds.has(rec.id) || rec.onMtdBoard || rec.inMTD) {
          updateMTD(rec.id, patch);
        } else {
          updateOrder(rec.id, {
            assignedProducer: null,
            editorRequest: "FA",
            mixStartDate: "",
            mixEndDate: "",
            isReassigned: true,
            orderStatus: patch.orderStatus,
            producerEmailSentAt: null,
            status: "active",
            collectionStates: patch.collectionStates,
            haveSongs: patch.haveSongs,
            eightCountSheet: patch.eightCountSheet,
          });
        }
      }
    }
    return { mixCount, focusId, labels };
  }

  function updateCategoryRate(cat: string, val: number) {
    setForm((prev) => ({
      ...prev,
      categoryRates: {
        ...prev.categoryRates,
        [cat]: val,
      },
    }));
  }

  function addVoiceover(kind: VoiceoverKind) {
    const option = VOICEOVER_OPTIONS.find((entry) => entry.id === kind);
    if (!option) return;
    setForm((prev) => {
      if (kind === "dance" && prev.danceVoiceoverRate != null) return prev;
      if (kind === "cheer" && prev.cheerVoiceoverRate != null) return prev;
      return {
        ...prev,
        danceVoiceoverRate:
          kind === "dance" ? option.defaultRate : prev.danceVoiceoverRate,
        cheerVoiceoverRate:
          kind === "cheer" ? option.defaultRate : prev.cheerVoiceoverRate,
      };
    });
  }

  function applyRemoveVoiceover(kind: VoiceoverKind) {
    setForm((prev) => ({
      ...prev,
      danceVoiceoverRate: kind === "dance" ? null : prev.danceVoiceoverRate,
      cheerVoiceoverRate: kind === "cheer" ? null : prev.cheerVoiceoverRate,
    }));
  }

  function requestRemoveVoiceover(kind: VoiceoverKind) {
    if (readOnly) return;
    const addonKind: ProducerAddonRateKind =
      kind === "dance" ? "dance_voiceover" : "cheer_voiceover";
    if (!producer?.id) {
      applyRemoveVoiceover(kind);
      return;
    }
    const blocking = collectMixesUsingProducerAddonRate(
      producer,
      addonKind,
      activeOrders,
      mtdRecords
    );
    if (blocking.length === 0) {
      applyRemoveVoiceover(kind);
      return;
    }
    setPendingRemoveAddon(addonKind);
  }

  function addRushFee() {
    setForm((prev) =>
      prev.rushFeeRate != null ? prev : { ...prev, rushFeeRate: 100 }
    );
  }

  function applyRemoveRushFee() {
    setForm((prev) => ({ ...prev, rushFeeRate: null }));
  }

  function requestRemoveRushFee() {
    if (readOnly) return;
    if (!producer?.id) {
      applyRemoveRushFee();
      return;
    }
    const blocking = collectMixesUsingProducerAddonRate(
      producer,
      "rush_fee",
      activeOrders,
      mtdRecords
    );
    if (blocking.length === 0) {
      applyRemoveRushFee();
      return;
    }
    setPendingRemoveAddon("rush_fee");
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (readOnly || saveBusy) return;
    setValidationError(null);

    const initials = (form.initials || initialsFromName(form.name))
      .toUpperCase()
      .slice(0, 4);

    if (!form.name.trim() || !form.email.trim() || !initials) {
      setValidationError("Please fill out name, initials, and email.");
      return;
    }

    for (const cat of form.categories) {
      const rate = form.categoryRates[cat];
      if (typeof rate !== "number" || isNaN(rate) || rate < 0 || rate > 100) {
        setValidationError(`Invalid compensation percentage for category "${cat}". Must be between 0% and 100%.`);
        return;
      }
    }

    if (
      form.danceVoiceoverRate != null &&
      (form.danceVoiceoverRate < 0 || form.danceVoiceoverRate > 100)
    ) {
      setValidationError("Dance Voiceover rate must be between 0% and 100%.");
      return;
    }

    if (
      form.cheerVoiceoverRate != null &&
      (form.cheerVoiceoverRate < 0 || form.cheerVoiceoverRate > 100)
    ) {
      setValidationError("Cheer Voiceover rate must be between 0% and 100%.");
      return;
    }

    if (
      form.rushFeeRate != null &&
      (form.rushFeeRate < 0 || form.rushFeeRate > 100)
    ) {
      setValidationError("Rush Fee rate must be between 0% and 100%.");
      return;
    }

    const selectedWorkDays = form.workDays ?? [...DEFAULT_WORK_DAYS];
    if (!isEdit && selectedWorkDays.length === 0) {
      setValidationError("Pick at least one work day.");
      return;
    }

    const payload = buildProducerPayload(form, producer, isEdit);
    const reassign = flushPendingCategoryReassigns();
    setSaveBusy(true);
    try {
      await onSave(payload);
      if (reassign.mixCount > 0 && producer) {
        const categoryLabel =
          reassign.labels.length === 1
            ? reassign.labels[0]
            : `${reassign.labels.length} categories`;
        addNotification({
          type: "schedule",
          title: `${categoryLabel} removed`,
          message:
            reassign.mixCount === 1
              ? `${producer.name} no longer covers ${categoryLabel}. 1 mix needs a new producer.`
              : `${producer.name} no longer covers ${categoryLabel}. ${reassign.mixCount} mixes need a new producer.`,
          href: "/orders?range=reassigned",
        });
        const params = new URLSearchParams();
        params.set("range", "reassigned");
        if (reassign.focusId) params.set("focus", reassign.focusId);
        onClose();
        router.push(`/orders?${params.toString()}`);
        return;
      }
      onClose();
    } catch {
      // Error toast comes from add/update producer (optimistic update already applied).
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition"
        onClick={() => {
          if (!saveBusy) onClose();
        }}
        aria-label="Close"
      />

      <div className="relative flex max-h-[min(94dvh,820px)] w-full max-w-md sm:w-[440px] sm:max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]">
        <header className="relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saveBusy}
            className="min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink disabled:opacity-50"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink">
            {readOnly ? "Producer Profile" : isEdit ? "Edit Producer" : "New Producer"}
          </h2>
          {!readOnly ? (
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void handleSubmit()}
              className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover disabled:opacity-60"
            >
              {saveBusy ? "Saving…" : "Save"}
            </button>
          ) : (
            <span className="min-w-[64px]" />
          )}
        </header>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {validationError ? (
            <div className="bg-brand-danger-soft/80 px-5 py-2.5 text-[12px] font-medium text-brand-danger border-b border-brand-danger-muted">
              {validationError}
            </div>
          ) : null}

          <section className="flex flex-col items-center px-6 pb-5 pt-7">
            <Avatar
              initials={form.initials || initialsFromName(form.name) || "??"}
              name={form.name}
              color={form.color}
              size="xl"
            />
            {!readOnly ? (
              <div ref={colorPickerRef} className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setColorPickerOpen((value) => !value)}
                  aria-expanded={colorPickerOpen}
                  aria-haspopup="dialog"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-bg px-2.5 text-[12px] font-medium text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle hover:text-brand-ink"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]"
                    style={{ backgroundColor: selectedColor }}
                    aria-hidden
                  />
                  <span className="max-w-[110px] truncate">
                    {producerColorLabel(selectedColor)}
                  </span>
                  <ChevronDown
                    className={clsx(
                      "h-3.5 w-3.5 text-brand-ink-tertiary transition",
                      colorPickerOpen && "rotate-180"
                    )}
                    strokeWidth={2.25}
                  />
                </button>

                {colorPickerOpen ? (
                  <div
                    className="absolute left-1/2 top-[calc(100%+8px)] z-30 w-[240px] -translate-x-1/2 rounded-2xl bg-brand-elevated p-2.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.08]"
                    role="dialog"
                    aria-label="Choose avatar color"
                  >
                    <div
                      className="grid grid-cols-7 gap-1.5"
                      role="radiogroup"
                      aria-label="Avatar color"
                    >
                      {PRODUCER_COLOR_SWATCHES.map((swatch) => {
                        const selected =
                          selectedColor.toLowerCase() ===
                          swatch.hex.toLowerCase();
                        return (
                          <button
                            key={swatch.hex}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={`Select ${swatch.label}`}
                            title={swatch.label}
                            onClick={() => {
                              setAvatarColor(swatch.hex);
                              setColorPickerOpen(false);
                            }}
                            className={clsx(
                              "relative mx-auto flex h-7 w-7 items-center justify-center rounded-full transition duration-150",
                              "shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]",
                              selected
                                ? "scale-105 shadow-[0_0_0_2px_#fff,0_0_0_3.5px_rgba(37,99,235,0.85)]"
                                : "hover:scale-105"
                            )}
                            style={{ backgroundColor: swatch.hex }}
                          >
                            {selected ? (
                              <Check
                                className={clsx(
                                  "h-3 w-3",
                                  isLightProducerColor(swatch.hex)
                                    ? "text-slate-900"
                                    : "text-white"
                                )}
                                strokeWidth={3}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                      <label
                        className={clsx(
                          "relative mx-auto flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full transition duration-150",
                          "bg-brand-bg shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]",
                          !selectedInSwatches
                            ? "scale-105 shadow-[0_0_0_2px_#fff,0_0_0_3.5px_rgba(37,99,235,0.85)]"
                            : "hover:scale-105"
                        )}
                        title="Custom color"
                        aria-label="Pick a custom avatar color"
                        style={
                          !selectedInSwatches
                            ? { backgroundColor: selectedColor }
                            : undefined
                        }
                      >
                        {selectedInSwatches ? (
                          <Plus
                            className="h-3 w-3 text-brand-ink-secondary"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Check
                            className={clsx(
                              "h-3 w-3",
                              isLightProducerColor(selectedColor)
                                ? "text-slate-900"
                                : "text-white"
                            )}
                            strokeWidth={3}
                          />
                        )}
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setAvatarColor(e.target.value)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="border-y border-black/[0.08]">
            <ProfileRow label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    initials: initialsTouched
                      ? prev.initials
                      : initialsFromName(name),
                  }));
                }}
                placeholder="Name"
                className={rowInput}
              />
            </ProfileRow>
            <ProfileRow label="Initials">
              <input
                required
                maxLength={4}
                value={form.initials}
                onChange={(e) => {
                  setInitialsTouched(true);
                  setForm({
                    ...form,
                    initials: e.target.value.toUpperCase(),
                  });
                }}
                placeholder="CA"
                className={clsx(rowInput, "tracking-[0.08em]")}
              />
            </ProfileRow>
            <ProfileRow label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className={rowInput}
              />
            </ProfileRow>
          </section>

          {!isEdit ? (
            <section className="border-b border-black/[0.08] px-5 py-4">
              <p className="text-[13px] font-semibold text-brand-ink">
                Days they work
              </p>
              <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                Set their regular week now. You can change this later in Schedule
                and capacity.
              </p>
              <div className="mt-4 flex justify-between gap-1">
                {WEEKDAYS.map((day) => {
                  const workDays = form.workDays ?? DEFAULT_WORK_DAYS;
                  const active = workDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      aria-label={day.label}
                      aria-pressed={active}
                      disabled={readOnly}
                      onClick={() => {
                        if (readOnly) return;
                        setForm((prev) => {
                          const current = prev.workDays ?? [...DEFAULT_WORK_DAYS];
                          const on = current.includes(day.id);
                          return {
                            ...prev,
                            workDays: on
                              ? current.filter((d) => d !== day.id)
                              : [...current, day.id],
                          };
                        });
                      }}
                      className={clsx(
                        "flex h-11 w-11 flex-col items-center justify-center rounded-full text-[11px] font-semibold transition",
                        active
                          ? "bg-brand-ink text-white shadow-sm"
                          : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] hover:bg-brand-bg-subtle",
                        readOnly && "cursor-default opacity-70"
                      )}
                    >
                      {weekdayPill(day.id)}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="px-5 py-4">
            <div className="rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-brand-ink">
                    Category compensation
                  </p>
                  <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                    Payroll percentage by category.
                  </p>
                </div>

                <ProducerCategoryAddMenu
                  assignedCategories={form.categories}
                  onAdd={addCategory}
                />
              </div>

              {form.categories.length === 0 ? (
                <p className="mt-3 text-[12px] leading-relaxed text-brand-ink-tertiary">
                  No categories assigned yet. Tap Add to pick a category and
                  subcategory.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-black/[0.06]">
                  {form.categories.map((cat) => {
                    const group = findProducerCategoryGroup(cat);
                    return (
                    <li
                      key={cat}
                      className="flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand-ink-secondary">
                          {cat}
                        </p>
                        {group ? (
                          <p className="truncate text-[11px] text-brand-ink-tertiary">
                            {group.label}
                          </p>
                        ) : null}
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={form.categoryRates[cat] ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateCategoryRate(cat, isNaN(val) ? 0 : val);
                          }}
                          className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none"
                          aria-label={`Compensation percentage for ${cat}`}
                        />
                        <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={readOnly || saveBusy}
                        onClick={() => requestRemoveCategory(cat)}
                        className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger disabled:opacity-50"
                        aria-label={`Remove ${cat}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-brand-ink">
                  Voiceover compensation
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Specific rates for Voiceover payouts.
                </p>
              </div>

              <ul className="mt-3 divide-y divide-black/[0.06]">
                {(
                  [
                    {
                      kind: "dance" as const,
                      label: "Dance Voiceover",
                      value: form.danceVoiceoverRate,
                      aria: "Dance Voiceover compensation percentage",
                    },
                    {
                      kind: "cheer" as const,
                      label: "Cheer Voiceover",
                      value: form.cheerVoiceoverRate,
                      aria: "Cheer Voiceover compensation percentage",
                    },
                  ] as const
                ).map((row) => (
                  <li
                    key={row.kind}
                    className="flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1 font-medium text-brand-ink-secondary">
                      {row.label}
                    </span>
                    {row.value != null ? (
                      <>
                        <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={row.value}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setForm((prev) => ({
                                ...prev,
                                ...(row.kind === "dance"
                                  ? {
                                      danceVoiceoverRate: isNaN(val)
                                        ? 0
                                        : val,
                                    }
                                  : {
                                      cheerVoiceoverRate: isNaN(val)
                                        ? 0
                                        : val,
                                    }),
                              }));
                            }}
                            disabled={readOnly}
                            className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none disabled:opacity-60"
                            aria-label={row.aria}
                          />
                          <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                            %
                          </span>
                        </div>
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => requestRemoveVoiceover(row.kind)}
                            className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger"
                            aria-label={`Remove ${row.label}`}
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.75}
                            />
                          </button>
                        ) : null}
                      </>
                    ) : readOnly ? (
                      <span className="text-[12px] text-brand-ink-tertiary">
                        Not set
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addVoiceover(row.kind)}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-elevated px-3 text-[12px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
                        aria-label={`Add ${row.label}`}
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-brand-ink">
                  Rush fee compensation
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Default rate for Rush Fee payouts.
                </p>
              </div>

              <ul className="mt-3 divide-y divide-black/[0.06]">
                <li className="flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1 font-medium text-brand-ink-secondary">
                    Rush Fee
                  </span>
                  {form.rushFeeRate != null ? (
                    <>
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={form.rushFeeRate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setForm((prev) => ({
                              ...prev,
                              rushFeeRate: isNaN(val) ? 0 : val,
                            }));
                          }}
                          disabled={readOnly}
                          className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none disabled:opacity-60"
                          aria-label="Rush Fee compensation percentage"
                        />
                        <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                          %
                        </span>
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={requestRemoveRushFee}
                          className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger"
                          aria-label="Remove Rush Fee"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      ) : null}
                    </>
                  ) : readOnly ? (
                    <span className="text-[12px] text-brand-ink-tertiary">
                      Not set
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={addRushFee}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-elevated px-3 text-[12px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
                      aria-label="Add Rush Fee"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Add
                    </button>
                  )}
                </li>
              </ul>
            </div>
          </section>

          <div className="flex justify-center pb-5 pt-6 sm:hidden">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-brand-bg p-2 text-brand-ink-tertiary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>

    {typeof document !== "undefined"
      ? createPortal(
          <>
            <RemoveCategoryModal
              open={Boolean(pendingRemoveCategory)}
              producer={producer ?? null}
              category={pendingRemoveCategory}
              assignedMixes={categoryAssignedMixes}
              unpaidPayrollMixes={categoryUnpaidPayrollMixes}
              onClose={() => {
                if (!saveBusy) setPendingRemoveCategory(null);
              }}
              onSendToReassign={confirmRemoveCategoryWithReassign}
              busy={saveBusy}
            />
            <RemoveAddonRateModal
              open={Boolean(pendingRemoveAddon)}
              producer={producer ?? null}
              kind={pendingRemoveAddon}
              mixes={addonRateBlockingMixes}
              onClose={() => setPendingRemoveAddon(null)}
            />
          </>,
          document.body
        )
      : null}
    </>
  );
}

function ProfileRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <label
      className={clsx(
        "flex items-center gap-4 px-5 py-[14px]",
        !last && "border-b border-black/[0.06]"
      )}
    >
      <span className="w-[88px] shrink-0 text-[15px] text-brand-ink">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}
