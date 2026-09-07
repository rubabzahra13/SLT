"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetPricingModal = SetPricingModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const data_1 = require("@/lib/data");
const pricing_1 = require("@/lib/pricing");
const TAB_OPTIONS = [
    { value: "packages", label: "Packages", icon: lucide_react_1.Tag },
    { value: "secret-menu", label: "Secret menu", icon: lucide_react_1.Sparkles },
];
const PACKAGE_CATEGORIES = [
    "Cheer",
    "Dance",
    "School",
    "Marching Band",
    "Other",
];
function catalogKeys() {
    return new Set(pricing_1.PACKAGE_CATALOG.map((entry) => entry.key));
}
function secretMenuDraftFromPricing(pricing) {
    return {
        basePrice: String(pricing.basePrice),
        tiers: pricing.extraSongTiers.map((tier) => ({
            extraSongs: String(tier.extraSongs),
            extraCost: String(tier.extraCost),
            editingMinutes: String(tier.editingMinutes),
        })),
    };
}
function parseSecretMenuDraft(draft, source) {
    const basePrice = (0, pricing_1.parsePriceInput)(draft.basePrice) ?? source.basePrice;
    const extraSongTiers = draft.tiers
        .map((row) => ({
        extraSongs: (0, pricing_1.parseIntegerInput)(row.extraSongs) ?? 0,
        extraCost: (0, pricing_1.parsePriceInput)(row.extraCost) ?? 0,
        editingMinutes: (0, pricing_1.parseIntegerInput)(row.editingMinutes) ?? 0,
    }))
        .filter((tier) => tier.extraSongs > 0);
    return {
        ...source,
        basePrice,
        extraSongTiers: extraSongTiers.length > 0 ? extraSongTiers : source.extraSongTiers,
    };
}
function buildCustomPackagesFromPrices(prices) {
    const known = catalogKeys();
    return Object.entries(prices)
        .filter(([key]) => !known.has(key))
        .map(([key, price]) => ({
        id: `saved-${key}`,
        name: key,
        category: "Other",
        price: String(price),
    }));
}
const inputClass = "w-full rounded-lg border border-brand-line/60 bg-white px-2.5 py-2 text-[13px] font-semibold tabular-nums text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15";
function PriceField({ value, onChange, ariaLabel, className, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("relative w-[7.5rem] shrink-0", className), children: [(0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-brand-ink-tertiary", children: "$" }), (0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "decimal", value: value, onChange: (e) => onChange(e.target.value), className: (0, clsx_1.default)(inputClass, "pl-6 text-right"), "aria-label": ariaLabel })] }));
}
function removalDescription(pending) {
    switch (pending.kind) {
        case "catalog":
            return `${pending.label} will be removed from the catalog. You can add it again later if needed.`;
        case "custom":
            return `${pending.label} will be removed. You can add a custom package again if needed.`;
        case "tier":
            return `The ${pending.label} tier will be removed from the secret menu.`;
    }
}
function RemovePriceConfirmModal({ open, pending, onClose, onConfirm, }) {
    if (!open || !pending)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[60] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/80 backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "alertdialog", "aria-modal": "true", "aria-labelledby": "remove-price-title", "aria-describedby": "remove-price-desc", className: "relative w-full max-w-sm overflow-hidden rounded-2xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/20", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 pb-5 pt-6 text-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-5 w-5", strokeWidth: 2.25 }) }), (0, jsx_runtime_1.jsx)("h2", { id: "remove-price-title", className: "mt-4 text-[18px] font-bold tracking-[-0.02em] text-brand-ink", children: "Remove this price?" }), (0, jsx_runtime_1.jsx)("p", { id: "remove-price-desc", className: "mt-2 text-[13px] leading-relaxed text-brand-ink-secondary", children: removalDescription(pending) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2.5 border-t border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "flex-1 rounded-xl px-4 py-2.5 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-white hover:text-brand-ink", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onConfirm, className: "flex-1 rounded-xl bg-brand-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover", children: "Remove" })] })] })] }));
}
function RemoveButton({ onClick, label, }) {
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, className: "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-orange", "aria-label": label, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-3.5 w-3.5", strokeWidth: 2 }) }));
}
function PackageRow({ entry, draftValue, savedPrice, onChange, onRemove, }) {
    const parsed = (0, pricing_1.parsePriceInput)(draftValue);
    const changed = parsed !== null && parsed !== savedPrice && draftValue.trim() !== "";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-blue-soft/15", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[14px] font-semibold text-brand-ink", children: entry.name }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 flex items-center gap-2 text-[11px] text-brand-ink-tertiary", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Saved ", (0, data_1.formatPrice)(savedPrice)] }), changed ? ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-orange-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-orange ring-1 ring-inset ring-brand-orange/20", children: "Edited" })) : null] })] }), (0, jsx_runtime_1.jsx)(PriceField, { value: draftValue, onChange: onChange, ariaLabel: `Price for ${entry.name}` }), (0, jsx_runtime_1.jsx)(RemoveButton, { onClick: onRemove, label: `Remove price for ${entry.name}` })] }));
}
function CustomPackageRow({ pkg, onChange, onRemove, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-blue-soft/15 sm:flex-nowrap", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: pkg.name, onChange: (e) => onChange({ name: e.target.value }), placeholder: "Package name", className: (0, clsx_1.default)(inputClass, "min-w-[10rem] flex-1 font-medium"), "aria-label": "Custom package name" }), (0, jsx_runtime_1.jsx)("select", { value: pkg.category, onChange: (e) => onChange({
                    category: e.target.value,
                }), className: (0, clsx_1.default)(inputClass, "w-auto min-w-[7.5rem] cursor-pointer font-medium"), "aria-label": "Custom package category", children: PACKAGE_CATEGORIES.map((category) => ((0, jsx_runtime_1.jsx)("option", { value: category, children: category }, category))) }), (0, jsx_runtime_1.jsx)(PriceField, { value: pkg.price, onChange: (value) => onChange({ price: value }), ariaLabel: "Custom package price" }), (0, jsx_runtime_1.jsx)(RemoveButton, { onClick: onRemove, label: "Remove custom package" })] }));
}
function PackagesPanel({ grouped, draft, prices, customPackages, onDraftChange, onRemoveCatalog, onCustomChange, onCustomRemove, onAddCustom, }) {
    const customByCategory = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const pkg of customPackages) {
            const list = map.get(pkg.category) ?? [];
            list.push(pkg);
            map.set(pkg.category, list);
        }
        return map;
    }, [customPackages]);
    const categories = [
        ...new Set([
            ...grouped.keys(),
            ...customByCategory.keys(),
        ]),
    ];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 pb-8", children: [categories.map((category) => {
                const entries = grouped.get(category) ?? [];
                const customs = customByCategory.get(category) ?? [];
                if (entries.length === 0 && customs.length === 0)
                    return null;
                return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between gap-3 px-1", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: category }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded-lg bg-brand-blue-soft/50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-brand-signature ring-1 ring-inset ring-brand-blue/15", children: [entries.length + customs.length, " packages"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-hidden rounded-xl border border-brand-line/50 bg-white ring-1 ring-inset ring-brand-line/15", children: (0, jsx_runtime_1.jsxs)("div", { className: "divide-y divide-brand-line/30", children: [entries.map((entry) => ((0, jsx_runtime_1.jsx)(PackageRow, { entry: entry, draftValue: draft[entry.key] ?? "", savedPrice: prices[entry.key] ?? 0, onChange: (value) => onDraftChange(entry.key, value), onRemove: () => onRemoveCatalog(entry.key) }, entry.key))), customs.map((pkg) => ((0, jsx_runtime_1.jsx)(CustomPackageRow, { pkg: pkg, onChange: (patch) => onCustomChange(pkg.id, patch), onRemove: () => onCustomRemove(pkg.id) }, pkg.id)))] }) })] }, category));
            }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onAddCustom, className: "inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand-line/70 bg-white px-3.5 py-2 text-[12px] font-semibold text-brand-signature transition hover:border-brand-blue/40 hover:bg-brand-blue-soft/25", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add package price"] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex gap-3 rounded-xl border border-brand-orange/25 bg-gradient-to-r from-brand-orange-soft/40 to-white px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-orange-soft text-brand-orange ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "h-3.5 w-3.5", strokeWidth: 2.25 }) }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] leading-relaxed text-brand-ink-secondary", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-orange", children: "Non-compliant music" }), " ", "uses these base prices plus a 15% surcharge on MTD and orders."] })] })] }));
}
function SecretMenuPanel({ secretMenuPrices, secretDraft, onSecretDraftChange, onRequestRemoveTier, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-5 pb-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl border border-brand-line/50 bg-gradient-to-br from-brand-blue-soft/50 via-white to-white p-5 ring-1 ring-inset ring-brand-line/15", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: secretMenuPrices.menuTitle }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex flex-wrap items-end justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[16px] font-bold text-brand-ink", children: secretMenuPrices.packageName }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-brand-ink-secondary", children: "Base package price before extra song tiers" })] }), (0, jsx_runtime_1.jsx)(PriceField, { value: secretDraft.basePrice, onChange: (value) => onSecretDraftChange((prev) => ({ ...prev, basePrice: value })), ariaLabel: `Base price for ${secretMenuPrices.packageName}`, className: "w-[8.5rem]" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex flex-wrap items-end justify-between gap-3 px-1", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Extra song tiers" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-brand-ink-secondary", children: "Additional cost and editing time per extra song count" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSecretDraftChange((prev) => ({
                                    ...prev,
                                    tiers: [
                                        ...prev.tiers,
                                        {
                                            extraSongs: String(prev.tiers.length + 1),
                                            extraCost: "",
                                            editingMinutes: "",
                                        },
                                    ],
                                })), className: "inline-flex items-center gap-1.5 rounded-lg border border-brand-line/60 bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-signature transition hover:border-brand-blue/40 hover:bg-brand-blue-soft/25", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add tier"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl border border-brand-line/50 bg-white ring-1 ring-inset ring-brand-line/15", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[3.5rem_1fr_1fr_auto] gap-3 border-b border-brand-line/40 bg-brand-bg-subtle/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary sm:grid-cols-[4rem_1fr_1fr_auto]", children: [(0, jsx_runtime_1.jsx)("span", { children: "Songs" }), (0, jsx_runtime_1.jsx)("span", { className: "text-right", children: "Extra cost" }), (0, jsx_runtime_1.jsx)("span", { className: "text-right", children: "Editing" }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Remove" })] }), (0, jsx_runtime_1.jsx)("div", { className: "divide-y divide-brand-line/30", children: secretDraft.tiers.map((tier, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[3.5rem_1fr_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[4rem_1fr_1fr_auto]", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: tier.extraSongs, onChange: (e) => onSecretDraftChange((prev) => ({
                                                ...prev,
                                                tiers: prev.tiers.map((row, rowIndex) => rowIndex === index
                                                    ? { ...row, extraSongs: e.target.value }
                                                    : row),
                                            })), className: (0, clsx_1.default)(inputClass, "w-12 px-2 text-center"), "aria-label": `Extra song count for tier ${index + 1}` }), (0, jsx_runtime_1.jsxs)("div", { className: "relative min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-brand-ink-tertiary", children: "$" }), (0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "decimal", value: tier.extraCost, onChange: (e) => onSecretDraftChange((prev) => ({
                                                        ...prev,
                                                        tiers: prev.tiers.map((row, rowIndex) => rowIndex === index
                                                            ? { ...row, extraCost: e.target.value }
                                                            : row),
                                                    })), className: (0, clsx_1.default)(inputClass, "pl-6 text-right"), "aria-label": `Extra cost for tier ${index + 1}` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative min-w-0", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: tier.editingMinutes, onChange: (e) => onSecretDraftChange((prev) => ({
                                                        ...prev,
                                                        tiers: prev.tiers.map((row, rowIndex) => rowIndex === index
                                                            ? { ...row, editingMinutes: e.target.value }
                                                            : row),
                                                    })), className: (0, clsx_1.default)(inputClass, "pr-9 text-right"), "aria-label": `Editing time for tier ${index + 1}` }), (0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "min" })] }), (0, jsx_runtime_1.jsx)(RemoveButton, { onClick: () => onRequestRemoveTier(index, `${tier.extraSongs || secretDraft.tiers[index]?.extraSongs || index + 1} extra songs`), label: `Remove tier ${index + 1}` })] }, `tier-${index}`))) })] })] })] }));
}
function SetPricingModal({ open, prices, secretMenuPrices, onClose, onSave, }) {
    const [activeTab, setActiveTab] = (0, react_1.useState)("packages");
    const [draft, setDraft] = (0, react_1.useState)({});
    const [removedKeys, setRemovedKeys] = (0, react_1.useState)(() => new Set());
    const [customPackages, setCustomPackages] = (0, react_1.useState)([]);
    const [secretDraft, setSecretDraft] = (0, react_1.useState)(() => secretMenuDraftFromPricing(secretMenuPrices));
    const [pendingRemoval, setPendingRemoval] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const next = {};
        for (const entry of pricing_1.PACKAGE_CATALOG) {
            const price = prices[entry.key];
            next[entry.key] = price !== undefined ? String(price) : "";
        }
        setDraft(next);
        setRemovedKeys(new Set());
        setCustomPackages(buildCustomPackagesFromPrices(prices));
        setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
        setActiveTab("packages");
        setPendingRemoval(null);
    }, [open, prices, secretMenuPrices]);
    const grouped = (0, react_1.useMemo)(() => {
        const groups = new Map();
        for (const entry of pricing_1.PACKAGE_CATALOG) {
            if (removedKeys.has(entry.key))
                continue;
            const list = groups.get(entry.category) ?? [];
            list.push(entry);
            groups.set(entry.category, list);
        }
        return groups;
    }, [removedKeys]);
    const visiblePackageCount = pricing_1.PACKAGE_CATALOG.length -
        removedKeys.size +
        customPackages.length;
    const tierCount = secretDraft.tiers.length;
    if (!open)
        return null;
    function confirmRemoval() {
        if (!pendingRemoval)
            return;
        if (pendingRemoval.kind === "catalog") {
            setRemovedKeys((prev) => new Set(prev).add(pendingRemoval.key));
        }
        else if (pendingRemoval.kind === "custom") {
            setCustomPackages((prev) => prev.filter((pkg) => pkg.id !== pendingRemoval.id));
        }
        else {
            setSecretDraft((prev) => ({
                ...prev,
                tiers: prev.tiers.filter((_, index) => index !== pendingRemoval.index),
            }));
        }
        setPendingRemoval(null);
    }
    function handleSave() {
        const updated = { ...prices };
        for (const key of removedKeys) {
            delete updated[key];
        }
        for (const entry of pricing_1.PACKAGE_CATALOG) {
            if (removedKeys.has(entry.key))
                continue;
            const parsed = (0, pricing_1.parsePriceInput)(draft[entry.key] ?? "");
            if (parsed !== null)
                updated[entry.key] = parsed;
        }
        for (const pkg of customPackages) {
            const key = pkg.name.trim().toUpperCase();
            const parsed = (0, pricing_1.parsePriceInput)(pkg.price);
            if (!key || parsed === null)
                continue;
            updated[key] = parsed;
        }
        onSave(updated, parseSecretMenuDraft(secretDraft, secretMenuPrices));
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/90 backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "set-pricing-title", className: "relative flex max-h-[min(90vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/20", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-brand-line/40 px-6 py-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-start gap-3.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange-soft to-brand-orange-soft/40 text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { className: "h-5 w-5", strokeWidth: 2.25 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h2", { id: "set-pricing-title", className: "text-[22px] font-bold tracking-[-0.03em] text-brand-ink", children: "Set pricing" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: "Catalog prices flow into MTD records and new orders" })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-xl p-2 text-brand-ink-tertiary transition hover:bg-brand-bg-subtle hover:text-brand-ink", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4", strokeWidth: 2 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-5 flex flex-wrap items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "inline-flex rounded-xl bg-brand-bg-subtle/80 p-0.5 ring-1 ring-inset ring-brand-line/40", role: "tablist", "aria-label": "Pricing sections", children: TAB_OPTIONS.map(({ value, label, icon: Icon }) => {
                                            const active = activeTab === value;
                                            return ((0, jsx_runtime_1.jsxs)("button", { type: "button", role: "tab", "aria-selected": active, onClick: () => setActiveTab(value), className: (0, clsx_1.default)("inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition", active
                                                    ? "bg-white text-brand-ink shadow-sm ring-1 ring-inset ring-brand-line/30"
                                                    : "text-brand-ink-secondary hover:bg-white/70 hover:text-brand-ink"), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "h-3.5 w-3.5", strokeWidth: 2 }), label] }, value));
                                        }) }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium tabular-nums text-brand-ink-tertiary", children: activeTab === "packages"
                                            ? `${visiblePackageCount} packages`
                                            : `${tierCount} tiers` })] })] }), (0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1", scrollClassName: "h-full max-h-[calc(min(90vh,820px)-11.5rem)] overflow-y-scroll scrollbar-hide px-6 py-5 pr-4", indicatorPlacement: "gutter", indicatorDistribution: "even", children: activeTab === "packages" ? ((0, jsx_runtime_1.jsx)(PackagesPanel, { grouped: grouped, draft: draft, prices: prices, customPackages: customPackages, onDraftChange: (key, value) => setDraft((prev) => ({ ...prev, [key]: value })), onRemoveCatalog: (key) => {
                                const entry = pricing_1.PACKAGE_CATALOG.find((item) => item.key === key);
                                setPendingRemoval({
                                    kind: "catalog",
                                    key,
                                    label: entry?.name ?? key,
                                });
                            }, onCustomChange: (id, patch) => setCustomPackages((prev) => prev.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg))), onCustomRemove: (id) => {
                                const pkg = customPackages.find((item) => item.id === id);
                                setPendingRemoval({
                                    kind: "custom",
                                    id,
                                    label: pkg?.name.trim() || "Custom package",
                                });
                            }, onAddCustom: () => setCustomPackages((prev) => [
                                ...prev,
                                {
                                    id: `custom-${Date.now()}`,
                                    name: "",
                                    category: "Other",
                                    price: "",
                                },
                            ]) })) : ((0, jsx_runtime_1.jsx)(SecretMenuPanel, { secretMenuPrices: secretMenuPrices, secretDraft: secretDraft, onSecretDraftChange: setSecretDraft, onRequestRemoveTier: (index, label) => setPendingRemoval({ kind: "tier", index, label }) })) }), (0, jsx_runtime_1.jsx)(RemovePriceConfirmModal, { open: pendingRemoval !== null, pending: pendingRemoval, onClose: () => setPendingRemoval(null), onConfirm: confirmRemoval }), (0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-center justify-between gap-3 border-t border-brand-line/40 bg-white/95 px-6 py-4 backdrop-blur-sm", children: [(0, jsx_runtime_1.jsx)("p", { className: "hidden text-[12px] text-brand-ink-tertiary sm:block", children: "Changes apply to MTD and order pricing immediately after save" }), (0, jsx_runtime_1.jsxs)("div", { className: "ml-auto flex items-center gap-2.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-xl px-4 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg-subtle hover:text-brand-ink", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, className: "rounded-xl bg-brand-orange px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover hover:shadow-md", children: "Save pricing" })] })] })] })] }));
}
