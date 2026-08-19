import clsx from "clsx";

type StatCardProps = {
  label: string;
  value: number | string;
  trend?: string;
};

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="surface-premium animate-fade-in rounded-2xl p-6 transition hover:shadow-[var(--shadow-premium)]">
      <p className="text-label">{label}</p>
      <p className="text-display mt-2 text-[32px] leading-none tabular-nums">
        {value}
      </p>
      {trend ? (
        <p className="mt-2 text-[12px] text-brand-ink-tertiary">{trend}</p>
      ) : null}
    </div>
  );
}
