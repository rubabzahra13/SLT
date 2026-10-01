import { orderCategoryToProducerCategory } from "@/lib/editor-assignment";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
  type OrderFormType,
} from "@/types";

export type ProducerCategorySubcategory = {
  id: string;
  label: string;
};

export type ProducerCategoryGroup = {
  id: OrderFormType;
  label: string;
  subcategories: ProducerCategorySubcategory[];
};

function labelForProducerCategory(id: string, fallback: string): string {
  if (id === "All-Star Cheer") return "All Star Cheer";
  if (id === "Team Performance / Variety") return "Team Performance & Variety";
  return fallback.replace(" · VIROC Yes", "").replace(" · VIROC No", "").replace("VIROC Yes", "VIROC").replace("VIROC No", "School Cheer");
}

function uniqueSubcategories(
  formType: OrderFormType,
  subs: { id: string; label: string }[]
): ProducerCategorySubcategory[] {
  const seen = new Set<string>();
  const result: ProducerCategorySubcategory[] = [];

  for (const sub of subs) {
    const id = orderCategoryToProducerCategory(formType, sub.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      label: labelForProducerCategory(id, sub.label),
    });
  }

  return result;
}

const CHEER_GROUP: ProducerCategoryGroup = {
  id: "school-all-star-cheer",
  label: "All Star Cheer",
  subcategories: uniqueSubcategories("school-all-star-cheer", CHEER_FORM_SUBTABS),
};

const DANCE_GROUP: ProducerCategoryGroup = {
  id: "school-all-star-dance",
  label: "All Star Dance",
  subcategories: uniqueSubcategories("school-all-star-dance", DANCE_FORM_SUBTABS),
};

const SINGLE_FORM_GROUPS: ProducerCategoryGroup[] = (
  [
    "marching-band",
    "sports-entertainment",
    "school-anthem",
  ] as const
).map((formType) => {
  const tab = ORDER_FORM_TABS.find((entry) => entry.id === formType);
  const id = orderCategoryToProducerCategory(formType, undefined);
  return {
    id: formType,
    label: tab?.label ?? formType,
    subcategories: id ? [{ id, label: tab?.label ?? id }] : [],
  };
});

export const PRODUCER_CATEGORY_GROUPS: ProducerCategoryGroup[] = [
  CHEER_GROUP,
  DANCE_GROUP,
  ...SINGLE_FORM_GROUPS,
];

export function getAvailableProducerCategoryGroups(
  assignedCategories: string[]
): ProducerCategoryGroup[] {
  const assigned = new Set(assignedCategories);

  return PRODUCER_CATEGORY_GROUPS.map((group) => ({
    ...group,
    subcategories: group.subcategories.filter((sub) => !assigned.has(sub.id)),
  })).filter((group) => group.subcategories.length > 0);
}

export function hasAvailableProducerCategories(
  assignedCategories: string[]
): boolean {
  return getAvailableProducerCategoryGroups(assignedCategories).length > 0;
}

export function findProducerCategoryGroup(
  categoryId: string
): ProducerCategoryGroup | undefined {
  return PRODUCER_CATEGORY_GROUPS.find((group) =>
    group.subcategories.some((sub) => sub.id === categoryId)
  );
}
