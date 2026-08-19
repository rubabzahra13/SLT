import { Plus, Mail, Music } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { getData } from "@/lib/data";
import clsx from "clsx";

export default function ProducersPage() {
  const { producers } = getData();

  return (
    <>
      <PageHeader
        title="Producer Roster"
        subtitle="Manage producers, add, edit, or remove without dev help"
        action={{ label: "Add Producer" }}
      />

      <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {producers.map((producer) => (
          <article
            key={producer.id}
            className="surface-premium rounded-2xl p-6 transition hover:shadow-[var(--shadow-premium)]"
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={clsx(
                  producer.status === "available" && "ring-available",
                  producer.status === "limited" && "ring-limited",
                  producer.status === "unavailable" && "ring-unavailable"
                )}
              >
                <Avatar src={producer.avatar} alt={producer.name} size="lg" />
              </div>
              <h3 className="text-display mt-4 text-[15px]">{producer.name}</h3>
              <p className="mt-0.5 text-[12px] font-medium text-brand-ink-tertiary">
                {producer.initials}
              </p>
              <span className="mt-3 rounded-full border border-brand-line bg-brand-bg px-3 py-1 text-[11px] font-medium text-brand-ink-secondary">
                {producer.specialty}
              </span>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-brand-line pt-5">
              <div className="flex items-center gap-2.5 text-[12px] text-brand-ink-secondary">
                <Mail className="h-3.5 w-3.5 text-brand-ink-tertiary" strokeWidth={1.75} />
                <span className="truncate">{producer.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12px] text-brand-ink-secondary">
                <Music className="h-3.5 w-3.5 text-brand-ink-tertiary" strokeWidth={1.75} />
                <span>{producer.mixesThisWeek} mixes this week</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-brand-line py-2.5 text-[13px] font-semibold transition hover:bg-brand-bg"
            >
              Edit
            </button>
          </article>
        ))}

        <button
          type="button"
          className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-brand-line-strong bg-brand-bg/50 text-brand-ink-tertiary transition hover:border-brand-ink-tertiary hover:text-brand-ink"
        >
          <Plus className="h-6 w-6" strokeWidth={1.5} />
          <span className="mt-2 text-[13px] font-medium">Add producer</span>
        </button>
      </div>
    </>
  );
}
