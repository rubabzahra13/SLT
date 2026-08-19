"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import {
  defaultBookedUntil,
  getSuggestedEditors,
  inferAssignmentMode,
  type EditorAssignmentMode,
} from "@/lib/editor-assignment";
import { suggestMixStartDate } from "@/lib/scheduling";
import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { EDITOR_NAMES } from "@/types";

export type EditorAssignmentResult = {
  editorRequest: string;
  assignedProducer: string | null;
  bookedUntil: string | null;
  mixStartDate?: string;
};

type AssignEditorModalProps = {
  open: boolean;
  record: MTDRecord | null;
  mtdRecords: MTDRecord[];
  producers: Producer[];
  schedule: ScheduleEntry[];
  onClose: () => void;
  onAssign: (recordId: string, result: EditorAssignmentResult) => void;
};

const inputClass =
  "w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] text-brand-ink outline-none transition focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15";

export function AssignEditorModal({
  open,
  record,
  mtdRecords,
  producers,
  schedule,
  onClose,
  onAssign,
}: AssignEditorModalProps) {
  const [mode, setMode] = useState<EditorAssignmentMode>("fa");
  const [specificEditor, setSpecificEditor] = useState<string>(EDITOR_NAMES[0]);
  const [faEditor, setFaEditor] = useState<string>("");
  const [bookedUntil, setBookedUntil] = useState(defaultBookedUntil());

  const suggestions = useMemo(
    () =>
      record
        ? getSuggestedEditors(mtdRecords, producers, schedule, record.id)
        : [],
    [record, mtdRecords, producers, schedule]
  );

  useEffect(() => {
    if (!record || !open) return;

    const initialMode = inferAssignmentMode(record);
    const available = getSuggestedEditors(
      mtdRecords,
      producers,
      schedule,
      record.id
    );

    setMode(initialMode);
    setBookedUntil(record.bookedUntil || defaultBookedUntil());

    if (initialMode === "specific" && typeof record.editorRequest === "string") {
      setSpecificEditor(record.editorRequest);
    } else if (record.assignedProducer) {
      setSpecificEditor(record.assignedProducer);
      setFaEditor(record.assignedProducer);
    } else if (available.length > 0) {
      setFaEditor(available[0].name);
    } else {
      setFaEditor("");
    }
  }, [record, open, mtdRecords, producers, schedule]);

  if (!open || !record) return null;

  const activeRecord = record;

  const resolvedProducer =
    mode === "na"
      ? null
      : mode === "specific"
        ? specificEditor
        : faEditor || null;

  const canSubmit =
    mode === "na" ||
    (mode === "specific" && Boolean(specificEditor) && Boolean(bookedUntil)) ||
    (mode === "fa" && Boolean(faEditor) && Boolean(bookedUntil));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const editorRequest =
      mode === "na" ? "NA" : mode === "fa" ? "FA" : specificEditor;

    const assignedProducer = mode === "na" ? null : resolvedProducer;
    const mixStartDate =
      assignedProducer
        ? suggestMixStartDate(assignedProducer, producers, schedule)
        : undefined;

    onAssign(activeRecord.id, {
      editorRequest,
      assignedProducer,
      bookedUntil: mode === "na" ? null : bookedUntil,
      mixStartDate: mixStartDate || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-ink/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="surface-premium relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-[var(--shadow-premium)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-label">Editor assignment</p>
            <h2 className="text-display mt-1 text-[18px]">Assign producer</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {activeRecord.programName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-label mb-2">Assignment type</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  { id: "fa" as const, label: "First Available" },
                  { id: "specific" as const, label: "Choose editor" },
                  { id: "na" as const, label: "Not assigned" },
                ] satisfies { id: EditorAssignmentMode; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={clsx(
                    "rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition",
                    mode === option.id
                      ? "border-brand-info/50 bg-brand-info/8 text-brand-ink"
                      : "border-brand-line/70 bg-brand-bg/30 text-brand-ink-secondary hover:border-brand-line hover:bg-brand-bg/60"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {mode === "fa" ? (
            <div className="space-y-2">
              <p className="text-label">Suggested available editors</p>
              <p className="text-[12px] text-brand-ink-tertiary">
                Editors not currently assigned to another MTD order.
              </p>
              {suggestions.length === 0 ? (
                <p className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
                  All editors are currently assigned. Choose a specific editor
                  instead.
                </p>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {suggestions.map((suggestion) => (
                    <label
                      key={suggestion.name}
                      className={clsx(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition",
                        faEditor === suggestion.name
                          ? "border-brand-info/50 bg-brand-info/8"
                          : "border-brand-line/70 hover:border-brand-line hover:bg-brand-bg/40"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="fa-editor"
                          checked={faEditor === suggestion.name}
                          onChange={() => setFaEditor(suggestion.name)}
                          className="accent-brand-info"
                        />
                        <span className="text-[13px] font-medium">
                          {suggestion.name}
                        </span>
                      </span>
                      <span className="text-[11px] text-brand-ink-tertiary">
                        {suggestion.slotLabel}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {mode === "specific" ? (
            <div>
              <label className="text-label" htmlFor="specific-editor">
                Editor
              </label>
              <select
                id="specific-editor"
                value={specificEditor}
                onChange={(e) => setSpecificEditor(e.target.value)}
                className={clsx(inputClass, "mt-1.5")}
              >
                {EDITOR_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {mode !== "na" ? (
            <div>
              <label className="text-label" htmlFor="booked-until">
                Booked until
              </label>
              <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                How long this producer is reserved for this order.
              </p>
              <input
                id="booked-until"
                type="date"
                required
                value={bookedUntil}
                onChange={(e) => setBookedUntil(e.target.value)}
                className={clsx(inputClass, "mt-1.5")}
              />
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-brand-line/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand-ink px-4 py-2 text-[13px] font-medium text-brand-surface transition hover:bg-brand-ink/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
