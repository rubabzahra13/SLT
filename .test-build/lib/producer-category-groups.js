"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCER_CATEGORY_GROUPS = void 0;
exports.getAvailableProducerCategoryGroups = getAvailableProducerCategoryGroups;
exports.hasAvailableProducerCategories = hasAvailableProducerCategories;
exports.findProducerCategoryGroup = findProducerCategoryGroup;
const editor_assignment_1 = require("@/lib/editor-assignment");
const types_1 = require("@/types");
function labelForProducerCategory(id, fallback) {
    if (id === "All-Star Cheer")
        return "All Star Cheer";
    if (id === "Team Performance / Variety")
        return "Team Performance & Variety";
    return fallback.replace(" · VIROC Yes", "").replace(" · VIROC No", "").replace("VIROC Yes", "VIROC").replace("VIROC No", "School Cheer");
}
function uniqueSubcategories(formType, subs) {
    const seen = new Set();
    const result = [];
    for (const sub of subs) {
        const id = (0, editor_assignment_1.orderCategoryToProducerCategory)(formType, sub.id);
        if (!id || seen.has(id))
            continue;
        seen.add(id);
        result.push({
            id,
            label: labelForProducerCategory(id, sub.label),
        });
    }
    return result;
}
const CHEER_GROUP = {
    id: "school-all-star-cheer",
    label: "All Star Cheer",
    subcategories: uniqueSubcategories("school-all-star-cheer", types_1.CHEER_FORM_SUBTABS),
};
const DANCE_GROUP = {
    id: "school-all-star-dance",
    label: "All Star Dance",
    subcategories: uniqueSubcategories("school-all-star-dance", types_1.DANCE_FORM_SUBTABS),
};
const SINGLE_FORM_GROUPS = [
    "marching-band",
    "sports-entertainment",
    "school-anthem",
].map((formType) => {
    const tab = types_1.ORDER_FORM_TABS.find((entry) => entry.id === formType);
    const id = (0, editor_assignment_1.orderCategoryToProducerCategory)(formType, undefined);
    return {
        id: formType,
        label: tab?.label ?? formType,
        subcategories: id ? [{ id, label: tab?.label ?? id }] : [],
    };
});
exports.PRODUCER_CATEGORY_GROUPS = [
    CHEER_GROUP,
    DANCE_GROUP,
    ...SINGLE_FORM_GROUPS,
];
function getAvailableProducerCategoryGroups(assignedCategories) {
    const assigned = new Set(assignedCategories);
    return exports.PRODUCER_CATEGORY_GROUPS.map((group) => ({
        ...group,
        subcategories: group.subcategories.filter((sub) => !assigned.has(sub.id)),
    })).filter((group) => group.subcategories.length > 0);
}
function hasAvailableProducerCategories(assignedCategories) {
    return getAvailableProducerCategoryGroups(assignedCategories).length > 0;
}
function findProducerCategoryGroup(categoryId) {
    return exports.PRODUCER_CATEGORY_GROUPS.find((group) => group.subcategories.some((sub) => sub.id === categoryId));
}
