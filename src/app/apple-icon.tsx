import { ImageResponse } from "next/og";
import { BrandIconMarkup } from "@/lib/brand-icon-markup";
import { loadBrandLogoDataUrl } from "@/lib/load-brand-logo";

export const runtime = "nodejs";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  const logoSrc = await loadBrandLogoDataUrl();

  return new ImageResponse(<BrandIconMarkup logoSrc={logoSrc} size={180} />, {
    ...size,
  });
}
