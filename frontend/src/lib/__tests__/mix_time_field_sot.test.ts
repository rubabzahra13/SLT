import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderRequirements,
  mergeOrderFormFieldsForRequirements,
} from "../order-requirements";
import type { DanceFormSubtype, Order, OrderFormType } from "../../types";

function mixState(order: Order): string | undefined {
  return getOrderRequirements(order).collections.find((r) => r.id === "mix")
    ?.state;
}

function baseOrder(
  formType: OrderFormType,
  overrides: Partial<Order> = {}
): Order {
  return {
    id: `mix-${formType}`,
    formType,
    category:
      formType === "sports-entertainment"
        ? "Sports Entertainment"
        : formType === "school-all-star-dance"
          ? "All Star Dance"
          : formType === "marching-band"
            ? "Marching Band"
            : formType === "school-anthem"
              ? "School Anthem"
              : "Cheer",
    package: "TBD",
    packageType: "TBD",
    timeLengthOfMix: "",
    musicTheme: "",
    customerName: "Demo",
    contactName: "Demo",
    programName: "Demo Org",
    editorRequest: "FA",
    price: 0,
    status: "new",
    createdAt: "2026-10-17",
    needsAttention: false,
    isManualEntry: false,
    ...overrides,
  } as Order;
}

describe("Mix Time SoT: Time Length field only (all categories)", () => {
  const cases: {
    label: string;
    formType: OrderFormType;
    package: string;
    danceFormSubtype?: DanceFormSubtype;
    cheerFormSubtype?: Order["cheerFormSubtype"];
    needMix: boolean;
  }[] = [
    {
      label: "All-Star Cheer",
      formType: "school-all-star-cheer",
      package: "GOLD 2:00",
      cheerFormSubtype: "all-star-cheer",
      needMix: false, // Cheer mix length lives in package SoftSelect; Mix pill N/A for GOLD
    },
    {
      label: "Sports Entertainment",
      formType: "sports-entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      needMix: true,
    },
    {
      label: "POM Dance",
      formType: "school-all-star-dance",
      package: "CUSTOM POM",
      danceFormSubtype: "pom",
      needMix: true,
    },
    {
      label: "Hip Hop Dance",
      formType: "school-all-star-dance",
      package: "DANCE MIX",
      danceFormSubtype: "hip-hop",
      needMix: true,
    },
    {
      label: "Marching Band",
      formType: "marching-band",
      package: "BAND CHANT",
      needMix: true,
    },
  ];

  for (const c of cases) {
    if (!c.needMix) continue;

    describe(c.label, () => {
      it("is red when Time Length is empty: even with stale Mix override", () => {
        const order = baseOrder(c.formType, {
          package: c.package,
          packageType: c.package,
          danceFormSubtype: c.danceFormSubtype,
          cheerFormSubtype: c.cheerFormSubtype,
          timeLengthOfMix: "",
          collectionStates: { mix: true, time_of_mix: true },
        });
        assert.equal(mixState(order), "red");
      });

      it("is green when Time Length is filled", () => {
        const order = baseOrder(c.formType, {
          package: c.package,
          packageType: c.package,
          danceFormSubtype: c.danceFormSubtype,
          cheerFormSubtype: c.cheerFormSubtype,
          timeLengthOfMix: "2:00",
          collectionStates: { mix: false },
        });
        assert.equal(mixState(order), "green");
      });

      it("does not turn green from package label time alone when field is empty", () => {
        const order = baseOrder(c.formType, {
          package: `${c.package} 2:15`,
          packageType: c.package,
          danceFormSubtype: c.danceFormSubtype,
          cheerFormSubtype: c.cheerFormSubtype,
          timeLengthOfMix: "",
        });
        assert.equal(mixState(order), "red");
      });
    });
  }

  it("SE Pre-Game/Halftime with empty Time Length stays red (board bug repro)", () => {
    const order = baseOrder("sports-entertainment", {
      package: "Pre-Game/Halftime Remixed Package",
      packageType: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
      collectionStates: { mix: true },
      organizationName: "Demo Arena Org",
      programName: "Demo Arena Org",
    });
    assert.equal(mixState(order), "red");
  });

  it("mergeOrderFormFieldsForRequirements drops Mix override when linked Time Length empty", () => {
    const staging = baseOrder("sports-entertainment", {
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "2:00",
      collectionStates: { mix: true },
    });
    const linked = baseOrder("sports-entertainment", {
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
      collectionStates: {},
    });
    const merged = mergeOrderFormFieldsForRequirements(staging, linked) as Order;
    assert.equal(merged.timeLengthOfMix, "");
    assert.equal(merged.collectionStates?.mix, undefined);
    assert.equal(mixState(merged), "red");
  });

  it("School Anthem does not require Mix Time", () => {
    const order = baseOrder("school-anthem", {
      package: "SCHOOL ANTHEMS",
      timeLengthOfMix: "",
    });
    const mix = getOrderRequirements(order).collections.find((r) => r.id === "mix");
    assert.ok(!mix || !mix.isApplicable || mix.state === "white");
  });
});
