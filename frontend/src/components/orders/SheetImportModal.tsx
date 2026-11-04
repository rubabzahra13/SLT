"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Upload, X } from "lucide-react";
import {
  importOrdersInChunks,
  type ImportChunkRow,
} from "@/lib/api/orders-board";

type SheetImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

function parseSheetText(text: string): ImportChunkRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const gymI = idx("school_gym_name") >= 0 ? idx("school_gym_name") : idx("gym");
  const coachI = idx("coach_name") >= 0 ? idx("coach_name") : idx("coach");
  const teamI = idx("team_name") >= 0 ? idx("team_name") : idx("team");
  const pkgI = idx("package");
  const formI = idx("form_type");
  const extI = idx("external_id") >= 0 ? idx("external_id") : idx("id");

  return lines.slice(1).map((line, i) => {
    const cols = line.split(delim);
    return {
      external_id: extI >= 0 ? cols[extI]?.trim() || `row-${i + 1}` : `row-${i + 1}`,
      form_type: (formI >= 0 && cols[formI]?.trim()) || "school-all-star-cheer",
      school_gym_name: gymI >= 0 ? cols[gymI]?.trim() : "",
      coach_name: coachI >= 0 ? cols[coachI]?.trim() : "",
      team_name: teamI >= 0 ? cols[teamI]?.trim() : "",
      package: pkgI >= 0 ? cols[pkgI]?.trim() : "TBD",
      is_manual_entry: true,
      status: "new",
    };
  });
}

export function SheetImportModal({
  open,
  onClose,
  onImported,
}: SheetImportModalProps) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open || typeof document === "undefined") return null;

  const runImport = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const text = await file.text();
      const rows = parseSheetText(text);
      if (rows.length === 0) {
        setError("No data rows found. Use a CSV/TSV with a header row.");
        return;
      }
      const res = await importOrdersInChunks(rows, (done, total) => {
        setProgress({ done, total });
      });
      setResult(
        `Imported ${res.imported} · failed ${res.failed}${
          res.errors[0] ? ` · first error: ${res.errors[0].message}` : ""
        }`
      );
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[22px] bg-brand-elevated p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-brand-ink">Import sheet</h2>
            <p className="mt-1 text-[13px] text-brand-ink-tertiary">
              CSV/TSV in chunks of 100 rows. Headers: school_gym_name, coach_name,
              team_name, package, form_type, external_id.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary hover:bg-brand-bg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-brand-line px-4 py-8 text-center hover:bg-brand-bg/60">
          <Upload className="h-5 w-5 text-brand-ink-secondary" />
          <span className="text-[13px] font-semibold text-brand-ink">
            {busy ? "Importing…" : "Choose CSV / TSV file"}
          </span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void runImport(file);
              e.target.value = "";
            }}
          />
        </label>
        {busy && progress ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-brand-ink-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress.done} / {progress.total} rows
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-[13px] font-medium text-red-700">{error}</p>
        ) : null}
        {result ? (
          <p className="mt-3 text-[13px] font-medium text-brand-success">{result}</p>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
