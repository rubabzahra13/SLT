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
            className="rounded-2xl border border-ig-border bg-ig-surface p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-ig-bg p-2.5">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold">{title}</h2>
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between rounded-xl bg-ig-bg px-4 py-3 text-sm"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    className="font-semibold text-ig-blue"
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
