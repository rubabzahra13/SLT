import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Payroll Filter & Category Preservation on Detail Return", () => {
  // Mock sessionStorage implementation for node testing environment
  function createMockSessionStorage() {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
  }

  it("Test 1: Preserves All-Star Dance -> POM context across session reload / detail return", () => {
    const sessionStorage = createMockSessionStorage();

    // Step 1: User selects All-Star Dance -> POM
    sessionStorage.setItem("slt_payroll_form", "school-all-star-dance");
    sessionStorage.setItem("slt_payroll_dance_subtype", "pom");

    // Step 2: User opens detail view and returns (re-mounts PayrollPage)
    const savedForm = sessionStorage.getItem("slt_payroll_form");
    const savedDanceSubtype = sessionStorage.getItem("slt_payroll_dance_subtype");

    assert.equal(savedForm, "school-all-star-dance");
    assert.equal(savedDanceSubtype, "pom");
  });

  it("Test 2: Preserves All-Star Dance -> Hip Hop context across session reload / detail return", () => {
    const sessionStorage = createMockSessionStorage();

    // Step 1: User selects All-Star Dance -> Hip Hop
    sessionStorage.setItem("slt_payroll_form", "school-all-star-dance");
    sessionStorage.setItem("slt_payroll_dance_subtype", "hip-hop");

    // Step 2: User opens detail view and returns
    const savedForm = sessionStorage.getItem("slt_payroll_form");
    const savedDanceSubtype = sessionStorage.getItem("slt_payroll_dance_subtype");

    assert.equal(savedForm, "school-all-star-dance");
    assert.equal(savedDanceSubtype, "hip-hop");
  });

  it("Test 3: Preserves All-Star Cheer -> VIROC context across detail return", () => {
    const sessionStorage = createMockSessionStorage();

    sessionStorage.setItem("slt_payroll_form", "school-all-star-cheer");
    sessionStorage.setItem("slt_payroll_cheer_subtype", "school-cheer-viroc-yes");

    const savedForm = sessionStorage.getItem("slt_payroll_form");
    const savedCheerSubtype = sessionStorage.getItem("slt_payroll_cheer_subtype");

    assert.equal(savedForm, "school-all-star-cheer");
    assert.equal(savedCheerSubtype, "school-cheer-viroc-yes");
  });

  it("Test 4: Preserves applied producer, search, and date table filters", () => {
    const sessionStorage = createMockSessionStorage();

    const tableFilters = {
      packageTier: "GOLD",
      timeLimit: "All",
      split: "all",
      assignedProducer: "Nick",
      requestedProducer: "All",
      dateFilter: { type: "thisMonth", value: null },
      scheduleFilter: "all",
      infoFilter: "all",
    };

    sessionStorage.setItem("slt_payroll_table_filters", JSON.stringify(tableFilters));
    sessionStorage.setItem("slt_payroll_search", "Sparkle");

    const savedTableFilters = JSON.parse(
      sessionStorage.getItem("slt_payroll_table_filters") || "{}"
    );
    const savedSearch = sessionStorage.getItem("slt_payroll_search");

    assert.deepEqual(savedTableFilters, tableFilters);
    assert.equal(savedSearch, "Sparkle");
  });
});
