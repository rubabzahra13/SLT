"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, Music2, StickyNote } from "lucide-react";
import {
  hasMeaningfulFieldValue,
  initialCollectionGreenDraft,
  placeholderFieldErrorMessage,
  resolveCollectionPlaceholderOnFile,
} from "@/lib/empty-field-tokens";
import {
  formatMixDuration,
  isValidMixDuration,
  normalizeMixDurationValue,
  parseMixDurationParts,
} from "@/lib/mix-duration";

export type SongsNotesToggleKind = "songs" | "notes" | "mix";
export type SongsNotesToggleDirection = "to_red" | "to_green";

type SongsNotesToggleModalProps = {
  open: boolean;
  kind: SongsNotesToggleKind;
  direction: SongsNotesToggleDirection;
  /** Current field text shown when removing (green → red) or as placeholder warning. */
  currentText?: string;
  /** Override Magento field label (e.g. School Anthem style / lyrical notes). */
  fieldLabel?: string;
  onClose: () => void;
  /** to_red: confirm clear. to_green: confirm with entered text. */
  onConfirm: (text: string) => void;
};

export function SongsNotesToggleModal({
  open,
  kind,
  direction,
  currentText = "",
  fieldLabel: fieldLabelProp,
  onClose,
  onConfirm,
}: SongsNotesToggleModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Red→green: never prefill placeholder tokens (none, N/A, …): blank draft.
    // Mix: normalize Magento bare minutes ("1" → "1:00") so min:sec inputs fill.
    const seed =
      direction === "to_green"
        ? initialCollectionGreenDraft(currentText)
        : currentText;
    const mixSeed =
      kind === "mix" && seed.trim()
        ? normalizeMixDurationValue(seed) || seed
        : seed;
    setDraft(mixSeed);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, direction, currentText, kind]);

  if (!mounted || !open) return null;

  const isSongs = kind === "songs";
  const isMix = kind === "mix";
  const fieldLabel =
    fieldLabelProp ||
    (isMix
      ? "Time Length of Mix"
      : isSongs
        ? "Song list/suggestions"
        : "Routine notes");
  const removing = direction === "to_red";
  const mixParts = parseMixDurationParts(draft);
  const canConfirmGreen = isMix
    ? isValidMixDuration(draft)
    : hasMeaningfulFieldValue(draft);
  // Same amber UI for Songs / Notes / Mix on every category when a
  // dictionary placeholder is on file (none, N/A, TBD, labeled Dance covers, …).
  const placeholderStored = resolveCollectionPlaceholderOnFile(currentText);

  const title = removing
    ? isMix
      ? "Remove mix time?"
      : isSongs
        ? "Remove songs?"
        : "Remove notes?"
    : isMix
      ? "Add mix time?"
      : isSongs
        ? "Add songs?"
        : "Add notes?";

  const pillName = isMix ? "Mix Time" : isSongs ? "Songs" : "Notes";
  // When a placeholder is on file, the amber panel carries that detail — keep
  // the subtitle short so the same warning is not repeated twice.
  const body = removing
    ? currentText.trim()
      ? `The text below is currently stored in ${fieldLabel}. Confirm to remove it and mark ${pillName} as missing (red).`
      : `Confirm to clear ${fieldLabel} and mark ${pillName} as missing (red).`
    : isMix
      ? `Enter ${fieldLabel} to mark Mix Time as collected. This updates the form field and turns the pill green.`
      : isSongs
        ? `Enter ${fieldLabel} to mark Songs as have. This updates the form field and turns the pill green.`
        : `Enter ${fieldLabel} to mark Notes as have. This updates the form field and turns the pill green.`;

  const confirmLabel = removing
    ? isMix
      ? "Remove mix time"
      : isSongs
        ? "Remove songs"
        : "Remove notes"
    : isMix
      ? "Save mix time"
      : isSongs
        ? "Save songs"
        : "Save notes";

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="songs-notes-toggle-title"
        className="relative w-full max-w-[440px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div
            className={
              removing
                ? "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f9d7d7] text-[#901313] ring-1 ring-inset ring-[#ebafaf]"
                : "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#c2e7d9] text-[#0f5236] ring-1 ring-inset ring-[#9edbb8]"
            }
          >
            {isMix ? (
              <Clock3 className="h-6 w-6" strokeWidth={1.75} />
            ) : isSongs ? (
              <Music2 className="h-6 w-6" strokeWidth={1.75} />
            ) : (
              <StickyNote className="h-6 w-6" strokeWidth={1.75} />
            )}
          </div>
          <h2
            id="songs-notes-toggle-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            {title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {body}
          </p>

          {removing && currentText.trim() ? (
            <div className="mt-4 max-h-28 overflow-y-auto rounded-xl border border-brand-line/50 bg-white px-3.5 py-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                Current {fieldLabel}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-brand-ink">
                {currentText.trim()}
              </p>
            </div>
          ) : null}

          {!removing && placeholderStored ? (
            <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 px-3.5 py-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-800/80">
                Needs a real answer
              </p>
              <p className="mt-1 text-[11px] leading-snug text-amber-900/80">
                Right now this is set to “{placeholderStored}”. Enter a real{" "}
                {fieldLabel.toLowerCase()} below to mark this complete.
              </p>
            </div>
          ) : null}

          {!removing ? (
            <div className="mt-4 text-left">
              <label
                htmlFor="songs-notes-toggle-input"
                className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary"
              >
                {fieldLabel}
              </label>
              {isMix ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <label className="sr-only" htmlFor="songs-notes-toggle-minutes">
                    Minutes
                  </label>
                  <input
                    id="songs-notes-toggle-minutes"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    step={1}
                    value={mixParts.minutes}
                    onChange={(e) => {
                      const nextMins = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
                      setDraft(
                        formatMixDuration(nextMins, mixParts.seconds || "00")
                      );
                    }}
                    placeholder="0"
                    className="h-10 w-[88px] rounded-xl border border-brand-line/60 bg-white px-3 text-center text-[13px] tabular-nums text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                    autoFocus
                  />
                  <span
                    className="text-[15px] font-semibold text-brand-ink-secondary"
                    aria-hidden
                  >
                    :
                  </span>
                  <label className="sr-only" htmlFor="songs-notes-toggle-seconds">
                    Seconds
                  </label>
                  <input
                    id="songs-notes-toggle-seconds"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    step={1}
                    value={mixParts.seconds}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
                      const capped =
                        raw === ""
                          ? ""
                          : String(Math.min(59, Number(raw))).padStart(
                              raw.length >= 2 ? 2 : raw.length,
                              "0"
                            );
                      setDraft(
                        formatMixDuration(mixParts.minutes || "0", capped)
                      );
                    }}
                    placeholder="00"
                    className="h-10 w-[88px] rounded-xl border border-brand-line/60 bg-white px-3 text-center text-[13px] tabular-nums text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                  <span className="text-[11px] text-brand-ink-tertiary">
                    min : sec
                  </span>
                </div>
              ) : (
                <textarea
                  id="songs-notes-toggle-input"
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Enter ${fieldLabel.toLowerCase()}…`}
                  className="mt-1.5 w-full resize-y rounded-xl border border-brand-line/60 bg-white px-3 py-2.5 text-[13px] text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  autoFocus
                />
              )}
              {!isMix && draft.trim() && !canConfirmGreen ? (
                <p className="mt-1.5 text-[11px] text-[#901313]">
                  {placeholderFieldErrorMessage(draft)}
                </p>
              ) : null}
              {isMix && draft.trim() && !canConfirmGreen ? (
                <p className="mt-1.5 text-[11px] text-[#901313]">
                  Enter a time greater than 0:00.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="border-r border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!removing && !canConfirmGreen}
            onClick={() => onConfirm(removing ? "" : draft.trim())}
            className={
              removing
                ? "py-3.5 text-[15px] font-semibold text-[#901313] transition hover:bg-[#f9d7d7]/50 disabled:cursor-not-allowed disabled:opacity-40"
                : "py-3.5 text-[15px] font-semibold text-[#0f5236] transition hover:bg-[#c2e7d9]/50 disabled:cursor-not-allowed disabled:opacity-40"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
