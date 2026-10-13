// One-off celebrations, one per theme, for the easter eggs in EasterEggs.tsx.
// Everything is drawn in a temporary overlay that removes itself when done.
import { drawBlossom, drawPetal } from "./blossom";

type Shape = "leaf" | "circle" | "petal" | "splat" | "spark" | "flake";

interface Burst {
  shape: Shape;
  colors: string[];
  count: number;
  from: "bottom" | "top" | "center";
  gravity: number; // px/s²
  spread: number; // initial speed, px/s
  drag: number; // fraction of speed kept per second
  life: number; // ms
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function overlay(tag: "canvas" | "div") {
  const el = document.createElement(tag);
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none" });
  document.body.appendChild(el);
  return el;
}

function burst(b: Burst) {
  const canvas = overlay("canvas") as HTMLCanvasElement;
  const dpr = Math.min(devicePixelRatio, 2);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: b.count }, () => {
    const angle =
      b.from === "bottom"
        ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6
        : b.from === "top"
          ? Math.PI / 2 + (Math.random() - 0.5) * 0.6
          : Math.random() * Math.PI * 2;
    const speed = b.spread * (0.4 + Math.random() * 0.8);
    return {
      x: b.from === "center" ? w / 2 : b.from === "top" ? Math.random() * w : w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: b.from === "bottom" ? h + 10 : b.from === "top" ? -20 - Math.random() * h * 0.5 : h / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 8,
      color: b.colors[Math.floor(Math.random() * b.colors.length)],
    };
  });

  const gold = cssVar("--sun"); // blossom centres
  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    const age = now - start;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, (b.life - age) / 600);
    const keep = Math.pow(b.drag, dt);
    for (const p of parts) {
      p.vx *= keep;
      p.vy = p.vy * keep + b.gravity * dt;
      p.x += p.vx * dt + (b.shape === "leaf" || b.shape === "petal" ? Math.sin(age / 300 + p.rot) * 0.6 : 0);
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      draw(ctx, b.shape, p, gold);
    }
    if (age < b.life) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

function draw(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  p: { x: number; y: number; size: number; rot: number; color: string },
  gold: string,
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  ctx.beginPath();
  const s = p.size;
  switch (shape) {
    case "leaf":
      ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(p.rot)));
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s, s, 0);
      ctx.quadraticCurveTo(0, s, -s, 0);
      ctx.fill();
      break;
    case "petal":
      // Mostly loose petals, with the odd whole blossom
      if (s > 9.5) drawBlossom(ctx, s * 1.4, gold);
      else drawPetal(ctx, s);
      break;
    case "splat": {
      // An ink dot with a few droplets
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + p.rot;
        ctx.moveTo(Math.cos(a) * s * 1.6, Math.sin(a) * s * 1.6);
        ctx.arc(Math.cos(a) * s * 1.6, Math.sin(a) * s * 1.6, s * 0.3, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    }
    case "spark":
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();
      break;
    case "flake":
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.moveTo(-s * 0.7, 0);
        ctx.lineTo(s * 0.7, 0);
      }
      ctx.stroke();
      break;
    default:
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

// Swiss: a grid rules itself across the page, then lifts
function grid() {
  const el = overlay("div");
  const accent = cssVar("--accent");
  const cols = 12;
  const rows = 8;
  const lines: string[] = [];
  for (let i = 1; i < cols; i++)
    lines.push(
      `<span style="position:absolute;top:0;bottom:0;left:${(i / cols) * 100}%;width:1px;background:${accent};transform-origin:top;animation:egg-rule-y .5s ${i * 40}ms cubic-bezier(.83,0,.17,1) both"></span>`,
    );
  for (let i = 1; i < rows; i++)
    lines.push(
      `<span style="position:absolute;left:0;right:0;top:${(i / rows) * 100}%;height:1px;background:${accent};transform-origin:left;animation:egg-rule-x .5s ${i * 50}ms cubic-bezier(.83,0,.17,1) both"></span>`,
    );
  el.innerHTML = lines.join("");
  el.style.animation = "egg-fade-out .5s 1.6s both";
  setTimeout(() => el.remove(), 2200);
}

// Graphite: the shutter closes, the flash goes off
function flash() {
  const el = overlay("div");
  el.innerHTML = `
    <span style="position:absolute;left:0;right:0;top:0;height:50%;background:#000;transform-origin:top;animation:egg-shutter .35s both"></span>
    <span style="position:absolute;left:0;right:0;bottom:0;height:50%;background:#000;transform-origin:bottom;animation:egg-shutter .35s both"></span>
    <span style="position:absolute;inset:0;background:#fff;animation:egg-flash .9s .3s both"></span>`;
  setTimeout(() => el.remove(), 1400);
}

// Gazette: a rubber stamp slams onto the page
function stamp() {
  const el = overlay("div");
  Object.assign(el.style, { display: "grid", placeItems: "center" });
  el.innerHTML = `<span style="font-family:var(--theme-display),serif;font-weight:900;font-size:clamp(2.5rem,9vw,7rem);line-height:1;letter-spacing:-0.02em;color:var(--accent);border:6px double var(--accent);padding:.15em .35em;text-transform:uppercase;background:color-mix(in oklab,var(--bg) 70%,transparent);animation:egg-stamp 2.2s cubic-bezier(.2,.9,.3,1.2) both">Extra! Extra!</span>`;
  setTimeout(() => el.remove(), 2300);
}

export function celebrate() {
  const theme = document.documentElement.dataset.palette;
  const accent = cssVar("--accent");
  const sun = cssVar("--sun");
  const fg = cssVar("--fg");
  const muted = cssVar("--muted");

  switch (theme) {
    case "riso":
      return burst({ shape: "splat", colors: [accent, fg], count: 70, from: "center", gravity: 400, spread: 900, drag: 0.3, life: 2600 });
    case "swiss":
      return grid();
    case "graphite":
      return flash();
    case "gazette":
      return stamp();
    case "frost":
      return burst({ shape: "flake", colors: [fg, accent], count: 140, from: "top", gravity: 30, spread: 60, drag: 0.8, life: 5000 });
    case "bloom":
      return burst({ shape: "petal", colors: [accent, "#f4b3c6", "#f9d0dc"], count: 90, from: "bottom", gravity: 320, spread: 1900, drag: 0.5, life: 4200 });
    case "solstice":
      return burst({ shape: "spark", colors: [sun, accent], count: 110, from: "center", gravity: 120, spread: 1000, drag: 0.2, life: 2600 });
    // Trail and Harvest: an armful of leaves thrown into the air
    default:
      return burst({ shape: "leaf", colors: [accent, sun, muted], count: 80, from: "bottom", gravity: 320, spread: 1900, drag: 0.5, life: 4500 });
  }
}
