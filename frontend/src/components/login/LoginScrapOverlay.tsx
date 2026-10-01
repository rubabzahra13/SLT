"use client";

import type { CSSProperties } from "react";

type ScrapPiece = {
  id: string;
  src: string;
  rotate: number;
  /** Extra vertical nudge in px (negative = up) */
  nudgeY?: number;
  /** Stack order — higher draws in front */
  zIndex?: number;
  /** Absolute overlay — does not take flex space */
  overlay?: boolean;
};

const LEFT_STACK: ScrapPiece[] = [
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
const LEFT_OVERLAY: ScrapPiece = {
  id: "anthem",
  src: "/login/scrap-anthem.png",
  rotate: -1,
  nudgeY: -12,
  zIndex: 8,
  overlay: true,
};

const RIGHT_PIECES: ScrapPiece[] = [
  { id: "cheer", src: "/login/scrap-cheer.png", rotate: 4 },
  { id: "sports", src: "/login/scrap-sports.png", rotate: -3 },
];

function scrapStyle(piece: ScrapPiece, overlayCentered = false): CSSProperties {
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

function ScrapImg({
  piece,
  className,
  overlayCentered = false,
}: {
  piece: ScrapPiece;
  className?: string;
  overlayCentered?: boolean;
}) {
  return (
    <img
      src={piece.src}
      alt={piece.id}
      data-scrap-id={piece.id}
      className={`login-scrap-overlay-img pointer-events-auto cursor-pointer select-auto ${className ?? ""}`}
      style={scrapStyle(piece, overlayCentered)}
    />
  );
}

function LeftScrapColumn() {
  return (
    <div className="login-scrap-overlay-col login-scrap-overlay-col-left pointer-events-none relative flex h-full w-[min(34vw,420px)] shrink-0 flex-col justify-between py-[4%] pl-2 sm:pl-4">
      {LEFT_STACK.map((piece) => (
        <ScrapImg
          key={piece.id}
          piece={piece}
          className="relative w-full max-w-[420px]"
        />
      ))}
      <ScrapImg
        piece={LEFT_OVERLAY}
        overlayCentered
        className="absolute left-1/2 top-1/2 w-full max-w-[420px]"
      />
    </div>
  );
}

function ScrapColumn({
  pieces,
  side,
}: {
  pieces: ScrapPiece[];
  side: "left" | "right";
}) {
  return (
    <div
      className={`login-scrap-overlay-col login-scrap-overlay-col-${side} pointer-events-none flex h-full w-[min(34vw,420px)] shrink-0 flex-col justify-between py-[4%] ${
        side === "left" ? "pl-2 sm:pl-4" : "pr-2 sm:pr-4"
      }`}
    >
      {pieces.map((piece) => (
        <ScrapImg
          key={piece.id}
          piece={piece}
          className="relative w-full max-w-[420px]"
        />
      ))}
    </div>
  );
}

/** Left: 2 stacked + anthem overlaid on top; right: 2 */
export function LoginScrapOverlay() {
  return (
    <div className="login-scrap-overlay pointer-events-none fixed inset-0 z-[5] flex items-stretch justify-between px-4 sm:px-8 md:px-10">
      <LeftScrapColumn />
      <ScrapColumn pieces={RIGHT_PIECES} side="right" />
    </div>
  );
}
