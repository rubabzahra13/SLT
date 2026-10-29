import { SCHOOL_ANTHEM_PACKAGE } from "@/lib/order-form";
import type { DanceFormSubtype, MTDRecord, Order } from "@/types";

/**
 * Resolve the order shape for Add/Edit form sections.
 * Trusts formType first: never let stale cheer/dance subtypes on an MTD row
 * rewrite School Anthem / MB / Sports into Cheer or Dance sections.
 */
export function resolveOrderFormDisplay(
  order: Order,
  record?: Pick<MTDRecord, "cheerFormSubtype" | "danceFormSubtype"> | null
): Order {
  const formType = order.formType;

  if (formType === "school-anthem") {
    return {
      ...order,
      formType: "school-anthem",
      cheerFormSubtype: undefined,
      danceFormSubtype: undefined,
      packageType: order.packageType || SCHOOL_ANTHEM_PACKAGE,
      package: order.package || SCHOOL_ANTHEM_PACKAGE,
    };
  }

  if (formType === "marching-band") {
    return {
      ...order,
      formType: "marching-band",
      cheerFormSubtype: undefined,
      danceFormSubtype: undefined,
    };
  }

  if (formType === "sports-entertainment") {
    return {
      ...order,
      formType: "sports-entertainment",
      cheerFormSubtype: undefined,
      danceFormSubtype: undefined,
    };
  }

  if (formType === "school-all-star-dance") {
    const danceSubtypeRaw = String(
      order.danceFormSubtype || record?.danceFormSubtype || ""
    );
    const danceSubtype: DanceFormSubtype =
      danceSubtypeRaw === "team-performance" ||
      danceSubtypeRaw.startsWith("team-performance")
        ? "team-performance-variety"
        : ((danceSubtypeRaw ||
            order.danceFormSubtype ||
            "pom") as DanceFormSubtype);
    return {
      ...order,
      formType: "school-all-star-dance",
      cheerFormSubtype: undefined,
      danceFormSubtype: danceSubtype,
    };
  }

  // Cheer (explicit or legacy missing formType).
  if (formType === "school-all-star-cheer" || !formType) {
    const virocFlag = String(order.varsityVirocCustomer || "").toLowerCase();
    const recSubtype = String(record?.cheerFormSubtype || "");

    const virocYes =
      order.cheerFormSubtype === "school-cheer-viroc-yes" ||
      virocFlag === "yes" ||
      recSubtype === "school-cheer-viroc-yes";
    if (virocYes) {
      return {
        ...order,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        danceFormSubtype: undefined,
        varsityVirocCustomer: "Yes",
      };
    }

    const schoolCheerNo =
      order.cheerFormSubtype === "school-cheer-viroc-no" ||
      virocFlag === "no" ||
      recSubtype === "school-cheer-viroc-no";
    if (schoolCheerNo) {
      return {
        ...order,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        danceFormSubtype: undefined,
        varsityVirocCustomer: "No",
      };
    }

    const youthRec =
      order.cheerFormSubtype === "youth-rec-cheer" ||
      recSubtype === "youth-rec-cheer";
    if (youthRec) {
      return {
        ...order,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "youth-rec-cheer",
        danceFormSubtype: undefined,
      };
    }

    return {
      ...order,
      formType: "school-all-star-cheer",
      cheerFormSubtype: order.cheerFormSubtype || "all-star-cheer",
      danceFormSubtype: undefined,
    };
  }

  return order;
}
