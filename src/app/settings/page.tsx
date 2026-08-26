import Link from "next/link";
import { Bell, ChevronRight, Palette, Shield } from "lucide-react";
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
    title: "Producer settings",
    description: "Roster, specialties, and availability",
    icon: Shield,
    items: [
      {
        label: "Producer roster",
        description: "Add, edit, and remove team members",
        href: "/producers",
      },
      {
        label: "Specializations",
        description: "Genre and category assignments",
      },
      {
        label: "Availability defaults",
        description: "Work days and time-off rules",
      },
    ],
  },
  {
    title: "Pricing rules",
    description: "Rates, packages, and discounts",
    icon: Palette,
    items: [
      {
        label: "Compliance rates",
        description: "Compliant vs non-compliant pricing",
      },
      {
        label: "Package templates",
        description: "Tier and time-limit defaults",
      },
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
            <section
              key={section.title}
              className="panel-shell overflow-hidden rounded-2xl"
            >
              <div className="border-b border-brand-line/30 bg-gradient-to-b from-brand-bg-subtle/90 to-white px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <section.icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-signature"
                    strokeWidth={2}
                  />
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-brand-ink">
                      {section.title}
                    </h2>
                    <p className="mt-0.5 text-[12px] leading-snug text-brand-ink-tertiary">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>

              <ul>
                {section.items.map((item, itemIndex) => (
                  <li
                    key={item.label}
                    className={
                      itemIndex > 0 ? "border-t border-brand-line/25" : undefined
                    }
                  >
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

  const rowClass =
    "group flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-brand-blue-soft/15";

  if (item.href) {
    return (
      <Link href={item.href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-4 px-5 py-3.5">
      {content}
    </div>
  );
}
