"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBrandLogoDataUrl = loadBrandLogoDataUrl;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const brand_logo_1 = require("@/lib/brand-logo");
async function loadBrandLogoDataUrl() {
    const logoPath = (0, node_path_1.join)(process.cwd(), "public", brand_logo_1.BRAND_LOGO_FILE);
    const data = await (0, promises_1.readFile)(logoPath);
    return `data:image/png;base64,${data.toString("base64")}`;
}
