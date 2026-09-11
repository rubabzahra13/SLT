"use client";

import clsx from "clsx";

/** Static full-screen background (dark center void) */
const COLLAGE_BG =
  "/ChatGPT%20Image%20Sep%2011%2C%202026%2C%2006_21_28%20PM.png";

/** Animated scrap crops — Spotify / team-spirit collage ring */
const COLLAGE_SCRAPS =
  "/ChatGPT%20Image%20Sep%2011%2C%202026%2C%2005_51_26%20PM.png";

const CYCLE_S = 24;

type ScrapPiece = {
  id: string;
  /** Display position on the board (%) */
  l: number;
  t: number;
  w: number;
  h: number;
  /** Source region on the collage image (%) */
  cropL: number;
  cropT: number;
  cropW: number;
  cropH: number;
  rotate: number;
  /** Irregular load-in offset within the burst (s) */
  delay: number;
  /** Exit cascade — 0 = bottom crop, leaves first at cycle end */
  exit: number;
  frame: "orange" | "blue";
  kind: "photo" | "note";
};

/** Hand-drawn star / sparkle paths for the dark center void */
const STAR_PATH =
  "M 50 6 L 54 40 L 90 44 L 58 60 L 66 94 L 50 72 L 34 94 L 42 60 L 10 44 L 46 40 Z";

const SPARKLE_PATH = "M 50 8 L 50 92 M 8 50 L 92 50 M 22 22 L 78 78 M 78 22 L 22 78";

type BgDoodle = {
  id: string;
  l: number;
  t: number;
  size: number;
  rotate: number;
  delay: number;
  exit: number;
  frame: "orange" | "blue" | "cream";
  path: string;
};

/** Stars in the bg void — same scribble-draw loop as crop frames */
const BG_DOODLES: BgDoodle[] = [
  { id: "star-1", l: 38, t: 30, size: 22, rotate: -14, delay: 0.2, exit: 4, frame: "cream", path: STAR_PATH },
  { id: "star-2", l: 52, t: 26, size: 18, rotate: 8, delay: 0.9, exit: 3, frame: "blue", path: STAR_PATH },
  { id: "star-3", l: 62, t: 36, size: 20, rotate: -6, delay: 1.4, exit: 2, frame: "orange", path: STAR_PATH },
  { id: "star-4", l: 34, t: 44, size: 16, rotate: 12, delay: 0.5, exit: 1, frame: "cream", path: SPARKLE_PATH },
  { id: "star-5", l: 48, t: 40, size: 24, rotate: -10, delay: 1.1, exit: 0, frame: "blue", path: STAR_PATH },
  { id: "star-6", l: 56, t: 54, size: 17, rotate: 5, delay: 1.7, exit: 4, frame: "orange", path: STAR_PATH },
  { id: "star-7", l: 42, t: 56, size: 19, rotate: -8, delay: 0.35, exit: 3, frame: "cream", path: STAR_PATH },
  { id: "star-8", l: 50, t: 48, size: 15, rotate: 15, delay: 2.0, exit: 2, frame: "blue", path: SPARKLE_PATH },
  { id: "star-9", l: 44, t: 34, size: 14, rotate: -4, delay: 0.65, exit: 1, frame: "orange", path: STAR_PATH },
  { id: "star-10", l: 58, t: 62, size: 21, rotate: 7, delay: 1.55, exit: 0, frame: "cream", path: STAR_PATH },
];

/** Hand-sketched frame paths — one per piece */
const SCRIBBLE_PATHS = [
  "M 7,11 Q 2,4 16,3 L 86,6 Q 98,9 94,20 L 97,84 Q 93,97 78,95 L 11,98 Q 2,91 6,76 Z",
  "M 5,8 Q 1,2 18,4 L 91,3 Q 99,12 96,22 L 98,88 Q 92,99 82,96 L 8,97 Q 0,88 4,72 Z",
  "M 9,6 Q 3,1 20,5 L 88,4 Q 97,10 95,24 L 96,86 Q 88,98 74,94 L 6,96 Q 1,85 8,70 Z",
  "M 6,9 Q 0,3 14,2 L 90,7 Q 99,6 97,19 L 94,90 Q 96,98 84,93 L 9,99 Q 3,89 5,74 Z",
  "M 8,7 Q 4,0 17,6 L 87,5 Q 98,14 93,21 L 99,83 Q 91,96 76,98 L 10,94 Q 2,86 7,68 Z",
];

/** Five crops — fixed layout, burst load at irregular times, loop together */
const SCRAP_PIECES: ScrapPiece[] = [
  {
    id: "band-trumpet",
    l: 3,
    t: 5,
    w: 37,
    h: 33,
    cropL: 0,
    cropT: 0,
    cropW: 32,
    cropH: 28,
    rotate: -7,
    delay: 0,
    exit: 4,
    frame: "orange",
    kind: "photo",
  },
  {
    id: "cheer-portrait",
    l: 68,
    t: 1,
    w: 35,
    h: 31,
    cropL: 64,
    cropT: 0,
    cropW: 36,
    cropH: 30,
    rotate: 6,
    delay: 0.7,
    exit: 3,
    frame: "blue",
    kind: "photo",
  },
  {
    id: "band-formation",
    l: -6,
    t: 52,
    w: 32,
    h: 29,
    cropL: 2,
    cropT: 24,
    cropW: 30,
    cropH: 30,
    rotate: 4,
    delay: 1.85,
    exit: 2,
    frame: "orange",
    kind: "photo",
  },
  {
    id: "widget-bow",
    l: 74,
    t: 55,
    w: 34,
    h: 32,
    cropL: 56,
    cropT: 40,
    cropW: 40,
    cropH: 38,
    rotate: -5,
    delay: 0.35,
    exit: 1,
    frame: "blue",
    kind: "photo",
  },
  {
    id: "cheer-hard-work",
    l: 30,
    t: 86,
    w: 38,
    h: 32,
    cropL: 6,
    cropT: 52,
    cropW: 34,
    cropH: 32,
    rotate: -2,
    delay: 2.2,
    exit: 0,
    frame: "orange",
    kind: "note",
  },
];

function cropStyle(
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number
): React.CSSProperties {
  return {
    width: `${(100 / cropW) * 100}%`,
    height: `${(100 / cropH) * 100}%`,
    left: `${-(cropL / cropW) * 100}%`,
    top: `${-(cropT / cropH) * 100}%`,
    maxWidth: "none",
  };
}

export function CollageBackground({ className }: { className?: string }) {
  return (
    <div className={clsx("login-scrapboard overflow-hidden", className)} aria-hidden="true">
      <div className="login-scrapboard-fill absolute inset-0 z-0">
        <img
          src={COLLAGE_BG}
          alt=""
          draggable={false}
          className="login-scrapboard-img pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
      </div>

      <div className="login-bg-doodles pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
        {BG_DOODLES.map((doodle) => (
          <svg
            key={doodle.id}
            className={clsx("login-bg-doodle", `login-bg-doodle-${doodle.frame}`)}
            style={
              {
                left: `${doodle.l}%`,
                top: `${doodle.t}%`,
                width: `${doodle.size}px`,
                height: `${doodle.size}px`,
                transform: `rotate(${doodle.rotate}deg)`,
                "--doodle-delay": `${doodle.delay}s`,
              } as React.CSSProperties
            }
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <path
              d={doodle.path}
              className={clsx("login-bg-doodle-path", `login-scrap-scribble-exit-${doodle.exit}`)}
              pathLength={360}
            />
          </svg>
        ))}
      </div>

      {SCRAP_PIECES.map((piece, index) => (
        <div
          key={piece.id}
          className={clsx(
            "login-scrap-piece",
            `login-scrap-tear-${(index % 5) + 1}`,
            `login-scrap-exit-${piece.exit}`,
            `login-scrap-frame-${piece.frame}`,
            piece.kind === "photo" ? "login-scrap-piece-photo" : "login-scrap-piece-note"
          )}
          style={
            {
              left: `${piece.l}%`,
              top: `${piece.t}%`,
              width: `${piece.w}%`,
              height: `${piece.h}%`,
              zIndex: index + 1,
              "--piece-rotate": `${piece.rotate}deg`,
              "--piece-delay": `${piece.delay}s`,
              animationDuration: `${CYCLE_S}s`,
              animationDelay: `${piece.delay}s`,
            } as React.CSSProperties
          }
        >
          <svg
            className="login-scrap-scribble"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={SCRIBBLE_PATHS[index % SCRIBBLE_PATHS.length]}
              className={clsx("login-scrap-scribble-path", `login-scrap-scribble-exit-${piece.exit}`)}
              pathLength={360}
            />
          </svg>
          <div className="login-scrap-piece-inner">
            <img
              src={COLLAGE_SCRAPS}
              alt=""
              draggable={false}
              className="login-scrap-piece-img pointer-events-none absolute select-none"
              style={cropStyle(piece.cropL, piece.cropT, piece.cropW, piece.cropH)}
            />
          </div>
          {index % 2 === 0 ? (
            <span
              className={clsx(
                "login-scrap-tape",
                index % 4 === 0 ? "login-scrap-tape-tl" : "login-scrap-tape-tr"
              )}
            />
          ) : null}
          {index % 2 === 1 ? (
            <span className="login-scrap-tape login-scrap-tape-br login-scrap-tape-blue" />
          ) : null}
        </div>
      ))}

      <div className="login-craft-grain pointer-events-none absolute inset-0 z-[50]" />
      <div className="login-craft-vignette pointer-events-none absolute inset-0 z-[51]" />
    </div>
  );
}
