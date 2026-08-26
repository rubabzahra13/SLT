import clsx from "clsx";
import {
  BRAND_LOGO_IMAGE,
  BRAND_LOGO_PATH,
  BRAND_LOGO_RING,
} from "@/lib/brand-logo";

export function BrandMonogram({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[1.5px]",
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
            transform: `translateX(${BRAND_LOGO_IMAGE.translateXPx}px) scale(${BRAND_LOGO_IMAGE.scale})`,
          }}
        />
      </span>
    </span>
  );
}
