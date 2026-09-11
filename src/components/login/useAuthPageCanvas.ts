"use client";

import { useEffect } from "react";
import { BRAND_CHARCOAL } from "@/lib/brand-colors";

export const AUTH_PAGE_CANVAS = BRAND_CHARCOAL;

/** Pin html/body overscroll; optional canvas color (transparent = gradient-only login). */
export function useAuthPageCanvas(canvas: string = AUTH_PAGE_CANVAS) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlBg: html.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.backgroundColor = canvas;
    body.style.backgroundColor = canvas;
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const createdThemeMeta = !themeMeta;
    const prevTheme = themeMeta?.getAttribute("content") ?? "";

    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      document.head.appendChild(themeMeta);
    }
    if (canvas !== "transparent") {
      themeMeta.setAttribute("content", canvas);
    }

    return () => {
      html.style.backgroundColor = prev.htmlBg;
      body.style.backgroundColor = prev.bodyBg;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;

      if (createdThemeMeta) {
        themeMeta?.remove();
      } else if (themeMeta) {
        themeMeta.setAttribute("content", prevTheme);
      }
    };
  }, [canvas]);
}
