import clsx from "clsx";
import { getHaveStatus } from "@/lib/data";

type HaveToggleProps = {
  label: string;
  value: string;
};

export function HaveToggle({ label, value }: HaveToggleProps) {
  const status = getHaveStatus(value);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label">{label}</span>
      <span
        className={clsx(
          "inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
          status === "have" && "bg-[#ecfdf5] text-brand-success ring-[#a7f3d0]",
          status === "need" && "bg-[#fef2f2] text-brand-danger ring-[#fecaca]",
          status === "partial" && "bg-brand-bg text-brand-neutral ring-brand-line"
        )}
      >
        {value || "-"}
      </span>
    </div>
  );
}
