import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_LOGO_FILE } from "@/lib/brand-logo";

export async function loadBrandLogoDataUrl() {
  const logoPath = join(process.cwd(), "public", BRAND_LOGO_FILE);
  const data = await readFile(logoPath);
  return `data:image/png;base64,${data.toString("base64")}`;
}
