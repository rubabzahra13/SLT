import type { CheerFormSubtype, Order, OrderFormType } from "@/types";
import { CHEER_FORM_SUBTABS } from "@/types";
import { displayMultiline, displayText } from "@/lib/order-form";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { getOrderFormColumns } from "@/components/orders/order-columns";

export type OrderDetailField = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
  preserveCase?: boolean;
};

export type OrderDetailSection = {
  title: string;
  fields: OrderDetailField[];
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  preserveCase?: boolean;
};

const ALL_STAR_CHEER_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Gym",
    fields: [
      { key: "gymName", label: "Gym Name" },
      { key: "gymBillingAddress", label: "Gym Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "Gym State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Team information",
    fields: [
      { key: "teamName", label: "Team Name" },
      {
        key: "division",
        label: "Division that your team competes in",
        multiline: true,
      },
      { key: "teamCoedAllGirl", label: "My team is (Coed/All Girl)" },
      { key: "teamColors", label: "Team colors" },
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
      },
    ],
  },
  {
    title: "Contact information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
    ],
  },
  {
    title: "Mix information",
    fields: [
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Length of mix", preserveCase: true },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "sendingEightCountSheets",
        label: "Will you be sending 8 count sheets?",
      },
      {
        key: "songListSuggestions",
        label: "Song list/suggestions",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
      {
        key: "howDidYouFindOut",
        label: "How did you find out about Sounds Like That?",
        multiline: true,
      },
    ],
  },
];

const CHEER_FORM_CODES: Partial<Record<CheerFormSubtype, string>> = {
  "all-star-cheer": "A",
  "school-cheer-viroc-yes": "B",
  "school-cheer-viroc-no": "C",
  "youth-rec-cheer": "D",
};

function formatFieldValue(
  order: Order,
  def: FieldDef
): OrderDetailField {
  const raw = rawFieldValue(order, def.key);
  const value = def.multiline
    ? def.preserveCase
      ? raw.trim() || "—"
      : displayMultiline(raw, 2000)
    : def.preserveCase
      ? raw.trim() || "—"
      : displayText(raw);

  return {
    key: def.key,
    label: def.label,
    value,
    multiline: def.multiline,
    preserveCase: def.preserveCase,
  };
}

function buildSections(
  sectionDefs: { title: string; fields: FieldDef[] }[],
  order: Order
): OrderDetailSection[] {
  return sectionDefs.map((section) => ({
    title: section.title,
    fields: section.fields.map((field) => formatFieldValue(order, field)),
  }));
}

export function getCheerFormCode(subtype?: CheerFormSubtype): string | null {
  if (!subtype) return null;
  return CHEER_FORM_CODES[subtype] ?? null;
}

export function getCheerFormTitle(subtype?: CheerFormSubtype): string | null {
  if (!subtype) return null;
  return CHEER_FORM_SUBTABS.find((tab) => tab.id === subtype)?.label ?? null;
}

export function getOrderFormBadge(order: Order): string | null {
  if (order.formType !== "school-all-star-cheer") return null;
  const code = getCheerFormCode(order.cheerFormSubtype);
  const title = getCheerFormTitle(order.cheerFormSubtype);
  if (!code || !title) return title;
  return `${code} · ${title.toUpperCase()}`;
}

export function getOrderDetailSections(order: Order): OrderDetailSection[] {
  if (
    order.formType === "school-all-star-cheer" &&
    order.cheerFormSubtype === "all-star-cheer"
  ) {
    return buildSections(ALL_STAR_CHEER_FIELDS, order);
  }

  return [
    {
      title: "Order details",
      fields: getOrderFormColumns(order).map((col) => {
        const raw = rawFieldValue(order, col.key);
        const multiline = col.nowrap === false;
        return {
          key: col.key,
          label: col.header,
          value: multiline ? displayMultiline(raw, 2000) : displayText(raw),
          multiline,
        };
      }),
    },
  ];
}

export function getFormTypeLabel(formType: OrderFormType): string {
  switch (formType) {
    case "school-all-star-cheer":
      return "All Star Cheer";
    case "school-all-star-dance":
      return "All Star Dance";
    case "marching-band":
      return "Marching Band";
    case "sports-entertainment":
      return "Sports Entertainment";
    case "school-anthem":
      return "School Anthem";
    default:
      return formType;
  }
}
