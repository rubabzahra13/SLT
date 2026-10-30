import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MTDRecord, Order, Producer } from "@/types";
import { collectOpenAssignedMixRecords } from "../producer-assigned-mixes";
import { getScheduleCells } from "../schedule-view";
import { isEligibleProducerScheduleRecord } from "../export-csv";

const ben: Producer = {
  id: "prod-ben",
  name: "ben",
  initials: "BE",
  email: "ben@example.com",
  categories: ["All-Star Cheer"],
  avatar: "",
  mixesThisWeek: 0,
  nextAvailable: "TBD",
  status: "available",
  workDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  extraDays: [],
  timeOff: [],
  maxMixesPerDay: 5,
  maxProducerCostPerDay: 5000,
};

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: "ord-qa-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    status: "new",
    programName: "QA OF CAPACITY",
    schoolGymName: "QA OF CAPACITY",
    assignedProducer: "BE",
    mixStartDate: "2026-11-01",
    mixEndDate: "2026-11-03",
    package: "GOLD 2:00",
    packageType: "GOLD 2:00",
    price: 950,
    ...overrides,
  } as Order;
}

describe("Schedule Assigned legend includes Orders-tab assignments", () => {
  it("shows Assigned (mix) cells for Orders assigned with dates when mtdRecords is empty", () => {
    const orders = [
      makeOrder({ id: "ord-1", assignedProducer: "BE" }),
      makeOrder({
        id: "ord-2",
        assignedProducer: "ben",
        mixStartDate: "2026-11-01",
        mixEndDate: "2026-11-03",
      }),
    ];
    const bookings = collectOpenAssignedMixRecords(orders, []);
    assert.equal(bookings.length, 2);
    assert.ok(bookings.every(isEligibleProducerScheduleRecord));

    const cells = getScheduleCells(
      ben,
      [],
      "week",
      new Date(2026, 10, 2), // Mon Nov 2, 2026 local
      bookings
    );
    const nov1 = cells.find((c) => c.key === "2026-11-01");
    const nov2 = cells.find((c) => c.key === "2026-11-02");
    const nov3 = cells.find((c) => c.key === "2026-11-03");

    assert.equal(nov1?.status, "mix");
    assert.equal(nov2?.status, "mix");
    assert.equal(nov3?.status, "mix");
    assert.equal(nov2?.bookings?.length, 2);
  });

  it("keeps MTD Outsourced on the Assigned legend and ignores payroll", () => {
    const mtd: MTDRecord[] = [
      {
        id: "mtd-out",
        orderId: "ord-out",
        section: "OUTSOURCED MIXES",
        programName: "Outsourced Mix",
        assignedProducer: "BE",
        category: "Cheer",
        contactName: "Coach",
        editorInitials: "BE",
        editorRequest: "BE",
        package: "GOLD 2:00",
        price: 700,
        priceCompliance: "compliant",
        invoice: "",
        musicTheme: "",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        status: "outsourced",
        recordStatus: "Outsourced",
        inMTD: true,
        mixStartDate: "2026-11-01",
        mixEndDate: "2026-11-02",
      } as MTDRecord,
      {
        id: "mtd-pay",
        orderId: "ord-pay",
        section: "COMPLETED MIXES",
        programName: "Payroll Mix",
        assignedProducer: "BE",
        category: "Cheer",
        contactName: "Coach",
        editorInitials: "BE",
        editorRequest: "BE",
        package: "GOLD 2:00",
        price: 700,
        priceCompliance: "compliant",
        invoice: "",
        musicTheme: "",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        status: "completed",
        recordStatus: "Completed",
        inPayroll: true,
        inMTD: true,
        mixStartDate: "2026-11-01",
        mixEndDate: "2026-11-03",
      } as MTDRecord,
    ];

    const bookings = collectOpenAssignedMixRecords([], mtd);
    assert.equal(bookings.length, 1);
    assert.equal(bookings[0].programName, "Outsourced Mix");
    assert.equal(isEligibleProducerScheduleRecord(bookings[0]), true);

    const cells = getScheduleCells(
      ben,
      [],
      "week",
      new Date(2026, 10, 2),
      bookings
    );
    assert.equal(cells.find((c) => c.key === "2026-11-01")?.status, "mix");
  });
});
