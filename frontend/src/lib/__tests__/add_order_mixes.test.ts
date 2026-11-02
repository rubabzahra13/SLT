import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addOrderDraftHasContent,
  addOrderSaveBlockReason,
  applyMixFieldValues,
  blankAddOrderPerMixValues,
  buildManualOrdersFromMixes,
  defaultAddOrderMixLength,
  defaultAddOrderPackageType,
  getAddOrderMultiMixFieldKeys,
  isAddOrderPerMixFieldKey,
  MAX_ADD_ORDER_MIXES,
  orderWithoutMixFields,
  supportsAddOrderMultiMix,
} from "../add-order-mixes";
import type { Order } from "../../types";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    customerName: "",
    contactName: "",
    programName: "",
    category: "All Star Cheer",
    package: "",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 0,
    status: "new",
    createdAt: new Date().toISOString(),
    needsAttention: false,
    attentionReason: null,
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    isManualEntry: true,
    ...overrides,
  } as Order;
}

describe("add-order-mixes", () => {
  it("cheer, dance, and marching band support multi-mix; other forms do not", () => {
    assert.equal(supportsAddOrderMultiMix(baseOrder()), true);
    assert.equal(
      supportsAddOrderMultiMix(
        baseOrder({
          formType: "school-all-star-dance",
          danceFormSubtype: "pom",
          cheerFormSubtype: undefined,
        })
      ),
      true
    );
    assert.equal(
      supportsAddOrderMultiMix(
        baseOrder({
          formType: "marching-band",
          cheerFormSubtype: undefined,
          category: "Marching Band",
        })
      ),
      true
    );
    assert.equal(
      supportsAddOrderMultiMix(baseOrder({ formType: "school-anthem" })),
      false
    );
    assert.equal(
      supportsAddOrderMultiMix(
        baseOrder({ formType: "sports-entertainment" })
      ),
      false
    );
  });

  it("All Star cheer: editor, division, team, package, length", () => {
    assert.equal(isAddOrderPerMixFieldKey("musicAffiliate"), false);
    assert.deepEqual(getAddOrderMultiMixFieldKeys(baseOrder()), [
      "requestedEditor",
      "division",
      "teamName",
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("VIROC omits teamName (not on Magento form)", () => {
    const viroc = baseOrder({ cheerFormSubtype: "school-cheer-viroc-yes" });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(viroc), [
      "requestedEditor",
      "division",
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("Youth Rec: Team Name is per-mix (even though Magento puts it on Program)", () => {
    const youth = baseOrder({ cheerFormSubtype: "youth-rec-cheer" });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(youth), [
      "teamName",
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("POM dance: package + editor (no style on Magento form)", () => {
    const pom = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(pom), [
      "packageType",
      "requestedEditor",
    ]);
  });

  it("TPV dance includes style when on form; still no invented date", () => {
    const tpv = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "team-performance-variety",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    const keys = getAddOrderMultiMixFieldKeys(tpv);
    assert.ok(keys.includes("style"));
    assert.ok(keys.includes("packageType"));
    assert.ok(keys.includes("requestedEditor"));
    assert.ok(!keys.includes("mixEndDate"));
  });

  it("Gameday dance uses styleOfGamedayMix, not style", () => {
    const gameday = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "gameday",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    const keys = getAddOrderMultiMixFieldKeys(gameday);
    assert.ok(keys.includes("styleOfGamedayMix"));
    assert.ok(!keys.includes("style"));
    assert.ok(!keys.includes("mixEndDate"));
  });

  it("caps at 10 mixes", () => {
    assert.equal(MAX_ADD_ORDER_MIXES, 10);
  });

  it("shared affiliate stays on base when applying a mix slot", () => {
    const order = baseOrder({
      musicAffiliate: "Power Music",
      routineNotes: "Shared notes",
      gymName: "Thunder",
    });
    const keys = getAddOrderMultiMixFieldKeys(order);
    const shared = orderWithoutMixFields(order, keys);
    const full = applyMixFieldValues(shared, {
      teamName: "Team A",
      packageType: "GOLD",
      timeLengthOfMix: "2:30",
    });
    assert.equal(full.musicAffiliate, "Power Music");
    assert.equal(full.routineNotes, "Shared notes");
    assert.equal(full.gymName, "Thunder");
    assert.equal(full.teamName, "Team A");
    assert.equal(full.packageType, "GOLD");
  });

  it("content rule: shared gym name unlocks save", () => {
    const order = baseOrder({ gymName: "Thunder Elite" });
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(addOrderDraftHasContent(order, [{}], keys), true);
  });

  it("content rule: cheer team name alone does not unlock save", () => {
    const order = baseOrder();
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(
      addOrderDraftHasContent(order, [{ teamName: "Open" }], keys),
      false
    );
    assert.equal(
      addOrderDraftHasContent(
        order,
        [{ teamName: "Open" }, { teamName: "Elite" }],
        keys
      ),
      false
    );
    assert.match(
      addOrderSaveBlockReason(order, [{ teamName: "Open" }], keys),
      /Gym or Coach \/ Billing\. Division and Team Name do not count/i
    );
  });

  it("content rule: cheer package alone does not unlock save", () => {
    const order = baseOrder();
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(
      addOrderDraftHasContent(order, [{ packageType: "GOLD" }], keys),
      false
    );
    assert.equal(
      addOrderDraftHasContent(order, [{ packageType: "TBD" }], keys),
      false
    );
  });

  it("default package type is TBD (School Anthems for anthem)", () => {
    assert.equal(defaultAddOrderPackageType("school-all-star-cheer"), "TBD");
    assert.equal(defaultAddOrderPackageType("school-all-star-dance"), "TBD");
    assert.equal(defaultAddOrderPackageType("marching-band"), "TBD");
    assert.equal(defaultAddOrderPackageType("school-anthem"), "SCHOOL ANTHEMS");
    assert.equal(blankAddOrderPerMixValues().packageType, "TBD");
  });

  it("default mix length is TBD", () => {
    assert.equal(defaultAddOrderMixLength("school-all-star-cheer"), "TBD");
    assert.equal(defaultAddOrderMixLength("marching-band"), "TBD");
    assert.equal(defaultAddOrderMixLength("school-anthem"), "");
    assert.equal(blankAddOrderPerMixValues().timeLengthOfMix, "TBD");
    assert.equal(
      addOrderDraftHasContent(
        baseOrder({ timeLengthOfMix: "TBD" }),
        [{ timeLengthOfMix: "TBD" }],
        getAddOrderMultiMixFieldKeys(baseOrder())
      ),
      false
    );
  });

  it("content rule: Time Length of Mix alone does not unlock save", () => {
    const cheer = baseOrder();
    const cheerKeys = getAddOrderMultiMixFieldKeys(cheer);
    assert.equal(
      addOrderDraftHasContent(cheer, [{ timeLengthOfMix: "2:30" }], cheerKeys),
      false
    );
    const mb = baseOrder({
      formType: "marching-band",
      cheerFormSubtype: undefined,
      category: "Marching Band",
    });
    const mbKeys = getAddOrderMultiMixFieldKeys(mb);
    assert.equal(
      addOrderDraftHasContent(mb, [{ timeLengthOfMix: "7:00" }], mbKeys),
      false
    );
    assert.match(
      addOrderSaveBlockReason(mb, [{ timeLengthOfMix: "7:00" }], mbKeys),
      /Gym or Coach \/ Billing\. Division and Team Name do not count/i
    );
  });

  it("content rule: dance/MB unlock on any one non-default field", () => {
    const dance = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    const danceKeys = getAddOrderMultiMixFieldKeys(dance);
    assert.equal(
      addOrderDraftHasContent(dance, [{ packageType: "CUSTOM POM" }], danceKeys),
      false
    );
    assert.equal(
      addOrderDraftHasContent(
        { ...dance, schoolProgramName: "Westside Dance" },
        [{}],
        danceKeys
      ),
      true
    );
    assert.equal(
      addOrderDraftHasContent(
        { ...dance, coachPhone: "512-555-0199" },
        [{}],
        danceKeys
      ),
      true
    );
    const mb = baseOrder({
      formType: "marching-band",
      cheerFormSubtype: undefined,
      category: "Marching Band",
    });
    const mbKeys = getAddOrderMultiMixFieldKeys(mb);
    assert.equal(
      addOrderDraftHasContent(mb, [{ packageType: "BAND CHANT" }], mbKeys),
      false
    );
    assert.equal(
      addOrderDraftHasContent(
        { ...mb, schoolProgramName: "Westlake Band" },
        [{}],
        mbKeys
      ),
      true
    );
  });

  it("content rule: First Available alone does not unlock save", () => {
    const order = baseOrder();
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(
      addOrderDraftHasContent(
        order,
        [{ requestedEditor: "First Available" }],
        keys
      ),
      false
    );
  });

  it("content rule: Division alone does not unlock save", () => {
    const order = baseOrder({ divisionOfTeam: "Level 5" });
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(addOrderDraftHasContent(order, [{}], keys), false);
    assert.equal(
      addOrderDraftHasContent(order, [{ division: "Level 5" }], keys),
      false
    );
  });

  it("Save N Orders: shared gym identity; distinct team/package per mix", () => {
    const draft = baseOrder({
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
      coachName: "Coach Kim",
      coachEmail: "kim@example.com",
    });
    const orders = buildManualOrdersFromMixes({
      orderDraft: draft,
      mixes: [
        {
          teamName: "Open",
          packageType: "GOLD",
          timeLengthOfMix: "2:00",
          requestedEditor: "First Available",
          division: "Level 5",
        },
        {
          teamName: "Elite",
          packageType: "PLATINUM",
          timeLengthOfMix: "2:30",
          requestedEditor: "NA",
          division: "Level 4",
        },
      ],
      formType: "school-all-star-cheer",
      cheerSubtype: "all-star-cheer",
      danceSubtype: "pom",
      category: "All Star Cheer",
    });
    assert.equal(orders.length, 2);
    assert.equal(orders[0].gymName, "Spirit Elite");
    assert.equal(orders[1].gymName, "Spirit Elite");
    assert.equal(orders[0].programName, "Spirit Elite");
    assert.equal(orders[1].programName, "Spirit Elite");
    assert.equal(orders[0].teamName, "Open");
    assert.equal(orders[1].teamName, "Elite");
    assert.equal(orders[0].packageType, "GOLD");
    assert.equal(orders[1].packageType, "PLATINUM");
    assert.equal(orders[0].timeLengthOfMix, "2:00");
    assert.equal(orders[1].timeLengthOfMix, "2:30");
    assert.equal(orders[0].requestedProducer, "First Available");
    assert.equal(orders[1].requestedProducer, "NA");
    assert.equal(orders[0].division, "Level 5");
    assert.equal(orders[1].division, "Level 4");
  });

  it("Save N Orders: team name never becomes gym/program identity", () => {
    const draft = baseOrder({
      gymName: "",
      programName: "",
      schoolName: "",
    });
    const orders = buildManualOrdersFromMixes({
      orderDraft: draft,
      mixes: [
        {
          teamName: "Open",
          packageType: "GOLD",
          timeLengthOfMix: "2:00",
        },
      ],
      formType: "school-all-star-cheer",
      cheerSubtype: "all-star-cheer",
      danceSubtype: "pom",
      category: "All Star Cheer",
    });
    assert.equal(orders.length, 1);
    assert.equal(orders[0].teamName, "Open");
    assert.equal(orders[0].gymName || "", "");
    assert.equal(orders[0].programName || "", "");
    assert.equal(orders[0].schoolName || "", "");
    assert.notEqual(orders[0].gymName, "Open");
    assert.notEqual(orders[0].programName, "Open");
  });

  it("Jazz/Kick dance: style + package + editor are per-mix", () => {
    const jazz = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "jazz-kick",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(jazz), [
      "style",
      "packageType",
      "requestedEditor",
    ]);
  });

  it("Marching Band: package + mix length are per-mix", () => {
    const mb = baseOrder({
      formType: "marching-band",
      cheerFormSubtype: undefined,
      category: "Marching Band",
    });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(mb), [
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("Save N Orders dance: shared school/program; distinct style/package/editor", () => {
    const draft = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "team-performance-variety",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
      schoolProgramName: "Westside Dance",
      programName: "Westside Dance",
      coachName: "Coach Dana",
    });
    const orders = buildManualOrdersFromMixes({
      orderDraft: draft,
      mixes: [
        {
          style: "Jazz / Lyrical",
          packageType: "CUSTOM TEAM PERFORMANCE",
          requestedEditor: "First Available",
        },
        {
          style: "Hip Hop",
          packageType: "STANDARD TEAM PERFORMANCE",
          requestedEditor: "NA",
        },
      ],
      formType: "school-all-star-dance",
      cheerSubtype: "all-star-cheer",
      danceSubtype: "team-performance-variety",
      category: "All Star Dance",
    });
    assert.equal(orders.length, 2);
    assert.equal(orders[0].schoolProgramName, "Westside Dance");
    assert.equal(orders[1].schoolProgramName, "Westside Dance");
    assert.equal(orders[0].programName, "Westside Dance");
    assert.equal(orders[1].programName, "Westside Dance");
    assert.equal(orders[0].style, "Jazz / Lyrical");
    assert.equal(orders[1].style, "Hip Hop");
    assert.equal(orders[0].packageType, "CUSTOM TEAM PERFORMANCE");
    assert.equal(orders[1].packageType, "STANDARD TEAM PERFORMANCE");
    assert.equal(orders[0].requestedProducer, "First Available");
    assert.equal(orders[1].requestedProducer, "NA");
    assert.notEqual(orders[0].schoolProgramName, orders[0].style);
  });

  it("Save N Orders gameday: styleOfGamedayMix unique per mix; mirrored to style", () => {
    const draft = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "gameday",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
      schoolProgramName: "Central HS",
    });
    const orders = buildManualOrdersFromMixes({
      orderDraft: draft,
      mixes: [
        {
          styleOfGamedayMix: "Fight Song",
          packageType: "GAMEDAY",
          requestedEditor: "First Available",
        },
        {
          styleOfGamedayMix: "Spirit",
          packageType: "GAMEDAY PLUS",
          requestedEditor: "NA",
        },
      ],
      formType: "school-all-star-dance",
      cheerSubtype: "all-star-cheer",
      danceSubtype: "gameday",
      category: "All Star Dance",
    });
    assert.equal(orders[0].styleOfGamedayMix, "Fight Song");
    assert.equal(orders[1].styleOfGamedayMix, "Spirit");
    assert.equal(orders[0].style, "Fight Song");
    assert.equal(orders[1].style, "Spirit");
    assert.equal(orders[0].schoolProgramName, "Central HS");
    assert.equal(orders[1].schoolProgramName, "Central HS");
  });

  it("Save N Orders marching band: shared school/program; distinct package/length", () => {
    const draft = baseOrder({
      formType: "marching-band",
      cheerFormSubtype: undefined,
      category: "Marching Band",
      schoolProgramName: "Westlake High Marching Band",
      coachName: "Sousa",
    });
    const orders = buildManualOrdersFromMixes({
      orderDraft: draft,
      mixes: [
        {
          packageType: "FULL MARCHING ARRANGEMENT",
          timeLengthOfMix: "7:00",
        },
        {
          packageType: "STAND TUNE",
          timeLengthOfMix: "2:30",
        },
      ],
      formType: "marching-band",
      cheerSubtype: "all-star-cheer",
      danceSubtype: "pom",
      category: "Marching Band",
    });
    assert.equal(orders.length, 2);
    assert.equal(orders[0].schoolProgramName, "Westlake High Marching Band");
    assert.equal(orders[1].schoolProgramName, "Westlake High Marching Band");
    assert.equal(orders[0].programName, "Westlake High Marching Band");
    assert.equal(orders[1].programName, "Westlake High Marching Band");
    assert.equal(orders[0].packageType, "FULL MARCHING ARRANGEMENT");
    assert.equal(orders[1].packageType, "STAND TUNE");
    assert.equal(orders[0].timeLengthOfMix, "7:00");
    assert.equal(orders[1].timeLengthOfMix, "2:30");
  });

  it("Save N Orders: cheer team-only mixes create unique orders without gym", () => {
    const draft = baseOrder({ gymName: "", programName: "" });
    const orders = buildManualOrdersFromMixes({
      orderDraft: draft,
      mixes: [
        { teamName: "Open", packageType: "GOLD" },
        { teamName: "Elite", packageType: "PLATINUM" },
        { packageType: "SILVER" },
      ],
      formType: "school-all-star-cheer",
      cheerSubtype: "all-star-cheer",
      danceSubtype: "pom",
      category: "All Star Cheer",
    });
    assert.equal(orders.length, 2);
    assert.equal(orders[0].teamName, "Open");
    assert.equal(orders[1].teamName, "Elite");
    assert.equal(orders[0].gymName || "", "");
    assert.equal(orders[1].gymName || "", "");
  });

});
