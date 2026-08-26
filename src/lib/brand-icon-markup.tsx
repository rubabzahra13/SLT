import {
  BRAND_LOGO_IMAGE,
  BRAND_LOGO_RING,
} from "@/lib/brand-logo";

type BrandIconMarkupProps = {
  logoSrc: string;
  size: number;
};

export function BrandIconMarkup({ logoSrc, size }: BrandIconMarkupProps) {
  const ring = Math.max(
    1,
    Math.round((BRAND_LOGO_RING.paddingPx / BRAND_LOGO_RING.baseSizePx) * size)
  );
  const inner = size - ring * 2;
  const offset =
    (BRAND_LOGO_IMAGE.translateXPx / BRAND_LOGO_RING.baseSizePx) * inner;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${BRAND_LOGO_RING.from} 0%, ${BRAND_LOGO_RING.to} 100%)`,
        borderRadius: "50%",
        padding: ring,
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: "50%",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={inner}
          height={inner}
          style={{
            objectFit: "contain",
            objectPosition: "center",
            transform: `translateX(${offset}px) scale(${BRAND_LOGO_IMAGE.scale})`,
          }}
        />
      </div>
    </div>
  );
}
