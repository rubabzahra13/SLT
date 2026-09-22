// Pre-renders the SLT 8 count sheets PDF into PNG page images under
// public/eight-count-sheets/. The in-app preview shows these images so it works
// in every browser (including the Cursor in-IDE webview, where PDF plugins and
// Web Workers are unavailable). Run: `node scripts/render-eight-count.mjs`.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  createCanvas,
  DOMMatrix,
  DOMPoint,
  DOMRect,
  ImageData,
  Path2D,
} from "@napi-rs/canvas";

const require = createRequire(import.meta.url);

// pdf.js expects these DOM globals when rendering vector paths / transforms.
// Provide them from @napi-rs/canvas so glyph paths render correctly in Node.
globalThis.DOMMatrix ??= DOMMatrix;
globalThis.DOMPoint ??= DOMPoint;
globalThis.DOMRect ??= DOMRect;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_PDF = path.join(ROOT, "public", "SLT 8 count sheets.pdf");
const OUT_DIR = path.join(ROOT, "public", "eight-count-sheets");
const STANDARD_FONTS_DIR = path.join(
  ROOT,
  "node_modules",
  "pdfjs-dist",
  "standard_fonts"
);
const SCALE = 2; // ~144 DPI, crisp on retina without huge files.

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(cc, width, height) {
    cc.canvas.width = Math.ceil(width);
    cc.canvas.height = Math.ceil(height);
  }
  destroy(cc) {
    cc.canvas.width = 0;
    cc.canvas.height = 0;
    cc.canvas = null;
    cc.context = null;
  }
}

async function main() {
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

  const data = new Uint8Array(await fs.readFile(SOURCE_PDF));
  const canvasFactory = new NodeCanvasFactory();
  const loadingTask = pdfjs.getDocument({
    data,
    canvasFactory,
    // Node has no browser Worker; run on the main thread.
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: false,
    standardFontDataUrl: `${STANDARD_FONTS_DIR}${path.sep}`,
  });
  const pdf = await loadingTask.promise;

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: SCALE });
    const { canvas, context } = canvasFactory.create(
      viewport.width,
      viewport.height
    );
    await page.render({ canvasContext: context, viewport, canvasFactory })
      .promise;

    const fileName = `page-${pageNumber}.png`;
    const png = canvas.toBuffer("image/png");
    await fs.writeFile(path.join(OUT_DIR, fileName), png);
    pages.push({
      src: `/eight-count-sheets/${fileName}`,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
    });
    page.cleanup();
    process.stdout.write(`rendered page ${pageNumber}/${pdf.numPages}\n`);
  }

  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify({ pageCount: pdf.numPages, pages }, null, 2)
  );

  console.log(`Done: ${pdf.numPages} page(s) -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
