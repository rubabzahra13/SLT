import { orderCategoryToProducerCategory, producerSupportsCategory } from "./editor-assignment";
import type { Producer } from "@/types";
import {
  CHEER_FORM_SUBTABS,
  CHEER_FORM_SUBTABS_WITH_ALL,
  DANCE_FORM_SUBTABS,
  DANCE_FORM_SUBTABS_WITH_ALL,
  ORDER_FORM_TABS,
  type CheerFormSubtypeFilter,
  type DanceFormSubtypeFilter,
  type OrderFormType,
} from "@/types";

const CHEER_PRODUCER_CATEGORIES = [
  "All-Star Cheer",
  "School Cheer",
  "Youth Rec Cheer",
] as const;

const DANCE_PRODUCER_CATEGORIES = [
  "Pom",
  "Hip Hop",
  "Team Performance / Variety",
  "Gameday",
  "Jazz / Kick",
] as const;

function producerSupportsAnyCategory(
  producer: Producer,
  categories: readonly string[]
): boolean {
  return categories.some((category) => producerSupportsCategory(producer, category));
}

export function producerMatchesScheduleFormFilter(
  producer: Producer,
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter
): boolean {
  if (form === "school-all-star-cheer") {
    if (cheerSubtype === "all") {
      return producerSupportsAnyCategory(producer, CHEER_PRODUCER_CATEGORIES);
    }
    const category = orderCategoryToProducerCategory(form, cheerSubtype);
    return producerSupportsCategory(producer, category);
  }

  if (form === "school-all-star-dance") {
    if (danceSubtype === "all") {
      return producerSupportsAnyCategory(producer, DANCE_PRODUCER_CATEGORIES);
    }
    const category = orderCategoryToProducerCategory(form, danceSubtype);
    return producerSupportsCategory(producer, category);
  }

  const category = orderCategoryToProducerCategory(form, undefined);
  return producerSupportsCategory(producer, category);
}

export function countProducersByForm(
  producers: Producer[]
): Record<OrderFormType, number> {
  const counts = Object.fromEntries(
    ORDER_FORM_TABS.map(({ id }) => [id, 0])
  ) as Record<OrderFormType, number>;

  for (const producer of producers) {
    for (const { id } of ORDER_FORM_TABS) {
      if (
        producerMatchesScheduleFormFilter(
          producer,
          id,
          "all",
          "all"
        )
      ) {
        counts[id] += 1;
      }
    }
  }

  return counts;
}

export function countProducersByCheerSubtype(
  producers: Producer[]
): Record<CheerFormSubtypeFilter, number> {
  const counts = {
    all: 0,
    ...Object.fromEntries(CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])),
  } as Record<CheerFormSubtypeFilter, number>;

  for (const producer of producers) {
    if (!producerSupportsAnyCategory(producer, CHEER_PRODUCER_CATEGORIES)) {
      continue;
    }
    counts.all += 1;
    for (const { id } of CHEER_FORM_SUBTABS) {
      if (producerMatchesScheduleFormFilter(producer, "school-all-star-cheer", id, "all")) {
        counts[id] += 1;
      }
    }
  }

  return counts;
}

export function countProducersByDanceSubtype(
  producers: Producer[]
): Record<DanceFormSubtypeFilter, number> {
  const counts = {
    all: 0,
    ...Object.fromEntries(DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])),
  } as Record<DanceFormSubtypeFilter, number>;

  for (const producer of producers) {
    if (!producerSupportsAnyCategory(producer, DANCE_PRODUCER_CATEGORIES)) {
      continue;
    }
    counts.all += 1;
    for (const { id } of DANCE_FORM_SUBTABS) {
      if (producerMatchesScheduleFormFilter(producer, "school-all-star-dance", "all", id)) {
        counts[id] += 1;
      }
    }
  }

  return counts;
}

export function scheduleFormFilterLabel(
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter
): string {
  if (form === "school-all-star-cheer" && cheerSubtype !== "all") {
    return (
      CHEER_FORM_SUBTABS_WITH_ALL.find(({ id }) => id === cheerSubtype)?.label ??
      ORDER_FORM_TABS.find(({ id }) => id === form)?.label ??
      form
    );
  }

  if (form === "school-all-star-dance" && danceSubtype !== "all") {
    return (
      DANCE_FORM_SUBTABS_WITH_ALL.find(({ id }) => id === danceSubtype)?.label ??
      ORDER_FORM_TABS.find(({ id }) => id === form)?.label ??
      form
    );
  }

  return ORDER_FORM_TABS.find(({ id }) => id === form)?.label ?? form;
}
