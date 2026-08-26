import { ImageResponse } from "next/og";
import { BrandIconMarkup } from "@/lib/brand-icon-markup";
import { loadBrandLogoDataUrl } from "@/lib/load-brand-logo";

export const runtime = "nodejs";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default async function Icon() {
  const logoSrc = await loadBrandLogoDataUrl();

  return new ImageResponse(<BrandIconMarkup logoSrc={logoSrc} size={32} />, {
    ...size,
  });
}
