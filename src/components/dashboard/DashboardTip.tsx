"use client";

import { HoverTip } from "@/components/ui/HoverTip";

type DashboardTipProps = {
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?: "bottom" | "top" | "right" | "left";
};

export function DashboardTip({
  title,
  body,
  children,
  className,
  placement = "top",
}: DashboardTipProps) {
  return (
    <HoverTip
      placement={placement}
      className={className}
      content={
        <div className="min-w-[160px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            {title}
          </p>
          <div className="mt-1.5 text-[12px] leading-snug text-brand-ink-secondary">
            {body}
          </div>
        </div>
      }
    >
      {children}
    </HoverTip>
  );
}
