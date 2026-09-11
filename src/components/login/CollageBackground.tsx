"use client";

import clsx from "clsx";

/** Pre-made category scrapbook assets — one per SLT vertical */
const SCRAP_ASSETS = {
  marchingBand: "/login/scrap-marching-band.png",
  cheer: "/login/scrap-cheer.png",
  dance: "/login/scrap-dance.png",
  sports: "/login/scrap-sports.png",
  schoolAnthem: "/login/scrap-anthem.png",
} as const;

type ScrapPiece = {
  id: string;
  src: string;
  l: number;
  t: number;
  w: number;
  h: number;
  rotate: number;
  delay: number;
};

/** Ring layout around the login card void */
const SCRAP_PIECES: ScrapPiece[] = [
  { id: "marching-band", src: SCRAP_ASSETS.marchingBand, l: 1, t: 4, w: 34, h: 36, rotate: -5, delay: 0 },
  { id: "cheer-team", src: SCRAP_ASSETS.cheer, l: 68, t: 2, w: 32, h: 34, rotate: 4, delay: 0.8 },
  { id: "dance-stage", src: SCRAP_ASSETS.dance, l: -2, t: 48, w: 32, h: 34, rotate: 2, delay: 1.6 },
  { id: "sports-arena", src: SCRAP_ASSETS.sports, l: 72, t: 50, w: 30, h: 32, rotate: -3, delay: 0.4 },
  { id: "school-anthem", src: SCRAP_ASSETS.schoolAnthem, l: 28, t: 78, w: 36, h: 32, rotate: -1, delay: 2.0 },
];

/** Category scrap PNGs layered on top of the gradient wave */
export function CollageBackground({ className }: { className?: string }) {
  return (
    <div className={clsx("login-scrapboard", className)} aria-hidden="true">
      <div className="login-scrap-crops-layer pointer-events-none" aria-hidden="true">
        {SCRAP_PIECES.map((piece, index) => (
          <div
            key={piece.id}
            className="login-scrap-piece login-scrap-piece-asset login-scrap-piece-visible"
            style={
              {
                left: `${piece.l}%`,
                top: `${piece.t}%`,
                width: `${piece.w}%`,
                height: `${piece.h}%`,
                zIndex: index + 1,
                "--piece-rotate": `${piece.rotate}deg`,
                "--piece-delay": `${piece.delay}s`,
              } as React.CSSProperties
            }
          >
            <img
              src={piece.src}
              alt=""
              draggable={false}
              className="login-scrap-piece-img pointer-events-none h-full w-full select-none object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
