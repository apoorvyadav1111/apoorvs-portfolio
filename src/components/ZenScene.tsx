"use client";

import { useEffect, useRef } from "react";
import { THEMES } from "@/themes";
import type { Season } from "@/themes";

// The landscape behind zen mode (/zen): sky glow, a sun by day or tonight's
// real moon phase by night, drifting clouds, stars, soft hills along the bottom, and a few things only one season has:
// spring showers and butterflies, summer's drifting dandelion seeds, autumn's
// birds heading south, winter's aurora. Colours come from the theme's CSS
// variables every frame, so they follow a timelapse's blend; each season's
// extras fade in and out as the seasons hand over. Falling leaves, snow and
// the rest are SeasonSky's, drawn on top.

interface Butterfly {
  x: number;
  y: number;
  phase: number;
  dir: number;
}
interface Seed {
  x: number;
  y: number;
  drift: number;
  size: number;
}
interface Flock {
  x: number;
  y: number;
  dir: number;
  birds: { dx: number; dy: number; phase: number }[];
}

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

// Where the moon is in its cycle right now, 0 new → 0.5 full → 1 new again,
// counted from a known new moon (6 Jan 2000, 18:14 UTC)
function moonPhase(now = Date.now()) {
  const SYNODIC = 29.530588853 * 86400000;
  const p = (now - Date.UTC(2000, 0, 6, 18, 14)) / SYNODIC;
  return p - Math.floor(p);
}

interface Cloud {
  x: number; // 0–1, drifting right
  y: number;
  scale: number;
  speed: number;
  puffs: { dx: number; dy: number; r: number }[];
}

type RGB = [number, number, number];

// Theme colours are hex, or color-mix(in oklab, #a N%, #b) while a timelapse
// blends; canvas can't be trusted with the latter, so mix them here
function hex(value: string): RGB {
  let h = value.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function color(value: string): RGB {
  const m = value.match(/color-mix\(in oklab,\s*(#[0-9a-f]{3,8})\s+([\d.]+)%,\s*(#[0-9a-f]{3,8})\)/i);
  if (!m) return hex(value.trim());
  const [a, b, p] = [hex(m[1]), hex(m[3]), Number(m[2]) / 100];
  return a.map((v, i) => v * p + b[i] * (1 - p)) as RGB;
}
const rgba = (c: RGB, a = 1) => `rgba(${c.map(Math.round).join(",")},${a})`;
const mix = (a: RGB, b: RGB, p: number) => a.map((v, i) => v * p + b[i] * (1 - p)) as RGB;

export default function ZenScene() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let frame = 0;
    let last = performance.now();
    // How present each season's extras are, 0 to 1, easing toward the season on show
    const presence: Record<Season, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 };

    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.2 + 0.3, phase: Math.random() * 6 }));
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), speed: 0.6 + Math.random() * 0.5 }));
    const butterflies: Butterfly[] = Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.45 + Math.random() * 0.25, phase: i * 2, dir: Math.random() < 0.5 ? -1 : 1 }));
    const seeds: Seed[] = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), drift: Math.random() * 6, size: 2 + Math.random() * 2 }));
    let flock: Flock | null = null;
    const phase = moonPhase();
    // A handful of clouds, each a cluster of overlapping puffs
    const clouds: Cloud[] = Array.from({ length: 7 }, (_, i) => ({
      x: i / 7 + Math.random() * 0.1,
      y: 0.08 + Math.random() * 0.32,
      scale: 0.7 + Math.random() * 0.7,
      speed: 0.004 + Math.random() * 0.006,
      puffs: Array.from({ length: 5 + Math.floor(Math.random() * 3) }, (_, k) => ({
        dx: (k - 3) * 22 + Math.random() * 10,
        dy: -Math.sin((k / 6) * Math.PI) * 16 + Math.random() * 6,
        r: 18 + Math.sin((k / 6) * Math.PI) * 14 + Math.random() * 6,
      })),
    }));
    let nextFlock = 4;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seasonOn = (): Season | null => {
      const id = root.dataset.seasonNext ?? root.dataset.palette;
      return THEMES.find((t) => t.id === id)?.season ?? null;
    };

    // The hills' outline at x (0–1), `layer` 0 far, 1 near
    const hill = (x: number, layer: number) => {
      const base = h * (layer ? 0.9 : 0.84);
      return base - Math.sin(x * (layer ? 5.1 : 3.3) + layer * 2) * h * 0.035 - Math.sin(x * 11 + layer) * h * 0.012;
    };

    const draw = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const t = now / 1000;
      const css = getComputedStyle(root);
      const v = (name: string) => color(css.getPropertyValue(name));
      const [bgC, surfaceC, fgC, lineC, accentC, sunC] = ["--bg", "--surface", "--fg", "--line", "--accent", "--sun"].map(v);
      const [surface, fg, accent, sun] = [surfaceC, fgC, accentC, sunC].map((c) => rgba(c));
      const dark = root.dataset.theme !== "light";
      const on = seasonOn();
      for (const s of SEASONS) presence[s] += ((s === on ? 1 : 0) - presence[s]) * Math.min(1, dt * 0.6);

      ctx.clearRect(0, 0, w, h);

      // Sky glow from the sun or moon, upper right
      const cx = w * 0.78;
      const cy = h * (presence.autumn > 0.5 ? 0.3 : 0.2);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
      glow.addColorStop(0, dark ? rgba(fgC, 0.1) : rgba(sunC, 0.28));
      glow.addColorStop(1, rgba(dark ? fgC : sunC, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Stars at night, more of them in winter
      if (dark) {
        ctx.fillStyle = fg;
        const shown = 40 + Math.round(50 * presence.winter);
        for (let i = 0; i < shown; i++) {
          const s = stars[i];
          ctx.globalAlpha = (0.25 + 0.35 * Math.sin(t * 0.8 + s.phase) ** 2) * 0.8;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Winter's aurora: slow ribbons near the top, only at night
      if (dark && presence.winter > 0.01) {
        for (let band = 0; band < 2; band++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 16) {
            const y = h * (0.16 + band * 0.07) + Math.sin(x / 170 + t * 0.25 + band) * 26 + Math.sin(x / 70 - t * 0.4) * 8;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineWidth = 34 - band * 10;
          ctx.strokeStyle = band ? "#7fd8c6" : "#8fb8ff";
          ctx.globalAlpha = 0.09 * presence.winter;
          ctx.filter = "blur(14px)";
          ctx.stroke();
          ctx.filter = "none";
        }
        ctx.globalAlpha = 1;
      }

      // Sun by day; by night the moon, in tonight's actual phase
      ctx.save();
      if (dark) {
        const r = 22;
        // The unlit disc, faint (earthshine)
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // The lit part: one limb plus the terminator, an ellipse whose width
        // follows the phase. Waxing is lit on the right, waning on the left.
        ctx.translate(cx, cy);
        if (phase > 0.5) ctx.scale(-1, 1);
        const k = Math.cos(phase * 2 * Math.PI); // 1 new, 0 half, -1 full
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = fg;
        ctx.shadowBlur = 24 * (1 - k) * 0.5 + 6;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
        ctx.fill();
      } else {
        ctx.fillStyle = sun;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = sun;
        ctx.shadowBlur = 40 + 20 * presence.summer;
        ctx.beginPath();
        ctx.arc(cx, cy, 26 + 6 * presence.summer, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Clouds drift across, more of them in spring and winter, few in summer;
      // white by day, dim grey by night (passing in front of the moon)
      const cloudy = Math.max(1, Math.round(3 + 3 * presence.spring + 2 * presence.winter + presence.autumn - 2 * presence.summer));
      const showerDark = presence.spring * Math.max(0, Math.sin(t * 0.12)) ** 2;
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        if (!still) {
          c.x += c.speed * dt;
          if (c.x > 1.25) {
            c.x = -0.25;
            c.y = 0.08 + Math.random() * 0.32;
          }
        }
        const want = i < cloudy ? 1 : 0;
        const a = (dark ? 0.16 : 0.55) * want;
        if (a === 0) continue;
        const tint = dark ? mix(fgC, bgC, 0.35) : mix([255, 255, 255], mix(fgC, bgC, 0.15), 1 - showerDark * 0.5);
        ctx.fillStyle = rgba(tint, a);
        ctx.beginPath();
        for (const puff of c.puffs) {
          const px = c.x * w + puff.dx * c.scale;
          const py = c.y * h + puff.dy * c.scale;
          ctx.moveTo(px + puff.r * c.scale, py);
          ctx.arc(px, py, puff.r * c.scale, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Autumn: now and then a flock heads south across the sky
      if (!still) {
        nextFlock -= dt;
        if (!flock && nextFlock <= 0 && presence.autumn > 0.5) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          flock = {
            x: dir > 0 ? -80 : w + 80,
            y: h * (0.18 + Math.random() * 0.2),
            dir,
            birds: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, (_, i) => ({
              dx: -Math.ceil(i / 2) * 18,
              dy: (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 10,
              phase: Math.random() * 6,
            })),
          };
          nextFlock = 14 + Math.random() * 10;
        }
        if (flock) {
          flock.x += flock.dir * 38 * dt;
          ctx.strokeStyle = fg;
          ctx.lineWidth = 1.4;
          ctx.globalAlpha = 0.55 * Math.max(presence.autumn, 0.2);
          for (const b of flock.birds) {
            const bx = flock.x + b.dx * flock.dir;
            const by = flock.y + b.dy + Math.sin(t * 1.5 + b.phase) * 2;
            const flap = Math.sin(t * 7 + b.phase) * 3;
            ctx.beginPath();
            ctx.moveTo(bx - 6, by - flap);
            ctx.quadraticCurveTo(bx - 3, by - 3, bx, by);
            ctx.quadraticCurveTo(bx + 3, by - 3, bx + 6, by - flap);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          if (flock.x < -200 || flock.x > w + 200) flock = null;
        }
      }

      // Hills: a far ridge and a near one, the near one running into the ground
      for (const layer of [0, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, hill(x / w, layer));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = layer ? surface : rgba(mix(lineC, bgC, 0.7));
        ctx.fill();
      }
      // The ground the pile and grass rest on (SeasonSky reads [data-ground])
      ctx.fillStyle = surface;
      ctx.fillRect(0, h * 0.92, w, h * 0.08);

      // Spring: a shower comes and goes
      const shower = presence.spring * Math.max(0, Math.sin(t * 0.12)) ** 2;
      if (shower > 0.02 && !still) {
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.22 * shower;
        ctx.beginPath();
        for (const d of drops) {
          d.y += d.speed * dt;
          if (d.y > 0.92) {
            d.y = -0.05;
            d.x = Math.random();
          }
          const x = d.x * w;
          const y = d.y * h;
          ctx.moveTo(x, y);
          ctx.lineTo(x - 3, y + 12);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Spring: butterflies wander over the hills
      if (presence.spring > 0.02) {
        for (const b of butterflies) {
          if (!still) {
            b.x += (b.dir * 0.018 + Math.sin(t * 0.7 + b.phase) * 0.01) * dt;
            b.y += Math.sin(t * 1.3 + b.phase) * 0.02 * dt;
            if (b.x < -0.05) b.dir = 1;
            if (b.x > 1.05) b.dir = -1;
          }
          const x = b.x * w;
          const y = b.y * h;
          const flap = Math.abs(Math.sin(t * 9 + b.phase));
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(1.8, 1.8);
          ctx.translate(-x, -y);
          ctx.globalAlpha = 0.85 * presence.spring;
          ctx.fillStyle = accent;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + side * 4 * flap, y - 2, 5 * flap + 1, 6, side * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + side * 3 * flap, y + 4, 3.5 * flap + 0.8, 4, side * -0.3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = fg;
          ctx.fillRect(x - 0.6, y - 4, 1.2, 9);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // Summer: dandelion seeds rising on warm air
      if (presence.summer > 0.02) {
        ctx.strokeStyle = fg;
        ctx.fillStyle = fg;
        ctx.lineWidth = 0.8;
        for (const s of seeds) {
          if (!still) {
            s.y -= 0.012 * dt;
            s.x += Math.sin(t * 0.5 + s.drift) * 0.006 * dt;
            if (s.y < -0.05) {
              s.y = 0.95;
              s.x = Math.random();
            }
          }
          const x = s.x * w;
          const y = s.y * h;
          ctx.globalAlpha = 0.55 * presence.summer;
          // A parachute: a fan of fluff over a thin stem, the seed at its foot
          const tilt = Math.sin(t * 0.8 + s.drift) * 0.25;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(tilt);
          ctx.beginPath();
          for (let k = 0; k <= 8; k++) {
            const a = -Math.PI * (0.15 + 0.7 * (k / 8));
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * s.size * 2.6, Math.sin(a) * s.size * 2.6);
          }
          ctx.moveTo(0, 0);
          ctx.lineTo(0, s.size * 3.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, s.size * 3.8, 0.9, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      if (!still) frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);
    const onResize = () => {
      resize();
      if (still) requestAnimationFrame(draw);
    };
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
      {/* Where things land in zen: the top of the ground strip */}
      <div data-ground aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-[8vh]" />
    </>
  );
}
