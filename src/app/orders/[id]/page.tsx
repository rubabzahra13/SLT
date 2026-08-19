import Link from "next/link";
import { ArrowLeft, Edit3, Archive } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HaveToggle } from "@/components/ui/HaveToggle";
import { AttentionFlag } from "@/components/ui/AttentionFlag";
import { Avatar } from "@/components/ui/Avatar";
import { findOrder, getData, formatPrice } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const { mtdRecords, producers } = getData();
  const order = findOrder(id);
  if (!order) notFound();

  const isPast = order.status === "completed" || from === "past";
  const mtd = order.mtdId
    ? mtdRecords.find((r) => r.id === order.mtdId)
    : undefined;
  const suggestedProducers = producers
    .filter((p) => p.specialty === order.category || order.category === "Cheer")
    .slice(0, 3);

  return (
    <>
      <PageHeader title={isPast ? "Past Order" : "Order Details"} />

      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <Link
          href={isPast ? "/orders?tab=past" : "/orders"}
          className="link-premium inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to {isPast ? "past orders" : "active orders"}
        </Link>

        <article className="surface-premium overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-brand-line px-6 py-4">
            <Avatar
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customerName}&backgroundColor=f5f5f3`}
              alt={order.customerName}
            />
            <div className="flex-1">
              <p className="text-display text-[15px]">{order.programName}</p>
              <p className="text-[13px] text-brand-ink-secondary">
                {order.customerName}
              </p>
            </div>
            <StatusBadge status={order.status} size="md" />
          </div>

          {isPast ? (
            <div className="flex items-center gap-2 border-b border-brand-line bg-brand-bg/50 px-6 py-3">
              <Archive className="h-3.5 w-3.5 text-brand-ink-tertiary" strokeWidth={1.75} />
              <p className="text-[12px] text-brand-ink-secondary">
                Completed order · archived for reference
                {order.completedAt ? ` · ${order.completedAt}` : ""}
              </p>
            </div>
          ) : null}

          <div className="space-y-5 p-6">
            {!isPast && order.needsAttention && order.attentionReason ? (
              <AttentionFlag reason={order.attentionReason} />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" value={order.category} />
              <Field label="Package" value={order.package} />
              <Field
                label={isPast ? "Producer" : "Requested Producer"}
                value={
                  isPast
                    ? order.assignedProducer || order.requestedProducer
                    : order.requestedProducer
                }
              />
              <Field label="Price" value={formatPrice(order.price)} />
              <Field
                label={isPast ? "Completed" : "Received"}
                value={order.completedAt || order.createdAt}
              />
              {mtd ? (
                <>
                  <Field label="Invoice #" value={mtd.invoice || "-"} editable />
                  <Field label="Mix Start Date" value={mtd.mixStartDate || "-"} editable />
                </>
              ) : null}
            </div>

            {mtd ? (
              <div className="rounded-xl bg-brand-bg/60 p-4">
                <p className="text-label mb-3">Materials</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <HaveToggle label="8-Count Sheet" value={mtd.eightCountSheet} />
                  <HaveToggle label="Songs" value={mtd.haveSongs} />
                </div>
                <p className="mt-4 text-[13px] text-brand-ink-secondary">
                  {mtd.musicTheme}
                </p>
              </div>
            ) : null}
          </div>
        </article>

        {!isPast ? (
          <section className="surface-premium rounded-2xl p-6">
            <h2 className="text-display text-[15px]">Suggested Producers</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              Based on genre ({order.category}) and earliest availability
            </p>
            <div className="mt-4 space-y-2">
              {suggestedProducers.map((producer) => (
                <div
                  key={producer.id}
                  className="flex items-center justify-between rounded-xl border border-brand-line bg-brand-bg/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={producer.avatar} alt={producer.name} size="sm" />
                    <div>
                      <p className="text-[13px] font-semibold">{producer.name}</p>
                      <p className="text-[12px] text-brand-ink-tertiary">
                        {producer.specialty}, available {producer.nextAvailable}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-brand-accent px-4 py-2 text-[12px] font-semibold text-white hover:bg-brand-accent-hover"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  editable,
}: {
  label: string;
  value: string;
  editable?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-label">{label}</span>
        {editable ? (
          <Edit3 className="h-3 w-3 text-brand-ink-tertiary" strokeWidth={1.75} />
        ) : null}
      </div>
      <p className="mt-1.5 text-[13px] font-semibold">{value}</p>
    </div>
  );
}
