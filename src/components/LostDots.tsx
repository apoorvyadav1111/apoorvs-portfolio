"use client";

import { useEffect, useRef } from "react";

// "404" drawn in dots, in the theme's headline face. The dots scatter away
// from the cursor (or a finger) and spring back. Static for reduced motion.

interface Dot {
  hx: number; // home position
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const GAP = 7; // px between dots
const REACH = 70; // how close the pointer has to be to push

export default function LostDots({ text = "404" }: { text?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let frame = 0;
    let w = 0;
    let h = 0;
    const pointer = { x: -1e4, y: -1e4 };

    // Lay the text out off-screen and keep a dot wherever it's inked
    const layout = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const css = getComputedStyle(el);
      const off = document.createElement("canvas").getContext("2d")!;
      off.canvas.width = w;
      off.canvas.height = h;
      off.font = `${css.getPropertyValue("--display-weight") || 800} ${h * 0.9}px ${css.fontFamily}`;
      off.textAlign = "center";
      off.textBaseline = "middle";
      off.fillText(text, w / 2, h / 2 + h * 0.04);
      const data = off.getImageData(0, 0, w, h).data;

      dots = [];
      for (let y = 0; y < h; y += GAP)
        for (let x = 0; x < w; x += GAP)
          if (data[(y * w + x) * 4 + 3] > 128) dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
    };

    const draw = () => {
      const color = getComputedStyle(el).color;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (const d of dots) {
        if (!reduce) {
          const dx = d.x - pointer.x;
          const dy = d.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REACH && dist > 0.1) {
            const push = (1 - dist / REACH) * 6;
            d.vx += (dx / dist) * push;
            d.vy += (dy / dist) * push;
          }
          // Spring home, with damping
          d.vx = (d.vx + (d.hx - d.x) * 0.06) * 0.82;
          d.vy = (d.vy + (d.hy - d.y) * 0.06) * 0.82;
          d.x += d.vx;
          d.y += d.vy;
        }
        const away = Math.min(Math.hypot(d.x - d.hx, d.y - d.hy) / 40, 1);
        ctx.globalAlpha = 1 - away * 0.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.2 - away, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce) frame = requestAnimationFrame(draw);
    };

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const leave = () => {
      pointer.x = pointer.y = -1e4;
    };
    const resize = () => {
      layout();
      if (reduce) draw();
    };

    // Wait for the web font, or the dots trace a fallback face
    document.fonts.ready.then(() => {
      layout();
      draw();
    });
    addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      removeEventListener("resize", resize);
    };
  }, [text]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={text}
      className="display h-40 w-full touch-none text-accent sm:h-64"
    />
  );
}
