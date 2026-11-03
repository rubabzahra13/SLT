import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatRequestedEditorLabel,
  getRequestedEditorFromRecord,
} from "../editor-assignment";
import type { MTDRecord, Order, Producer } from "../../types";

const producers: Producer[] = [
  {
    id: "p-be",
    name: "Ben",
    initials: "BE",
    email: "be@example.com",
    categories: ["All-Star Cheer"],
  } as Producer,
];

function cheerOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    category: "Cheer",
    customerName: "Coach",
    contactName: "Coach",
    programName: "Demo Gym",
    package: "GOLD 2:00",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    requestedEditor: "",
    assignedProducer: null,
    price: 0,
    priceCompliance: "compliant",
    status: "new",
    createdAt: "2026-01-01",
    needsAttention: false,
    attentionReason: null,
    ...overrides,
  } as Order;
}

function boardRec(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "ord-1",
    orderId: "ord-1",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    editorRequest: "FA",
    contactName: "Coach",
    programName: "Demo Gym",
    package: "GOLD 2:00",
    musicTheme: "",
    price: 0,
    priceCompliance: "compliant",
    invoice: "",
    mixStartDate: "",
    eightCountSheet: "",
    haveSongs: "",
    needsAttention: false,
    status: "active",
    assignedProducer: null,
    ...overrides,
  } as MTDRecord;
}

describe("Requested producer board label", () => {
  it("shows Magento Josh even when Josh is not on the producer roster", () => {
    const order = cheerOrder({
      requestedEditor: "Josh",
      requestedProducer: "Josh",
      editorRequest: "FA",
    });
    const rec = boardRec();
    assert.equal(
      getRequestedEditorFromRecord(rec, producers, order),
      "Josh"
    );
    assert.equal(
      formatRequestedEditorLabel(rec, producers, order),
      "Josh"
    );
  });

  it("shows Brent for Dance Magento requests not on roster", () => {
    const order = cheerOrder({
      id: "ord-dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      category: "Dance",
      requestedEditor: "Brent",
      requestedProducer: "Brent",
      editorRequest: "FA",
    });
    const rec = boardRec({
      id: "ord-dance",
      orderId: "ord-dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      category: "Dance",
      section: "DANCE MUSIC",
    });
    assert.equal(formatRequestedEditorLabel(rec, producers, order), "Brent");
  });

  it("resolves roster producers to canonical key then first name", () => {
    const order = cheerOrder({
      requestedEditor: "Ben",
      requestedProducer: "Ben",
      editorRequest: "FA",
    });
    const rec = boardRec({ category: "All-Star Cheer" });
    assert.equal(getRequestedEditorFromRecord(rec, producers, order), "BE");
    assert.equal(formatRequestedEditorLabel(rec, producers, order), "Ben");
  });

  it("shows First Available only when Magento request is blank or FA", () => {
    const order = cheerOrder({
      requestedEditor: "First Available",
      requestedProducer: "First Available",
      editorRequest: "FA",
    });
    assert.equal(
      formatRequestedEditorLabel(boardRec(), producers, order),
      "First Available"
    );
  });
});
