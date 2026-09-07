"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBadge = StatusBadge;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
function StatusBadge({ status, size = "sm" }) {
    return ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("inline-flex items-center rounded-md font-medium capitalize ring-1 ring-inset", (0, data_1.getStatusColor)(status), size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"), children: (0, data_1.getStatusLabel)(status) }));
}
