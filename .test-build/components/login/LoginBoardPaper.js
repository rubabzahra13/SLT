"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginBoardPaper = LoginBoardPaper;
const jsx_runtime_1 = require("react/jsx-runtime");
const shaders_react_1 = require("@paper-design/shaders-react");
const COLLAGE_BG = "/login/scrapboard-bg.png";
/** PaperTexture shader — fiber, crumple, warm kraft tint on the collage image */
function LoginBoardPaper({ className }) {
    return ((0, jsx_runtime_1.jsx)(shaders_react_1.PaperTexture, { className: className, image: COLLAGE_BG, fit: "cover", scale: 1, speed: 0, colorFront: "#d8c8aa", colorBack: "#14110e", contrast: 0.48, roughness: 0.22, fiber: 0.38, fiberSize: 0.18, crumples: 0.55, crumpleSize: 0.28, folds: 0.2, foldCount: 4, fade: 0.12, drops: 0.28, seed: 12 }));
}
