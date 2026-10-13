"use client";

import { useEffect, useRef } from "react";
import { THEMES } from "@/themes";

// A few particles drifting across the page while a theme with `particles` is
// on (the seasonal themes): leaves, snow, petals or fireflies. Kept sparse and
// faint so they never compete with the text; off for reduced motion, paused
// while the tab is hidden.

type Kind = NonNullable<(typeof THEMES)[number]["particles"]>;

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number; // px per second, downward (fireflies wander instead)
  sway: number; // sideways amplitude
  phase: number;
  spin: number;
  color: string;
}

// Particles per 1440×900 of screen
const DENSITY: Record<Kind, number> = { leaves: 12, snow: 45, petals: 14, fireflies: 16 };

export default function SeasonSky() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    let kind: Kind | null = null;
    let particles: Particle[] = [];
    let frame = 0;
    let last = 0;
    let w = 0;
    let h = 0;

    const colors = () => {
      const css = getComputedStyle(root);
      const v = (name: string) => css.getPropertyValue(name).trim();
      if (kind === "leaves") return [v("--accent"), v("--sun"), v("--muted")];
      if (kind === "petals") return [v("--accent"), v("--accent"), v("--fg")];
      if (kind === "snow") return [v("--fg")];
      return [v("--sun")];
    };

    const spawn = (anywhere: boolean, palette: string[]): Particle => ({
      x: Math.random() * w,
      y: anywhere || kind === "fireflies" ? Math.random() * h : -20,
      size: kind === "snow" ? 1 + Math.random() * 2 : kind === "fireflies" ? 1.5 + Math.random() * 1.5 : 7 + Math.random() * 6,
      speed: kind === "snow" ? 15 + Math.random() * 25 : kind === "fireflies" ? 8 + Math.random() * 10 : 20 + Math.random() * 25,
      sway: kind === "snow" ? 10 : 30 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2,
      color: palette[Math.floor(Math.random() * palette.length)],
    });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;

      for (const p of particles) {
        if (kind === "fireflies") {
          p.x += Math.cos(t * 0.3 + p.phase) * p.speed * dt;
          p.y += Math.sin(t * 0.4 + p.phase * 1.3) * p.speed * dt;
        } else {
          p.y += p.speed * dt;
          p.x += Math.cos(t * 0.8 + p.phase) * p.sway * dt;
        }
        if (p.y > h + 20) Object.assign(p, spawn(false, [p.color]));
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        ctx.fillStyle = p.color;
        if (kind === "snow") {
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === "fireflies") {
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + p.phase * 3);
          ctx.globalAlpha = 0.15 + 0.6 * pulse;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Leaves and petals: a tumbling ellipse, narrowing as it turns
          ctx.globalAlpha = kind === "leaves" ? 0.55 : 0.5;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * p.spin + p.phase);
          ctx.scale(1, Math.abs(Math.sin(t * 1.2 + p.phase)) * 0.5 + 0.5);
          ctx.beginPath();
          if (kind === "leaves") {
            // A pointed leaf: two arcs meeting at the tips
            ctx.moveTo(-p.size, 0);
            ctx.quadraticCurveTo(0, -p.size, p.size, 0);
            ctx.quadraticCurveTo(0, p.size, -p.size, 0);
          } else {
            ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.45, 0, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      ctx.clearRect(0, 0, w, h);
    };

    const start = () => {
      stop();
      const theme = THEMES.find((t) => t.id === root.dataset.palette);
      kind = theme?.particles ?? null;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!kind || reduce || document.hidden) return;
      resize();
      const palette = colors();
      const count = Math.round((DENSITY[kind] * (w * h)) / (1440 * 900));
      particles = Array.from({ length: Math.max(4, count) }, () => spawn(true, palette));
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };

    start();
    // Theme or light/dark changes, and tab visibility
    const observer = new MutationObserver(start);
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette", "data-theme"] });
    document.addEventListener("visibilitychange", start);
    // Phones resize as the address bar shows and hides; keep the particles
    const onResize = () => frame && resize();
    addEventListener("resize", onResize);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", start);
      removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}
