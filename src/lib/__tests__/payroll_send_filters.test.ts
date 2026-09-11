import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, Producer } from "@/types";
import { getPayrollSendProducerNames } from "../payroll-send-filters";

const rubab = {
  id: "rubab",
  name: "Rubab",
  initials: "R",
  email: "rubab@example.com",
  specialty: "Dance",
  avatar: "",
  color: "#6366f1",
  mixesThisWeek: 0,
  nextAvailable: "Today",
  status: "available",
  workDays: ["mon"],
  maxMixesPerDay: 5,
  overtimeDays: [],
  categories: ["Hip Hop"],
} as unknown as Producer;

const pomProducer = {
  ...rubab,
  id: "pom-editor",
  name: "Anne Jacobs",
  initials: "AJ",
  categories: ["Pom"],
} as unknown as Producer;

const orderById = new Map<string, Order>([
  [
    "ord-pom",
    {
      id: "ord-pom",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      contactName: "Test",
      programName: "Pom Team",
      price: 400,
      status: "completed",
      needsAttention: false,
      createdAt: "2026-09-10T10:00:00Z",
    } as Order,
  ],
]);

const rubabPayrollRecord = {
  id: "payroll-rubab",
  orderId: "ord-pom",
  contactName: "Test",
  programName: "Pom Team",
  invoice: "INV-9001",
  package: "GOLD 1:30",
  assignedProducer: "Rubab",
  mixStartDate: "2026-09-01",
  mixEndDate: "2026-09-05",
  completedAt: "2026-09-10",
  inPayroll: true,
  status: "completed",
} as unknown as MTDRecord;

describe("payroll send producer names", () => {
  it("includes assigned editors even when their profile category does not match the tab filter", () => {
    const names = getPayrollSendProducerNames(
      [rubabPayrollRecord],
      orderById,
      [rubab, pomProducer],
      "school-all-star-dance",
      "all",
      "pom",
      { start: "2026-09-01", end: "2026-09-11" }
    );

    assert.deepEqual(names, ["Rubab"]);
  });
});
