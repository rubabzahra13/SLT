"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginCollagePanel = LoginCollagePanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const LoginCollagePanel_module_css_1 = __importDefault(require("./LoginCollagePanel.module.css"));
const COLLAGE_SRC = "/login/collage-hero.png";
/** Scrapbook collage — black plate blends into charcoal via screen mix */
function LoginCollagePanel() {
    return ((0, jsx_runtime_1.jsx)("aside", { className: LoginCollagePanel_module_css_1.default.panel, "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("img", { src: COLLAGE_SRC, alt: "", draggable: false, className: LoginCollagePanel_module_css_1.default.hero }) }));
}
