"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Loader2, Search } from "lucide-react";
import type { MTDRecord, Order, Producer } from "@/types";
import type { CreatePayrollAddonPayload } from "@/lib/api/payroll-addons";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { Avatar } from "@/components/ui/Avatar";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";

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
  record: MTDRecord | null;
  allOrders: Order[];
  producers: Producer[];
  onAdd: (payload: CreatePayrollAddonPayload) => Promise<unknown>;
};

export function AddVoiceoverModal({
  open,
  onClose,
  record,
  allOrders,
  producers,
  onAdd,
}: AddVoiceoverModalProps) {
  const [selectedSchoolProgram, setSelectedSchoolProgram] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  const [selectedTeamDivision, setSelectedTeamDivision] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  const [rateIndex, setRateIndex] = useState(0); // default to 0 ($20 for Cheer)
  const [manualAmount, setManualAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Derive target producer automatically from the payroll row
  const assignedProducerObj = useMemo(() => {
    if (!record?.assignedProducer) return null;
    return findProducerByAssignmentKey(record.assignedProducer, producers) || null;
  }, [record, producers]);

  // Derive Category (Cheer / Dance)
  const effectiveCategory: "Cheer" | "Dance" = useMemo(() => {
    if (!record) return "Cheer";
    const meta = resolveMTDFormMeta(record, new Map(allOrders.map((o) => [o.id, o])));
    if (meta.formType === "school-all-star-dance") return "Dance";
    return "Cheer";
  }, [record, allOrders]);

  const rates = effectiveCategory === "Dance" ? DANCE_RATES : CHEER_RATES;
  const selectedRate = rates[rateIndex] ?? rates[0];
  const isManual = selectedRate.source === "manual";

  // Build unique School / Program options dynamically from database orders
  const schoolProgramOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const order of allOrders) {
      const name = (order.programName || order.schoolProgramName || order.schoolName || order.gymName || "").trim();
      if (name && !seen.has(name.toUpperCase())) {
        seen.add(name.toUpperCase());
        list.push(name);
      }
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [allOrders]);

  // Build Team / Division options contextually filtered by selected School/Program if possible
  const teamDivisionOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const targetSchool = selectedSchoolProgram.trim().toUpperCase();

    for (const order of allOrders) {
      const orderSchool = (order.programName || order.schoolProgramName || order.schoolName || order.gymName || "").trim().toUpperCase();
      if (targetSchool && orderSchool !== targetSchool) continue;

      const teamName = (order.teamName || order.division || order.contactName || "").trim();
      if (teamName && !seen.has(teamName.toUpperCase())) {
        seen.add(teamName.toUpperCase());
        list.push(teamName);
      }
    }

    // Fallback to all team names if none match
    if (list.length === 0 && targetSchool) {
      for (const order of allOrders) {
        const teamName = (order.teamName || order.division || order.contactName || "").trim();
        if (teamName && !seen.has(teamName.toUpperCase())) {
          seen.add(teamName.toUpperCase());
          list.push(teamName);
        }
      }
    }

    return list.sort((a, b) => a.localeCompare(b));
  }, [allOrders, selectedSchoolProgram]);

  // Pre-fill fields when modal opens for a record
  useEffect(() => {
    if (!open || !record) return;
    const initialSchool = record.programName || (record as any).schoolProgramName || "";
    setSelectedSchoolProgram(initialSchool);
    setSchoolSearch(initialSchool);

    const initialTeam = (record as any).teamName || record.contactName || "";
    setSelectedTeamDivision(initialTeam);
    setTeamSearch(initialTeam);

    setRateIndex(0); // Default to $20 (Cheer) or $25 (Dance)
    setManualAmount("");
    setError(null);
    setSaving(false);
  }, [open, record]);

  const filteredSchoolOptions = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return schoolProgramOptions.slice(0, 30);
    return schoolProgramOptions.filter((s) => s.toLowerCase().includes(q)).slice(0, 30);
  }, [schoolProgramOptions, schoolSearch]);

  const filteredTeamOptions = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teamDivisionOptions.slice(0, 30);
    return teamDivisionOptions.filter((t) => t.toLowerCase().includes(q)).slice(0, 30);
  }, [teamDivisionOptions, teamSearch]);

  const handleClose = () => {
    setShowSchoolDropdown(false);
    setShowTeamDropdown(false);
    onClose();
  };

  const handleAdd = async () => {
    setError(null);

    if (!record) {
      setError("No payroll row selected.");
      return;
    }

    if (!selectedSchoolProgram.trim()) {
      setError("Please select a School / Program.");
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
        orderId: record.orderId || record.id,
        mtdId: record.id,
        programName: selectedSchoolProgram.trim(),
        teamName: selectedTeamDivision.trim() || null,
        contactName: record.contactName || null,
        category: effectiveCategory,
        addonType: "voiceover",
        amount,
        rateSource: selectedRate.source,
        producerId: assignedProducerObj?.id || null,
        producerInitials: assignedProducerObj?.initials || record.assignedProducer || null,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add voiceover.");
      setSaving(false);
    }
  };

  if (!open || !record) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={() => {
        setShowSchoolDropdown(false);
        setShowTeamDropdown(false);
      }}
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-xl border border-brand-line bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-brand-ink">Add Voiceover</h2>
            <p className="text-xs text-brand-ink-faint">Row: {record.programName}</p>
          </div>
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
          {/* Producer (Automatic / Read-only) */}
          <div className="rounded-lg border border-brand-line/70 bg-brand-bg/60 p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-faint">
              Assigned Producer
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Avatar producer={assignedProducerObj ?? undefined} initials={record.assignedProducer} size="xs" />
              <span className="text-sm font-semibold text-brand-ink">
                {assignedProducerObj?.name || record.assignedProducer || "Unassigned"}
              </span>
              {assignedProducerObj?.initials && (
                <span className="rounded bg-brand-hover px-1.5 py-0.5 text-xs font-semibold text-brand-ink-secondary">
                  ({assignedProducerObj.initials})
                </span>
              )}
            </div>
          </div>

          {/* School / Program Selection */}
          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              School / Program <span className="text-brand-orange">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink-faint focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
                placeholder="Search or enter school/program…"
                value={schoolSearch}
                onChange={(e) => {
                  setSchoolSearch(e.target.value);
                  setSelectedSchoolProgram(e.target.value);
                  setShowSchoolDropdown(true);
                }}
                onFocus={() => setShowSchoolDropdown(true)}
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-brand-ink-faint" />
            </div>

            {showSchoolDropdown && filteredSchoolOptions.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-brand-line bg-brand-surface shadow-lg">
                {filteredSchoolOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex w-full px-3 py-2 text-left text-sm font-medium text-brand-ink hover:bg-brand-hover"
                    onClick={() => {
                      setSelectedSchoolProgram(opt);
                      setSchoolSearch(opt);
                      setShowSchoolDropdown(false);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team / Division Selection */}
          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Team / Division
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink-faint focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30"
                placeholder="Search or enter team/division…"
                value={teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                  setSelectedTeamDivision(e.target.value);
                  setShowTeamDropdown(true);
                }}
                onFocus={() => setShowTeamDropdown(true)}
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-brand-ink-faint" />
            </div>

            {showTeamDropdown && filteredTeamOptions.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-brand-line bg-brand-surface shadow-lg">
                {filteredTeamOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex w-full px-3 py-2 text-left text-sm font-medium text-brand-ink hover:bg-brand-hover"
                    onClick={() => {
                      setSelectedTeamDivision(opt);
                      setTeamSearch(opt);
                      setShowTeamDropdown(false);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rate Selection */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-brand-ink-secondary">
                Voiceover Rate ({effectiveCategory}) <span className="text-brand-orange">*</span>
              </label>
            </div>
            <div className="flex gap-2">
              {rates.map((rate, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRateIndex(i);
                    if (rate.source !== "manual") setManualAmount("");
                  }}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
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

          {/* Manual Amount Input */}
          {isManual && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
                Manual Amount <span className="text-brand-orange">*</span>
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
                  autoFocus
                />
              </div>
            </div>
          )}

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
