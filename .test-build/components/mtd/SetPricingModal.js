"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryAndSubtypeFromContext = getCategoryAndSubtypeFromContext;
exports.getCategoryAndSubtypeFromActiveTabFilters = getCategoryAndSubtypeFromActiveTabFilters;
exports.SetPricingModal = SetPricingModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const FilterMenu_1 = require("@/components/ui/FilterMenu");
const HoverTip_1 = require("@/components/ui/HoverTip");
const Tabs_1 = require("@/components/ui/Tabs");
const AppStateContext_1 = require("@/context/AppStateContext");
const data_1 = require("@/lib/data");
const pricing_1 = require("@/lib/pricing");
const pricing_reference_1 = require("@/lib/pricing-reference");
const types_1 = require("@/types");
function cloneCategorySnapshot(snapshot) {
    return {
        compliantAffiliateIds: [...snapshot.compliantAffiliateIds],
        compliantAffiliateLabels: snapshot.compliantAffiliateLabels
            ? { ...snapshot.compliantAffiliateLabels }
            : {},
        addOns: snapshot.addOns.map((addon) => ({ ...addon })),
        rows: snapshot.rows.map((row) => ({ ...row })),
    };
}
const nameInputClassName = "w-full min-w-[96px] rounded-md border border-neutral-300 px-2 py-1 text-center text-[12px] font-bold text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15";
function ManualQuotePriceCell() {
    return ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { content: "This package is not on the standard rate card. Price is quoted manually via email.", children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex cursor-help flex-col items-center gap-0.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-bold tabular-nums tracking-wide text-amber-700", children: "TBD" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.05em] text-neutral-500", children: "Manual quote" })] }) }));
}
function priceInputValue(value) {
    return value === null || value === undefined ? "" : String(value);
}
function PriceCell({ value, editing, onChange, className, }) {
    if (!editing) {
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: value === null ? "N/A" : (0, data_1.formatPrice)(value) });
    }
    return ((0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: priceInputValue(value), onChange: (event) => onChange((0, pricing_1.parsePriceInput)(event.target.value)), className: (0, clsx_1.default)("w-full min-w-[72px] rounded-md border border-neutral-300 bg-white px-2 py-1 text-center text-[12px] font-semibold tabular-nums text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15", className) }));
}
function getCategoryAndSubtypeFromContext(order, rec) {
    if (order) {
        if (order.formType === "school-all-star-cheer") {
            const sub = order.cheerFormSubtype;
            if (sub === "school-cheer-viroc-yes" || sub === "school-cheer-viroc-no") {
                return { category: "School Cheer", subtype: sub };
            }
            if (sub === "youth-rec-cheer") {
                return { category: "Youth Rec Cheer" };
            }
            return { category: "All-Star Cheer" };
        }
        if (order.formType === "school-all-star-dance" || order.formType === "dance") {
            const sub = order.danceFormSubtype;
            if (sub === "pom")
                return { category: "Pom" };
            if (sub === "hip-hop")
                return { category: "Hip Hop" };
            if (sub === "team-performance-variety")
                return { category: "Team Performance & Variety" };
            if (sub === "gameday")
                return { category: "Gameday" };
            if (sub === "jazz-kick")
                return { category: "Jazz/Kick" };
            return { category: "Pom" };
        }
        if (order.formType === "marching-band") {
            return { category: "Marching Band" };
        }
        if (order.formType === "sports-entertainment") {
            return { category: "Sports Entertainment" };
        }
        if (order.formType === "school-anthem" ||
            order.formType === "school-anthems") {
            return { category: "School Anthems" };
        }
    }
    if (rec) {
        const recCategory = (rec.category || "").toLowerCase();
        const recPkg = (rec.package || "").toLowerCase();
        if (recCategory.includes("marching"))
            return { category: "Marching Band" };
        if (recCategory.includes("sports"))
            return { category: "Sports Entertainment" };
        if (recCategory.includes("anthem"))
            return { category: "School Anthems" };
        if (recCategory.includes("dance")) {
            if (recPkg.includes("pom"))
                return { category: "Pom" };
            if (recPkg.includes("hip hop"))
                return { category: "Hip Hop" };
            if (recPkg.includes("tp") || recPkg.includes("team"))
                return { category: "Team Performance & Variety" };
            if (recPkg.includes("gameday") || recPkg.includes("performance"))
                return { category: "Gameday" };
            if (recPkg.includes("jazz") || recPkg.includes("kick"))
                return { category: "Jazz/Kick" };
            return { category: "Pom" };
        }
        if (recCategory.includes("school")) {
            if (recPkg.includes("viroc no"))
                return { category: "School Cheer", subtype: "school-cheer-viroc-no" };
            return { category: "School Cheer", subtype: "school-cheer-viroc-yes" };
        }
        if (recCategory.includes("youth") || recCategory.includes("rec"))
            return { category: "Youth Rec Cheer" };
        if (recCategory.includes("cheer"))
            return { category: "All-Star Cheer" };
    }
    return { category: "All-Star Cheer" };
}
function getCategoryAndSubtypeFromActiveTabFilters(form, cheerSubtype, danceSubtype) {
    if (form === "school-all-star-cheer") {
        if (cheerSubtype === "school-cheer-viroc-yes") {
            return { category: "School Cheer", subtype: "school-cheer-viroc-yes" };
        }
        if (cheerSubtype === "school-cheer-viroc-no") {
            return { category: "School Cheer", subtype: "school-cheer-viroc-no" };
        }
        if (cheerSubtype === "youth-rec-cheer") {
            return { category: "Youth Rec Cheer" };
        }
        if (cheerSubtype === "all-star-cheer") {
            return { category: "All-Star Cheer" };
        }
        return { category: "All-Star Cheer" };
    }
    if (form === "school-all-star-dance") {
        if (danceSubtype === "pom")
            return { category: "Pom" };
        if (danceSubtype === "hip-hop")
            return { category: "Hip Hop" };
        if (danceSubtype === "team-performance-variety")
            return { category: "Team Performance & Variety" };
        if (danceSubtype === "gameday")
            return { category: "Gameday" };
        if (danceSubtype === "jazz-kick")
            return { category: "Jazz/Kick" };
        return { category: "Pom" };
    }
    if (form === "marching-band") {
        return { category: "Marching Band" };
    }
    if (form === "sports-entertainment") {
        return { category: "Sports Entertainment" };
    }
    if (form === "school-anthem" ||
        form === "school-anthems") {
        return { category: "School Anthems" };
    }
    return { category: "All-Star Cheer" };
}
function getFiltersFromCategory(category, subtype) {
    switch (category) {
        case "All-Star Cheer":
            return {
                form: "school-all-star-cheer",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "pom",
            };
        case "School Cheer":
            return {
                form: "school-all-star-cheer",
                cheerSubtype: subtype ?? "school-cheer-viroc-yes",
                danceSubtype: "pom",
            };
        case "Youth Rec Cheer":
            return {
                form: "school-all-star-cheer",
                cheerSubtype: "youth-rec-cheer",
                danceSubtype: "pom",
            };
        case "Pom":
            return {
                form: "school-all-star-dance",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "pom",
            };
        case "Hip Hop":
            return {
                form: "school-all-star-dance",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "hip-hop",
            };
        case "Team Performance & Variety":
            return {
                form: "school-all-star-dance",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "team-performance-variety",
            };
        case "Gameday":
            return {
                form: "school-all-star-dance",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "gameday",
            };
        case "Jazz/Kick":
            return {
                form: "school-all-star-dance",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "jazz-kick",
            };
        case "Marching Band":
            return {
                form: "marching-band",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "pom",
            };
        case "Sports Entertainment":
            return {
                form: "sports-entertainment",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "pom",
            };
        case "School Anthems":
            return {
                form: "school-anthem",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "pom",
            };
        default:
            return {
                form: "school-all-star-cheer",
                cheerSubtype: "all-star-cheer",
                danceSubtype: "pom",
            };
    }
}
const DEFAULT_PRICING_CHEER_SUBTYPE = "all-star-cheer";
const DEFAULT_PRICING_DANCE_SUBTYPE = "pom";
function normalizePricingCheerSubtype(value) {
    return types_1.CHEER_FORM_SUBTABS.some((tab) => tab.id === value)
        ? value
        : DEFAULT_PRICING_CHEER_SUBTYPE;
}
function normalizePricingDanceSubtype(value) {
    return types_1.DANCE_FORM_SUBTABS.some((tab) => tab.id === value)
        ? value
        : DEFAULT_PRICING_DANCE_SUBTYPE;
}
function secretMenuDraftFromPricing(pricing) {
    const rates = (0, pricing_1.getSecretMenuPerSongRates)(pricing);
    return {
        basePrice: String(pricing.basePrice),
        costPerSong: String(rates.costPerSong),
        minutesPerSong: String(rates.minutesPerSong),
    };
}
function parseSecretMenuDraft(draft, source) {
    const current = (0, pricing_1.getSecretMenuPerSongRates)(source);
    const basePrice = (0, pricing_1.parsePriceInput)(draft.basePrice) ?? source.basePrice;
    const costPerSong = (0, pricing_1.parsePriceInput)(draft.costPerSong) ?? current.costPerSong;
    const minutesPerSong = (0, pricing_1.parseIntegerInput)(draft.minutesPerSong) ?? current.minutesPerSong;
    return (0, pricing_1.applySecretMenuPerSongRates)(source, {
        basePrice,
        costPerSong,
        minutesPerSong,
    });
}
function SetPricingModal({ open, onClose, secretMenuPrices: secretMenuPricesProp, onSave, order, record, form, cheerSubtype, danceSubtype, initialCategory, initialSubtype, }) {
    const { secretMenuPrices: secretMenuPricesState, setSecretMenuPrices } = (0, AppStateContext_1.useAppState)();
    const secretMenuPrices = secretMenuPricesProp ?? secretMenuPricesState;
    const [activeViewTab, setActiveViewTab] = (0, react_1.useState)("reference");
    const [isEditingSecretMenu, setIsEditingSecretMenu] = (0, react_1.useState)(false);
    const [secretDraft, setSecretDraft] = (0, react_1.useState)(() => secretMenuDraftFromPricing((0, pricing_1.getDefaultSecretMenuPricing)()));
    const [pricingForm, setPricingForm] = (0, react_1.useState)("school-all-star-cheer");
    const [pricingCheerSubtype, setPricingCheerSubtype] = (0, react_1.useState)(DEFAULT_PRICING_CHEER_SUBTYPE);
    const [pricingDanceSubtype, setPricingDanceSubtype] = (0, react_1.useState)(DEFAULT_PRICING_DANCE_SUBTYPE);
    const [referenceStore, setReferenceStore] = (0, react_1.useState)(() => (0, pricing_reference_1.loadPricingReferenceStore)());
    const [isEditingPricing, setIsEditingPricing] = (0, react_1.useState)(false);
    const [isEditingCompliant, setIsEditingCompliant] = (0, react_1.useState)(false);
    const [draftSnapshot, setDraftSnapshot] = (0, react_1.useState)(null);
    const [compliantDraft, setCompliantDraft] = (0, react_1.useState)([]);
    const [savedCompliantIds, setSavedCompliantIds] = (0, react_1.useState)([]);
    const [savedCompliantLabels, setSavedCompliantLabels] = (0, react_1.useState)({});
    const [savedNonCompliantLabels, setSavedNonCompliantLabels] = (0, react_1.useState)({});
    const [compliantLabelDraft, setCompliantLabelDraft] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        if (initialCategory) {
            const filters = getFiltersFromCategory(initialCategory, initialSubtype);
            setPricingForm(filters.form);
            setPricingCheerSubtype(normalizePricingCheerSubtype(filters.cheerSubtype));
            setPricingDanceSubtype(normalizePricingDanceSubtype(filters.danceSubtype));
        }
        else if (order || record) {
            const ctx = getCategoryAndSubtypeFromContext(order, record);
            const filters = getFiltersFromCategory(ctx.category, ctx.subtype);
            setPricingForm(filters.form);
            setPricingCheerSubtype(normalizePricingCheerSubtype(filters.cheerSubtype));
            setPricingDanceSubtype(normalizePricingDanceSubtype(filters.danceSubtype));
        }
        else if (form) {
            setPricingForm(form);
            setPricingCheerSubtype(normalizePricingCheerSubtype(cheerSubtype));
            setPricingDanceSubtype(normalizePricingDanceSubtype(danceSubtype));
        }
        else {
            const ctx = getCategoryAndSubtypeFromContext(order, record);
            const filters = getFiltersFromCategory(ctx.category, ctx.subtype);
            setPricingForm(filters.form);
            setPricingCheerSubtype(normalizePricingCheerSubtype(filters.cheerSubtype));
            setPricingDanceSubtype(normalizePricingDanceSubtype(filters.danceSubtype));
        }
    }, [open, order, record, form, cheerSubtype, danceSubtype, initialCategory, initialSubtype]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        setReferenceStore((0, pricing_reference_1.loadPricingReferenceStore)());
        setIsEditingPricing(false);
        setIsEditingCompliant(false);
        setDraftSnapshot(null);
        setActiveViewTab("reference");
        setIsEditingSecretMenu(false);
        setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    }, [open, secretMenuPrices]);
    const selectedCategory = (0, react_1.useMemo)(() => getCategoryAndSubtypeFromActiveTabFilters(pricingForm, pricingCheerSubtype, pricingDanceSubtype).category, [pricingForm, pricingCheerSubtype, pricingDanceSubtype]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        setIsEditingPricing(false);
        setIsEditingCompliant(false);
        setDraftSnapshot(null);
        const snapshot = (0, pricing_reference_1.getCategoryPricingSnapshot)(selectedCategory, referenceStore);
        setCompliantDraft(snapshot.compliantAffiliateIds);
        setSavedCompliantIds(snapshot.compliantAffiliateIds);
        setSavedCompliantLabels(snapshot.compliantAffiliateLabels ?? {});
        setSavedNonCompliantLabels(snapshot.nonCompliantAffiliateLabels ?? {});
        setCompliantLabelDraft({});
    }, [open, selectedCategory, referenceStore]);
    const activeSnapshot = (0, react_1.useMemo)(() => {
        if (isEditingPricing && draftSnapshot)
            return draftSnapshot;
        return (0, pricing_reference_1.getCategoryPricingSnapshot)(selectedCategory, referenceStore);
    }, [draftSnapshot, isEditingPricing, referenceStore, selectedCategory]);
    const isTierTime = activeSnapshot.rows[0]?.kind === "tier-time";
    const affiliateOptions = (0, react_1.useMemo)(() => (0, pricing_reference_1.getVisibleMusicAffiliateOptions)(selectedCategory), [selectedCategory]);
    const compliantLabelsDirty = (0, react_1.useMemo)(() => affiliateOptions.some((option) => {
        const saved = (0, pricing_reference_1.resolveCompliantAffiliateLabel)(option.id, savedCompliantLabels, savedNonCompliantLabels);
        const draft = compliantLabelDraft[option.id] ??
            (0, pricing_reference_1.resolveCompliantAffiliateLabel)(option.id, savedCompliantLabels, savedNonCompliantLabels);
        return saved !== draft.trim();
    }), [
        affiliateOptions,
        compliantLabelDraft,
        savedCompliantLabels,
        savedNonCompliantLabels,
    ]);
    const compliantDirty = !(0, pricing_reference_1.affiliateIdsEqual)(compliantDraft, savedCompliantIds) || compliantLabelsDirty;
    const compliantSelections = (0, react_1.useMemo)(() => affiliateOptions.map((option) => ({
        ...option,
        label: isEditingCompliant
            ? (compliantLabelDraft[option.id] ??
                (0, pricing_reference_1.resolveCompliantAffiliateLabel)(option.id, savedCompliantLabels, savedNonCompliantLabels))
            : (0, pricing_reference_1.resolveCompliantAffiliateLabel)(option.id, savedCompliantLabels, savedNonCompliantLabels),
        checked: (isEditingCompliant ? compliantDraft : savedCompliantIds).includes(option.id),
    })), [
        affiliateOptions,
        compliantDraft,
        compliantLabelDraft,
        isEditingCompliant,
        savedCompliantIds,
        savedCompliantLabels,
        savedNonCompliantLabels,
    ]);
    const startEditing = (0, react_1.useCallback)(() => {
        setIsEditingCompliant(false);
        setCompliantDraft([...savedCompliantIds]);
        const snapshot = (0, pricing_reference_1.getCategoryPricingSnapshot)(selectedCategory, referenceStore);
        setDraftSnapshot(cloneCategorySnapshot(snapshot));
        setIsEditingPricing(true);
    }, [referenceStore, savedCompliantIds, selectedCategory]);
    const cancelEditing = (0, react_1.useCallback)(() => {
        setDraftSnapshot(null);
        setIsEditingPricing(false);
    }, []);
    const startEditingCompliant = (0, react_1.useCallback)(() => {
        setIsEditingPricing(false);
        setDraftSnapshot(null);
        setCompliantDraft([...savedCompliantIds]);
        setCompliantLabelDraft(Object.fromEntries((0, pricing_reference_1.getVisibleMusicAffiliateOptions)(selectedCategory).map((option) => [
            option.id,
            (0, pricing_reference_1.resolveCompliantAffiliateLabel)(option.id, savedCompliantLabels, savedNonCompliantLabels),
        ])));
        setIsEditingCompliant(true);
    }, [
        savedCompliantIds,
        savedCompliantLabels,
        savedNonCompliantLabels,
        selectedCategory,
    ]);
    const cancelEditingCompliant = (0, react_1.useCallback)(() => {
        setCompliantDraft([...savedCompliantIds]);
        setCompliantLabelDraft({});
        setIsEditingCompliant(false);
    }, [savedCompliantIds]);
    const savePricingEdits = (0, react_1.useCallback)(() => {
        if (!draftSnapshot)
            return;
        const next = (0, pricing_reference_1.updateCategoryPricingSnapshot)(referenceStore, selectedCategory, {
            rows: draftSnapshot.rows,
            addOns: draftSnapshot.addOns,
        });
        (0, pricing_reference_1.savePricingReferenceStore)(next);
        setReferenceStore(next);
        setDraftSnapshot(null);
        setIsEditingPricing(false);
    }, [draftSnapshot, referenceStore, selectedCategory]);
    const saveCompliantAffiliates = (0, react_1.useCallback)(() => {
        const visibleIds = new Set(affiliateOptions.map((option) => option.id));
        const nextIds = compliantDraft.filter((id) => visibleIds.has(id));
        const nextLabels = {};
        const nextNonCompliantLabels = {};
        for (const option of affiliateOptions) {
            const draftLabel = compliantLabelDraft[option.id] ??
                (0, pricing_reference_1.resolveCompliantAffiliateLabel)(option.id, savedCompliantLabels, savedNonCompliantLabels);
            const override = (0, pricing_reference_1.normalizeCompliantAffiliateLabelOverride)(option.id, draftLabel);
            if (!override)
                continue;
            if (option.alwaysNonCompliant) {
                nextNonCompliantLabels[option.id] = override;
            }
            else {
                nextLabels[option.id] = override;
            }
        }
        const next = (0, pricing_reference_1.updateCategoryPricingSnapshot)(referenceStore, selectedCategory, {
            compliantAffiliateIds: nextIds,
            compliantAffiliateLabels: nextLabels,
            nonCompliantAffiliateLabels: nextNonCompliantLabels,
        });
        (0, pricing_reference_1.savePricingReferenceStore)(next);
        setReferenceStore(next);
        setCompliantDraft(nextIds);
        setSavedCompliantIds(nextIds);
        setSavedCompliantLabels(nextLabels);
        setSavedNonCompliantLabels(nextNonCompliantLabels);
        setCompliantLabelDraft({});
        setIsEditingCompliant(false);
    }, [
        affiliateOptions,
        compliantDraft,
        compliantLabelDraft,
        referenceStore,
        savedCompliantLabels,
        savedNonCompliantLabels,
        selectedCategory,
    ]);
    const toggleCompliantAffiliate = (0, react_1.useCallback)((id) => {
        setCompliantDraft((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
    }, []);
    const updateCompliantLabel = (0, react_1.useCallback)((id, label) => {
        setCompliantLabelDraft((current) => ({ ...current, [id]: label }));
    }, []);
    const updateDraftAddOn = (0, react_1.useCallback)((index, patch) => {
        setDraftSnapshot((current) => {
            if (!current)
                return current;
            return {
                ...current,
                addOns: current.addOns.map((addon, addonIndex) => addonIndex === index ? { ...addon, ...patch } : addon),
            };
        });
    }, []);
    const updateDraftRow = (0, react_1.useCallback)((index, patch) => {
        setDraftSnapshot((current) => {
            if (!current)
                return current;
            return {
                ...current,
                rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row),
            };
        });
    }, []);
    const startEditingSecretMenu = (0, react_1.useCallback)(() => {
        setIsEditingPricing(false);
        setIsEditingCompliant(false);
        setDraftSnapshot(null);
        setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
        setIsEditingSecretMenu(true);
    }, [secretMenuPrices]);
    const cancelEditingSecretMenu = (0, react_1.useCallback)(() => {
        setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
        setIsEditingSecretMenu(false);
    }, [secretMenuPrices]);
    const saveSecretMenuEdits = (0, react_1.useCallback)(() => {
        const next = parseSecretMenuDraft(secretDraft, secretMenuPrices);
        setSecretMenuPrices(next);
        onSave?.({}, next);
        setIsEditingSecretMenu(false);
    }, [onSave, secretDraft, secretMenuPrices, setSecretMenuPrices]);
    const switchViewTab = (0, react_1.useCallback)((tab) => {
        setActiveViewTab(tab);
        setIsEditingPricing(false);
        setIsEditingCompliant(false);
        setDraftSnapshot(null);
        setIsEditingSecretMenu(false);
        setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    }, [secretMenuPrices]);
    const secretMenuPerSongRates = (0, react_1.useMemo)(() => (0, pricing_1.getSecretMenuPerSongRates)(secretMenuPrices), [secretMenuPrices]);
    if (!open)
        return null;
    const hasPricingRows = activeSnapshot.rows.length > 0;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 overflow-hidden", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/90 backdrop-blur-sm", onClick: onClose, "aria-label": "Close modal" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "pricing-reference-title", style: { height: "80vh", maxHeight: "80vh", display: "flex", flexDirection: "column" }, className: "relative w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-neutral-400 bg-white shadow-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b-2 border-neutral-300 bg-neutral-100 px-6 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-start gap-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { className: "h-5 w-5", strokeWidth: 2.25 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h2", { id: "pricing-reference-title", className: "text-[20px] font-bold tracking-[-0.02em] text-neutral-900", children: activeViewTab === "reference"
                                                            ? "Pricing Reference Table"
                                                            : "Secret Menu Pricing" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-neutral-600", children: activeViewTab === "reference"
                                                            ? "Filterable reference lookup table mirroring original client pricing sheets."
                                                            : "Set base price plus the per-song extra cost and editing time." })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-xl p-2 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4", strokeWidth: 2 }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 border-b border-neutral-300", children: (0, jsx_runtime_1.jsx)(Tabs_1.Tabs, { options: [
                                        { value: "reference", label: "Reference table" },
                                        { value: "secret-menu", label: "Secret menu" },
                                    ], value: activeViewTab, onChange: (value) => switchViewTab(value), accent: "orange" }) }), activeViewTab === "reference" ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-4", children: (0, jsx_runtime_1.jsx)("div", { className: "inline-flex flex-wrap items-center gap-2.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40", children: [(0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Form", hideLabel: true, grouped: true, portal: true, portalZIndex: 120, value: pricingForm, onChange: (value) => {
                                                    const nextForm = value;
                                                    setPricingForm(nextForm);
                                                    if (nextForm === "school-all-star-cheer") {
                                                        setPricingCheerSubtype((current) => normalizePricingCheerSubtype(current));
                                                    }
                                                    if (nextForm === "school-all-star-dance") {
                                                        setPricingDanceSubtype((current) => normalizePricingDanceSubtype(current));
                                                    }
                                                }, accent: "blue", options: types_1.ORDER_FORM_TABS.map(({ id, label }) => ({
                                                    value: id,
                                                    label,
                                                })) }), pricingForm === "school-all-star-cheer" ? ((0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Cheer", hideLabel: true, grouped: true, portal: true, portalZIndex: 120, value: pricingCheerSubtype, onChange: (value) => setPricingCheerSubtype(value), accent: "orange", options: types_1.CHEER_FORM_SUBTABS.map(({ id, label }) => ({
                                                    value: id,
                                                    label,
                                                })) })) : null, pricingForm === "school-all-star-dance" ? ((0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Dance", hideLabel: true, grouped: true, portal: true, portalZIndex: 120, value: pricingDanceSubtype, onChange: (value) => setPricingDanceSubtype(value), accent: "orange", options: types_1.DANCE_FORM_SUBTABS.map(({ id, label }) => ({
                                                    value: id,
                                                    label,
                                                })) })) : null] }) }) })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4", children: activeViewTab === "secret-menu" ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900", children: "Secret menu" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-neutral-600", children: secretMenuPrices.menuTitle })] }), !isEditingSecretMenu ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: startEditingSecretMenu, className: "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-3.5 w-3.5", strokeWidth: 2.25 }), "Edit secret menu"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-orange", children: "Editing" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-lg border-2 border-neutral-400 bg-white shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b-2 border-neutral-300 bg-neutral-100 px-4 py-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-bold text-neutral-900", children: secretMenuPrices.packageName }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] text-neutral-600", children: secretMenuPrices.menuTitle })] }), (0, jsx_runtime_1.jsxs)("div", { className: "divide-y divide-neutral-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold text-neutral-900", children: "Base package price" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-neutral-500", children: "Starting price before extra songs" })] }), isEditingSecretMenu ? ((0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: secretDraft.basePrice, onChange: (event) => setSecretDraft((current) => ({
                                                                ...current,
                                                                basePrice: event.target.value,
                                                            })), className: "w-28 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-[12px] font-bold tabular-nums text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15", "aria-label": `Base price for ${secretMenuPrices.packageName}` })) : ((0, jsx_runtime_1.jsx)("span", { className: "text-[14px] font-bold tabular-nums text-neutral-900", children: (0, data_1.formatPrice)(secretMenuPrices.basePrice) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold text-neutral-900", children: "Extra cost per song" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-neutral-500", children: "Added for each additional song" })] }), isEditingSecretMenu ? ((0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: secretDraft.costPerSong, onChange: (event) => setSecretDraft((current) => ({
                                                                ...current,
                                                                costPerSong: event.target.value,
                                                            })), className: "w-28 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-[12px] font-bold tabular-nums text-brand-blue outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15", "aria-label": "Extra cost per song" })) : ((0, jsx_runtime_1.jsxs)("span", { className: "text-[14px] font-bold tabular-nums text-brand-blue", children: ["+", (0, data_1.formatPrice)(secretMenuPerSongRates.costPerSong)] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold text-neutral-900", children: "Editing time per song" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-neutral-500", children: "Minutes added for each extra song" })] }), isEditingSecretMenu ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: secretDraft.minutesPerSong, onChange: (event) => setSecretDraft((current) => ({
                                                                        ...current,
                                                                        minutesPerSong: event.target.value,
                                                                    })), className: "w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-[12px] font-bold tabular-nums text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15", "aria-label": "Editing minutes per song" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-semibold text-neutral-500", children: "min" })] })) : ((0, jsx_runtime_1.jsxs)("span", { className: "text-[14px] font-bold tabular-nums text-neutral-900", children: ["+", secretMenuPerSongRates.minutesPerSong, " min"] }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-bold text-neutral-900", children: "How this works" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] leading-relaxed text-neutral-600", children: "Set the base package price, then the extra cost and editing time added for each additional song. Totals scale automatically from those per-song rates." })] })] })) : !hasPricingRows ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { className: "h-8 w-8 text-neutral-400" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[14px] font-semibold text-neutral-800", children: "No pricing configured for this order form" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-neutral-500", children: "Please select another form from the filters above." })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900", children: "Rate card" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[12px] text-neutral-600", children: ["Reference prices for ", selectedCategory] })] }), !isEditingPricing ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: startEditing, disabled: isEditingCompliant, className: "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-3.5 w-3.5", strokeWidth: 2.25 }), "Edit pricing"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-orange", children: "Editing" }))] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-hidden rounded-lg border-2 border-neutral-400 bg-white shadow-sm", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full border-collapse text-center text-[12px]", children: [(0, jsx_runtime_1.jsx)("thead", { className: "sticky top-0 z-20 bg-neutral-200", children: (0, jsx_runtime_1.jsxs)("tr", { className: "bg-neutral-200 text-[11px] font-bold uppercase tracking-[0.06em] text-neutral-900 border-b-2 border-neutral-400", children: [isTierTime ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900", children: "Tier" }), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900", children: "Time Limit" })] })) : ((0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900", children: "Package" })), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-neutral-200 text-neutral-900", children: "Customer Price" }), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-emerald-200 text-emerald-950 font-bold", children: "Music Affiliate: Compliant (Payroll Price)" }), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-rose-200 text-rose-950 font-bold", children: "Music Affiliate: Non-Compliant (Payroll Price)" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "text-neutral-900", children: isTierTime
                                                    ? activeSnapshot.rows.map((row, idx) => {
                                                        if (row.kind !== "tier-time")
                                                            return null;
                                                        const tierRow = row;
                                                        const isTitanium = tierRow.isTitanium;
                                                        return ((0, jsx_runtime_1.jsxs)("tr", { className: "even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900", children: isEditingPricing ? ((0, jsx_runtime_1.jsx)("input", { type: "text", value: tierRow.tier, onChange: (event) => updateDraftRow(idx, { tier: event.target.value }), className: nameInputClassName })) : (tierRow.tier) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 font-semibold tabular-nums text-neutral-700", children: isEditingPricing ? ((0, jsx_runtime_1.jsx)("input", { type: "text", value: tierRow.limit, onChange: (event) => updateDraftRow(idx, { limit: event.target.value }), className: nameInputClassName })) : (tierRow.limit) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900", children: (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: tierRow.customer, onChange: (next) => updateDraftRow(idx, {
                                                                            customer: next ?? tierRow.customer,
                                                                        }) }) }), isTitanium || tierRow.compliant === tierRow.nonCompliant ? ((0, jsx_runtime_1.jsx)("td", { colSpan: 2, className: "border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900", children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center justify-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { className: "h-3.5 w-3.5 text-brand-blue" }), (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: tierRow.compliant, onChange: (next) => updateDraftRow(idx, {
                                                                                    compliant: next ?? tierRow.compliant,
                                                                                    nonCompliant: next ?? tierRow.nonCompliant,
                                                                                }) }), !isEditingPricing ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-normal text-neutral-600", children: "(always)" })) : null] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40", children: (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: tierRow.compliant, onChange: (next) => updateDraftRow(idx, {
                                                                                    compliant: next ?? tierRow.compliant,
                                                                                }) }) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20", children: (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: tierRow.nonCompliant, onChange: (next) => updateDraftRow(idx, {
                                                                                    nonCompliant: next ?? tierRow.nonCompliant,
                                                                                }) }) })] }))] }, `${tierRow.tier}-${tierRow.limit}-${idx}`));
                                                    })
                                                    : activeSnapshot.rows.map((row, idx) => {
                                                        if (row.kind !== "flat-package")
                                                            return null;
                                                        const packageRow = row;
                                                        const isUnpriced = packageRow.isUnpriced || packageRow.customer === null;
                                                        const alwaysFixed = packageRow.alwaysFixedPayroll ||
                                                            (!isUnpriced &&
                                                                packageRow.compliant === packageRow.nonCompliant);
                                                        return ((0, jsx_runtime_1.jsxs)("tr", { className: "even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900", children: isEditingPricing ? ((0, jsx_runtime_1.jsx)("input", { type: "text", value: packageRow.package, onChange: (event) => updateDraftRow(idx, { package: event.target.value }), className: nameInputClassName })) : (packageRow.package) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900", children: isUnpriced && !isEditingPricing ? ((0, jsx_runtime_1.jsx)(ManualQuotePriceCell, {})) : ((0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: packageRow.customer, onChange: (next) => updateDraftRow(idx, { customer: next }) })) }), isUnpriced && !isEditingPricing ? ((0, jsx_runtime_1.jsx)("td", { colSpan: 2, className: "border border-neutral-300 bg-amber-50/10 px-3.5 py-2 text-center text-[12px] font-medium text-neutral-500", children: "N/A" })) : alwaysFixed ? ((0, jsx_runtime_1.jsx)("td", { colSpan: 2, className: "border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900", children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center justify-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { className: "h-3.5 w-3.5 text-brand-blue" }), (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: packageRow.compliant, onChange: (next) => updateDraftRow(idx, {
                                                                                    compliant: next,
                                                                                    nonCompliant: next,
                                                                                }) }), !isEditingPricing ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-normal text-neutral-600", children: "(always)" })) : null] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40", children: (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: packageRow.compliant, onChange: (next) => updateDraftRow(idx, { compliant: next }) }) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20", children: (0, jsx_runtime_1.jsx)(PriceCell, { editing: isEditingPricing, value: packageRow.nonCompliant, onChange: (next) => updateDraftRow(idx, { nonCompliant: next }) }) })] }))] }, `${packageRow.package}-${idx}`));
                                                    }) })] }) }), activeSnapshot.addOns.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsxs)("h3", { className: "text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900", children: ["Add-Ons (", selectedCategory, ")"] })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-neutral-600", children: "Add-ons stack on top of the rate card amounts above." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 overflow-hidden rounded-lg border border-neutral-300 bg-white", children: activeSnapshot.addOns.map((addon, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2.5 text-[12px] last:border-b-0", children: [isEditingPricing ? ((0, jsx_runtime_1.jsx)("input", { type: "text", value: addon.name, onChange: (event) => updateDraftAddOn(idx, { name: event.target.value }), className: "min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-[12px] font-bold text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" })) : ((0, jsx_runtime_1.jsx)("span", { className: "font-bold text-neutral-900", children: addon.name })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [isEditingPricing ? ((0, jsx_runtime_1.jsx)("input", { type: "text", value: (0, pricing_reference_1.stripAddOnFlatSuffix)(addon.price), onChange: (event) => updateDraftAddOn(idx, { price: event.target.value }), className: "min-w-[72px] rounded-md border border-neutral-300 px-2 py-1 text-center text-[12px] font-bold text-brand-orange outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" })) : ((0, jsx_runtime_1.jsx)("span", { className: "font-bold text-brand-orange", children: (0, pricing_reference_1.stripAddOnFlatSuffix)(addon.price) })), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500", children: "flat" })] })] }, `${addon.name}-${idx}`))) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { className: "h-4 w-4 shrink-0 text-brand-blue" }), (0, jsx_runtime_1.jsxs)("h3", { className: "text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900", children: ["Music affiliates (", selectedCategory, ")"] })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-neutral-600", children: isEditingCompliant
                                                                ? "Check which affiliate values count as compliant for payroll pricing."
                                                                : "Affiliate values marked non-compliant use the non-compliant payroll column above." })] }), !isEditingCompliant ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: startEditingCompliant, disabled: isEditingPricing, className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-3.5 w-3.5", strokeWidth: 2.25 }), "Edit affiliates"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-orange", children: "Editing" }))] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 overflow-hidden rounded-lg border border-neutral-300 bg-white", children: compliantSelections.map((option, idx) => isEditingCompliant ? ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2.5 text-[12px] last:border-b-0 transition hover:bg-neutral-50/80", option.checked && "bg-emerald-50/30"), children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex min-w-0 items-center gap-2.5", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: option.checked, onChange: () => toggleCompliantAffiliate(option.id), className: "h-4 w-4 shrink-0 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/20" }), (0, jsx_runtime_1.jsxs)("span", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: option.label, onChange: (event) => updateCompliantLabel(option.id, event.target.value), onClick: (event) => event.stopPropagation(), className: "min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-[12px] font-bold text-neutral-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" }), option.danceOnly ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500", children: "Dance forms" })) : null] })] }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]", option.checked
                                                            ? "bg-emerald-100 text-emerald-900"
                                                            : "bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200/80"), children: option.checked ? "Compliant" : "Non-compliant" })] }, option.id)) : ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2.5 text-[12px] last:border-b-0", idx % 2 === 1 && "bg-neutral-50/50"), children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-neutral-900", children: option.label }), option.danceOnly ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500", children: "Dance forms" })) : null] }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]", option.checked
                                                            ? "bg-emerald-100 text-emerald-900"
                                                            : "bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200/80"), children: option.checked ? "Compliant" : "Non-compliant" })] }, option.id))) })] })] })) }), isEditingPricing || isEditingCompliant || isEditingSecretMenu ? ((0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 flex items-center justify-end gap-3 border-t-2 border-neutral-300 bg-neutral-100 px-6 py-3.5", children: [isEditingSecretMenu ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: cancelEditingSecretMenu, className: "rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50", children: "Cancel edits" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: saveSecretMenuEdits, className: "rounded-xl bg-brand-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-blue-hover", children: "Save secret menu" })] })) : null, isEditingCompliant ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: cancelEditingCompliant, className: "rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50", children: "Cancel edits" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: saveCompliantAffiliates, disabled: !compliantDirty, className: "rounded-xl bg-brand-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:bg-neutral-300", children: "Save compliance" })] })) : null, isEditingPricing ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: cancelEditing, className: "rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50", children: "Cancel edits" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: savePricingEdits, className: "rounded-xl bg-brand-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-blue-hover", children: "Save pricing" })] })) : null] })) : null] })] }));
}
