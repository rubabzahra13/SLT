"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Music2, StickyNote } from "lucide-react";

export type SongsNotesToggleKind = "songs" | "notes";
export type SongsNotesToggleDirection = "to_red" | "to_green";

type SongsNotesToggleModalProps = {
  open: boolean;
  kind: SongsNotesToggleKind;
  direction: SongsNotesToggleDirection;
  /** Current field text shown when removing (green → red). */
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
    setDraft(direction === "to_green" ? "" : currentText);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, direction, currentText]);

  if (!mounted || !open) return null;

  const isSongs = kind === "songs";
  const fieldLabel =
    fieldLabelProp ||
    (isSongs ? "Song list/suggestions" : "Routine notes");
  const removing = direction === "to_red";
  const canConfirmGreen = draft.trim().length > 0;

  const title = removing
    ? isSongs
      ? "Remove songs?"
      : "Remove notes?"
    : isSongs
      ? "Add songs?"
      : "Add notes?";

  const body = removing
    ? isSongs
      ? `Current text will be removed from ${fieldLabel}. The Songs pill will turn red.`
      : `Current text will be removed from ${fieldLabel}. The Notes pill will turn red.`
    : isSongs
      ? `Enter ${fieldLabel} to mark Songs as have. This updates the form field and turns the pill green.`
      : `Enter ${fieldLabel} to mark Notes as have. This updates the form field and turns the pill green.`;

  const confirmLabel = removing
    ? isSongs
      ? "Remove songs"
      : "Remove notes"
    : isSongs
      ? "Save songs"
      : "Save notes";

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
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
            {isSongs ? (
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

          {!removing ? (
            <div className="mt-4 text-left">
              <label
                htmlFor="songs-notes-toggle-input"
                className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary"
              >
                {fieldLabel}
              </label>
              <textarea
                id="songs-notes-toggle-input"
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Enter ${fieldLabel.toLowerCase()}…`}
                className="mt-1.5 w-full resize-y rounded-xl border border-brand-line/60 bg-white px-3 py-2.5 text-[13px] text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                autoFocus
              />
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
