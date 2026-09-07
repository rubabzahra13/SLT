"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = Avatar;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const sizeMap = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-[52px] w-[52px]",
    xl: "h-16 w-16",
};
function Avatar({ src, alt, size = "md", ring }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("shrink-0 overflow-hidden rounded-full bg-brand-bg", sizeMap[size], ring && "ring-2 ring-brand-line ring-offset-2 ring-offset-brand-surface"), children: (0, jsx_runtime_1.jsx)("img", { src: src, alt: alt, className: "h-full w-full object-cover" }) }));
}
