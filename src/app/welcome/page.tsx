"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMonogram } from "@/components/layout/BrandMonogram";
import { LoginBgAtmosphere } from "@/components/login/LoginBgAtmosphere";
import { useAuthPageCanvas } from "@/components/login/useAuthPageCanvas";
import { useAuth } from "@/context/AuthContext";
import styles from "./welcome.module.css";

const HOLD_MS = 2800;
const EXIT_MS = 520;

export default function WelcomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isViewOnly } = useAuth();
  useAuthPageCanvas("#0a0c10");

  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    window.setTimeout(() => {
      router.replace("/");
    }, EXIT_MS);
  }

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const hold = window.setTimeout(finish, HOLD_MS);
    return () => window.clearTimeout(hold);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot welcome hold
  }, [isLoading, isAuthenticated, router]);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const accessLabel = isViewOnly ? "View access" : "Full access";

  return (
    <div className={styles.page}>
      <LoginBgAtmosphere />
      <div
        className="login-figma-vignette pointer-events-none fixed inset-0 z-[1]"
        aria-hidden="true"
      />

      <div className={`${styles.stage} ${exiting ? styles.exit : ""}`}>
        <div className={styles.mark}>
          <BrandMonogram size="lg" imageTranslateXPx={8} />
        </div>

        <p className={styles.eyebrow}>Sounds Like That</p>

        <h1 className={styles.headline}>
          Welcome back,{" "}
          <span className={styles.accent}>{firstName}</span>
        </h1>

        <p className={styles.sub}>
          Your studio workspace is ready. Taking you into the dashboard.
        </p>

        <div className={styles.meta}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{accessLabel} · Admin Studio</span>
        </div>

        <div className={styles.barTrack} aria-hidden="true">
          <div className={styles.barFill} />
        </div>

        <button type="button" className={styles.skip} onClick={finish}>
          Enter dashboard →
        </button>
      </div>
    </div>
  );
}
