"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Mic, Pencil, Plus, Trash2, X } from "lucide-react";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { Avatar } from "@/components/ui/Avatar";
import { SoftSelect, type SoftSelectOption } from "@/components/ui/SoftSelect";
import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDate } from "@/lib/dates";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  matchesFormFilter,
} from "@/lib/mtd-filters";
import { getPayrollRecords } from "@/lib/mtd-completion";
import { producerMatchesScheduleFormFilter } from "@/lib/schedule-filters";
import type { CreatePayrollAddonPayload } from "@/lib/api/payroll-addons";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  PayrollAddon,
  Producer,
} from "@/types";

const CHEER_RATES = [
  { label: "$20", value: 20, source: "predefined" as const },
  { label: "$40", value: 40, source: "predefined" as const },
  { label: "Manual", value: null, source: "manual" as const },
];

const DANCE_RATES = [
  { label: "$25", value: 25, source: "predefined" as const },
  { label: "$75", value: 75, source: "predefined" as const },
  { label: "Manual", value: null, source: "manual" as const },
];

function categoryFromForm(form: OrderFormType): "Cheer" | "Dance" {
  return form === "school-all-star-dance" ? "Dance" : "Cheer";
}

type VoiceoversPanelProps = {
  payrollAddons: PayrollAddon[];
  producers: Producer[];
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  form?: OrderFormType;
  cheerSubtype?: CheerFormSubtypeFilter;
  danceSubtype?: DanceFormSubtypeFilter;
  readOnly?: boolean;
  onAdd: (payload: CreatePayrollAddonPayload) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
};

export function VoiceoversPanel({
  payrollAddons,
  producers,
  mtdRecords,
  allOrders,
  form: pageForm = "school-all-star-cheer",
  cheerSubtype: pageCheerSubtype = "all",
  danceSubtype: pageDanceSubtype = "all",
  readOnly = false,
  onAdd,
  onDelete,
}: VoiceoversPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollAddon | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  const voiceovers = useMemo(() => {
    const pageCategory = categoryFromForm(pageForm);
    return payrollAddons
      .filter(
        (a) => a.addonType === "voiceover" && a.category === pageCategory
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [payrollAddons, pageForm]);

  const total = useMemo(
    () => voiceovers.reduce((sum, a) => sum + a.amount, 0),
    [voiceovers]
  );

  function producerFor(addon: PayrollAddon): Producer | null {
    if (addon.producerId) {
      return producers.find((p) => p.id === addon.producerId) ?? null;
    }
    if (addon.producerInitials) {
      return findProducerByAssignmentKey(addon.producerInitials, producers) ?? null;
    }
    return null;
  }

  return (
    <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line/50 px-4 py-3">
        <p className="text-[13px] font-semibold text-brand-ink">Voiceovers</p>
        <div className="flex items-center gap-3">
          {voiceovers.length > 0 ? (
            <p className="text-[12px] tabular-nums text-brand-ink-secondary">
              {voiceovers.length} · {formatPrice(total)}
            </p>
          ) : null}
          {!readOnly ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-orange px-3 text-[12px] font-semibold text-white transition hover:bg-brand-orange/90"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add voiceover
            </button>
          ) : null}
        </div>
      </div>

      {voiceovers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Mic className="h-8 w-8 text-brand-ink-tertiary" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-brand-ink">No voiceovers yet</p>
          <p className="max-w-sm text-[12px] text-brand-ink-tertiary">
            Add a voiceover for the producer who recorded it.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left">
            <thead>
              <tr className="table-header-row">
                <th className="table-header-label table-header-cell px-4 py-2.5">
                  VO producer
                </th>
                <th className="table-header-label table-header-cell px-4 py-2.5">
                  School / program
                </th>
                <th className="table-header-label table-header-cell px-4 py-2.5">
                  Category
                </th>
                <th className="table-header-label table-header-cell px-4 py-2.5 text-right">
                  Amount
                </th>
                <th className="table-header-label table-header-cell px-4 py-2.5">
                  Added
                </th>
                {!readOnly ? (
                  <th className="table-header-label table-header-cell px-4 py-2.5 text-center">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {voiceovers.map((addon) => {
                const producer = producerFor(addon);
                return (
                  <tr
                    key={addon.id}
                    className="border-b border-brand-line-strong last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          producer={producer ?? undefined}
                          initials={addon.producerInitials ?? "?"}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-brand-ink">
                            {producer?.name ||
                              addon.producerInitials ||
                              "Unknown"}
                          </p>
                          {producer?.initials ? (
                            <p className="text-[11px] text-brand-ink-tertiary">
                              {producer.initials}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[13px] text-brand-ink">
                      {titleCase(addon.programName)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-brand-ink-secondary">
                      {addon.category}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-brand-ink">
                      {formatPrice(addon.amount)}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-brand-ink-secondary">
                      {addon.createdAt
                        ? formatDisplayDate(addon.createdAt.slice(0, 10))
                        : "—"}
                    </td>
                    {!readOnly ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            disabled={Boolean(deletingId)}
                            onClick={() => {
                              setEditing(addon);
                              setFormOpen(true);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-brand-ink-tertiary transition hover:bg-brand-signature/10 hover:text-brand-signature disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            disabled={Boolean(deletingId)}
                            onClick={() => void handleDelete(addon.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-brand-ink-tertiary transition hover:bg-brand-danger/10 hover:text-brand-danger disabled:pointer-events-none disabled:opacity-40"
                          >
                            {deletingId === addon.id ? (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin text-brand-danger"
                                strokeWidth={2}
                              />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                            )}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <VoiceoverEntryModal
        open={formOpen}
        editing={editing}
        producers={producers}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        initialForm={pageForm}
        initialCheerSubtype={pageCheerSubtype}
        initialDanceSubtype={pageDanceSubtype}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={async (payload) => {
          if (editing) {
            await onDelete(editing.id);
          }
          await onAdd(payload);
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

type VoiceoverEntryModalProps = {
  open: boolean;
  editing: PayrollAddon | null;
  producers: Producer[];
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  initialForm: OrderFormType;
  initialCheerSubtype: CheerFormSubtypeFilter;
  initialDanceSubtype: DanceFormSubtypeFilter;
  onClose: () => void;
  onSave: (payload: CreatePayrollAddonPayload) => Promise<unknown>;
};

function VoiceoverEntryModal({
  open,
  editing,
  producers,
  mtdRecords,
  allOrders,
  initialForm,
  initialCheerSubtype,
  initialDanceSubtype,
  onClose,
  onSave,
}: VoiceoverEntryModalProps) {
  const [producerId, setProducerId] = useState("");
  const [programName, setProgramName] = useState("");
  const [form, setForm] = useState<OrderFormType>("school-all-star-cheer");
  const [cheerSubtype, setCheerSubtype] =
    useState<CheerFormSubtypeFilter>("all");
  const [danceSubtype, setDanceSubtype] =
    useState<DanceFormSubtypeFilter>("all");
  const [rateIndex, setRateIndex] = useState(0);
  const [manualAmount, setManualAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [producerMenuOpen, setProducerMenuOpen] = useState(false);
  const [programMenuOpen, setProgramMenuOpen] = useState(false);

  const orderById = useMemo(
    () => new Map(allOrders.map((o) => [o.id, o])),
    [allOrders]
  );

  const payrollMixes = useMemo(() => getPayrollRecords(mtdRecords), [mtdRecords]);

  const formFilteredMixes = useMemo(
    () =>
      payrollMixes.filter((rec) =>
        matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
      ),
    [payrollMixes, orderById, form, cheerSubtype, danceSubtype]
  );

  const formCounts = useMemo(
    () => countMTDByForm(payrollMixes, orderById),
    [payrollMixes, orderById]
  );
  const cheerCounts = useMemo(
    () => countMTDByCheerSubtype(payrollMixes, orderById),
    [payrollMixes, orderById]
  );
  const danceCounts = useMemo(
    () => countMTDByDanceSubtype(payrollMixes, orderById),
    [payrollMixes, orderById]
  );

  const category = categoryFromForm(form);
  const rates = category === "Dance" ? DANCE_RATES : CHEER_RATES;
  const selectedRate = rates[rateIndex] ?? rates[0];
  const isManual = selectedRate.source === "manual";

  const categoryProducers = useMemo(() => {
    const matched = producers.filter((p) =>
      producerMatchesScheduleFormFilter(p, form, cheerSubtype, danceSubtype)
    );
    // Keep an already-selected / editing producer visible even if filters changed
    if (producerId && !matched.some((p) => p.id === producerId)) {
      const selected = producers.find((p) => p.id === producerId);
      if (selected) matched.push(selected);
    }
    return matched.sort((a, b) => a.name.localeCompare(b.name));
  }, [producers, form, cheerSubtype, danceSubtype, producerId]);

  const producerOptions: SoftSelectOption[] = useMemo(
    () =>
      categoryProducers.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.initials})`,
      })),
    [categoryProducers]
  );

  const programOptions: SoftSelectOption[] = useMemo(() => {
    const names = new Set<string>();
    for (const rec of formFilteredMixes) {
      const name = rec.programName?.trim();
      if (name) names.add(name);
    }
    if (programName.trim() && !names.has(programName.trim())) {
      names.add(programName.trim());
    }
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: titleCase(name) }));
  }, [formFilteredMixes, programName]);

  function switchForm(next: OrderFormType) {
    setForm(next);
    if (next !== "school-all-star-cheer") setCheerSubtype("all");
    if (next !== "school-all-star-dance") setDanceSubtype("all");
    setRateIndex(0);
    setManualAmount("");
    setProducerId("");
    setProgramName("");
    setProducerMenuOpen(false);
    setProgramMenuOpen(false);
  }

  // Clear producer when form/subcategory change leaves them out of the roster
  useEffect(() => {
    if (!producerId) return;
    const stillMatches = producers.some(
      (p) =>
        p.id === producerId &&
        producerMatchesScheduleFormFilter(p, form, cheerSubtype, danceSubtype)
    );
    if (!stillMatches && !editing) {
      setProducerId("");
    }
  }, [producerId, producers, form, cheerSubtype, danceSubtype, editing]);

  // Clear program when it is no longer in the filtered Payroll list
  useEffect(() => {
    if (!programName.trim() || editing) return;
    const stillListed = formFilteredMixes.some(
      (rec) =>
        rec.programName?.trim().toLowerCase() ===
        programName.trim().toLowerCase()
    );
    if (!stillListed) setProgramName("");
  }, [programName, formFilteredMixes, editing]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setProducerId(editing.producerId || "");
      setProgramName(editing.programName || "");
      const nextForm: OrderFormType =
        editing.category === "Dance"
          ? "school-all-star-dance"
          : "school-all-star-cheer";
      setForm(nextForm);
      setCheerSubtype("all");
      setDanceSubtype("all");
      const list = editing.category === "Dance" ? DANCE_RATES : CHEER_RATES;
      const idx = list.findIndex(
        (r) => r.source === "predefined" && r.value === editing.amount
      );
      if (idx >= 0) {
        setRateIndex(idx);
        setManualAmount("");
      } else {
        setRateIndex(list.length - 1);
        setManualAmount(String(editing.amount));
      }
    } else {
      setProducerId("");
      setProgramName("");
      setForm(initialForm);
      setCheerSubtype(initialCheerSubtype);
      setDanceSubtype(initialDanceSubtype);
      setRateIndex(0);
      setManualAmount("");
    }
    setProducerMenuOpen(false);
    setProgramMenuOpen(false);
    setError(null);
    setSaving(false);
  }, [open, editing, initialForm, initialCheerSubtype, initialDanceSubtype]);

  async function handleSave() {
    setError(null);
    const producer = producers.find((p) => p.id === producerId);
    if (!producer) {
      setError("Select the voiceover producer.");
      return;
    }
    if (!programName.trim()) {
      setError("Select a school / program.");
      return;
    }
    let amount: number;
    if (isManual) {
      const parsed = parseFloat(manualAmount.replace(/[^0-9.]/g, ""));
      if (!manualAmount.trim() || Number.isNaN(parsed) || parsed <= 0) {
        setError("Enter a valid positive amount.");
        return;
      }
      amount = parsed;
    } else {
      amount = selectedRate.value!;
    }

    // Link to the payroll mix for this program so statement details fill from the order
    const linkedMix =
      formFilteredMixes.find(
        (rec) =>
          rec.programName?.trim().toLowerCase() ===
          programName.trim().toLowerCase()
      ) ?? null;

    setSaving(true);
    try {
      await onSave({
        orderId: linkedMix?.orderId || linkedMix?.id || null,
        mtdId: linkedMix?.id || null,
        programName: programName.trim(),
        teamName:
          (linkedMix as { teamName?: string } | null)?.teamName?.trim() || null,
        contactName: linkedMix?.contactName || null,
        category,
        addonType: "voiceover",
        amount,
        rateSource: selectedRate.source,
        producerId: producer.id,
        producerInitials: producer.initials,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save voiceover.");
      setSaving(false);
    }
  }

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-xl border border-brand-line bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-brand-ink">
              {editing ? "Edit voiceover" : "Add voiceover"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-brand-ink-faint transition hover:bg-brand-hover hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Form
            </label>
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
              <OrderFormFilters
                grouped
                portalMenus
                form={form}
                cheerSubtype={cheerSubtype}
                danceSubtype={danceSubtype}
                onFormChange={switchForm}
                onCheerSubtypeChange={setCheerSubtype}
                onDanceSubtypeChange={setDanceSubtype}
                formCounts={formCounts}
                cheerCounts={cheerCounts}
                danceCounts={danceCounts}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              VO producer <span className="text-brand-orange">*</span>
            </label>
            <SoftSelect
              aria-label="VO producer"
              size="md"
              searchable
              placement="below"
              searchPlaceholder="Search producers…"
              placeholder={
                producerOptions.length === 0
                  ? "No producers for this form…"
                  : "Select producer…"
              }
              value={producerId}
              options={producerOptions}
              open={producerMenuOpen}
              onOpenChange={(next) => {
                setProducerMenuOpen(next);
                if (next) setProgramMenuOpen(false);
              }}
              onChange={(value) => {
                setProducerId(value);
                setProducerMenuOpen(false);
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              School / program <span className="text-brand-orange">*</span>
            </label>
            <SoftSelect
              aria-label="School / program"
              size="md"
              searchable
              placement="below"
              searchPlaceholder="Search programs…"
              placeholder={
                programOptions.length === 0
                  ? "No programs on Payroll for this form…"
                  : "Select program…"
              }
              value={programName}
              options={programOptions}
              open={programMenuOpen}
              onOpenChange={(next) => {
                setProgramMenuOpen(next);
                if (next) setProducerMenuOpen(false);
              }}
              onChange={(value) => {
                setProgramName(value);
                setProgramMenuOpen(false);
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Voiceover rate ({category}){" "}
              <span className="text-brand-orange">*</span>
            </label>
            <div className="flex gap-2">
              {rates.map((rate, i) => (
                <button
                  key={rate.label}
                  type="button"
                  onClick={() => {
                    setRateIndex(i);
                    if (rate.source !== "manual") setManualAmount("");
                  }}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                    rateIndex === i
                      ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                      : "border-brand-line bg-brand-bg text-brand-ink-secondary hover:border-brand-orange/40"
                  }`}
                >
                  {rate.label}
                </button>
              ))}
            </div>
          </div>

          {isManual ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
                Manual amount <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm text-brand-ink-faint">
                  $
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full rounded-lg border border-brand-line bg-brand-bg py-2 pl-7 pr-3 text-sm text-brand-ink focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-brand-line px-4 py-1.5 text-sm font-medium text-brand-ink-secondary transition hover:bg-brand-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-orange/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {editing ? "Save" : "Add voiceover"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
