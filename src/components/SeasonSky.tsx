"use client";

import { useEffect, useRef } from "react";
import { THEMES } from "@/themes";
import { drawBlossom, drawPetal } from "./blossom";

// A few particles drifting across the page while a theme with `particles` is
// on (the seasonal themes): leaves, snow, petals or fireflies. Kept sparse and
// faint so they never compete with the text; off for reduced motion, paused
// while the tab is hidden.
//
// Whatever falls onto the footer's top edge settles there in a small pile
// (fireflies land and keep glowing). Moving the mouse or a finger through the
// pile kicks it back into the air.

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
  whole: boolean; // petals: a whole blossom rather than a single petal
}

// Something resting on the footer, or kicked off it and flying
interface Piece {
  x: number;
  y: number; // flying: viewport y. Resting: height above the footer's edge
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  color: string;
  whole: boolean;
  phase: number;
  thick: number; // how much it adds to the pile's height
  flying: boolean;
}

// Particles per 1440×900 of screen
const DENSITY: Record<Kind, number> = { leaves: 12, snow: 30, petals: 14, fireflies: 16 };
const COLUMN = 8; // px; the pile's height is tracked per column
const MAX_PIECES = 110;
const MAX_HEIGHT = 22; // px; deeper than this and things fall behind the footer
const MAX_FIREFLIES = 6;
const KICK_REACH = 38; // px around the pointer

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
    let gold = "";
    let pile: Piece[] = [];
    let heights: number[] = [];
    let edge = Infinity; // the footer's top, in viewport px
    const footer = document.querySelector("footer");

    const colors = () => {
      const css = getComputedStyle(root);
      const v = (name: string) => css.getPropertyValue(name).trim();
      if (kind === "leaves") return [v("--accent"), v("--sun"), v("--muted")];
      // Blossom pinks: the theme's own, plus two soft ones
      if (kind === "petals") return [v("--accent"), "#f4b3c6", "#f9d0dc"];
      if (kind === "snow") return [v("--fg")];
      return [v("--sun")];
    };

    const spawn = (anywhere: boolean, palette: string[]): Particle => ({
      x: Math.random() * w,
      y: anywhere || kind === "fireflies" ? Math.random() * h : -20,
      size: kind === "snow" ? 4 + Math.random() * 4 : kind === "fireflies" ? 1.5 + Math.random() * 1.5 : 7 + Math.random() * 6,
      speed: kind === "snow" ? 15 + Math.random() * 25 : kind === "fireflies" ? 8 + Math.random() * 10 : 20 + Math.random() * 25,
      sway: kind === "snow" ? 10 : 30 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2,
      color: palette[Math.floor(Math.random() * palette.length)],
      whole: kind === "petals" && Math.random() < 0.3,
    });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // One leaf, flake, petal or firefly at (x, y). Resting ones lie still.
    const shape = (x: number, y: number, p: Particle | Piece, t: number, resting: boolean) => {
      ctx.fillStyle = p.color;
      const spin = "rot" in p ? p.rot : t * p.spin * 0.3 + p.phase;
      if (kind === "snow") {
        if (resting) {
          // Settled snow: low, wide mounds that merge into a layer
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.ellipse(x, y, p.size * 1.1, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        // A six-armed flake, slowly turning; bigger ones get little branches
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.beginPath();
        for (let arm = 0; arm < 6; arm++) {
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -p.size);
          if (p.size > 4.5) {
            const b = p.size * 0.55;
            const l = p.size * 0.3;
            ctx.moveTo(0, -b);
            ctx.lineTo(-l, -b - l);
            ctx.moveTo(0, -b);
            ctx.lineTo(l, -b - l);
          }
          ctx.rotate(Math.PI / 3);
        }
        ctx.stroke();
        ctx.restore();
      } else if (kind === "fireflies") {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + p.phase * 3);
        ctx.globalAlpha = 0.15 + 0.6 * pulse;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Leaves and petals tumble, narrowing as they turn edge-on. Whole
        // blossoms mostly float flat; resting ones lie seen at an angle.
        ctx.globalAlpha = kind === "leaves" ? (resting ? 0.75 : 0.55) : resting ? 0.85 : 0.7;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate("rot" in p ? p.rot : t * p.spin * (p.whole ? 0.4 : 1) + p.phase);
        const turn = Math.abs(Math.sin(t * 1.2 + p.phase));
        ctx.scale(1, resting ? 0.6 : p.whole ? 0.8 + turn * 0.2 : 0.5 + turn * 0.5);
        if (kind === "leaves") {
          // A pointed leaf: two arcs meeting at the tips
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.quadraticCurveTo(0, -p.size, p.size, 0);
          ctx.quadraticCurveTo(0, p.size, -p.size, 0);
          ctx.fill();
        } else if (p.whole) {
          drawBlossom(ctx, p.size * 1.6, gold);
        } else {
          drawPetal(ctx, p.size);
        }
        ctx.restore();
      }
    };

    // A resting angle: roughly flat, either way round
    const lying = () => (Math.random() - 0.5) * 0.9 + (Math.random() < 0.5 ? 0 : Math.PI);

    const column = (x: number) => Math.max(0, Math.min(heights.length - 1, Math.floor(x / COLUMN)));

    // Adds something to the pile where it landed; false if there's no room
    const settle = (x: number, from: Particle | Piece) => {
      const fireflies = kind === "fireflies";
      if (fireflies ? pile.length >= MAX_FIREFLIES : pile.length >= MAX_PIECES) return false;
      const c = column(x);
      if (heights[c] >= MAX_HEIGHT) return false;
      const thick = fireflies ? 0 : from.size * (kind === "snow" ? 0.3 : 0.35);
      pile.push({
        x,
        y: heights[c] + thick * 0.5,
        vx: 0,
        vy: 0,
        rot: fireflies || kind === "snow" ? 0 : lying(),
        spin: 0,
        size: from.size,
        color: from.color,
        whole: from.whole,
        phase: from.phase,
        thick,
        flying: false,
      });
      heights[c] += thick;
      if (c > 0) heights[c - 1] += thick * 0.4;
      if (c < heights.length - 1) heights[c + 1] += thick * 0.4;
      return true;
    };

    // Has a falling particle reached the pile's surface (or a firefly the edge)?
    const landed = (p: Particle) => {
      const surface = edge - heights[column(p.x)];
      if (kind === "fireflies") return Math.abs(p.y - (edge - 3)) < 2 && settle(p.x, p);
      return p.y >= surface && p.y < edge + 30 && settle(p.x, p);
    };

    // Kicked pieces fly up, fall back and settle again
    const updatePile = (dt: number) => {
      pile = pile.filter((piece) => {
        if (!piece.flying) return true;
        piece.vy += 900 * dt;
        piece.vx *= Math.pow(0.4, dt);
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.rot += piece.spin * dt;
        if (piece.vy > 0 && piece.y >= edge - heights[column(piece.x)]) {
          piece.flying = false;
          piece.rot = lying();
          const c = column(piece.x);
          piece.y = heights[c] + piece.thick * 0.5;
          heights[c] += piece.thick;
          return true;
        }
        return piece.y < h + 30;
      });
    };

    let pointer: { x: number; y: number } | null = null;
    const kick = (x: number, y: number) => {
      const dx = pointer ? x - pointer.x : 0;
      const dy = pointer ? y - pointer.y : 0;
      pointer = { x, y };
      if (!frame || edge > h || Math.hypot(dx, dy) < 2) return;
      for (const piece of pile) {
        if (piece.flying) continue;
        const py = edge - piece.y;
        const dist = Math.hypot(piece.x - x, py - y);
        if (dist > KICK_REACH) continue;
        const c = column(piece.x);
        heights[c] = Math.max(0, heights[c] - piece.thick);
        const strength = 1 - dist / KICK_REACH;
        piece.flying = true;
        piece.y = py;
        piece.vx = dx * 18 * strength + (Math.random() - 0.5) * 80;
        piece.vy = -(220 + Math.random() * 260) * (0.5 + strength);
        piece.spin = (Math.random() - 0.5) * 12;
      }
    };
    const onPointer = (e: PointerEvent) => kick(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => kick(e.touches[0].clientX, e.touches[0].clientY);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      edge = footer ? footer.getBoundingClientRect().top : Infinity;

      for (const p of particles) {
        if (kind === "fireflies") {
          p.x += Math.cos(t * 0.3 + p.phase) * p.speed * dt;
          p.y += Math.sin(t * 0.4 + p.phase * 1.3) * p.speed * dt;
        } else {
          p.y += p.speed * dt;
          p.x += Math.cos(t * 0.8 + p.phase) * p.sway * dt;
        }
        if (edge < h && landed(p)) Object.assign(p, spawn(kind === "fireflies", [p.color]));
        if (p.y > h + 20) Object.assign(p, spawn(false, [p.color]));
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        shape(p.x, p.y, p, t, false);
      }

      if (edge < h + 40) {
        updatePile(dt);
        for (const piece of pile) {
          const y = piece.flying ? piece.y : edge - piece.y;
          if (y > -20 && y < h + 20) shape(piece.x, y, piece, t, !piece.flying);
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
      gold = getComputedStyle(root).getPropertyValue("--sun").trim();
      const count = Math.round((DENSITY[kind] * (w * h)) / (1440 * 900));
      particles = Array.from({ length: Math.max(4, count) }, () => spawn(true, palette));
      pile = [];
      heights = new Array(Math.ceil(w / COLUMN) + 1).fill(0);
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };

    start();
    // Theme or light/dark changes, and tab visibility
    const observer = new MutationObserver(start);
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette", "data-theme"] });
    document.addEventListener("visibilitychange", start);
    // Phones resize as the address bar shows and hides; keep the particles
    const onResize = () => {
      if (!frame) return;
      if (innerWidth !== w) {
        // The pile's columns no longer line up; start it again
        pile = [];
        heights = new Array(Math.ceil(innerWidth / COLUMN) + 1).fill(0);
      }
      resize();
    };
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("touchmove", onTouch, { passive: true });
    addEventListener("resize", onResize);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", start);
      removeEventListener("resize", onResize);
      removeEventListener("pointermove", onPointer);
      removeEventListener("touchmove", onTouch);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}
