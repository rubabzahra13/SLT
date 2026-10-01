"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import {
  BRAND_BLUE,
  BRAND_CHARCOAL,
  BRAND_ORANGE,
  BRAND_SIGNATURE,
} from "@/lib/brand-colors";

type Ripple = {
  x: number;
  y: number;
  born: number;
  interval: number;
};

/** Soft aurora + sound-ripple background — music-themed without busy equalizer bars. */
export function MusicWaveBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const ripples: Ripple[] = [];
    let lastSpawn = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    let animationId = 0;

    const spawnRipple = (now: number) => {
      ripples.push({
        x: width * (0.35 + Math.random() * 0.3),
        y: height * (0.72 + Math.random() * 0.12),
        born: now,
        interval: 2200 + Math.random() * 1800,
      });
      lastSpawn = now;
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (!reducedMotion && now - lastSpawn > 900) {
        spawnRipple(now);
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const ripple = ripples[i];
        const age = now - ripple.born;
        const progress = age / ripple.interval;

        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }

        const radius = 40 + progress * Math.min(width, height) * 0.38;
        const alpha = (1 - progress) * 0.14;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(82, 200, 238, ${alpha})`;
        ctx.lineWidth = 1.5 * (1 - progress * 0.5);
        ctx.stroke();

        if (progress < 0.55) {
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, radius * 0.62, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(240, 120, 64, ${alpha * 0.45})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Single elegant waveform — thin, low in frame
      if (width > 0 && height > 0) {
        const baseY = height * 0.82;
        const t = reducedMotion ? 0 : now / 1000;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const y =
            baseY +
            Math.sin(x * 0.008 + t * 0.9) * 18 +
            Math.sin(x * 0.015 - t * 0.5) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const waveGrad = ctx.createLinearGradient(0, baseY - 30, width, baseY + 30);
        waveGrad.addColorStop(0, "rgba(31,143,179,0)");
        waveGrad.addColorStop(0.35, "rgba(82,200,238,0.22)");
        waveGrad.addColorStop(0.65, "rgba(240,120,64,0.18)");
        waveGrad.addColorStop(1, "rgba(31,143,179,0)");
        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (!reducedMotion) {
        animationId = requestAnimationFrame(render);
      }
    };

    if (reducedMotion) {
      render(0);
    } else {
      spawnRipple(performance.now());
      animationId = requestAnimationFrame(render);
    }

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      observer.observe(canvas);
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      className={clsx("overflow-hidden", className)}
      style={{ backgroundColor: BRAND_CHARCOAL }}
      aria-hidden="true"
    >
      {/* Drifting brand aurora blobs */}
      <div className="absolute inset-0">
        <div
          className="login-aurora-blob login-aurora-blob-a"
          style={{ background: `radial-gradient(circle, ${BRAND_SIGNATURE}55 0%, transparent 70%)` }}
        />
        <div
          className="login-aurora-blob login-aurora-blob-b"
          style={{ background: `radial-gradient(circle, ${BRAND_BLUE}44 0%, transparent 70%)` }}
        />
        <div
          className="login-aurora-blob login-aurora-blob-c"
          style={{ background: `radial-gradient(circle, ${BRAND_ORANGE}33 0%, transparent 70%)` }}
        />
      </div>

      {/* Soft sound ripples + single waveform */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Center vignette — keeps the card readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(12,15,20,0.15)_0%,rgba(12,15,20,0.55)_55%,rgba(12,15,20,0.88)_100%)]" />
    </div>
  );
}
