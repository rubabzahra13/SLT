import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OrdersBoardCounts, OrdersMatchCounts } from "../api/orders-board";
import {
  applyMatchPoolLiveDelete,
  applyMatchPoolLiveOrder,
  applyPeerOrderUpdate,
  dropRecentlyMatched,
  markMatchPoolLiveGap,
  matchPoolQueryKey,
  mergeIncomingOrderPreservingRecentLocalFields,
  ordersBoardCountsQueryKey,
  ordersBoardQueryKey,
  ordersRangeFilterTotal,
  patchOrdersBoardRowOptimistic,
  readMatchCountsCache,
  readMatchPoolCache,
  readOrdersBoardCache,
  readOrdersBoardCountsCache,
  readOrdersBoardOrder,
  syncMatchPoolOrderPatch,
  syncOrdersAfterMatch,
  syncOrdersAfterSplit,
  syncOrdersBoardOrderPatch,
  writeMatchCountsCache,
  writeMatchPoolCache,
  writeOrdersBoardCache,
  writeOrdersBoardCountsOnlyCache,
} from "../orders-board-cache";
import type { Order } from "@/types";

const cheer = "school-all-star-cheer";

function makeCounts(overrides: Partial<OrdersBoardCounts> = {}): OrdersBoardCounts {
  return {
    all: 191,
    complete_data: 2,
    missing_data: 189,
    assigned: 17,
    not_assigned: 174,
    reassigned: 0,
    flagged: 2,
    by_form_type: { [cheer]: 191 },
    complete_data_by_form_type: { [cheer]: 2 },
    missing_data_by_form_type: { [cheer]: 189 },
    assigned_by_form_type: { [cheer]: 17 },
    not_assigned_by_form_type: { [cheer]: 174 },
    reassigned_by_form_type: { [cheer]: 0 },
    complete_assigned: 1,
    complete_not_assigned: 1,
    complete_reassigned: 0,
    complete_assigned_by_form_type: { [cheer]: 1 },
    complete_not_assigned_by_form_type: { [cheer]: 1 },
    complete_reassigned_by_form_type: {},
    ...overrides,
  };
}

describe("ordersRangeFilterTotal", () => {
  it("resolves combined chips from Complete ∩ assignment", () => {
    const c = makeCounts();
    const opts = { formType: cheer };
    assert.equal(ordersRangeFilterTotal(c, "waiting_for_data,assigned", opts), 16);
    assert.equal(ordersRangeFilterTotal(c, "need_to_be_scheduled,assigned", opts), 1);
    assert.equal(ordersRangeFilterTotal(c, "waiting_for_data,not_assigned", opts), 173);
    assert.equal(ordersRangeFilterTotal(c, "need_to_be_scheduled,reassigned", opts), 0);
    assert.equal(ordersRangeFilterTotal(c, "assigned", opts), 17);
    assert.equal(ordersRangeFilterTotal(c, undefined, opts), 191);
  });

  it("returns null for combined chips on an older payload", () => {
    const c = makeCounts({
      complete_assigned: undefined,
      complete_not_assigned: undefined,
      complete_reassigned: undefined,
    });
    assert.equal(ordersRangeFilterTotal(c, "waiting_for_data,assigned", {}), null);
    assert.equal(ordersRangeFilterTotal(c, "assigned", {}), 17);
  });
});

describe("badge counts follow data changes", () => {
  const boardKey = ordersBoardQueryKey({ formType: cheer, range: "all" });
  const countsKey = ordersBoardCountsQueryKey({});
  const searchCountsKey = ordersBoardCountsQueryKey({ search: "acme" });
  let seq = 0;
  let row: Order;

  const counts = () => readOrdersBoardCountsCache(countsKey)!.counts;

  beforeEach(() => {
    seq += 1;
    // Missing only because Notes is empty; not assigned.
    row = {
      id: `ord-badge-${seq}`,
      formType: cheer,
      status: "active",
      packageType: "GOLD",
      timeLengthOfMix: "2:30",
      songListSuggestions: "Song A",
      routineNotes: "",
      haveSongs: "HAVE SONGS",
      eightCountSheet: "",
      sendingEightCountSheets: "No",
      needsAttention: false,
      assignedProducer: null,
      isReassigned: false,
    } as unknown as Order;
    writeOrdersBoardCache(boardKey, { orders: [row], nextPageToken: null });
    writeOrdersBoardCountsOnlyCache(countsKey, makeCounts());
    writeOrdersBoardCountsOnlyCache(searchCountsKey, makeCounts());
  });

  it("moves Missing → Complete on a Notes fill and back on undo", () => {
    const undo = patchOrdersBoardRowOptimistic(row.id, { routineNotes: "Count 8" });
    let c = counts();
    assert.equal(c.complete_data, 3);
    assert.equal(c.missing_data, 188);
    assert.equal(c.complete_data_by_form_type?.[cheer], 3);
    assert.equal(c.missing_data_by_form_type?.[cheer], 188);
    assert.equal(c.complete_not_assigned, 2);
    assert.equal(c.assigned, 17);
    assert.equal(c.not_assigned, 174);
    assert.equal(c.all, 191);
    // Search badges come from their own /counts call.
    assert.equal(readOrdersBoardCountsCache(searchCountsKey)!.counts.complete_data, 2);

    undo();
    c = counts();
    assert.equal(c.complete_data, 2);
    assert.equal(c.missing_data, 189);
    assert.equal(c.complete_not_assigned, 1);
  });

  it("keeps optimistic Notes over Magento-empty SSE/paint echo", () => {
    patchOrdersBoardRowOptimistic(row.id, {
      routineNotes: "Count 8",
      additionalNotes: "Count 8",
      lyricalNotes: "Count 8",
    });
    const local = readOrdersBoardOrder(row.id)!;
    assert.equal(local.routineNotes, "Count 8");
    const echoed = mergeIncomingOrderPreservingRecentLocalFields(local, {
      ...local,
      routineNotes: "",
      additionalNotes: "",
      lyricalNotes: "",
    });
    assert.equal(echoed.routineNotes, "Count 8");
    assert.equal(echoed.additionalNotes, "Count 8");
    assert.equal(echoed.lyricalNotes, "Count 8");
  });

  it("Notes fill clears stale needsAttention so Complete badge counts move", () => {
    syncOrdersBoardOrderPatch(row.id, { needsAttention: true });
    assert.equal(readOrdersBoardOrder(row.id)!.needsAttention, true);
    patchOrdersBoardRowOptimistic(row.id, {
      routineNotes: "Count 8",
      additionalNotes: "Count 8",
      lyricalNotes: "Count 8",
    });
    const after = readOrdersBoardOrder(row.id)!;
    assert.equal(after.routineNotes, "Count 8");
    assert.equal(after.needsAttention, false);
    assert.equal(counts().complete_data, 3);
    assert.equal(counts().missing_data, 188);
  });

  it("shifts search badges only when the row is in that search's results", () => {
    const hitKey = ordersBoardCountsQueryKey({ search: "black" });
    writeOrdersBoardCountsOnlyCache(hitKey, makeCounts());
    writeOrdersBoardCache(ordersBoardQueryKey({ formType: cheer, search: "black" }), {
      orders: [row],
      nextPageToken: null,
    });
    patchOrdersBoardRowOptimistic(row.id, { routineNotes: "Count 8" });
    assert.equal(readOrdersBoardCountsCache(hitKey)!.counts.complete_data, 3);
    assert.equal(readOrdersBoardCountsCache(searchCountsKey)!.counts.complete_data, 2);
  });

  it("CS NEED keeps the row Missing via server needs_attention", () => {
    patchOrdersBoardRowOptimistic(row.id, { routineNotes: "Count 8" });
    patchOrdersBoardRowOptimistic(row.id, { eightCountSheet: "NEED CS" });
    assert.equal(counts().complete_data, 2);
    assert.equal(counts().missing_data, 189);
    patchOrdersBoardRowOptimistic(row.id, { eightCountSheet: "HAVE CS" });
    assert.equal(counts().complete_data, 3);
  });

  it("leaves badges alone for edits that don't change a bucket", () => {
    patchOrdersBoardRowOptimistic(row.id, { songListSuggestions: "Song B" });
    assert.deepEqual(counts(), makeCounts());
  });

  it("shifts both dimensions for a peer save on a cached row", () => {
    const moved = applyPeerOrderUpdate({
      ...row,
      routineNotes: "Count 8",
      assignedProducer: "CH",
    });
    assert.equal(moved, "shifted");
    const c = counts();
    assert.equal(c.complete_data, 3);
    assert.equal(c.missing_data, 188);
    assert.equal(c.assigned, 18);
    assert.equal(c.not_assigned, 173);
    assert.equal(c.assigned_by_form_type?.[cheer], 18);
    assert.equal(c.complete_assigned, 2);
    assert.equal(c.complete_not_assigned, 1);
  });

  it("resolve affiliate flag drops Flagged and returns the row to Orders", () => {
    const flaggedKey = ordersBoardQueryKey({ range: "flagged", excludeFlagged: false });
    const flaggedCountsKey = ordersBoardCountsQueryKey({ flaggedOnly: true });
    const dancePomKey = ordersBoardQueryKey({
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      range: "all",
    });
    const flagged = {
      ...row,
      id: `ord-flag-${seq}`,
      formType: cheer,
      cheerFormSubtype: "all-star-cheer",
      affiliateFlagStatus: "open",
      isManualEntry: false,
      createdAt: "2026-11-03T12:00:00Z",
    } as Order;
    writeOrdersBoardCache(flaggedKey, { orders: [flagged], nextPageToken: null });
    writeOrdersBoardCache(boardKey, { orders: [], nextPageToken: null });
    // Wrong form page must stay empty — do not spill the resolved cheer row into Dance/POM.
    writeOrdersBoardCache(dancePomKey, { orders: [], nextPageToken: null });
    writeOrdersBoardCountsOnlyCache(
      flaggedCountsKey,
      makeCounts({
        all: 2,
        flagged: 2,
        by_form_type: { [cheer]: 2 },
        by_cheer_form_subtype: { "all-star-cheer": 1 },
      })
    );
    // Flagged rows are not on the normal board page.
    writeOrdersBoardCountsOnlyCache(countsKey, makeCounts({ flagged: 2 }));

    patchOrdersBoardRowOptimistic(flagged.id, {
      affiliateFlagStatus: "released",
      musicAffiliate: "Songs for Cheer",
      needsAttention: false,
    });

    assert.equal(counts().flagged, 1);
    assert.equal(counts().all, 192);
    assert.equal(counts().missing_data, 190);
    assert.equal(counts().not_assigned, 175);
    assert.equal(readOrdersBoardCountsCache(flaggedCountsKey)!.counts.flagged, 1);
    assert.equal(
      readOrdersBoardCountsCache(flaggedCountsKey)!.counts.by_form_type?.[cheer],
      1
    );
    assert.equal(
      readOrdersBoardOrder(flagged.id)?.affiliateFlagStatus,
      "released"
    );
    // Left the Flagged page; joined the matching Cheer board — not Dance/POM.
    assert.equal(
      readOrdersBoardCache(flaggedKey)!.entry.orders.some((o) => o.id === flagged.id),
      false
    );
    assert.equal(
      readOrdersBoardCache(boardKey)!.entry.orders.some((o) => o.id === flagged.id),
      true
    );
    assert.equal(
      readOrdersBoardCache(dancePomKey)?.entry.orders.some((o) => o.id === flagged.id) ??
        false,
      false
    );
  });

  it("asks for a recount when a peer moves the row off the board", () => {
    const moved = applyPeerOrderUpdate({ ...row, status: "in_mtd" } as Order);
    assert.equal(moved, "recount");
    assert.deepEqual(counts(), makeCounts());
  });

  it("drops the row from Orders pages on Move to MTD (status=in_mtd)", () => {
    syncOrdersBoardOrderPatch(row.id, { status: "in_mtd" });
    assert.equal(
      readOrdersBoardCache(boardKey)!.entry.orders.some((o) => o.id === row.id),
      false
    );
  });
});

describe("confirm match syncs pool, match badges and board locally", () => {
  const boardKey = ordersBoardQueryKey({ formType: cheer, range: "all" });
  const countsKey = ordersBoardCountsQueryKey({});
  const allPoolKey = matchPoolQueryKey({});
  const cheerPoolKey = matchPoolQueryKey({ formType: cheer });
  let manual: Order;
  let form: Order;
  let other: Order;

  const matchCounts = (): OrdersMatchCounts => ({
    magento: 5,
    manual: 4,
    by_form_type: { [cheer]: 5 },
    by_cheer_form_subtype: { rec: 3 },
    by_dance_form_subtype: {},
    manual_by_form_type: { [cheer]: 4 },
    manual_by_cheer_form_subtype: { rec: 2 },
    manual_by_dance_form_subtype: {},
  });

  beforeEach(() => {
    const base = {
      formType: cheer,
      cheerFormSubtype: "rec",
      status: "active",
      packageType: "GOLD",
      timeLengthOfMix: "2:30",
      songListSuggestions: "Song A",
      haveSongs: "HAVE SONGS",
      eightCountSheet: "",
      sendingEightCountSheets: "No",
      needsAttention: false,
      isReassigned: false,
    };
    manual = {
      ...base,
      id: "manual-1",
      isManualEntry: true,
      routineNotes: "",
      assignedProducer: null,
    } as unknown as Order;
    form = {
      ...base,
      id: "form-1",
      isManualEntry: false,
      routineNotes: "Count 8",
      assignedProducer: "CH",
    } as unknown as Order;
    other = { ...base, id: "form-2", isManualEntry: false } as unknown as Order;
    writeOrdersBoardCache(boardKey, { orders: [manual, form], nextPageToken: null });
    writeOrdersBoardCountsOnlyCache(
      countsKey,
      makeCounts({
        form: 61,
        manual: 4,
        form_by_form_type: { [cheer]: 61 },
        manual_by_form_type: { [cheer]: 4 },
        form_by_cheer_form_subtype: { rec: 61 },
        manual_by_cheer_form_subtype: { rec: 4 },
      })
    );
    writeOrdersBoardCountsOnlyCache(
      ordersBoardCountsQueryKey({ source: "manual" }),
      makeCounts({
        all: 4,
        complete_data: 1,
        missing_data: 3,
        assigned: 1,
        not_assigned: 3,
        form: 61,
        manual: 4,
        form_by_form_type: { [cheer]: 61 },
        manual_by_form_type: { [cheer]: 4 },
        form_by_cheer_form_subtype: { rec: 61 },
        manual_by_cheer_form_subtype: { rec: 4 },
        complete_data_by_form_type: { [cheer]: 1 },
        missing_data_by_form_type: { [cheer]: 3 },
        assigned_by_form_type: { [cheer]: 1 },
        not_assigned_by_form_type: { [cheer]: 3 },
        complete_assigned: 0,
        complete_not_assigned: 1,
      })
    );
    writeMatchPoolCache([form, other, manual], "tok", allPoolKey);
    writeMatchPoolCache([manual, form], null, cheerPoolKey);
    writeMatchCountsCache(matchCounts());
  });

  const confirm = () =>
    syncOrdersAfterMatch({
      manual,
      form,
      manualPatch: {},
      formPatch: {
        suppressManualFormMerge: true,
        invoice: "12345",
      },
      discardManual: true,
    });

  it("drops the pair everywhere with no refetch, and undo restores it", () => {
    const undo = confirm();
    assert.deepEqual(
      readMatchPoolCache(allPoolKey)!.entry.orders.map((o) => o.id),
      ["form-2"]
    );
    assert.equal(readMatchPoolCache(allPoolKey)!.entry.nextPageToken, "tok");
    assert.equal(readMatchPoolCache(cheerPoolKey)!.entry.orders.length, 0);

    const mc = readMatchCountsCache()!.counts;
    assert.equal(mc.magento, 4);
    assert.equal(mc.manual, 3);
    assert.equal(mc.by_form_type[cheer], 4);
    assert.equal(mc.by_cheer_form_subtype.rec, 2);
    assert.equal(mc.manual_by_form_type[cheer], 3);
    assert.equal(mc.manual_by_cheer_form_subtype.rec, 1);

    // The manual is discarded. The Magento form stays, so Form totals do not
    // change and All / Manual drop by that one manual.
    const c = readOrdersBoardCountsCache(countsKey)!.counts;
    assert.equal(c.all, 190);
    assert.equal(c.complete_data, 2);
    assert.equal(c.assigned, 17);
    assert.equal(c.complete_assigned, 1);
    assert.equal(c.form, 61);
    assert.equal(c.manual, 3);
    assert.equal(c.form_by_cheer_form_subtype?.rec, 61);
    assert.equal(c.manual_by_cheer_form_subtype?.rec, 3);
    const manualCounts = readOrdersBoardCountsCache(
      ordersBoardCountsQueryKey({ source: "manual" })
    )!.counts;
    assert.equal(manualCounts.all, 3);
    assert.equal(manualCounts.complete_data, 1);
    assert.equal(manualCounts.missing_data, 2);
    assert.equal(manualCounts.assigned, 1);
    assert.equal(manualCounts.not_assigned, 2);
    assert.equal(manualCounts.form, 61);
    assert.equal(manualCounts.manual, 3);
    assert.equal(readOrdersBoardOrder(manual.id), null);
    assert.equal(
      readOrdersBoardOrder(form.id)!.mergedIntoManualOrderId,
      undefined
    );
    assert.equal(readOrdersBoardOrder(form.id)!.invoice, "12345");
    assert.equal(readOrdersBoardOrder(form.id)!.suppressManualFormMerge, true);

    // A stale server page from before the match can't bring the pair back.
    assert.deepEqual(
      dropRecentlyMatched([manual, other, form]).map((o) => o.id),
      ["form-2"]
    );

    undo();
    assert.deepEqual(
      readMatchPoolCache(allPoolKey)!.entry.orders.map((o) => o.id),
      ["form-1", "form-2", "manual-1"]
    );
    assert.deepEqual(readMatchCountsCache()!.counts, matchCounts());
    const back = readOrdersBoardCountsCache(countsKey)!.counts;
    assert.equal(back.all, 191);
    assert.equal(back.complete_data, 2);
    assert.equal(back.missing_data, 189);
    assert.equal(back.assigned, 17);
    assert.equal(back.not_assigned, 174);
    assert.equal(back.complete_assigned, 1);
    assert.equal(back.form, 61);
    assert.equal(back.manual, 4);
    assert.equal(
      readOrdersBoardCountsCache(ordersBoardCountsQueryKey({ source: "manual" }))!
        .counts.all,
      4
    );
    assert.equal(readOrdersBoardOrder(manual.id)?.id, manual.id);
    assert.equal(readOrdersBoardOrder(form.id)!.mergedIntoManualOrderId, undefined);
    assert.equal(readOrdersBoardOrder(form.id)!.suppressManualFormMerge, undefined);
    assert.equal(dropRecentlyMatched([manual, other]).length, 2);
  });

  it("split puts the pair back in date order where its page is loaded", () => {
    const dated = (o: Order, createdAt: string) => ({ ...o, createdAt }) as Order;
    manual = dated(manual, "2026-11-03T10:00:00Z");
    form = dated(form, "2026-11-01T10:00:00Z");
    const newer = dated(other, "2026-11-04T10:00:00Z");
    const older = { ...dated(other, "2026-10-01T10:00:00Z"), id: "form-3" } as Order;
    const danceKey = matchPoolQueryKey({ formType: "school-all-star-dance" });
    writeMatchPoolCache([newer, older], null, cheerPoolKey);
    writeMatchPoolCache([newer], "more", allPoolKey); // older rows not loaded yet
    writeMatchPoolCache([], null, danceKey);
    confirm();
    writeMatchCountsCache(matchCounts());

    const undo = syncOrdersAfterSplit({
      manual: { ...manual, mergedFormOrderId: undefined },
      form: { ...form, mergedIntoManualOrderId: undefined },
    });
    assert.deepEqual(
      readMatchPoolCache(cheerPoolKey)!.entry.orders.map((o) => o.id),
      ["form-2", "manual-1", "form-1", "form-3"]
    );
    assert.deepEqual(
      readMatchPoolCache(allPoolKey)!.entry.orders.map((o) => o.id),
      ["form-2"]
    );
    assert.equal(readMatchPoolCache(danceKey)!.entry.orders.length, 0);
    const mc = readMatchCountsCache()!.counts;
    assert.equal(mc.magento, 6);
    assert.equal(mc.manual, 5);
    assert.equal(mc.by_cheer_form_subtype.rec, 4);
    assert.equal(mc.manual_by_cheer_form_subtype.rec, 3);
    // No longer hidden from fetched pages after a recent match.
    assert.equal(dropRecentlyMatched([manual, form]).length, 2);

    // Failed PATCH: the pair is still matched.
    undo();
    assert.deepEqual(
      readMatchPoolCache(cheerPoolKey)!.entry.orders.map((o) => o.id),
      ["form-2", "form-3"]
    );
    assert.equal(readMatchCountsCache()!.counts.magento, 5);
    assert.equal(readMatchCountsCache()!.counts.manual, 4);
    assert.equal(dropRecentlyMatched([manual, form]).length, 0);
  });

  it("does not keep an absorbed Magento form in board badges", () => {
    confirm();
    assert.equal(
      applyPeerOrderUpdate({
        ...form,
        mergedIntoManualOrderId: manual.id,
        routineNotes: "",
      }),
      null
    );
  });
});

describe("Match lists + badges follow edits and live updates", () => {
  const anthem = "school-anthem";
  const allKey = matchPoolQueryKey({});
  const cheerKey = matchPoolQueryKey({ formType: cheer });
  const recKey = matchPoolQueryKey({ formType: cheer, cheerFormSubtype: "rec" });
  const allStarKey = matchPoolQueryKey({
    formType: cheer,
    cheerFormSubtype: "all-star-cheer",
  });

  const row = (id: string, createdAt: string, extra: Partial<Order> = {}) =>
    ({
      id,
      formType: cheer,
      cheerFormSubtype: "rec",
      status: "active",
      isManualEntry: false,
      createdAt,
      updatedAt: createdAt,
      ...extra,
    }) as unknown as Order;

  const counts = (): OrdersMatchCounts => ({
    magento: 10,
    manual: 2,
    by_form_type: { [cheer]: 8, [anthem]: 2, "marching-band": 0 },
    by_cheer_form_subtype: { rec: 5, "all-star-cheer": 3 },
    by_dance_form_subtype: {},
    manual_by_form_type: { [cheer]: 2, [anthem]: 0 },
    manual_by_cheer_form_subtype: { rec: 2, "all-star-cheer": 0 },
    manual_by_dance_form_subtype: {},
  });
  const ids = (key: string) =>
    readMatchPoolCache(key)!.entry.orders.map((o) => o.id);

  let a: Order;
  let b: Order;
  let star: Order;
  beforeEach(() => {
    a = row("live-a", "2026-11-03T10:00:00Z");
    star = row("live-star", "2026-11-02T10:00:00Z", {
      cheerFormSubtype: "all-star-cheer",
    });
    b = row("live-b", "2026-11-01T10:00:00Z");
    writeMatchPoolCache([a, star, b], "more", allKey);
    writeMatchPoolCache([a, star, b], null, cheerKey);
    writeMatchPoolCache([a, b], null, recKey);
    writeMatchPoolCache([star], null, allStarKey);
    writeMatchCountsCache(counts());
  });

  it("an edit reaches every cached list; a subtype change moves row + badges", () => {
    syncMatchPoolOrderPatch("live-a", { routineNotes: "Count 8" });
    for (const key of [allKey, cheerKey, recKey]) {
      const hit = readMatchPoolCache(key)!.entry.orders.find((o) => o.id === "live-a");
      assert.equal(hit?.routineNotes, "Count 8");
    }
    assert.deepEqual(readMatchCountsCache()!.counts, counts());

    syncMatchPoolOrderPatch("live-a", { cheerFormSubtype: "all-star-cheer" });
    assert.deepEqual(ids(recKey), ["live-b"]);
    assert.deepEqual(ids(allStarKey), ["live-a", "live-star"]);
    assert.deepEqual(ids(cheerKey), ["live-a", "live-star", "live-b"]);
    let mc = readMatchCountsCache()!.counts;
    assert.equal(mc.magento, 10);
    assert.equal(mc.by_cheer_form_subtype.rec, 4);
    assert.equal(mc.by_cheer_form_subtype["all-star-cheer"], 4);

    syncMatchPoolOrderPatch("live-a", { status: "in_mtd" });
    assert.deepEqual(ids(allKey), ["live-star", "live-b"]);
    assert.deepEqual(ids(allStarKey), ["live-star"]);
    mc = readMatchCountsCache()!.counts;
    assert.equal(mc.magento, 9);
    assert.equal(mc.by_form_type[cheer], 7);
    assert.equal(mc.by_cheer_form_subtype["all-star-cheer"], 3);

    // Undo of that save: back where its pages are loaded, badge back up.
    syncMatchPoolOrderPatch(
      "live-a",
      { status: "active" },
      { ...a, cheerFormSubtype: "all-star-cheer", status: "in_mtd" } as Order
    );
    assert.deepEqual(ids(allKey), ["live-a", "live-star", "live-b"]);
    assert.deepEqual(ids(allStarKey), ["live-a", "live-star"]);
    assert.equal(readMatchCountsCache()!.counts.magento, 10);
  });

  it("a brand-new form from the stream lands on top and counts once", () => {
    const now = new Date().toISOString();
    const fresh = row("live-new", now);
    assert.equal(applyMatchPoolLiveOrder(fresh), "synced");
    assert.equal(ids(recKey)[0], "live-new");
    assert.equal(ids(allKey)[0], "live-new");
    assert.ok(!ids(allStarKey).includes("live-new"));
    let mc = readMatchCountsCache()!.counts;
    assert.equal(mc.magento, 11);
    assert.equal(mc.by_cheer_form_subtype.rec, 6);

    applyMatchPoolLiveOrder({ ...fresh, routineNotes: "x" });
    assert.equal(readMatchCountsCache()!.counts.magento, 11);

    const song = row("live-anthem", now, {
      formType: anthem,
      cheerFormSubtype: undefined,
    });
    applyMatchPoolLiveOrder(song);
    applyMatchPoolLiveOrder(song);
    mc = readMatchCountsCache()!.counts;
    assert.equal(mc.by_form_type[anthem], 3);
    assert.equal(mc.magento, 12);
    assert.ok(!ids(cheerKey).includes("live-anthem"));

    // No loaded page would hold it — still counted, still only once.
    writeMatchPoolCache([], "more", allKey);
    const band = row("live-band", now, {
      formType: "marching-band",
      cheerFormSubtype: undefined,
    });
    assert.equal(applyMatchPoolLiveOrder(band), "synced");
    assert.equal(applyMatchPoolLiveOrder(band), null);
    mc = readMatchCountsCache()!.counts;
    assert.equal(mc.by_form_type["marching-band"], 1);
    assert.equal(mc.magento, 13);
    assert.deepEqual(ids(allKey), []);
  });

  it("a peer match takes the row out; rows never seen ask for /match-counts", () => {
    assert.equal(
      applyMatchPoolLiveOrder({ ...b, mergedIntoManualOrderId: "m-x" }),
      "synced"
    );
    assert.deepEqual(ids(recKey), ["live-a"]);
    assert.equal(readMatchCountsCache()!.counts.by_cheer_form_subtype.rec, 4);

    // Behind an unloaded page: nothing says whether it counted before.
    const old = row("live-old", "2026-01-01T00:00:00Z", {
      formType: "marching-band",
      cheerFormSubtype: undefined,
      status: "in_mtd",
    });
    assert.equal(applyMatchPoolLiveOrder(old), "unknown");
    // Now seen: its next update is known.
    assert.equal(applyMatchPoolLiveOrder({ ...old, routineNotes: "y" }), null);

    // The rec list is fully loaded, so a row missing from it wasn't in the pool.
    const back = row("live-back", "2026-10-01T00:00:00Z");
    assert.equal(applyMatchPoolLiveOrder(back), "synced");
    assert.deepEqual(ids(recKey), ["live-a", "live-back"]);
    assert.equal(readMatchCountsCache()!.counts.magento, 10);

    assert.equal(applyMatchPoolLiveDelete("live-back"), "synced");
    assert.deepEqual(ids(recKey), ["live-a"]);
    assert.equal(readMatchCountsCache()!.counts.magento, 9);
    assert.equal(applyMatchPoolLiveDelete("live-never-seen"), "unknown");
  });

  it("a resolved flag starts counting the form the list already held", () => {
    const flagged = row("live-flag", "2026-11-02T12:00:00Z", {
      affiliateFlagStatus: "open",
    });
    writeMatchPoolCache([a, flagged, b], null, recKey);
    applyMatchPoolLiveOrder({ ...flagged, affiliateFlagStatus: "resolved" });
    const mc = readMatchCountsCache()!.counts;
    assert.equal(mc.magento, 11);
    assert.equal(mc.by_cheer_form_subtype.rec, 6);
  });

  it("after a stream gap lists + badges revalidate and seen rows are unknown again", () => {
    const old = row("live-gap", "2026-01-01T00:00:00Z", {
      formType: "marching-band",
      cheerFormSubtype: undefined,
      status: "in_mtd",
    });
    applyMatchPoolLiveOrder(old);
    assert.equal(applyMatchPoolLiveOrder(old), null);
    markMatchPoolLiveGap();
    assert.equal(readMatchPoolCache(recKey)!.fresh, false);
    assert.equal(readMatchCountsCache()!.fresh, false);
    assert.deepEqual(ids(recKey), ["live-a", "live-b"]);
    assert.equal(applyMatchPoolLiveOrder(old), "unknown");
    writeMatchCountsCache(counts());
    assert.equal(readMatchCountsCache()!.fresh, true);
  });
});
