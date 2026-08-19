import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AttentionFlag } from "@/components/ui/AttentionFlag";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { getData, formatPrice } from "@/lib/data";
import clsx from "clsx";

export default function DashboardPage() {
  const { stats, orders, producers, mtdRecords } = getData();
  const attentionOrders = orders.filter((o) => o.needsAttention);
  const newOrders = orders.filter((o) => o.status === "new");

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Wednesday, August 19, 2026"
      />

      <div className="space-y-8 p-8">
        {/* Producer strip */}
        <section>
          <p className="text-label mb-4">Team availability</p>
          <div className="flex gap-5 overflow-x-auto pb-1">
            {producers.slice(0, 8).map((producer) => (
              <Link
                key={producer.id}
                href={`/schedule?producer=${producer.initials}`}
                className="group flex shrink-0 flex-col items-center gap-2.5"
              >
                <div
                  className={clsx(
                    producer.status === "available" && "ring-available",
                    producer.status === "limited" && "ring-limited",
                    producer.status === "unavailable" && "ring-unavailable"
                  )}
                >
                  <Avatar src={producer.avatar} alt={producer.name} size="lg" />
                </div>
                <span className="max-w-[64px] truncate text-[11px] font-medium text-brand-ink-secondary group-hover:text-brand-ink">
                  {producer.initials}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="New orders"
            value={stats.newOrders}
            trend="Awaiting assignment"
          />
          <StatCard
            label="Needs attention"
            value={stats.needsAttention}
            trend="Scheduling or materials"
          />
          <StatCard
            label="Active mixes"
            value={stats.activeMixes}
            trend="In production"
          />
          <StatCard
            label="Outsourced"
            value={stats.outsourced}
            trend="Voiceovers and custom"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="New orders"
              action={
                <Link href="/orders" className="link-premium flex items-center gap-1">
                  View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
              }
            />
            <div>
              {newOrders.slice(0, 4).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 border-b border-brand-line px-6 py-4 transition last:border-b-0 hover:bg-brand-bg/60"
                >
                  <Avatar
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customerName}&backgroundColor=f5f5f3`}
                    alt={order.customerName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{order.programName}</p>
                    <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                      {order.customerName}, {order.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-1.5 text-[13px] font-semibold tabular-nums">
                      {formatPrice(order.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Needs attention"
              action={
                <Link href="/orders?filter=attention" className="link-premium flex items-center gap-1">
                  View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
              }
            />
            <div className="space-y-3 p-5">
              {attentionOrders.length > 0
                ? attentionOrders.slice(0, 4).map((order) => (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                      <AttentionFlag
                        reason={`${order.programName}: ${order.attentionReason}`}
                      />
                    </Link>
                  ))
                : mtdRecords
                    .filter((r) => r.needsAttention)
                    .slice(0, 3)
                    .map((rec) => (
                      <Link key={rec.id} href={`/mtd/${rec.id}`}>
                        <AttentionFlag
                          reason={`${rec.programName}: Missing materials`}
                        />
                      </Link>
                    ))}
            </div>
          </Card>
        </div>

        {/* Availability grid */}
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-display text-[15px]">Producer availability</h2>
            <Link href="/schedule" className="link-premium flex items-center gap-1">
              Open schedule <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {producers.slice(0, 5).map((producer) => (
              <div
                key={producer.id}
                className="rounded-xl border border-brand-line bg-brand-bg/50 p-4 transition hover:bg-brand-bg"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={producer.avatar} alt={producer.name} size="sm" />
                  <div>
                    <p className="text-[13px] font-semibold">{producer.name}</p>
                    <p className="text-[11px] text-brand-ink-tertiary">{producer.specialty}</p>
                  </div>
                </div>
                <p className="text-label mt-4">Next available</p>
                <p className="mt-1 text-[13px] font-semibold text-brand-success">
                  {producer.nextAvailable}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
