"use client";

import { useMemo, useRef } from "react";
import clsx from "clsx";
import {
  countPlaceholderInText,
  parsePackedEmailDocument,
} from "@/lib/email-templates";
import {
  insertVariableChipAtSelection,
  serializeTemplateEditable,
  TemplateRichField,
  variableDisplayName,
} from "@/components/settings/TemplateRichField";

type InsertTarget = "subject" | "body";

const VARIABLE_HINTS: Record<string, string> = {
  programName: "Program",
  contactName: "Contact",
  day: "Day",
  completeDate: "Complete date",
  requiredData: "Required data",
  programLine: "Program + package",
  firstName: "Producer first name",
  editorName: "Editor",
  producerName: "Producer",
  periodLabel: "Pay period",
  mixLabel: "Mix count",
  scope: "Category scope",
  todayLabel: "Today",
};

function buildPackedDocument(subject: string, body: string): string {
  const sub = subject.trim();
  const message = body.trim();
  if (!sub && !message) return "";
  if (!message) return `Subject: ${sub}`;
  return `Subject: ${sub}\n\n${message}`;
}

type EmailTemplateDocumentPanelProps = {
  documentText: string;
  catalogPlaceholders: string[];
  isEditing: boolean;
  onDocumentChange: (text: string) => void;
};

export function EmailTemplateDocumentPanel({
  documentText,
  catalogPlaceholders,
  isEditing,
  onDocumentChange,
}: EmailTemplateDocumentPanelProps) {
  const subjectRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const insertTargetRef = useRef<InsertTarget>("body");

  const { subject, body } = useMemo(
    () => parsePackedEmailDocument(documentText),
    [documentText]
  );

  const updateSubject = (nextSubject: string) => {
    onDocumentChange(buildPackedDocument(nextSubject, body));
  };

  const updateBody = (nextBody: string) => {
    onDocumentChange(buildPackedDocument(subject, nextBody));
  };

  const insertKeyAtCursor = (key: string) => {
    const isSubject = insertTargetRef.current === "subject";
    const el = isSubject ? subjectRef.current : bodyRef.current;
    if (!el) return;

    insertVariableChipAtSelection(el, key, VARIABLE_HINTS);
    const next = serializeTemplateEditable(el, !isSubject);
    if (isSubject) updateSubject(next);
    else updateBody(next);
  };

  const addVariableAtCursor = (key: string) => {
    if (!isEditing) return;
    insertKeyAtCursor(key);
  };

  return (
    <div className="flex flex-col gap-3">
      {isEditing ? (
        <div className="rounded-xl border border-brand-line/50 bg-gradient-to-b from-brand-bg/60 to-white p-3.5 shadow-sm">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
            Variables
          </p>

          <div className="flex flex-wrap gap-1.5">
            {catalogPlaceholders.map((key) => {
              const inUse = countPlaceholderInText(documentText, key) > 0;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={inUse}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addVariableAtCursor(key)}
                  className={clsx(
                    "rounded-lg px-2.5 py-1.5 text-left ring-1 ring-inset transition",
                    inUse
                      ? "bg-brand-signature text-white ring-brand-signature shadow-sm hover:bg-brand-signature/90"
                      : "bg-brand-bg/50 text-brand-ink ring-brand-line/45 hover:bg-brand-blue-soft/30"
                  )}
                >
                  <span className="text-[12px] font-semibold">
                    {variableDisplayName(key, VARIABLE_HINTS)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-brand-ink-tertiary">
            Place the cursor in the subject or message, then click a variable
            to insert it (as many times as you need).{" "}
            <span className="font-medium text-brand-ink-secondary">
              Required data
            </span>{" "}
            is filled from the missing items you select when sending from
            Orders. Day and complete date are chosen in that same send modal.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-brand-line/50 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-brand-line/40 bg-brand-bg/35 px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
            Subject
          </p>
        </div>
        <TemplateRichField
          ref={subjectRef}
          value={subject}
          onChange={updateSubject}
          readOnly={!isEditing}
          onFocus={() => {
            insertTargetRef.current = "subject";
          }}
          placeholder="Subject line"
          ariaLabel="Email subject"
          variableHints={VARIABLE_HINTS}
          className="border-b border-brand-line/30 px-4 py-3 text-[14px]"
        />

        <div className="border-b border-brand-line/40 bg-brand-bg/35 px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
            Message
          </p>
        </div>
        <TemplateRichField
          ref={bodyRef}
          value={body}
          onChange={updateBody}
          multiline
          readOnly={!isEditing}
          onFocus={() => {
            insertTargetRef.current = "body";
          }}
          placeholder="Email message"
          ariaLabel="Email message"
          variableHints={VARIABLE_HINTS}
          className="px-4 py-4 text-[13px]"
        />
      </div>
    </div>
  );
}
