"use client";

import { createPortal } from "react-dom";
import { useCallback, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Producer } from "@/types";
import type { CreatePayrollAddonPayload } from "@/lib/api/payroll-addons";

// Voiceover rate options by category
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

type AddVoiceoverModalProps = {
  open: boolean;
  onClose: () => void;
  /** Unique program names derived from allOrders */
  programOptions: { programName: string; contactName: string; category: string }[];
  producers: Producer[];
  onAdd: (payload: CreatePayrollAddonPayload) => Promise<unknown>;
};

export function AddVoiceoverModal({
  open,
  onClose,
  programOptions,
  producers,
  onAdd,
}: AddVoiceoverModalProps) {
  const [programSearch, setProgramSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<{
    programName: string;
    contactName: string;
    category: string;
  } | null>(null);
  const [manualCategory, setManualCategory] = useState<"Cheer" | "Dance">("Cheer");
  const [rateIndex, setRateIndex] = useState(0); // 0 = first option (default)
  const [manualAmount, setManualAmount] = useState("");
  const [selectedProducerId, setSelectedProducerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveCategory: "Cheer" | "Dance" = useMemo(() => {
    if (!selectedProgram) return manualCategory;
    const cat = selectedProgram.category?.toLowerCase();
    if (cat?.includes("dance")) return "Dance";
    return "Cheer";
  }, [selectedProgram, manualCategory]);

  const rates = effectiveCategory === "Dance" ? DANCE_RATES : CHEER_RATES;
  const selectedRate = rates[rateIndex] ?? rates[0];
  const isManual = selectedRate.source === "manual";

  // Reset rate index when category changes
  const prevCatRef = { current: effectiveCategory };
  if (prevCatRef.current !== effectiveCategory) {
    setRateIndex(0);
  }

  const filteredPrograms = useMemo(() => {
    const q = programSearch.trim().toLowerCase();
    if (!q) return programOptions.slice(0, 50);
    return programOptions
      .filter(
        (p) =>
          p.programName.toLowerCase().includes(q) ||
          p.contactName.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [programOptions, programSearch]);

  const reset = useCallback(() => {
    setProgramSearch("");
    setSelectedProgram(null);
    setManualCategory("Cheer");
    setRateIndex(0);
    setManualAmount("");
    setSelectedProducerId("");
    setNotes("");
    setError(null);
    setSaving(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async () => {
    setError(null);

    if (!selectedProgram) {
      setError("Please select a school / program / team.");
      return;
    }

    const producerObj = producers.find((p) => p.id === selectedProducerId);
    if (!producerObj) {
      setError("Please select a producer / payee.");
      return;
    }

    let amount: number;
    if (isManual) {
      const parsed = parseFloat(manualAmount.replace(/[^0-9.]/g, ""));
      if (!manualAmount.trim() || isNaN(parsed) || parsed <= 0) {
        setError("Please enter a valid positive amount.");
        return;
      }
      amount = parsed;
    } else {
      amount = selectedRate.value!;
    }

    setSaving(true);
    try {
      await onAdd({
        programName: selectedProgram.programName,
        contactName: selectedProgram.contactName || null,
        category: effectiveCategory,
        addonType: "voiceover",
        amount,
        rateSource: selectedRate.source,
        producerId: producerObj.id,
        producerInitials: producerObj.initials,
        notes: notes.trim() || null,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add voiceover.");
      setSaving(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="relative flex w-full max-w-md flex-col rounded-xl border border-brand-line bg-brand-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-brand-ink">Add Voiceover</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-brand-ink-faint transition hover:bg-brand-hover hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          {/* Program search */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              School / Program / Team <span className="text-brand-orange">*</span>
            </label>
            {selectedProgram ? (
              <div className="flex items-center gap-2 rounded-lg border border-brand-orange/40 bg-brand-orange-soft/20 px-3 py-2">
                <span className="flex-1 text-sm font-medium text-brand-ink">
                  {selectedProgram.programName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProgram(null);
                    setProgramSearch("");
                  }}
                  className="text-brand-ink-faint hover:text-brand-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink-faint focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
                  placeholder="Search program name or contact…"
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  autoFocus
                />
                {programSearch && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-brand-line bg-brand-surface shadow-lg">
                    {filteredPrograms.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-brand-ink-faint">No results</div>
                    ) : (
                      filteredPrograms.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-brand-hover"
                          onClick={() => {
                            setSelectedProgram(p);
                            setProgramSearch("");
                            setRateIndex(0);
                          }}
                        >
                          <span className="text-sm font-medium text-brand-ink">{p.programName}</span>
                          {p.contactName && (
                            <span className="text-xs text-brand-ink-faint">{p.contactName}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category — shown only if not auto-derived */}
          {!selectedProgram && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
                Category
              </label>
              <div className="flex gap-2">
                {(["Cheer", "Dance"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setManualCategory(cat);
                      setRateIndex(0);
                    }}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition ${
                      manualCategory === cat
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                        : "border-brand-line bg-brand-bg text-brand-ink-secondary hover:border-brand-orange/40 hover:text-brand-ink"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category badge when auto-derived */}
          {selectedProgram && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-brand-ink-secondary">Category:</span>
              <span className="rounded-md bg-brand-hover px-2 py-0.5 text-xs font-semibold text-brand-ink">
                {effectiveCategory}
              </span>
            </div>
          )}

          {/* Rate selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Voiceover Rate <span className="text-brand-orange">*</span>
            </label>
            <div className="flex gap-2">
              {rates.map((rate, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRateIndex(i);
                    if (rate.source !== "manual") setManualAmount("");
                  }}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition ${
                    rateIndex === i
                      ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                      : "border-brand-line bg-brand-bg text-brand-ink-secondary hover:border-brand-orange/40 hover:text-brand-ink"
                  }`}
                >
                  {rate.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual amount input */}
          {isManual && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
                Amount <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm text-brand-ink-faint">
                  $
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-brand-line bg-brand-bg py-2 pl-7 pr-3 text-sm text-brand-ink placeholder:text-brand-ink-faint focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Producer */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Producer / Payee <span className="text-brand-orange">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
            >
              <option value="">Select producer…</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.initials})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Notes <span className="text-brand-ink-faint">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink-faint focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
              placeholder="e.g. Spring 2026 camp…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-brand-line px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg border border-brand-line px-4 py-1.5 text-sm font-medium text-brand-ink-secondary transition hover:bg-brand-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-orange/90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Voiceover
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
