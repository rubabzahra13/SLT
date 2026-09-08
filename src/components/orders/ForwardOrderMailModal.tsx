"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Copy, Mail, X } from "lucide-react";
import clsx from "clsx";
import { titleCase } from "@/lib/data";
import {
  buildForwardMailClipboardText,
  buildForwardMailDraft,
  buildForwardOrderMailFieldGroups,
  defaultSelectedForwardMailKeys,
  flattenForwardMailFields,
  resolveDefaultEditorKey,
  type ForwardMailDraft,
  type ForwardMailField,
} from "@/lib/forward-order-mail";
import { findLinkedOrder } from "@/lib/editor-assignment";
import type { MTDRecord, Order, Producer } from "@/types";

type ForwardOrderMailModalProps = {
  open: boolean;
  record: MTDRecord | null;
  orderById: Map<string, Order>;
  allOrders: Order[];
  producers: Producer[];
  onClose: () => void;
};

type ModalStep = "compose" | "confirm";

function MailPreview({ draft }: { draft: ForwardMailDraft }) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-line/70 bg-white shadow-sm ring-1 ring-inset ring-brand-line/20">
      <div className="border-b border-brand-line/50 bg-brand-bg/50 px-4 py-3">
        <div className="grid gap-2 text-[12px]">
          <div className="flex gap-2">
            <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary">
              To
            </span>
            <span className="min-w-0 text-brand-ink">
              {draft.toName}{" "}
              <span className="text-brand-ink-secondary">&lt;{draft.to}&gt;</span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary">
              Subject
            </span>
            <span className="min-w-0 font-medium text-brand-ink">{draft.subject}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <p className="text-[13px] leading-relaxed text-brand-ink">{draft.greeting}</p>
        <p className="text-[13px] leading-relaxed text-brand-ink-secondary">{draft.intro}</p>

        {draft.sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-signature">
              {section.title}
            </p>
            <div className="mt-2 space-y-1.5 rounded-lg bg-brand-bg/40 px-3 py-2.5">
              {section.fields.map((field) => (
                <div key={`${section.title}-${field.label}`} className="grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 gap-y-0.5 text-[12px]">
                  <span className="font-medium text-brand-ink-secondary">{field.label}</span>
                  <span className="whitespace-pre-wrap text-brand-ink">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-brand-line/40 pt-3">
          <p className="text-[12px] leading-relaxed text-brand-ink-secondary">{draft.footer}</p>
          <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-brand-ink">
            {draft.signature}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ForwardOrderMailModal({
  open,
  record,
  orderById,
  allOrders,
  producers,
  onClose,
}: ForwardOrderMailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<ModalStep>("compose");
  const [editorId, setEditorId] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const linkedOrder = useMemo(
    () => (record ? findLinkedOrder(record, allOrders) : null),
    [record, allOrders]
  );

  const fieldGroups = useMemo(
    () =>
      record
        ? buildForwardOrderMailFieldGroups(
            record,
            linkedOrder,
            orderById,
            producers
          )
        : [],
    [record, linkedOrder, orderById, producers]
  );

  const allFields = useMemo(
    () => flattenForwardMailFields(fieldGroups),
    [fieldGroups]
  );

  const fieldByKey = useMemo(() => {
    const map = new Map<string, ForwardMailField>();
    for (const field of allFields) {
      map.set(field.key, field);
    }
    return map;
  }, [allFields]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !record) return;
    setStep("compose");
    setEditorId(resolveDefaultEditorKey(record, producers, linkedOrder));
    setSelectedKeys(defaultSelectedForwardMailKeys(fieldGroups));
    setCopied(false);
  }, [open, record, producers, fieldGroups, linkedOrder]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || !record) return null;

  const editor = producers.find((producer) => producer.id === editorId);
  const selectedFields = selectedKeys
    .map((key) => fieldByKey.get(key))
    .filter((field): field is ForwardMailField => Boolean(field));

  const draft = buildForwardMailDraft(record, editor, selectedFields);
  const canContinue = Boolean(editor?.email) && selectedFields.length > 0;

  function toggleField(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );
  }

  function toggleSection(fields: ForwardMailField[]) {
    const keys = fields.map((field) => field.key);
    const allSelected = keys.every((key) => selectedKeys.includes(key));
    setSelectedKeys((current) => {
      if (allSelected) {
        return current.filter((key) => !keys.includes(key));
      }
      return Array.from(new Set([...current, ...keys]));
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildForwardMailClipboardText(draft));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const isCompose = step === "compose";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-order-mail-title"
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-signature/10 via-brand-elevated to-brand-blue/8 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-signature/12 text-brand-signature ring-1 ring-inset ring-brand-signature/20">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {isCompose ? "Forward order" : "Review email"}
                </p>
                <h2
                  id="forward-order-mail-title"
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                >
                  {isCompose ? "Send mail to editor" : "Email preview"}
                </h2>
                <p className="mt-1 truncate text-[13px] text-brand-ink-secondary">
                  {titleCase(record.programName)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isCompose ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  Send to editor
                </span>
                <select
                  value={editorId}
                  onChange={(event) => setEditorId(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-signature/50 focus:ring-2 focus:ring-brand-signature/15"
                >
                  {producers.map((producer) => (
                    <option key={producer.id} value={producer.id}>
                      {producer.name} · {producer.email}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                    Include in email
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKeys(
                        selectedKeys.length === allFields.length
                          ? []
                          : defaultSelectedForwardMailKeys(fieldGroups)
                      )
                    }
                    className="text-[12px] font-medium text-brand-signature hover:underline"
                  >
                    {selectedKeys.length === allFields.length ? "Clear all" : "Select all"}
                  </button>
                </div>

                <div className="space-y-3">
                  {fieldGroups.map((group) => {
                    const groupKeys = group.fields.map((field) => field.key);
                    const allGroupSelected = groupKeys.every((key) =>
                      selectedKeys.includes(key)
                    );
                    const someGroupSelected =
                      !allGroupSelected &&
                      groupKeys.some((key) => selectedKeys.includes(key));

                    return (
                      <div
                        key={group.title}
                        className="overflow-hidden rounded-xl border border-brand-line/70 bg-brand-bg/35"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(group.fields)}
                          className="flex w-full items-center justify-between gap-3 border-b border-brand-line/50 px-3 py-2.5 text-left transition hover:bg-brand-bg/60"
                        >
                          <span className="text-[12px] font-semibold text-brand-ink">
                            {group.title}
                          </span>
                          <span
                            className={clsx(
                              "text-[11px] font-medium",
                              allGroupSelected
                                ? "text-brand-signature"
                                : someGroupSelected
                                  ? "text-brand-ink-secondary"
                                  : "text-brand-ink-tertiary"
                            )}
                          >
                            {groupKeys.filter((key) => selectedKeys.includes(key)).length}/
                            {groupKeys.length}
                          </span>
                        </button>
                        <ul className="divide-y divide-brand-line/40">
                          {group.fields.map((field) => {
                            const active = selectedKeys.includes(field.key);
                            return (
                              <li key={field.key}>
                                <button
                                  type="button"
                                  onClick={() => toggleField(field.key)}
                                  className={clsx(
                                    "flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-brand-bg/50",
                                    active && "bg-brand-signature/5"
                                  )}
                                >
                                  <span
                                    className={clsx(
                                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                      active
                                        ? "border-brand-signature bg-brand-signature text-white"
                                        : "border-brand-line bg-white"
                                    )}
                                  >
                                    {active ? (
                                      <Check className="h-3 w-3" strokeWidth={3} />
                                    ) : null}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-medium text-brand-ink">
                                      {field.label}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[11px] text-brand-ink-secondary">
                                      {field.value}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <MailPreview draft={draft} />
          )}
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          {isCompose ? (
            <>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!canContinue}
                className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent"
              >
                Review email
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopy}
                disabled={selectedFields.length === 0}
                className="inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-brand-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy email"}
              </button>
              <button
                type="button"
                onClick={() => setStep("compose")}
                className="inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to fields
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
