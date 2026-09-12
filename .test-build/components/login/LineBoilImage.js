"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineBoilImage = LineBoilImage;
exports.LineBoilWrap = LineBoilWrap;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
/** Stepped edge shimmer — ported from smartReader LineBoilImage */
function LineBoilImage({ src, alt = "", className, variant = "warm", showEcho = false, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("login-line-boil-wrap", className), children: [showEcho ? ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("login-line-boil-echo", `login-line-boil-${variant}`), "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("img", { src: src, alt: "", draggable: false, className: "login-line-boil-img" }) })) : null, (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("login-line-boil", `login-line-boil-${variant}`), children: (0, jsx_runtime_1.jsx)("img", { src: src, alt: alt, draggable: false, className: "login-line-boil-img" }) })] }));
}
/** Same boil effect for SVG doodles / arbitrary children */
function LineBoilWrap({ children, className, style, variant = "cream", showEcho = false, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("login-line-boil-wrap", className), style: style, children: [showEcho ? ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("login-line-boil-echo", `login-line-boil-${variant}`), "aria-hidden": "true", children: children })) : null, (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("login-line-boil", `login-line-boil-${variant}`), children: children })] }));
}
