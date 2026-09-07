"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.CardHeader = CardHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
function Card({ children, className, padding = true }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("surface-premium rounded-2xl", padding && "p-0", className), children: children }));
}
function CardHeader({ title, action }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-brand-line px-6 py-4", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-display text-[15px]", children: title }), action] }));
}
