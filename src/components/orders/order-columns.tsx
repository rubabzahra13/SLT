import type { Order } from "@/types";
import type { Column } from "@/components/ui/DataTable";
import type { CheerFormSubtype, DanceFormSubtype, OrderFormType } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { displayMultiline, displayText } from "@/lib/order-form";
import { getCheerOrderColumns } from "@/components/orders/cheer-order-columns";
import { AlertCircle } from "lucide-react";

type ColumnOptions = {
  mode: "active" | "all" | "past";
  formType?: OrderFormType;
  cheerFormSubtype?: CheerFormSubtype;
  danceFormSubtype?: DanceFormSubtype;
};

function textCell(value: string, wide = false) {
  return (
    <span className={wide ? "block max-w-[220px] truncate" : "block truncate"}>
      {displayText(value)}
    </span>
  );
}

function multilineCell(value: string) {
  return (
    <span className="block max-w-[240px] text-[12px] leading-snug text-brand-ink-secondary">
      {displayMultiline(value, 140)}
    </span>
  );
}

function pomFormColumns(): Column<Order>[] {
  return [
    {
      key: "schoolProgramName",
      header: "School / Program",
      width: "180px",
      render: (o) => textCell(o.schoolProgramName, true),
    },
    {
      key: "schoolAddress",
      header: "Address",
      width: "140px",
      render: (o) => textCell(o.schoolAddress),
    },
    { key: "city", header: "City", width: "100px", render: (o) => textCell(o.city) },
    {
      key: "stateProvince",
      header: "State",
      width: "72px",
      render: (o) => textCell(o.stateProvince),
    },
    {
      key: "zipPostalCode",
      header: "ZIP",
      width: "80px",
      render: (o) => <span className="tabular-nums">{o.zipPostalCode || "—"}</span>,
    },
    {
      key: "country",
      header: "Country",
      width: "110px",
      render: (o) => textCell(o.country),
    },
    {
      key: "division",
      header: "Division",
      width: "160px",
      nowrap: false,
      render: (o) => multilineCell(o.division),
    },
    {
      key: "coachName",
      header: "Coach",
      width: "120px",
      render: (o) => textCell(o.coachName),
    },
    {
      key: "coachPhone",
      header: "Coach Phone",
      width: "110px",
      render: (o) => <span className="tabular-nums">{o.coachPhone || "—"}</span>,
    },
    {
      key: "coachEmail",
      header: "Coach Email",
      width: "180px",
      render: (o) => (
        <span className="block truncate text-brand-ink-secondary">{o.coachEmail || "—"}</span>
      ),
    },
    {
      key: "billingPersonName",
      header: "Billing Contact",
      width: "120px",
      render: (o) => textCell(o.billingPersonName),
    },
    {
      key: "billingPersonEmail",
      header: "Billing Email",
      width: "180px",
      render: (o) => (
        <span className="block truncate text-brand-ink-secondary">
          {o.billingPersonEmail || "—"}
        </span>
      ),
    },
    {
      key: "choreographerName",
      header: "Choreographer",
      width: "140px",
      render: (o) => textCell(o.choreographerName),
    },
    {
      key: "choreographerEmail",
      header: "Choreographer Email",
      width: "180px",
      render: (o) => (
        <span className="block truncate text-brand-ink-secondary">
          {o.choreographerEmail || "—"}
        </span>
      ),
    },
    {
      key: "numberOfCopies",
      header: "Copies",
      width: "72px",
      align: "center",
      render: (o) => <span className="tabular-nums">{o.numberOfCopies || "—"}</span>,
    },
    {
      key: "packageType",
      header: "Package",
      width: "160px",
      nowrap: false,
      render: (o) => multilineCell(o.packageType),
    },
    {
      key: "requestedEditor",
      header: "Requested Editor",
      width: "120px",
      render: (o) => textCell(o.requestedEditor),
    },
    {
      key: "timeLengthOfMix",
      header: "Mix Length",
      width: "100px",
      render: (o) => <span>{o.timeLengthOfMix || "—"}</span>,
    },
    {
      key: "musicAffiliate",
      header: "Music Affiliate",
      width: "140px",
      render: (o) => textCell(o.musicAffiliate),
    },
    {
      key: "powerMusicCovers",
      header: "Power Music Covers",
      width: "220px",
      nowrap: false,
      render: (o) => multilineCell(o.powerMusicCovers),
    },
    {
      key: "routineNotes",
      header: "Routine Notes",
      width: "240px",
      nowrap: false,
      render: (o) => multilineCell(o.routineNotes),
    },
    {
      key: "customVoiceovers",
      header: "Voiceovers",
      width: "120px",
      render: (o) => textCell(o.customVoiceovers),
    },
  ];
}

function resolveFormColumns(options: ColumnOptions): Column<Order>[] {
  if (options.formType === "school-all-star-cheer" && options.cheerFormSubtype) {
    return getCheerOrderColumns(options.cheerFormSubtype);
  }
  return pomFormColumns();
}

export function getOrderColumns(options: ColumnOptions): Column<Order>[] {
  const { mode } = options;
  const columns = resolveFormColumns(options);

  columns.push({
    key: "status",
    header: "Status",
    width: "96px",
    nowrap: true,
    render: (order) => (
      <div className="flex items-center gap-1.5">
        {mode === "active" && order.needsAttention ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-brand-warning" strokeWidth={1.75} />
        ) : null}
        <StatusBadge status={order.status} />
      </div>
    ),
  });

  columns.push({
    key: "date",
    header: mode === "active" ? "Received" : "Completed",
    width: "96px",
    align: "right",
    nowrap: true,
    render: (order) => (
      <span className="text-[12px] text-brand-ink-tertiary tabular-nums">
        {mode === "past" || order.status === "completed"
          ? order.completedAt || order.createdAt
          : order.createdAt}
      </span>
    ),
  });

  return columns;
}
