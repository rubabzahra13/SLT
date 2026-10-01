"use client";

import clsx from "clsx";

export type LineBoilVariant = "cream" | "orange" | "blue" | "warm";

type LineBoilImageProps = {
  src: string;
  alt?: string;
  className?: string;
  variant?: LineBoilVariant;
  /** Soft ghost copy behind the boil — off for large scraps */
  showEcho?: boolean;
};

type LineBoilWrapProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: LineBoilVariant;
  showEcho?: boolean;
};

/** Stepped edge shimmer — ported from smartReader LineBoilImage */
export function LineBoilImage({
  src,
  alt = "",
  className,
  variant = "warm",
  showEcho = false,
}: LineBoilImageProps) {
  return (
    <div className={clsx("login-line-boil-wrap", className)}>
      {showEcho ? (
        <div
          className={clsx("login-line-boil-echo", `login-line-boil-${variant}`)}
          aria-hidden="true"
        >
          <img src={src} alt="" draggable={false} className="login-line-boil-img" />
        </div>
      ) : null}
      <div className={clsx("login-line-boil", `login-line-boil-${variant}`)}>
        <img src={src} alt={alt} draggable={false} className="login-line-boil-img" />
      </div>
    </div>
  );
}

/** Same boil effect for SVG doodles / arbitrary children */
export function LineBoilWrap({
  children,
  className,
  style,
  variant = "cream",
  showEcho = false,
}: LineBoilWrapProps) {
  return (
    <div className={clsx("login-line-boil-wrap", className)} style={style}>
      {showEcho ? (
        <div
          className={clsx("login-line-boil-echo", `login-line-boil-${variant}`)}
          aria-hidden="true"
        >
          {children}
        </div>
      ) : null}
      <div className={clsx("login-line-boil", `login-line-boil-${variant}`)}>{children}</div>
    </div>
  );
}
