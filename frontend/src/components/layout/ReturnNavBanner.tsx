"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { returnNavLabel, safeReturnHref } from "@/lib/nav-return";

type ReturnNavBannerProps = {
  /** Override ?return= when the parent already resolved it. */
  href?: string | null;
};

export function ReturnNavBanner({ href }: ReturnNavBannerProps) {
  const searchParams = useSearchParams();
  const target = safeReturnHref(href ?? searchParams.get("return"));
  if (!target) return null;

  return (
    <div className="shrink-0 border-b border-brand-blue/20 bg-brand-blue-soft/40 px-6 py-2 lg:px-8">
      <Link
        href={target}
        className="inline-flex items-center text-[13px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
      >
        {returnNavLabel(target)}
      </Link>
    </div>
  );
}
