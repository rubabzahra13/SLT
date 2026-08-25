"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeleteDiscountCodeModal } from "@/components/discount-codes/DeleteDiscountCodeModal";
import { DiscountCodeFormModal } from "@/components/discount-codes/DiscountCodeFormModal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useAppState } from "@/context/AppStateContext";
import type { DiscountCode } from "@/types";

export default function DiscountCodesPage() {
  const {
    discountCodes,
    addDiscountCode,
    updateDiscountCode,
    removeDiscountCode,
  } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [deleting, setDeleting] = useState<DiscountCode | null>(null);

  const sortedCodes = useMemo(
    () =>
      [...discountCodes].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
      ),
    [discountCodes]
  );

  const columns: Column<DiscountCode>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        width: "140px",
        render: (entry) => (
          <span className="font-semibold tracking-[0.04em] text-brand-ink">
            {entry.code}
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        render: (entry) => (
          <span className="text-brand-ink-secondary">{entry.description}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "96px",
        align: "right",
        sticky: "right",
        render: (entry) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setEditing(entry);
                setModalOpen(true);
              }}
              className="rounded-full p-2 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
              aria-label={`Edit ${entry.code}`}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
                setDeleting(entry);
              }}
              className="rounded-full p-2 text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-danger"
              aria-label={`Delete ${entry.code}`}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function handleSave(entry: DiscountCode) {
    if (editing) {
      updateDiscountCode(entry.id, entry);
    } else {
      addDiscountCode(entry);
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    removeDiscountCode(deleting.id);
    setDeleting(null);
    if (editing?.id === deleting.id) {
      setModalOpen(false);
      setEditing(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Discount codes"
        subtitle="Manage promo codes and what each one is for"
        action={{ label: "Add code", onClick: openAdd }}
      />

      <div className="p-6 lg:p-8">
        <Link
          href="/settings"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-ink-secondary transition hover:text-brand-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back to settings
        </Link>

        <div className="surface-premium overflow-hidden rounded-2xl">
          <DataTable
            columns={columns}
            data={sortedCodes}
            rowKey={(entry) => entry.id}
            emptyMessage="No discount codes yet. Add one to get started."
            onRowClick={(entry) => {
              setEditing(entry);
              setModalOpen(true);
            }}
          />
        </div>
      </div>

      <DiscountCodeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        discountCode={editing}
        discountCodes={discountCodes}
        onSave={handleSave}
      />

      <DeleteDiscountCodeModal
        open={Boolean(deleting)}
        discountCode={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
