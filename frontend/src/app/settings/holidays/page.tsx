"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Leave-name settings removed — reasons are entered as "Off work for …" on leave. */
export default function LeaveNamesSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings");
  }, [router]);
  return null;
}
