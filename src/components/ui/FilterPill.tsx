import clsx from "clsx";

type FilterPillProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-brand-accent text-white"
          : "text-brand-ink-secondary hover:bg-brand-bg hover:text-brand-ink"
      )}
    >
      {label}
    </button>
  );
}
