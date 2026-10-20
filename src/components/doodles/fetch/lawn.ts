import type { Season } from "@/themes";

// The garden fetch is played in, seen from above and drawn once into its own
// canvas (redrawn only when the size, season or light/dark changes): a
// striped lawn, a stepping-stone path, a pond, trees and bushes round the
// edges, and the season's touches: blossom and flowers in spring, deep green
// in summer, fallen leaves and turning trees in autumn, snow and bare
// branches in winter. Night darkens it.

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

const LOOK: Record<Season, { grass: string; stripe: string; canopy: string[]; path: string; water: string }> = {
  spring: { grass: "#8fc46e", stripe: "#9ccd7c", canopy: ["#6fae58", "#86bf68"], path: "#d8c9a6", water: "#6fa9c9" },
  summer: { grass: "#7cb356", stripe: "#88bd61", canopy: ["#4f8f3c", "#5f9f46"], path: "#d9c7a0", water: "#5f9fc4" },
  autumn: { grass: "#a3ad5e", stripe: "#adb768", canopy: ["#d9772c", "#e8a33a", "#b9462c"], path: "#cdb892", water: "#6b98ad" },
  winter: { grass: "#e8edf1", stripe: "#f1f4f7", canopy: [], path: "#cfd6dd", water: "#bcd4e3" },
};

export function drawLawn(ctx: CanvasRenderingContext2D, w: number, h: number, season: Season, night: boolean) {
  const look = LOOK[season];
  const rand = seeded(Math.round(w) * 7 + Math.round(h));

  // Grass, mown in broad stripes, with speckles so it isn't flat
  ctx.fillStyle = look.grass;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = look.stripe;
  for (let x = 0; x < w; x += 140) ctx.fillRect(x, 0, 70, h);
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  if (season === "winter") {
    // Grass poking through the snow
    ctx.strokeStyle = "rgba(90,120,80,0.45)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < (w * h) / 6000; i++) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y - 5);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y - 5);
      ctx.stroke();
    }
  }

  // A stepping-stone path across the lawn
  ctx.strokeStyle = look.path;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 46;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-20, h * 0.85);
  ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.45, h * 0.35, w + 20, h * 0.18);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.path;
  for (let t = 0.04; t < 1; t += 0.055) {
    const x = (1 - t) ** 3 * -20 + 3 * (1 - t) ** 2 * t * w * 0.3 + 3 * (1 - t) * t * t * w * 0.45 + t ** 3 * (w + 20);
    const y = (1 - t) ** 3 * h * 0.85 + 3 * (1 - t) ** 2 * t * h * 0.7 + 3 * (1 - t) * t * t * h * 0.35 + t ** 3 * h * 0.18;
    ctx.beginPath();
    ctx.ellipse(x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8, 13, 10, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // The pond (frozen in winter), with lily pads
  const px = w * 0.8;
  const py = h * 0.62;
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(px + 4, py + 5, 96, 58, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.water;
  ctx.beginPath();
  ctx.ellipse(px, py, 92, 55, -0.15, 0, Math.PI * 2);
  ctx.fill();
  if (season === "winter") {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 40, py - 10);
    ctx.lineTo(px - 5, py + 6);
    ctx.lineTo(px + 30, py - 4);
    ctx.moveTo(px - 5, py + 6);
    ctx.lineTo(px + 4, py + 30);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(px - 30, py - 20, 26, 6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy] of [[30, 10], [-15, 18], [48, -12]]) {
      ctx.fillStyle = "#4f8f3c";
      ctx.beginPath();
      ctx.arc(px + dx, py + dy, 7, 0.4, Math.PI * 2);
      ctx.lineTo(px + dx, py + dy);
      ctx.fill();
      if (season === "spring" || season === "summer") {
        ctx.fillStyle = "#f4b3c6";
        ctx.beginPath();
        ctx.arc(px + dx + 2, py + dy - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Flowers in spring and summer; fallen leaves in autumn
  if (season !== "winter") {
    const n = season === "autumn" ? 140 : season === "spring" ? 90 : 50;
    for (let i = 0; i < n; i++) {
      const x = rand() * w;
      const y = rand() * h;
      if (Math.hypot((x - px) / 100, (y - py) / 62) < 1) continue;
      if (season === "autumn") {
        ctx.fillStyle = look.canopy[Math.floor(rand() * look.canopy.length)];
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 2, rand() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = ["#ffffff", "#f7d34a", "#f4b3c6", "#b9a7f0"][Math.floor(rand() * 4)];
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#e8a33a";
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Bushes, then trees, round the edges of the garden (seen from above:
  // round canopies with a shadow, or bare branches in winter)
  const tree = (x: number, y: number, r: number) => {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y + r * 0.45, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    if (season === "winter") {
      ctx.strokeStyle = "#6b5440";
      ctx.lineCap = "round";
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + rand();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const bx = x + Math.cos(a) * r * 0.9;
        const by = y + Math.sin(a) * r * 0.9;
        ctx.lineTo(bx, by);
        ctx.lineWidth = 1.5;
        ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5);
        ctx.lineTo(bx + Math.cos(a + 0.6) * r * 0.25, by + Math.sin(a + 0.6) * r * 0.25);
        ctx.stroke();
      }
      ctx.fillStyle = "#6b5440";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      // Snow caught on it
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.arc(x + (rand() - 0.5) * r * 1.2, y + (rand() - 0.5) * r * 1.2, 3 + rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = look.canopy[k % look.canopy.length];
      const a = (k / 9) * Math.PI * 2;
      const d = k === 8 ? 0 : r * 0.45;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    if (season === "spring") {
      // Blossom
      ctx.fillStyle = "#f6c1d2";
      for (let k = 0; k < 18; k++) {
        ctx.beginPath();
        ctx.arc(x + (rand() - 0.5) * r * 1.5, y + (rand() - 0.5) * r * 1.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const bush = (x: number, y: number) => {
    if (season === "winter") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 6, 24, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = season === "autumn" ? "#8b8f3c" : "#5f9f46";
      ctx.beginPath();
      ctx.arc(x - 12 + k * 8, y + (k % 2) * 4 - 2, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  bush(w * 0.12, h * 0.22);
  bush(w * 0.52, h * 0.08);
  bush(w * 0.93, h * 0.92);
  bush(w * 0.06, h * 0.6);
  tree(w * 0.04, h * 0.06, 70);
  tree(w * 0.97, h * 0.2, 80);
  tree(w * 0.33, h * 0.98, 64);
  tree(w * 0.66, h * 0.02, 52);

  if (night) {
    ctx.fillStyle = "rgba(10, 16, 34, 0.35)";
    ctx.fillRect(0, 0, w, h);
  }
}
