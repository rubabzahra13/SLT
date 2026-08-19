import clsx from "clsx";
import { AlertCircle } from "lucide-react";

type AttentionFlagProps = {
  reason: string;
  compact?: boolean;
};

export function AttentionFlag({ reason, compact }: AttentionFlagProps) {
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-xl border border-brand-warning/20 bg-[#fffbeb] transition hover:border-brand-warning/30",
        compact ? "p-3" : "p-4"
      )}
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning"
        strokeWidth={1.75}
      />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-warning">
          Needs attention
        </p>
        {!compact ? (
          <p className="mt-1 text-[13px] leading-snug text-brand-ink-secondary">
            {reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}
