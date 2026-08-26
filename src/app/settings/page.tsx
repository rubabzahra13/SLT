import Link from "next/link";
import { Bell, ChevronRight, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

type SettingItem = {
  label: string;
  description?: string;
  href?: string;
};

type SettingSection = {
  title: string;
  description: string;
  icon: LucideIcon;
  items: SettingItem[];
};

const sections: SettingSection[] = [
  {
    title: "Pricing rules",
    description: "Rates, packages, and discounts",
    icon: Palette,
    items: [
      {
        label: "Discount codes",
        description: "Promo codes and usage rules",
        href: "/settings/discount-codes",
      },
    ],
  },
  {
    title: "Notifications",
    description: "Alerts and assignment confirmations",
    icon: Bell,
    items: [
      {
        label: "Needs attention",
        description: "Blocked items and missing materials",
      },
      {
        label: "New orders",
        description: "Incoming order alerts",
      },
      {
        label: "Assignments",
        description: "Producer assignment confirmations",
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        badge={`${sections.length} sections`}
        subtitle="Admin configuration and studio defaults"
      />

      <div className="px-6 pb-6 pt-5 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {sections.map((section) => (
            <section key={section.title} className="dashboard-panel flex flex-col">
              <div className="flex shrink-0 items-center gap-3 border-b border-brand-line/30 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg-subtle/80 ring-1 ring-inset ring-brand-line/40">
                  <section.icon
                    className="h-3.5 w-3.5 text-brand-ink-tertiary"
                    strokeWidth={2}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                    {section.title}
                  </h2>
                  <p className="mt-1 truncate text-[11px] font-medium text-brand-ink-tertiary">
                    {section.description}
                  </p>
                </div>
              </div>

              <ul className="dashboard-panel-body divide-y divide-brand-line/30">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <SettingRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function SettingRow({ item }: { item: SettingItem }) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-brand-ink">{item.label}</p>
        {item.description ? (
          <p className="mt-0.5 text-[12px] leading-snug text-brand-ink-tertiary">
            {item.description}
          </p>
        ) : null}
      </div>
      {item.href ? (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-brand-ink-tertiary transition group-hover:translate-x-0.5 group-hover:text-brand-signature"
          strokeWidth={2}
        />
      ) : (
        <span className="shrink-0 text-[12px] font-medium text-brand-ink-tertiary">
          Soon
        </span>
      )}
    </>
  );

  const rowClass = item.href
    ? "group flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-brand-blue-soft/20"
    : "flex w-full items-center justify-between gap-4 px-4 py-3.5";

  if (item.href) {
    return (
      <Link href={item.href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
