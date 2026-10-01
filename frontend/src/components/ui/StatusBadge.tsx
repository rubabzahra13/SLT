import clsx from "clsx";
import { getStatusColor, getStatusLabel } from "@/lib/data";

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md font-medium capitalize ring-1 ring-inset",
        getStatusColor(status),
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
