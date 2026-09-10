"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = Avatar;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const producer_avatars_1 = require("@/lib/producer-avatars");
const producers_1 = require("@/lib/producers");
const sizeMap = {
    xs: { box: "h-6 w-6 min-w-[24px]", font: "text-[10px]" },
    sm: { box: "h-8 w-8 min-w-[32px]", font: "text-[11px]" },
    md: { box: "h-10 w-10 min-w-[40px]", font: "text-[13px]" },
    lg: { box: "h-[52px] w-[52px] min-w-[52px]", font: "text-[15px]" },
    xl: { box: "h-16 w-16 min-w-[64px]", font: "text-[18px]" },
};
function resolveInitials(producer, initials, name, alt, src) {
    if (initials)
        return initials.trim().toUpperCase();
    if (producer?.initials)
        return producer.initials.trim().toUpperCase();
    const searchName = (name || alt || producer?.name || "").trim();
    if (searchName) {
        const firstWord = searchName.split(/\s+/)[0]?.toLowerCase();
        if (firstWord && producers_1.CANONICAL_PRODUCER_NAMES[firstWord]) {
            return producers_1.CANONICAL_PRODUCER_NAMES[firstWord];
        }
        const parts = searchName.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            return parts[0].slice(0, 3).toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (src) {
        const match = src.match(/seed=([^&]+)/i);
        if (match) {
            const seed = decodeURIComponent(match[1]).toLowerCase();
            if (producers_1.CANONICAL_PRODUCER_NAMES[seed]) {
                return producers_1.CANONICAL_PRODUCER_NAMES[seed];
            }
            return seed.slice(0, 3).toUpperCase();
        }
    }
    return "??";
}
function Avatar({ producer, initials, name, color, src, alt, size = "md", ring, className, }) {
    const displayInitials = resolveInitials(producer, initials, name, alt, src);
    const bgColor = color || producer?.color || (0, producer_avatars_1.getProducerColor)(displayInitials);
    const { box, font } = sizeMap[size] || sizeMap.md;
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("shrink-0 select-none overflow-hidden rounded-full font-bold text-black flex items-center justify-center shadow-xs transition-transform", box, ring && "ring-2 ring-brand-line ring-offset-2 ring-offset-brand-surface", className), style: { backgroundColor: bgColor }, title: name || alt || producer?.name || displayInitials, children: (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("leading-none text-black font-extrabold tracking-tight", font), children: displayInitials }) }));
}
