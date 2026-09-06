"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBadge = StatusBadge;
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
function StatusBadge({ status, size = "sm" }) {
    return (<span className={(0, clsx_1.default)("inline-flex items-center rounded-md font-medium capitalize ring-1 ring-inset", (0, data_1.getStatusColor)(status), size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]")}>
      {(0, data_1.getStatusLabel)(status)}
    </span>);
}
