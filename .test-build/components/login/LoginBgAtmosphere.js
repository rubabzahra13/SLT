"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginBgAtmosphere = LoginBgAtmosphere;
const jsx_runtime_1 = require("react/jsx-runtime");
const paper_design_shader_background_1 = require("@/components/ui/paper-design-shader-background");
const LoginBgAtmosphere_module_css_1 = __importDefault(require("./LoginBgAtmosphere.module.css"));
/** Brand teal + amber corner wash (replaces image smoke plates). */
const LOGIN_SHADER_COLORS = [
    "hsl(193, 82%, 55%)", // brand teal
    "hsl(18, 85%, 58%)", // brand orange
    "hsl(340, 70%, 48%)", // deep warm accent
];
/**
 * Charcoal plate + Paper Design GrainGradient corners (replaces smoke).
 */
function LoginBgAtmosphere({ className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: [LoginBgAtmosphere_module_css_1.default.atmosphere, className].filter(Boolean).join(" "), "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("div", { className: LoginBgAtmosphere_module_css_1.default.plate }), (0, jsx_runtime_1.jsx)(paper_design_shader_background_1.GradientBackground, { className: LoginBgAtmosphere_module_css_1.default.shader, colors: LOGIN_SHADER_COLORS, soft: true }), (0, jsx_runtime_1.jsx)("div", { className: LoginBgAtmosphere_module_css_1.default.veil })] }));
}
