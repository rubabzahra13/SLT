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
              className="overflow-hidden rounded-2xl border border-ig-border bg-ig-surface"
            >
              <div className="border-b border-ig-border px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold">{order.programName}</h3>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-ig-text-secondary">
                  {order.customerName} · {order.category} · {order.package} ·{" "}
                  {formatPrice(order.price)}
                </p>
                <p className="mt-2 text-sm">
                  Requested:{" "}
                  <span className="font-semibold">{order.requestedProducer}</span>
                </p>
              </div>

              <div className="p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ig-text-secondary">
                  Suggested Producers
                </p>
                <div className="space-y-2">
                  {suggestions.map((producer, i) => (
                    <div
                      key={producer.id}
                      className="flex items-center justify-between rounded-xl border border-ig-border bg-ig-bg p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ig-text text-xs font-bold text-ig-surface">
                          {i + 1}
                        </span>
                        <Avatar src={producer.avatar} alt={producer.name} />
                        <div>
                          <p className="font-semibold">
                            {producer.name}{" "}
                            <span className="text-ig-text-secondary">
                              ({producer.initials})
                            </span>
                          </p>
                          <p className="text-sm text-ig-green">
                            Available {producer.nextAvailable}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl bg-ig-blue px-5 py-2 text-sm font-semibold text-white hover:bg-ig-blue-hover"
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
