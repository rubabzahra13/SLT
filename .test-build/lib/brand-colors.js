"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHART_GRADIENTS = exports.CHART_SEGMENT_COLORS = exports.BRAND_ORANGE_DEEP = exports.BRAND_BLUE_DEEP = exports.BRAND_SIGNATURE = exports.BRAND_CHARCOAL_MID = exports.BRAND_CHARCOAL_ELEVATED = exports.BRAND_CHARCOAL = exports.BRAND_ORANGE = exports.BRAND_BLUE = void 0;
exports.chartSegmentColor = chartSegmentColor;
exports.chartGradientStops = chartGradientStops;
exports.chartGradient = chartGradient;
/** Shared SLT brand palette — blue-led with orange as secondary accent */
exports.BRAND_BLUE = "#52c8ee";
exports.BRAND_ORANGE = "#f07840";
/** Sidebar-aligned deep tones */
exports.BRAND_CHARCOAL = "#0c0f14";
exports.BRAND_CHARCOAL_ELEVATED = "#141820";
exports.BRAND_CHARCOAL_MID = "#1a2430";
exports.BRAND_SIGNATURE = "#1f8fb3";
exports.BRAND_BLUE_DEEP = "#2a8fb0";
exports.BRAND_ORANGE_DEEP = "#c45528";
exports.CHART_SEGMENT_COLORS = [
    exports.BRAND_SIGNATURE,
    exports.BRAND_BLUE,
    exports.BRAND_BLUE_DEEP,
    exports.BRAND_CHARCOAL_MID,
    exports.BRAND_ORANGE,
];
function chartSegmentColor(index) {
    return exports.CHART_SEGMENT_COLORS[index % exports.CHART_SEGMENT_COLORS.length];
}
/** Gradient stops keyed by brand color — aligned with sidebar accents */
exports.CHART_GRADIENTS = {
    "#0c0f14": ["#1a2430", "#0c0f14"],
    "#141820": ["#1f2430", "#141820"],
    "#1a2430": ["#2a8fb0", "#1a2430"],
    "#1f8fb3": ["#52c8ee", "#1f8fb3"],
    "#52c8ee": ["#7ad8f7", "#2a8fb0"],
    "#2a8fb0": ["#52c8ee", "#1f8fb3"],
    "#f07840": ["#f9a03f", "#e0652e"],
    "#c45528": ["#f07840", "#c45528"],
    "#059669": ["#34d399", "#059669"],
    "#6b7280": ["#aab2bd", "#6b7280"],
};
function chartGradientStops(color) {
    return exports.CHART_GRADIENTS[color.toLowerCase()] ?? [color, color];
}
/** CSS linear-gradient string for a base brand color (for div bars). */
function chartGradient(color, angle = 135) {
    const [from, to] = chartGradientStops(color);
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
