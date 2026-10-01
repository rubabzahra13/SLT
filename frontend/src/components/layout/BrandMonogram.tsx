import clsx from "clsx";
import {
  BRAND_LOGO_IMAGE,
  BRAND_LOGO_PATH,
  BRAND_LOGO_RING,
} from "@/lib/brand-logo";

const SIZE_CLASS = {
  sm: "h-8 w-8 p-[1px]",
  md: "h-9 w-9 p-[1.5px]",
  lg: "h-[72px] w-[72px] p-[3px]",
  xl: "h-20 w-20 p-[3.5px]",
} as const;

export function BrandMonogram({
  className,
  size = "md",
  imageTranslateXPx,
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASS;
  /** Override horizontal logo nudge (e.g. login page only). */
  imageTranslateXPx?: number;
}) {
  const translateX = imageTranslateXPx ?? BRAND_LOGO_IMAGE.translateXPx;
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full",
        SIZE_CLASS[size],
        className
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${BRAND_LOGO_RING.from}, ${BRAND_LOGO_RING.to})`,
      }}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
        <img
          src={BRAND_LOGO_PATH}
          alt=""
          className="h-full w-full object-contain object-center"
          style={{
            transform: `translateX(${translateX}px) scale(${BRAND_LOGO_IMAGE.scale})`,
          }}
        />
      </span>
    </span>
  );
}
