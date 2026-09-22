"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  MailWarning,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmailTemplateDocumentPanel } from "@/components/settings/EmailTemplateDocumentPanel";
import { useAppState } from "@/context/AppStateContext";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_DEFINITIONS,
  packEmailTemplate,
  unpackEmailTemplate,
  type EmailTemplateDefinition,
  type EmailTemplateId,
} from "@/lib/email-templates";

const TEMPLATE_NAV_ICON: Record<EmailTemplateId, LucideIcon> = {
  customer_missing_data: MailWarning,
  customer_incorrect_data: RefreshCw,
  producer_order: Send,
  producer_payroll: Wallet,
  producer_schedule: CalendarDays,
};

function templateAudience(entry: EmailTemplateDefinition): "Customer" | "Producer" {
  return entry.id.startsWith("customer_") ? "Customer" : "Producer";
}

function templateShortTitle(entry: EmailTemplateDefinition): string {
  const parts = entry.label.split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ") : entry.label;
}

const TEMPLATE_NAV_GROUPS: {
  heading: string;
  match: (entry: EmailTemplateDefinition) => boolean;
}[] = [
  { heading: "Customer", match: (e) => e.id.startsWith("customer_") },
  { heading: "Producer", match: (e) => e.id.startsWith("producer_") },
];

export default function EmailTemplatesSettingsPage() {
  const {
    emailTemplates,
    updateEmailTemplate,
    resetEmailTemplate,
    isViewOnly,
  } = useAppState();
  const [selectedId, setSelectedId] = useState<EmailTemplateId>(
    EMAIL_TEMPLATE_DEFINITIONS[0].id
  );
  const [isEditing, setIsEditing] = useState(false);

  const selectedDef = useMemo(
    () =>
      EMAIL_TEMPLATE_DEFINITIONS.find((entry) => entry.id === selectedId) ??
      EMAIL_TEMPLATE_DEFINITIONS[0],
    [selectedId]
  );
  const draft = emailTemplates[selectedDef.id];
  const [documentText, setDocumentText] = useState(() =>
    packEmailTemplate(draft)
  );

  useEffect(() => {
    setDocumentText(packEmailTemplate(emailTemplates[selectedId]));
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- switch-only sync
  }, [selectedId]);

  return (
    <>
      <PageHeader
        title="Email templates"
        badge={`${EMAIL_TEMPLATE_DEFINITIONS.length}`}
        subtitle="Edit customer and producer email copy for orders, payroll, and schedule"
      />

      <div className="px-6 pb-6 pt-5 lg:px-8">
        <div className="mb-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-ink-secondary transition hover:text-brand-signature"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back to settings
          </Link>
        </div>

        <div className="flex items-start gap-4 max-sm:flex-col">
          <aside className="dashboard-panel h-fit w-[280px] shrink-0 overflow-hidden max-sm:w-full sm:sticky sm:top-4 sm:max-h-[calc(100vh-7rem)] sm:overflow-y-auto">
            <div className="border-b border-brand-line/30 px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                Templates
              </p>
              <p className="mt-1 text-[11px] font-medium text-brand-ink-tertiary">
                Choose a message to preview or edit
              </p>
            </div>
            <div className="space-y-5 p-3">
              {TEMPLATE_NAV_GROUPS.map((group) => {
                const items = EMAIL_TEMPLATE_DEFINITIONS.filter(group.match);
                if (items.length === 0) return null;
                return (
                  <div key={group.heading}>
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                      {group.heading}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {items.map((entry) => {
                        const active = entry.id === selectedDef.id;
                        const Icon = TEMPLATE_NAV_ICON[entry.id];
                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(entry.id)}
                              className={clsx(
                                "group relative flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                                active
                                  ? "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-brand-line/70"
                                  : "hover:bg-brand-bg/90 hover:ring-1 hover:ring-brand-line/35"
                              )}
                            >
                              {active ? (
                                <span
                                  className="absolute bottom-2.5 left-0 top-2.5 w-0.5 rounded-full bg-brand-signature"
                                  aria-hidden
                                />
                              ) : null}
                              <div
                                className={clsx(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors",
                                  active
                                    ? "bg-brand-blue-soft/80 text-brand-signature ring-brand-signature/25"
                                    : "bg-brand-bg-subtle/80 text-brand-ink-tertiary ring-brand-line/40 group-hover:text-brand-ink-secondary"
                                )}
                              >
                                <Icon className="h-4 w-4" strokeWidth={2} />
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <span
                                  className={clsx(
                                    "text-[13px] font-semibold leading-tight",
                                    active
                                      ? "text-brand-ink"
                                      : "text-brand-ink group-hover:text-brand-ink"
                                  )}
                                >
                                  {templateShortTitle(entry)}
                                </span>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-brand-ink-tertiary">
                                  {entry.description}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="dashboard-panel min-w-0 flex-1 overflow-hidden max-sm:w-full">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-line/30 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-brand-bg-subtle/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary ring-1 ring-inset ring-brand-line/40">
                    {templateAudience(selectedDef)}
                  </span>
                  <h2 className="text-[15px] font-semibold text-brand-ink">
                    {templateShortTitle(selectedDef)}
                  </h2>
                </div>
                <p className="mt-1 text-[12px] text-brand-ink-secondary">
                  {selectedDef.description}
                </p>
              </div>
              {!isViewOnly ? (
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          resetEmailTemplate(selectedDef.id);
                          setDocumentText(
                            packEmailTemplate(
                              DEFAULT_EMAIL_TEMPLATES[selectedDef.id]
                            )
                          );
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/70 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink-secondary shadow-sm transition hover:border-brand-line-strong hover:text-brand-ink"
                      >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateEmailTemplate(
                            selectedDef.id,
                            unpackEmailTemplate(documentText, draft)
                          );
                          setIsEditing(false);
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-signature/30 bg-brand-signature px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-brand-signature/90"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
                        Done
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentText(packEmailTemplate(draft));
                        setIsEditing(true);
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/70 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink-secondary shadow-sm transition hover:border-brand-line-strong hover:text-brand-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      Edit
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-4 sm:p-5">
              <EmailTemplateDocumentPanel
                documentText={
                  isEditing && !isViewOnly
                    ? documentText
                    : packEmailTemplate(draft)
                }
                catalogPlaceholders={selectedDef.placeholders}
                isEditing={isEditing && !isViewOnly}
                onDocumentChange={setDocumentText}
              />

              {isViewOnly ? (
                <p className="mt-3 text-[13px] text-brand-ink-tertiary">
                  View-only accounts cannot edit email templates.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
