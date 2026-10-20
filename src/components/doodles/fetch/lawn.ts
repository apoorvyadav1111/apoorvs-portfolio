import type { Season } from "@/themes";
import type { View } from "./view";

// The garden fetch is played in, seen across at an angle (view.ts).
//
// drawGround paints everything lying flat, once into its own canvas: the sky
// and a far tree line above the horizon, then the lawn running back to it,
// striped, with a stepping-stone path, a pond and the season's touches
// (flowers, fallen leaves, snow). Night darkens it.
//
// scenery() lists what stands up out of the lawn (trees and bushes) with how
// far back each is, so the game can draw them in depth order with the dog:
// nearer things in front.

// The same "random" garden every time for a given size
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LOOK: Record<Season, { grass: string; stripe: string; canopy: string[]; path: string; water: string; sky: [string, string]; far: string }> = {
  spring: { grass: "#8fc46e", stripe: "#9ccd7c", canopy: ["#6fae58", "#86bf68"], path: "#d8c9a6", water: "#6fa9c9", sky: ["#bfe0f2", "#eef6f0"], far: "#7fae6a" },
  summer: { grass: "#7cb356", stripe: "#88bd61", canopy: ["#4f8f3c", "#5f9f46"], path: "#d9c7a0", water: "#5f9fc4", sky: ["#9fd0ef", "#f3efd8"], far: "#5f8f48" },
  autumn: { grass: "#a3ad5e", stripe: "#adb768", canopy: ["#d9772c", "#e8a33a", "#b9462c"], path: "#cdb892", water: "#6b98ad", sky: ["#c9d6df", "#f2e6cf"], far: "#b9733a" },
  winter: { grass: "#e8edf1", stripe: "#f1f4f7", canopy: [], path: "#cfd6dd", water: "#bcd4e3", sky: ["#cfd9e2", "#f1f3f5"], far: "#a9b4bd" },
};

// The garden's furniture, in ground coordinates (fractions of width and depth)
const POND = { x: 0.74, d: 0.5, rx: 0.13, rd: 0.11 };
const TREES = [
  { x: 0.08, d: 0.82, r: 1.1 },
  { x: 0.93, d: 0.66, r: 1.2 },
  { x: 0.5, d: 0.98, r: 1 },
  { x: 0.2, d: 0.42, r: 0.9 },
  { x: 0.97, d: 0.06, r: 1.3 }, // a big one up close, framing the corner
];
const BUSHES = [
  { x: 0.33, d: 0.9 },
  { x: 0.66, d: 0.86 },
  { x: 0.05, d: 0.25 },
  { x: 0.86, d: 0.32 },
];

export function drawGround(ctx: CanvasRenderingContext2D, v: View, season: Season, night: boolean) {
  const { w, h, horizon, depth } = v;
  const look = LOOK[season];
  const rand = seeded(Math.round(w) * 7 + Math.round(h));
  const at = (x: number, d: number) => v.project(x, d);

  // Sky, and a soft far tree line along the horizon
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, look.sky[0]);
  sky.addColorStop(1, look.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 2);
  ctx.fillStyle = look.far;
  ctx.beginPath();
  ctx.moveTo(0, horizon + 2);
  for (let x = 0; x <= w; x += 14) ctx.lineTo(x, horizon - 10 - Math.abs(Math.sin(x / 37) * 9 + Math.sin(x / 13) * 4));
  ctx.lineTo(w, horizon + 2);
  ctx.fill();

  // The lawn: one plane, with mown stripes running back to the horizon
  const lawn = (x0: number, x1: number, d0: number, d1: number) => {
    const a = at(x0, d0);
    const b = at(x1, d0);
    const c = at(x1, d1);
    const e = at(x0, d1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(e.x, e.y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = look.grass;
  lawn(-w, 2 * w, 0, depth);
  ctx.fillStyle = look.stripe;
  for (let x = -w; x < 2 * w; x += 140) lawn(x, x + 70, 0, depth);
  // Speckles, smaller further back
  for (let i = 0; i < (w * h) / 700; i++) {
    const p = at(rand() * w, rand() * depth);
    ctx.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(p.x, p.y, 2 * p.s, 2 * p.s);
  }

  // Lying flat on the lawn: an ellipse in ground coordinates
  const flat = (x: number, d: number, rx: number, rd: number) => {
    ctx.beginPath();
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const p = at(x + Math.cos(a) * rx, d + Math.sin(a) * rd);
      if (k) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.fill();
  };

  if (season === "winter") {
    // Grass poking through the snow
    ctx.strokeStyle = "rgba(90,120,80,0.45)";
    for (let i = 0; i < (w * h) / 5000; i++) {
      const p = at(rand() * w, rand() * depth);
      ctx.lineWidth = 1.2 * p.s;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2 * p.s, p.y - 5 * p.s);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 2 * p.s, p.y - 5 * p.s);
      ctx.stroke();
    }
  }

  // A stepping-stone path winding back across the lawn
  const curve = (t: number) => ({
    x: (1 - t) ** 3 * -0.05 * w + 3 * (1 - t) ** 2 * t * 0.25 * w + 3 * (1 - t) * t * t * 0.55 * w + t ** 3 * 1.05 * w,
    d: (1 - t) ** 3 * 0.05 * depth + 3 * (1 - t) ** 2 * t * 0.3 * depth + 3 * (1 - t) * t * t * 0.55 * depth + t ** 3 * 0.75 * depth,
  });
  ctx.fillStyle = look.path;
  ctx.globalAlpha = 0.4;
  for (let t = 0; t < 1; t += 0.01) {
    const g = curve(t);
    flat(g.x, g.d, 26, 26);
  }
  ctx.globalAlpha = 1;
  for (let t = 0.03; t < 1; t += 0.045) {
    const g = curve(t);
    flat(g.x + (rand() - 0.5) * 10, g.d + (rand() - 0.5) * 10, 14, 11);
  }

  // The pond (frozen in winter), with lily pads
  const px = POND.x * w;
  const pd = POND.d * depth;
  const prx = POND.rx * w;
  const prd = POND.rd * depth;
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  flat(px + 6, pd - 6, prx + 6, prd + 4);
  ctx.fillStyle = look.water;
  flat(px, pd, prx, prd);
  if (season === "winter") {
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const c1 = at(px - prx * 0.5, pd);
    const c2 = at(px, pd - prd * 0.2);
    const c3 = at(px + prx * 0.4, pd + prd * 0.1);
    const c4 = at(px + prx * 0.05, pd - prd * 0.6);
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.lineTo(c3.x, c3.y);
    ctx.moveTo(c2.x, c2.y);
    ctx.lineTo(c4.x, c4.y);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    flat(px - prx * 0.3, pd + prd * 0.35, prx * 0.3, prd * 0.08);
    for (const [fx, fd] of [[0.3, -0.2], [-0.2, -0.35], [0.5, 0.15]]) {
      ctx.fillStyle = "#4f8f3c";
      flat(px + fx * prx, pd + fd * prd, 8, 8);
      if (season === "spring" || season === "summer") {
        ctx.fillStyle = "#f4b3c6";
        flat(px + fx * prx + 2, pd + fd * prd + 2, 3, 3);
      }
    }
  }

  // Flowers in spring and summer; fallen leaves in autumn
  if (season !== "winter") {
    const n = season === "autumn" ? 220 : season === "spring" ? 140 : 80;
    for (let i = 0; i < n; i++) {
      const x = rand() * w;
      const d = rand() * depth;
      if (Math.hypot((x - px) / prx, (d - pd) / prd) < 1.1) continue;
      const p = at(x, d);
      if (season === "autumn") {
        ctx.fillStyle = look.canopy[Math.floor(rand() * look.canopy.length)];
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 4 * p.s, 2 * p.s * 0.8, rand() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = ["#ffffff", "#f7d34a", "#f4b3c6", "#b9a7f0"][Math.floor(rand() * 4)];
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * 2.4 * p.s, p.y + Math.sin(a) * 1.5 * p.s, 1.7 * p.s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#e8a33a";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.3 * p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (night) {
    ctx.fillStyle = "rgba(10, 16, 34, 0.35)";
    ctx.fillRect(0, 0, w, h);
  }
}

// What stands up out of the lawn, each with how far back it is (for drawing
// in depth order) and how to draw itself
export function scenery(v: View, season: Season) {
  const look = LOOK[season];
  const { w, depth } = v;
  const items: { d: number; x: number; draw: (ctx: CanvasRenderingContext2D) => void }[] = [];

  for (const [i, t] of TREES.entries()) {
    const x = t.x * w;
    const d = t.d * depth;
    items.push({
      x,
      d,
      draw(ctx) {
        const rand = seeded(i * 97 + 13);
        const base = v.project(x, d);
        const s = base.s * t.r;
        // Shadow on the grass, then the trunk standing up from it
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.ellipse(base.x + 18 * s, base.y + 2 * s, 46 * s, 46 * s * v.squash * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6b5440";
        ctx.fillRect(base.x - 5 * s, base.y - 58 * s, 10 * s, 58 * s);
        const top = base.y - 80 * s;
        if (season === "winter") {
          // Bare branches, with snow caught on them
          ctx.strokeStyle = "#6b5440";
          ctx.lineCap = "round";
          for (let k = 0; k < 7; k++) {
            const a = -Math.PI / 2 + (k - 3) * 0.32 + (rand() - 0.5) * 0.2;
            const len = (34 + rand() * 18) * s;
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            ctx.moveTo(base.x, base.y - 50 * s);
            ctx.lineTo(base.x + Math.cos(a) * len, base.y - 50 * s + Math.sin(a) * len);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            ctx.arc(base.x + (rand() - 0.5) * 50 * s, top + (rand() - 0.2) * 30 * s, (3 + rand() * 3) * s, 0, Math.PI * 2);
            ctx.fill();
          }
          return;
        }
        // A round canopy of overlapping clumps, lit from the top left
        for (let k = 0; k < 10; k++) {
          ctx.fillStyle = look.canopy[k % look.canopy.length];
          const a = (k / 10) * Math.PI * 2;
          const dist = k === 9 ? 0 : 22 * s;
          ctx.beginPath();
          ctx.arc(base.x + Math.cos(a) * dist, top + Math.sin(a) * dist * 0.8, 26 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.13)";
        ctx.beginPath();
        ctx.arc(base.x - 12 * s, top - 14 * s, 16 * s, 0, Math.PI * 2);
        ctx.fill();
        if (season === "spring") {
          ctx.fillStyle = "#f6c1d2";
          for (let k = 0; k < 18; k++) {
            ctx.beginPath();
            ctx.arc(base.x + (rand() - 0.5) * 60 * s, top + (rand() - 0.5) * 50 * s, 2.4 * s, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
    });
  }

  for (const b of BUSHES) {
    const x = b.x * w;
    const d = b.d * depth;
    items.push({
      x,
      d,
      draw(ctx) {
        const p = v.project(x, d);
        const s = p.s;
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.ellipse(p.x + 6 * s, p.y + 2 * s, 28 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = season === "winter" ? "rgba(255,255,255,0.92)" : season === "autumn" ? "#8b8f3c" : "#5f9f46";
          ctx.beginPath();
          ctx.arc(p.x - 13 * s + k * 9 * s, p.y - 10 * s - (k % 2) * 5 * s, 12 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }
  return items;
}
