"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { inferFormType, normalizeOrder } from "@/lib/order-form";
import type { Order } from "@/types";

type AddPastOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (order: Order) => void;
  producers: string[];
};

const categories = ["Cheer", "Dance", "Marching Band", "School", "Outsourced"];

export function AddPastOrderModal({
  open,
  onClose,
  onAdd,
  producers,
}: AddPastOrderModalProps) {
  const [form, setForm] = useState({
    programName: "",
    customerName: "",
    musicTheme: "",
    category: "Cheer",
    package: "",
    assignedProducer: producers[0] || "CASEY",
    price: "",
    completedAt: new Date().toISOString().slice(0, 10),
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const draft = {
      id: `ord-past-${Date.now()}`,
      customerName: form.customerName.toUpperCase(),
      contactName: form.customerName.toUpperCase(),
      programName: form.programName.toUpperCase(),
      schoolProgramName: form.programName.toUpperCase(),
      schoolAddress: "",
      city: "",
      stateProvince: "",
      zipPostalCode: "",
      country: "United States",
      division: form.category,
      coachName: form.customerName.toUpperCase(),
      coachPhone: "",
      coachEmail: "",
      billingPersonName: form.customerName.toUpperCase(),
      billingPersonEmail: "",
      choreographerName: "N/A",
      choreographerEmail: "N/A",
      numberOfCopies: "",
      packageType: form.package.toUpperCase() || "TBD",
      requestedEditor: form.assignedProducer,
      timeLengthOfMix: "",
      musicAffiliate: "Power Music Covers",
      powerMusicCovers: form.musicTheme.toUpperCase() || "",
      routineNotes: form.musicTheme.toUpperCase() || "",
      customVoiceovers: "No - None",
      category: form.category,
      package: form.package.toUpperCase() || "TBD",
      musicTheme: form.musicTheme.toUpperCase() || "PM & UTB COVERS (CM)",
      editorRequest: form.assignedProducer,
      requestedProducer: form.assignedProducer,
      assignedProducer: form.assignedProducer,
      price: Number(form.price) || 0,
      status: "completed" as const,
      createdAt: form.completedAt,
      completedAt: form.completedAt,
      needsAttention: false,
      attentionReason: null,
    };
    const order = normalizeOrder({
      ...draft,
      formType: inferFormType(draft),
    });
    onAdd(order);
    setForm({
      programName: "",
      customerName: "",
      musicTheme: "",
      category: "Cheer",
      package: "",
      assignedProducer: producers[0] || "CASEY",
      price: "",
      completedAt: new Date().toISOString().slice(0, 10),
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
      <div className="surface-premium relative w-full max-w-lg rounded-2xl p-6 shadow-[var(--shadow-premium)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-label">Past orders</p>
            <h2 className="text-display mt-1 text-[18px]">Add past order</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              Archive a completed order for search and reference.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Program name">
            <input
              required
              value={form.programName}
              onChange={(e) => setForm({ ...form, programName: e.target.value })}
              placeholder="SPIRIT XTREME AS MIGHTY MINI"
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact">
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="WALTER"
                className={inputClass}
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Package">
            <input
              value={form.package}
              onChange={(e) => setForm({ ...form, package: e.target.value })}
              placeholder="PLATINUM 2:30 NO SPLIT"
              className={inputClass}
            />
          </Field>
          <Field label="Music / theme (F)">
            <input
              value={form.musicTheme}
              onChange={(e) => setForm({ ...form, musicTheme: e.target.value })}
              placeholder="SONGS FOR CHEER EDITORS CHOICE (CM)"
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Producer">
              <select
                value={form.assignedProducer}
                onChange={(e) =>
                  setForm({ ...form, assignedProducer: e.target.value })
                }
                className={inputClass}
              >
                {producers.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Price">
              <input
                type="number"
                required
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="1400"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Completed date">
            <input
              type="date"
              required
              value={form.completedAt}
              onChange={(e) => setForm({ ...form, completedAt: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-brand-line py-2.5 text-[13px] font-semibold transition hover:bg-brand-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand-accent py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-accent-hover"
            >
              Add to past orders
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-brand-line bg-brand-bg px-3.5 py-2.5 text-[13px] outline-none transition focus:border-brand-line-strong focus:bg-brand-surface";
