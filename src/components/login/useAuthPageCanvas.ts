"use client";

import { useEffect } from "react";
import { BRAND_CHARCOAL } from "@/lib/brand-colors";

export const AUTH_PAGE_CANVAS = BRAND_CHARCOAL;

/** Pin html/body to the auth background so overscroll never reveals white. */
export function useAuthPageCanvas() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlBg: html.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.backgroundColor = AUTH_PAGE_CANVAS;
    body.style.backgroundColor = AUTH_PAGE_CANVAS;
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
    themeMeta.setAttribute("content", AUTH_PAGE_CANVAS);

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
  }, []);
}
