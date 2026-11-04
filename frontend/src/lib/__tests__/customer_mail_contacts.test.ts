import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCustomerMailContacts } from "../forward-order-mail";
import type { MTDRecord, Order } from "@/types";

function baseRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "mtd-1",
    section: "Orders",
    assignedProducer: null,
    category: "All Star Cheer",
    editorRequest: "",
    contactName: "Alex Contact",
    editorInitials: "",
    programName: "Test Program",
    package: "TP Mix",
    musicTheme: "",
    price: 0,
    priceCompliance: "compliant",
    invoice: "",
    mixStartDate: "",
    eightCountSheet: "",
    haveSongs: "",
    ...overrides,
  } as MTDRecord;
}

describe("resolveCustomerMailContacts", () => {
  it("defaults to billing_person_email SoT first", () => {
    const contacts = resolveCustomerMailContacts(
      baseRecord(),
      {
        billingPersonName: "Sam Billing",
        billingPersonEmail: "billing@gym.com",
        coachName: "Pat Coach",
        coachEmail: "coach@gym.com",
      } as Order
    );

    assert.equal(contacts[0]?.id, "billing");
    assert.equal(contacts[0]?.email, "billing@gym.com");
    assert.equal(contacts[0]?.name, "Sam Billing");
    assert.equal(contacts[1]?.email, "coach@gym.com");
  });

  it("uses Sports Entertainment billingContactEmail alias", () => {
    const contacts = resolveCustomerMailContacts(
      baseRecord({ category: "Sports Entertainment" }),
      {
        billingContactName: "Finance Desk",
        billingContactEmail: "finance@arena.com",
        musicContactName: "Vince",
        musicContactEmail: "vince@arena.com",
      } as Order
    );

    assert.equal(contacts[0]?.email, "finance@arena.com");
    assert.equal(contacts[0]?.role, "Billing");
    assert.ok(contacts.some((c) => c.email === "vince@arena.com"));
  });

  it("does not invent demo override addresses", () => {
    const contacts = resolveCustomerMailContacts(baseRecord(), {} as Order);
    assert.equal(contacts.length, 0);
    assert.ok(
      !contacts.some((c) => c.email.includes("rubabzahra248@gmail.com"))
    );
  });

  it("dedupes identical billing and coach emails", () => {
    const contacts = resolveCustomerMailContacts(
      baseRecord(),
      {
        billingPersonEmail: "same@gym.com",
        coachEmail: "same@gym.com",
        billingPersonName: "Billing",
        coachName: "Coach",
      } as Order
    );
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0]?.id, "billing");
  });
});
