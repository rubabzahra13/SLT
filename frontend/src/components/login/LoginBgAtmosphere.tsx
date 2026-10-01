"use client";

import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import styles from "./LoginBgAtmosphere.module.css";

/** Brand teal + amber corner wash (replaces image smoke plates). */
const LOGIN_SHADER_COLORS = [
  "hsl(193, 82%, 55%)", // brand teal
  "hsl(18, 85%, 58%)", // brand orange
  "hsl(340, 70%, 48%)", // deep warm accent
];

/**
 * Charcoal plate + Paper Design GrainGradient corners (replaces smoke).
 */
export function LoginBgAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={[styles.atmosphere, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <div className={styles.plate} />
      <GradientBackground
        className={styles.shader}
        colors={LOGIN_SHADER_COLORS}
        soft
      />
      <div className={styles.veil} />
    </div>
  );
}
