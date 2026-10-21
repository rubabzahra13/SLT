import Link from "next/link";
import { ChevronRight, Mail, Palette, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

import { EmailSendingSettingsCard } from "@/components/settings/EmailSendingSettingsCard";
import { DailyCostSettingsFields } from "@/components/settings/DailyCostSettingsCard";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";

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
    title: "Producers & Payroll",
    description: "Producer roster, categories, and compensation rates",
    icon: Users,
    items: [],
  },
  {
    title: "Email",
    description: "Gmail connection and message templates",
    icon: Mail,
    items: [
      {
        label: "Email templates",
        description:
          "Edit customer and producer copy for orders, payroll, and schedule emails",
        href: "/settings/email-templates",
      },
    ],
  },
  {
    title: "Pricing rules",
    description: "Rates, packages, and coupon codes",
    icon: Palette,
    items: [
      {
        label: "Coupon Code Settings",
        description: "Configured codes used to flag matching order coupons",
        href: "/settings/discount-codes",
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Settings"
        badge={`${sections.length + 2} sections`}
        subtitle="Admin configuration and studio defaults"
      />

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6 pt-5 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <EmailSendingSettingsCard />

          {sections.map((section) => (
            <section key={section.title} className="dashboard-panel flex flex-col">
              <div className="flex shrink-0 items-center gap-3 border-b border-brand-line/30 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft/80 text-brand-signature ring-1 ring-inset ring-brand-signature/20">
                  <section.icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink">
                    {section.title}
                  </h2>
                  <p className="mt-1 truncate text-[11px] font-medium text-brand-ink-secondary">
                    {section.description}
                  </p>
                </div>
              </div>

              {section.items.length > 0 ? (
                <ul className="dashboard-panel-body divide-y divide-brand-line/30">
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <SettingRow item={item} />
                    </li>
                  ))}
                </ul>
              ) : null}

              {section.title === "Producers & Payroll" ? (
                <DailyCostSettingsFields />
              ) : null}
            </section>
          ))}

          <NotificationSettingsCard />
        </div>
      </div>
    </div>
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
