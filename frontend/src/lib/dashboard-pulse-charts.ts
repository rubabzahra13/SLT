import type {
  DashboardCategoryPipeline,
  DashboardMixOpsApi,
  DashboardOpenBooking,
} from "@/lib/api/dashboard";
import type { CategorySlice, MixOpsSlice } from "@/lib/dashboard";
import type { MTDRecord } from "@/types";

/** Tiny stubs so team/week capacity can count mixes without hydrating live MTD. */
export function openBookingsToStubMtd(
  bookings: DashboardOpenBooking[] | undefined
): MTDRecord[] {
  if (!bookings?.length) return [];
  return bookings.map((b, index) => {
    const producer = (b.producer || "").trim();
    return {
      id: `pulse-booking-${index}`,
      section: "CHEERLEADING MUSIC",
      assignedProducer: producer || null,
      category: "Cheer",
      editorRequest: "FA",
      contactName: "",
      editorInitials: producer,
      programName: "",
      package: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      mixStartDate: b.start || "",
      mixEndDate: b.end || undefined,
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
      inPayroll: false,
      inMTD: true,
    };
  });
}

export function categoryPipelineFromPulse(
  rows: DashboardCategoryPipeline[] | undefined
): CategorySlice[] | null {
  if (!rows?.length) return null;
  const total = rows.reduce((sum, row) => sum + (row.count || 0), 0) || 1;
  return rows
    .filter((row) => (row.count || 0) > 0)
    .map((row) => ({
      category: row.category,
      count: row.count,
      share: row.count / total,
    }));
}

export function mixOpsFromPulse(
  ops: DashboardMixOpsApi | undefined
): MixOpsSlice[] | null {
  if (!ops) return null;
  return [
    {
      label: "Overdue",
      count: ops.overdue || 0,
      color: "#f07840",
      href: "/mtd",
    },
    {
      label: "Start today",
      count: ops.starting_today || 0,
      color: "#52c8ee",
      href: "/schedule",
    },
    {
      label: "Due this week",
      count: ops.due_this_week || 0,
      color: "#1f8fb3",
      href: "/mtd",
    },
    {
      label: "Missing data",
      count: ops.missing_data || 0,
      color: "#f07840",
      href: "/mtd",
    },
    {
      label: "On track",
      count: ops.on_track || 0,
      color: "#1f8fb3",
      href: "/mtd",
    },
  ].filter((slice) => slice.count > 0);
}
