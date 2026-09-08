"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.producerMatchesScheduleFormFilter = producerMatchesScheduleFormFilter;
exports.countProducersByForm = countProducersByForm;
exports.countProducersByCheerSubtype = countProducersByCheerSubtype;
exports.countProducersByDanceSubtype = countProducersByDanceSubtype;
exports.scheduleFormFilterLabel = scheduleFormFilterLabel;
const editor_assignment_1 = require("./editor-assignment");
const types_1 = require("@/types");
const CHEER_PRODUCER_CATEGORIES = [
    "All-Star Cheer",
    "School Cheer",
    "Youth Rec Cheer",
];
const DANCE_PRODUCER_CATEGORIES = [
    "Pom",
    "Hip Hop",
    "Team Performance / Variety",
    "Gameday",
    "Jazz / Kick",
];
function producerSupportsAnyCategory(producer, categories) {
    return categories.some((category) => (0, editor_assignment_1.producerSupportsCategory)(producer, category));
}
function producerMatchesScheduleFormFilter(producer, form, cheerSubtype, danceSubtype) {
    if (form === "school-all-star-cheer") {
        if (cheerSubtype === "all") {
            return producerSupportsAnyCategory(producer, CHEER_PRODUCER_CATEGORIES);
        }
        const category = (0, editor_assignment_1.orderCategoryToProducerCategory)(form, cheerSubtype);
        return (0, editor_assignment_1.producerSupportsCategory)(producer, category);
    }
    if (form === "school-all-star-dance") {
        if (danceSubtype === "all") {
            return producerSupportsAnyCategory(producer, DANCE_PRODUCER_CATEGORIES);
        }
        const category = (0, editor_assignment_1.orderCategoryToProducerCategory)(form, danceSubtype);
        return (0, editor_assignment_1.producerSupportsCategory)(producer, category);
    }
    const category = (0, editor_assignment_1.orderCategoryToProducerCategory)(form, undefined);
    return (0, editor_assignment_1.producerSupportsCategory)(producer, category);
}
function countProducersByForm(producers) {
    const counts = Object.fromEntries(types_1.ORDER_FORM_TABS.map(({ id }) => [id, 0]));
    for (const producer of producers) {
        for (const { id } of types_1.ORDER_FORM_TABS) {
            if (producerMatchesScheduleFormFilter(producer, id, "all", "all")) {
                counts[id] += 1;
            }
        }
    }
    return counts;
}
function countProducersByCheerSubtype(producers) {
    const counts = {
        all: 0,
        ...Object.fromEntries(types_1.CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])),
    };
    for (const producer of producers) {
        if (!producerSupportsAnyCategory(producer, CHEER_PRODUCER_CATEGORIES)) {
            continue;
        }
        counts.all += 1;
        for (const { id } of types_1.CHEER_FORM_SUBTABS) {
            if (producerMatchesScheduleFormFilter(producer, "school-all-star-cheer", id, "all")) {
                counts[id] += 1;
            }
        }
    }
    return counts;
}
function countProducersByDanceSubtype(producers) {
    const counts = {
        all: 0,
        ...Object.fromEntries(types_1.DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])),
    };
    for (const producer of producers) {
        if (!producerSupportsAnyCategory(producer, DANCE_PRODUCER_CATEGORIES)) {
            continue;
        }
        counts.all += 1;
        for (const { id } of types_1.DANCE_FORM_SUBTABS) {
            if (producerMatchesScheduleFormFilter(producer, "school-all-star-dance", "all", id)) {
                counts[id] += 1;
            }
        }
    }
    return counts;
}
function scheduleFormFilterLabel(form, cheerSubtype, danceSubtype) {
    if (form === "school-all-star-cheer" && cheerSubtype !== "all") {
        return (types_1.CHEER_FORM_SUBTABS_WITH_ALL.find(({ id }) => id === cheerSubtype)?.label ??
            types_1.ORDER_FORM_TABS.find(({ id }) => id === form)?.label ??
            form);
    }
    if (form === "school-all-star-dance" && danceSubtype !== "all") {
        return (types_1.DANCE_FORM_SUBTABS_WITH_ALL.find(({ id }) => id === danceSubtype)?.label ??
            types_1.ORDER_FORM_TABS.find(({ id }) => id === form)?.label ??
            form);
    }
    return types_1.ORDER_FORM_TABS.find(({ id }) => id === form)?.label ?? form;
}
