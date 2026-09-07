"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaveToggle = HaveToggle;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
function HaveToggle({ label, value }) {
    const status = (0, data_1.getHaveStatus)(value);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-label", children: label }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", status === "have" && "bg-[#ecfdf5] text-brand-success ring-[#a7f3d0]", status === "need" && "bg-[#fef2f2] text-brand-danger ring-[#fecaca]", status === "partial" && "bg-brand-bg text-brand-neutral ring-brand-line"), children: value || "-" })] }));
}
