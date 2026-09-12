"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginScrapOverlay = LoginScrapOverlay;
const jsx_runtime_1 = require("react/jsx-runtime");
const LEFT_STACK = [
    {
        id: "marching-band",
        src: "/login/scrap-marching-band.png",
        rotate: -5,
        nudgeY: -40,
        zIndex: 6,
    },
    {
        id: "dance",
        src: "/login/scrap-dance.png",
        rotate: 2,
        nudgeY: 44,
        zIndex: 6,
    },
];
/** Sits between marching-band + dance, layered on top — no layout push */
const LEFT_OVERLAY = {
    id: "anthem",
    src: "/login/scrap-anthem.png",
    rotate: -1,
    nudgeY: -12,
    zIndex: 8,
    overlay: true,
};
const RIGHT_PIECES = [
    { id: "cheer", src: "/login/scrap-cheer.png", rotate: 4 },
    { id: "sports", src: "/login/scrap-sports.png", rotate: -3 },
];
function scrapStyle(piece, overlayCentered = false) {
    const nudge = piece.nudgeY ?? 0;
    const parts = overlayCentered
        ? [
            "translate(-50%, -50%)",
            `rotate(${piece.rotate}deg)`,
            nudge !== 0 ? `translateY(${nudge}px)` : null,
        ]
        : [
            `rotate(${piece.rotate}deg)`,
            nudge !== 0 ? `translateY(${nudge}px)` : null,
        ];
    return {
        transform: parts.filter(Boolean).join(" "),
        zIndex: piece.zIndex ?? 6,
    };
}
function ScrapImg({ piece, className, overlayCentered = false, }) {
    return ((0, jsx_runtime_1.jsx)("img", { src: piece.src, alt: piece.id, "data-scrap-id": piece.id, className: `login-scrap-overlay-img pointer-events-auto cursor-pointer select-auto ${className ?? ""}`, style: scrapStyle(piece, overlayCentered) }));
}
function LeftScrapColumn() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "login-scrap-overlay-col login-scrap-overlay-col-left pointer-events-none relative flex h-full w-[min(34vw,420px)] shrink-0 flex-col justify-between py-[4%] pl-2 sm:pl-4", children: [LEFT_STACK.map((piece) => ((0, jsx_runtime_1.jsx)(ScrapImg, { piece: piece, className: "relative w-full max-w-[420px]" }, piece.id))), (0, jsx_runtime_1.jsx)(ScrapImg, { piece: LEFT_OVERLAY, overlayCentered: true, className: "absolute left-1/2 top-1/2 w-full max-w-[420px]" })] }));
}
function ScrapColumn({ pieces, side, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: `login-scrap-overlay-col login-scrap-overlay-col-${side} pointer-events-none flex h-full w-[min(34vw,420px)] shrink-0 flex-col justify-between py-[4%] ${side === "left" ? "pl-2 sm:pl-4" : "pr-2 sm:pr-4"}`, children: pieces.map((piece) => ((0, jsx_runtime_1.jsx)(ScrapImg, { piece: piece, className: "relative w-full max-w-[420px]" }, piece.id))) }));
}
/** Left: 2 stacked + anthem overlaid on top; right: 2 */
function LoginScrapOverlay() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "login-scrap-overlay pointer-events-none fixed inset-0 z-[5] flex items-stretch justify-between px-4 sm:px-8 md:px-10", children: [(0, jsx_runtime_1.jsx)(LeftScrapColumn, {}), (0, jsx_runtime_1.jsx)(ScrapColumn, { pieces: RIGHT_PIECES, side: "right" })] }));
}
