import clsx from "clsx";
import {
  BRAND_BLUE,
  BRAND_CHARCOAL,
  BRAND_CHARCOAL_MID,
  BRAND_ORANGE,
} from "@/lib/brand-colors";

// GradientBackground — SLT brand remix of 21st.dev "Orchid Petal Sky".
// Zero dependencies: one <div> that fills its parent.
// Remix source: https://21st.dev/community/gradients/editor?from=5bccdbda-6bc4-4d83-8d0d-cead4a853ade

const GRAIN_FILTER_ID = "grain-slt-brand-sky";

function rgbaFromHex(hex: string, alpha = 0.92): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const BRAND_SKY_GRADIENT = [
  `radial-gradient(ellipse 130% 110% at 50% 50%, ${rgbaFromHex(BRAND_CHARCOAL_MID, 0.55)} 0%, ${rgbaFromHex(BRAND_CHARCOAL, 0.95)} 100%)`,
  `radial-gradient(150% 50% at 40.46% 6%, ${rgbaFromHex(BRAND_CHARCOAL)} 0%, ${rgbaFromHex(BRAND_CHARCOAL, 0)} 55%)`,
  `radial-gradient(150% 50% at 41.41% 33%, ${rgbaFromHex(BRAND_CHARCOAL_MID)} 0%, ${rgbaFromHex(BRAND_CHARCOAL_MID, 0)} 55%)`,
  `radial-gradient(150% 50% at 51.35% 67%, ${rgbaFromHex(BRAND_BLUE)} 0%, ${rgbaFromHex(BRAND_BLUE, 0)} 55%)`,
  `radial-gradient(150% 50% at 54.16% 94%, ${rgbaFromHex(BRAND_ORANGE)} 0%, ${rgbaFromHex(BRAND_ORANGE, 0)} 55%)`,
].join(", ");

const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.180'/></svg>\")";

type GradientBackgroundProps = {
  className?: string;
};

export function GradientBackground({ className }: GradientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(className)}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        containerType: "size",
      }}
    >
      <div
        className="gradient-sky-drift"
        style={{
          position: "absolute",
          inset: "-0.8cqmin",
          filter: "blur(0.4cqmin)",
          backgroundImage: `${NOISE_TEXTURE}, ${BRAND_SKY_GRADIENT}`,
          backgroundSize: "120px 120px, auto, auto, auto, auto, auto",
          backgroundBlendMode: "overlay, normal, normal, normal, normal, normal",
        }}
      />
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.18,
          mixBlendMode: "overlay",
        }}
      >
        <filter id={GRAIN_FILTER_ID}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${GRAIN_FILTER_ID})`} />
      </svg>
    </div>
  );
}
