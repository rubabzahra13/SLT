"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCER_AVATARS = exports.PRODUCER_COLORS = void 0;
exports.hexAlpha = hexAlpha;
exports.getProducerColor = getProducerColor;
exports.defaultAvatarSrc = defaultAvatarSrc;
/**
 * Authoritative producer colors mapping supplied by the client.
 * Enforced centrally across the application.
 */
exports.PRODUCER_COLORS = {
    CM: "#ed7d31",
    MS: "#0a0c10",
    NC: "#c00000",
    BV: "#002060",
    MT: "#bf8f00",
    JB: "#548235",
    MM: "#ffc000",
    SS: "#0000ff",
    AJ: "#00b0f0",
    LV: "#ff00ff",
    JM: "#00ff00",
    SV: "#0070c0",
    RF: "#edbcfc",
    JOP: "#cc4125",
    JD: "#cc66ff",
    CC: "#008080",
    GP: "#00b050",
    // Legacy / fallback seed initials
    JP: "#7c3aed",
    R: "#e11d48",
    G: "#059669",
};
/** Blend a hex color with alpha for card surfaces and borders. */
function hexAlpha(hex, alpha) {
    const normalized = hex.replace("#", "").trim();
    if (normalized.length !== 6)
        return hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n)))
        return hex;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getProducerColor(initialsOrName) {
    if (!initialsOrName)
        return "#ed7d31";
    const key = initialsOrName.toUpperCase().trim();
    if (exports.PRODUCER_COLORS[key]) {
        return exports.PRODUCER_COLORS[key];
    }
    // Handle names like "Casey" -> "CM"
    const firstName = initialsOrName.toLowerCase().trim().split(/\s+/)[0];
    const nameMap = {
        casey: "CM",
        matt: "MS",
        nate: "NC",
        mark: "MM",
        brent: "BV",
        shelley: "SS",
        autumn: "AJ",
        logan: "LV",
        rory: "RF",
        jackie: "JM",
        joseph: "JOP",
        griffin: "GP",
        justin: "JD",
        jacob: "JP",
        max: "MT",
        cory: "CC",
        jared: "JB",
        riley: "R",
    };
    if (nameMap[firstName] && exports.PRODUCER_COLORS[nameMap[firstName]]) {
        return exports.PRODUCER_COLORS[nameMap[firstName]];
    }
    return "#ed7d31";
}
exports.PRODUCER_AVATARS = [
    { id: "ava-1", label: "CM · Orange", src: "#ed7d31" },
    { id: "ava-2", label: "MS · Charcoal", src: "#0a0c10" },
    { id: "ava-3", label: "NC · Red", src: "#c00000" },
];
function defaultAvatarSrc() {
    return "#ed7d31";
}
