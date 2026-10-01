"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

type PdfImageManifest = {
  pageCount: number;
  pages: Array<{ src: string; width: number; height: number }>;
};

type PdfImageViewerProps = {
  /** URL to a manifest.json describing the pre-rendered page images. */
  manifestSrc: string;
  className?: string;
};

/**
 * Displays a PDF that has been pre-rendered to PNG page images (see
 * scripts/render-eight-count.mjs). Using plain <img> tags means the preview
 * works in every browser — including embedded webviews where PDF plugins and
 * Web Workers are unavailable.
 */
export function PdfImageViewer({
  manifestSrc,
  className,
}: PdfImageViewerProps) {
  const [pages, setPages] = useState<PdfImageManifest["pages"] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setPages(null);

    (async () => {
      try {
        const res = await fetch(manifestSrc, { cache: "force-cache" });
        if (!res.ok) throw new Error("Could not load the preview.");
        const manifest = (await res.json()) as PdfImageManifest;
        if (cancelled) return;
        setPages(manifest.pages ?? []);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [manifestSrc]);

  return (
    <div className={`relative overflow-auto bg-neutral-200 ${className ?? ""}`}>
      {status === "ready" && pages ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3">
          {pages.map((page, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={page.src}
              src={page.src}
              alt={`Page ${index + 1}`}
              width={page.width}
              height={page.height}
              loading={index === 0 ? "eager" : "lazy"}
              className="h-auto w-full rounded-md bg-white shadow-sm"
            />
          ))}
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-ink-tertiary" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertCircle className="h-5 w-5 text-brand-danger" />
          <p className="text-[13px] text-brand-ink-secondary">
            Could not load the preview.
          </p>
        </div>
      ) : null}
    </div>
  );
}
