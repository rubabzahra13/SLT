import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildOrdersReturnHref,
  mergeOrdersViewState,
  parseOrdersViewFromSearchParams,
} from "../orders-view-state";

describe("orders view state return URL", () => {
  it("encodes search, range, form tabs, and sort into /orders return href", () => {
    const href = buildOrdersReturnHref({
      form: "school-all-star-cheer",
      cheerSubtype: "all-star-cheer",
      rangeFilter: "waiting_for_data",
      searchQuery: "ming",
      tableFilters: { sortBy: "name_az", packageTier: "Gold" },
    });
    assert.ok(href.startsWith("/orders?"));
    const qs = new URL(href, "http://local.test").searchParams;
    assert.equal(qs.get("form"), "school-all-star-cheer");
    assert.equal(qs.get("cheer"), "all-star-cheer");
    assert.equal(qs.get("range"), "waiting_for_data");
    assert.equal(qs.get("q"), "ming");
    assert.equal(qs.get("sort"), "name_az");
    assert.equal(qs.get("pkg"), "Gold");
  });

  it("parses return query back into view state", () => {
    const href = buildOrdersReturnHref({
      form: "school-all-star-dance",
      danceSubtype: "pom",
      rangeFilter: "assigned",
      searchQuery: "thunder",
      sourceFilter: "manual",
      tableFilters: { sortBy: "oldest", assignedProducer: "CH" },
    });
    const qs = new URL(href, "http://local.test").searchParams;
    const parsed = parseOrdersViewFromSearchParams(qs);
    assert.equal(parsed.form, "school-all-star-dance");
    assert.equal(parsed.danceSubtype, "pom");
    assert.equal(parsed.rangeFilter, "assigned");
    assert.equal(parsed.searchQuery, "thunder");
    assert.equal(parsed.sourceFilter, "manual");
    assert.equal(parsed.tableFilters?.sortBy, "oldest");
    assert.equal(parsed.tableFilters?.assignedProducer, "CH");
  });

  it("lets URL state win over stored snapshot", () => {
    const merged = mergeOrdersViewState(
      { searchQuery: "old", rangeFilter: "all" },
      { searchQuery: "ming", rangeFilter: "assigned" }
    );
    assert.equal(merged.searchQuery, "ming");
    assert.equal(merged.rangeFilter, "assigned");
  });
});
