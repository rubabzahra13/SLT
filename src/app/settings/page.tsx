import { PageHeader } from "@/components/layout/PageHeader";
import { Bell, Shield, Palette } from "lucide-react";

const sections = [
  {
    title: "Producer Settings",
    icon: Shield,
    items: [
      "Manage producer roster",
      "Set specializations by genre",
      "Configure availability defaults",
    ],
  },
  {
    title: "Pricing Rules",
    icon: Palette,
    items: [
      "Compliant vs non-compliant rates",
      "Package pricing templates",
      "Discount codes & affiliates",
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    items: [
      "Needs attention alerts",
      "New order notifications",
      "Producer assignment confirmations",
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Admin configuration" />

      <div className="mx-auto max-w-2xl space-y-4 p-6">
        {sections.map(({ title, icon: Icon, items }) => (
          <section
            key={title}
            className="surface-premium rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-accent-soft p-2.5 text-brand-ink-secondary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-display text-[15px]">{title}</h2>
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((item, index) => (
                <li
                  key={item}
                  className="flex items-center justify-between rounded-xl bg-brand-accent-soft/60 px-4 py-3 text-sm text-brand-ink-secondary"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    className={
                      index % 2 === 1
                        ? "font-semibold text-brand-orange transition hover:text-brand-orange-hover"
                        : "font-semibold text-brand-blue transition hover:text-brand-blue-hover"
                    }
                  >
                    Configure
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
