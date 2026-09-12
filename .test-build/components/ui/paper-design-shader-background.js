"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradientBackground = GradientBackground;
const jsx_runtime_1 = require("react/jsx-runtime");
const shaders_react_1 = require("@paper-design/shaders-react");
const DEFAULT_COLORS = [
    "hsl(14, 100%, 57%)",
    "hsl(45, 100%, 51%)",
    "hsl(340, 82%, 52%)",
];
function GradientBackground({ className = "absolute inset-0 -z-10", colors = [...DEFAULT_COLORS], soft = false, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: className, "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)(shaders_react_1.GrainGradient, { style: { height: "100%", width: "100%" }, colorBack: "hsl(0, 0%, 0%)", softness: soft ? 0.86 : 0.76, intensity: soft ? 0.38 : 0.45, noise: 0, shape: "corners", offsetX: 0, offsetY: 0, scale: 1, rotation: 0, speed: 1, colors: colors }) }));
}
