import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getData, formatPrice } from "@/lib/data";

export default function AssignmentsPage() {
  const { orders, producers } = getData();
  const pending = orders.filter(
    (o) => o.status === "new" || o.requestedProducer === "First Available"
  );

  return (
    <>
      <PageHeader
        title="Assignments"
        badge={`${pending.length} pending`}
        subtitle="Match orders to the right producer by genre and availability"
      />

      <div className="space-y-6 p-6">
        {pending.map((order) => {
          const suggestions = producers
            .filter(
              (p) =>
                p.specialty === order.category ||
                (order.category === "Cheer" && p.specialty === "Cheer")
            )
            .slice(0, 3);

          return (
            <article
              key={order.id}
              className="surface-premium overflow-hidden rounded-2xl"
            >
              <div className="border-b border-brand-line px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-display text-[15px]">{order.programName}</h3>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-brand-ink-secondary">
                  {order.customerName} · {order.category} · {order.package} ·{" "}
                  {formatPrice(order.price)}
                </p>
                <p className="mt-2 text-sm">
                  Requested:{" "}
                  <span className="font-semibold">{order.requestedProducer}</span>
                </p>
              </div>

              <div className="p-5">
                <p className="mb-3 text-label">
                  Suggested Producers
                </p>
                <div className="space-y-2">
                  {suggestions.map((producer, i) => (
                    <div
                      key={producer.id}
                      className="flex items-center justify-between rounded-xl border border-brand-line bg-brand-accent-soft/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            i === 0
                              ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange-soft text-xs font-bold text-brand-orange ring-1 ring-brand-orange-muted"
                              : "flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue-soft text-xs font-bold text-brand-signature ring-1 ring-brand-blue-muted"
                          }
                        >
                          {i + 1}
                        </span>
                        <Avatar src={producer.avatar} alt={producer.name} />
                        <div>
                          <p className="font-semibold text-brand-ink">
                            {producer.name}{" "}
                            <span className="text-brand-ink-secondary">
                              ({producer.initials})
                            </span>
                          </p>
                          <p
                            className={
                              i === 0
                                ? "text-sm text-brand-orange"
                                : "text-sm text-brand-blue"
                            }
                          >
                            Available {producer.nextAvailable}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl bg-brand-cta px-5 py-2 text-sm font-semibold text-brand-cta-text transition hover:bg-brand-cta-hover"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
