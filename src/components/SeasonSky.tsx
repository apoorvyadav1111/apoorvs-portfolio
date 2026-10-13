"use client";

import { useEffect, useRef } from "react";
import { THEMES } from "@/themes";
import { drawBlossom, drawPetal } from "./blossom";
import { featureOn } from "@/lib/features";

// A few particles drifting across the page while a theme with `particles` is
// on (the seasonal themes): leaves, snow, petals or fireflies. Kept sparse and
// faint so they never compete with the text; off for reduced motion, paused
// while the tab is hidden.
//
// Whatever falls onto the footer's top edge settles there in a small pile
// (fireflies land and keep glowing). Moving the mouse or a finger through the
// pile kicks it back into the air.
//
// Once a pile builds up, a tool appears at the end of the footer's edge: a rake
// for leaves, a shovel for snow, a broom for petals, a jar for fireflies. Pick
// it up and sweep to clear the pile for good (Esc or the button puts it down).
// Beside it there's a blower (not for fireflies): it blows the way you move,
// clearing the pile from a distance and pushing falling things sideways.

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
  gone?: boolean; // swept away by the tool: never settles again
  life?: number; // swept pieces fade out over a second
}

// Particles per 1440×900 of screen
const DENSITY: Record<Kind, number> = { leaves: 12, snow: 30, petals: 14, fireflies: 16 };
const COLUMN = 8; // px; the pile's height is tracked per column
const MAX_PIECES = 110;
const MAX_HEIGHT = 22; // px; deeper than this and things fall behind the footer
const MAX_FIREFLIES = 6;
const KICK_REACH = 38; // px around the pointer
const TOOL_FROM = 12; // pieces in the pile before the tool turns up (fireflies: 4)
const TOOL_REACH = 30; // px around the tool's head
const BLOW_REACH = 190; // px of air in front of the blower's nozzle
const BLOWER_ICON =
  '<rect x="2" y="9" width="10" height="8" rx="2"/><path d="M12 12h6l3-2v6l-3-2h-6"/><path d="M5 17v3h4v-3"/><path d="M7 9V6h3"/>';

const TOOLS: Record<Kind, { name: string; icon: string }> = {
  leaves: { name: "rake", icon: '<path d="M18 2 6 17"/><path d="M2 15l8 6"/><path d="M3 16l-1.5 2.5M5.5 17.8 4 20.3M8 19.7l-1.5 2.5"/>' },
  snow: { name: "shovel", icon: '<path d="M20 2 11 11"/><path d="M17 1l5 5"/><path d="m11 11-2-2-6 6c-1.5 1.5 0 4.5 3 6l6-6z"/>' },
  petals: { name: "broom", icon: '<path d="M20 2 12 10"/><path d="m9 9 6 6"/><path d="M9 9c-3 1-6 5-7 12 7-1 11-4 12-7z"/><path d="M5 15l-2 4M8 17l-3 4"/>' },
  fireflies: { name: "jar", icon: '<rect x="6" y="2" width="12" height="3" rx="1"/><path d="M7 5v2c-2 1-3 2.5-3 5v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7c0-2.5-1-4-3-5V5"/><circle cx="10" cy="14" r="1"/><circle cx="14" cy="12" r="1"/><circle cx="13" cy="17" r="1"/>' },
};

// The visitor's speed setting from the Appearance menu (`data-weather` on <html>):
// how fast things fall, and how many there are
const WEATHER = {
  slow: { speed: 0.5, density: 1 },
  normal: { speed: 1, density: 1 },
  fast: { speed: 2, density: 1.6 },
};
type Weather = keyof typeof WEATHER | "off";

const TOOL_BUTTON =
  "fixed z-30 hidden h-9 w-9 place-items-center rounded-full border border-line bg-bg text-muted shadow-sm transition-colors hover:border-accent hover:text-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-fg";

export default function SeasonSky() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const toolButton = useRef<HTMLButtonElement>(null);
  const toolNote = useRef<HTMLSpanElement>(null);
  const blowerRef = useRef<HTMLButtonElement>(null);

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
    let speed = 1;
    let palette: string[] = [];
    const weather = () => (root.dataset.weather ?? "normal") as Weather;
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
    const shape = (x: number, y: number, p: Particle | Piece, t: number, resting: boolean, fade = 1) => {
      ctx.fillStyle = p.color;
      const spin = "rot" in p ? p.rot : t * p.spin * 0.3 + p.phase;
      if (kind === "snow") {
        if (resting) {
          // Settled snow: low, wide mounds that merge into a layer
          ctx.globalAlpha = (0.8) * fade;
          ctx.beginPath();
          ctx.ellipse(x, y, p.size * 1.1, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        // A six-armed flake, slowly turning; bigger ones get little branches
        ctx.globalAlpha = (0.6) * fade;
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
        ctx.globalAlpha = (0.15 + 0.6 * pulse) * fade;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Leaves and petals tumble, narrowing as they turn edge-on. Whole
        // blossoms mostly float flat; resting ones lie seen at an angle.
        ctx.globalAlpha = (kind === "leaves" ? (resting ? 0.75 : 0.55) : resting ? 0.85 : 0.7) * fade;
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
      if (tool) return false; // cleaning up: nothing new settles meanwhile
      const surface = edge - heights[column(p.x)];
      if (kind === "fireflies") return Math.abs(p.y - (edge - 3)) < 2 && settle(p.x, p);
      return p.y >= surface && p.y < edge + 30 && settle(p.x, p);
    };

    // Kicked pieces fly up, fall back and settle again
    const updatePile = (dt: number) => {
      pile = pile.filter((piece) => {
        if (!piece.flying) return true;
        if (piece.gone) {
          piece.vy += 300 * dt;
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
          piece.rot += piece.spin * dt;
          piece.life = (piece.life ?? 1) - dt * 1.2;
          // Caught fireflies drift into the jar
          if (kind === "fireflies" && pointer) {
            piece.x += (pointer.x - piece.x) * Math.min(1, dt * 6);
            piece.y += (pointer.y - 10 - piece.y) * Math.min(1, dt * 6);
          }
          return piece.life > 0;
        }
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
      if (!frame || edge > h) return;
      if (tool === "blower") {
        if (Math.abs(dx) > 1) facing = Math.sign(dx);
        return;
      }
      if (tool) return sweep(x, y, dx);
      if (Math.hypot(dx, dy) < 2) return;
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
    const onPointer = (e: PointerEvent) => {
      kick(e.clientX, e.clientY);
      // Holding a tool over the pile: the tool is the cursor
      if (tool && e.pointerType === "mouse") root.style.cursor = nearPile(e.clientY) ? "none" : "";
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      // Sweeping with a finger shouldn't scroll the page
      if (tool && nearPile(t.clientY) && e.cancelable) e.preventDefault();
      kick(t.clientX, t.clientY);
    };

    // ---- The tool ----
    let tool: null | "hand" | "blower" = null;
    let swept = 0;
    let facing = -1; // the blower's nozzle: -1 left, 1 right
    const button = toolButton.current!;
    const blowerButton = blowerRef.current!;
    const note = toolNote.current!;
    const nearPile = (y: number) => y > edge - 120 && y < edge + 40;
    const resting = () => pile.reduce((n, p) => n + (p.flying ? 0 : 1), 0);

    const label = (el: HTMLButtonElement, name: string, on: boolean) => {
      el.setAttribute("aria-pressed", String(on));
      el.setAttribute("aria-label", on ? `Put down the ${name}` : `Pick up the ${name} and clear the pile`);
      el.title = on ? `Put down the ${name} (Esc)` : `Clear the pile with the ${name}`;
    };
    const hold = (which: typeof tool) => {
      tool = which;
      if (!which) root.style.cursor = "";
      label(button, kind ? TOOLS[kind].name : "tool", which === "hand");
      label(blowerButton, kind === "snow" ? "snow blower" : "leaf blower", which === "blower");
    };

    // Put the tool away once the pile is gone
    const checkClear = () => {
      if (!swept || resting() > 0) return;
      hold(null);
      note.textContent = kind === "fireflies" ? `${swept} fireflies caught ✓` : `All clear · ${swept} swept ✓`;
      note.style.opacity = "1";
      setTimeout(() => (note.style.opacity = "0"), 2200);
      swept = 0;
    };

    const sweep = (x: number, y: number, dx: number) => {
      for (const piece of pile) {
        if (piece.flying) continue;
        const py = edge - piece.y;
        // The head reaches a little further up than across, for deeper piles
        if (Math.hypot((piece.x - x) / TOOL_REACH, (py - (y + 8)) / (TOOL_REACH * 1.3)) > 1) continue;
        const c = column(piece.x);
        heights[c] = Math.max(0, heights[c] - piece.thick);
        piece.flying = true;
        piece.gone = true;
        piece.life = 1;
        piece.y = py;
        const dir = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
        piece.vx = dir * (260 + Math.random() * 220) + dx * 12;
        piece.vy = -(60 + Math.random() * 140);
        piece.spin = (Math.random() - 0.5) * 10;
        swept++;
      }
      checkClear();
    };

    // The blower: a cone of air from the nozzle, the way you last moved
    const inCone = (x: number, y: number, tipX: number, tipY: number) => {
      const ahead = (x - tipX) * facing;
      if (ahead < 0 || ahead > BLOW_REACH || Math.abs(y - tipY) > 14 + ahead * 0.4) return 0;
      return 1 - ahead / BLOW_REACH;
    };
    const blow = (x: number, y: number, dt: number) => {
      const tipX = x + facing * 30;
      const tipY = y + 4;
      for (const piece of pile) {
        if (piece.flying) continue;
        const strength = inCone(piece.x, edge - piece.y, tipX, tipY);
        if (!strength) continue;
        const c = column(piece.x);
        heights[c] = Math.max(0, heights[c] - piece.thick);
        piece.flying = true;
        piece.gone = true;
        piece.life = 1;
        piece.y = edge - piece.y;
        piece.vx = facing * (350 + 450 * strength + Math.random() * 100);
        piece.vy = -(80 + Math.random() * 200) * (0.4 + strength);
        piece.spin = (Math.random() - 0.5) * 14;
        swept++;
      }
      // Things still falling get pushed sideways too
      for (const p of particles) {
        const strength = inCone(p.x, p.y, tipX, tipY);
        if (!strength) continue;
        p.x += facing * 520 * strength * dt;
        p.y -= 140 * strength * dt;
      }
      checkClear();
    };

    // The blower, with streaks of air rushing out of the nozzle
    const drawBlower = (x: number, y: number, t: number) => {
      const css = getComputedStyle(root);
      const fg = css.getPropertyValue("--fg").trim();
      const accent = css.getPropertyValue("--accent").trim();
      ctx.save();
      ctx.translate(x, y + 4);
      ctx.scale(facing, 1);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([7, 9]);
      ctx.lineDashOffset = -t * 260;
      ctx.beginPath();
      for (const k of [-0.3, -0.1, 0.1, 0.3]) {
        ctx.moveTo(32, 0);
        ctx.lineTo(32 + BLOW_REACH * 0.8, BLOW_REACH * 0.8 * k);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Body, handle and nozzle
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.roundRect(-14, -9, 20, 16, 4);
      ctx.fill();
      ctx.strokeStyle = fg;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, -9);
      ctx.lineTo(-4, -16);
      ctx.lineTo(4, -16);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(28, -3);
      ctx.lineTo(32, -6);
      ctx.lineTo(32, 6);
      ctx.lineTo(28, 3);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // The tool itself, drawn where the pointer is
    const drawTool = (x: number, y: number) => {
      if (!kind) return;
      const css = getComputedStyle(root);
      const fg = css.getPropertyValue("--fg").trim();
      const accent = css.getPropertyValue("--accent").trim();
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(x, y + 8);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = fg;
      ctx.lineWidth = 2.5;
      if (kind !== "fireflies") {
        // Handle, leaning back up and to the right
        ctx.beginPath();
        ctx.moveTo(4, -6);
        ctx.lineTo(34, -64);
        ctx.stroke();
      }
      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (kind === "leaves") {
        // Rake: a bar with tines
        ctx.moveTo(-14, -4);
        ctx.lineTo(18, -10);
        for (let i = 0; i <= 5; i++) {
          const tx = -14 + i * 6.4;
          const ty = -4 - i * 1.2;
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - 1, ty + 8);
        }
        ctx.stroke();
      } else if (kind === "snow") {
        // Shovel: a wide scoop
        ctx.moveTo(-12, 2);
        ctx.lineTo(14, 2);
        ctx.lineTo(10, -10);
        ctx.lineTo(-8, -10);
        ctx.closePath();
        ctx.globalAlpha = 0.85;
        ctx.fill();
      } else if (kind === "petals") {
        // Broom: a fan of bristles
        ctx.moveTo(0, -10);
        ctx.lineTo(-14, 4);
        ctx.lineTo(12, 4);
        ctx.closePath();
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -10; i <= 9; i += 4) {
          ctx.moveTo(i * 0.3, -8);
          ctx.lineTo(i, 4);
        }
        ctx.stroke();
      } else {
        // Jar: glows brighter with every firefly caught
        ctx.globalAlpha = Math.min(0.15 + swept * 0.12, 0.8);
        ctx.shadowColor = css.getPropertyValue("--sun").trim();
        ctx.shadowBlur = 8 + swept * 2;
        ctx.fillStyle = ctx.shadowColor;
        ctx.fillRect(-9, -22, 18, 20);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = fg;
        ctx.strokeRect(-10, -24, 20, 23);
        ctx.fillStyle = fg;
        ctx.fillRect(-11, -28, 22, 4);
      }
      ctx.restore();
    };

    // The button sits on the footer's edge, at the right, once there's a pile
    const placeButton = () => {
      const show = kind !== null && edge < h - 20 && (tool !== null || (resting() >= (kind === "fireflies" ? 4 : TOOL_FROM) && featureOn("eggs")));
      button.style.display = show ? "grid" : "none";
      blowerButton.style.display = show && kind !== "fireflies" ? "grid" : "none";
      note.style.top = blowerButton.style.top = button.style.top = `${edge - 46}px`;
    };

    const onToolClick = () => hold(tool === "hand" ? null : "hand");
    const onBlowerClick = () => hold(tool === "blower" ? null : "blower");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && tool && hold(null);
    button.addEventListener("click", onToolClick);
    blowerButton.addEventListener("click", onBlowerClick);
    addEventListener("keydown", onKey);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      edge = footer ? footer.getBoundingClientRect().top : Infinity;

      for (const p of particles) {
        if (kind === "fireflies") {
          p.x += Math.cos(t * 0.3 + p.phase) * p.speed * speed * dt;
          p.y += Math.sin(t * 0.4 + p.phase * 1.3) * p.speed * speed * dt;
          // A slow drift too, so over time they wander the whole page (and
          // some find the footer)
          p.x += p.spin * 8 * speed * dt;
          p.y += p.sway * 0.15 * (p.phase > Math.PI ? 1 : -1) * speed * dt;
          if (p.y < -20) p.y = h + 10;
        } else {
          p.y += p.speed * speed * dt;
          p.x += Math.cos(t * 0.8 + p.phase) * p.sway * speed * dt;
        }
        if (edge < h && landed(p)) Object.assign(p, spawn(kind === "fireflies", [p.color]));
        if (p.y > h + 20) Object.assign(p, spawn(false, [p.color]));
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        shape(p.x, p.y, p, t, false);
      }

      placeButton();
      if (edge < h + 40) {
        updatePile(dt);
        for (const piece of pile) {
          const y = piece.flying ? piece.y : edge - piece.y;
          if (y > -20 && y < h + 20) shape(piece.x, y, piece, t, !piece.flying, piece.life ?? 1);
        }
      }
      if (tool && pointer && nearPile(pointer.y)) {
        if (tool === "blower") {
          blow(pointer.x, pointer.y, dt);
          drawBlower(pointer.x, pointer.y, t);
        } else drawTool(pointer.x, pointer.y);
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const target = (wx: keyof typeof WEATHER) =>
      Math.max(4, Math.round((DENSITY[kind!] * WEATHER[wx].density * (w * h)) / (1440 * 900)));

    // A new speed setting: adjust in place, keeping what's on screen and the pile
    const onWeather = () => {
      const wx = weather();
      if (wx === "off" || !frame) return start();
      speed = WEATHER[wx].speed;
      const n = target(wx);
      if (n < particles.length) particles = particles.slice(0, n);
      while (particles.length < n) particles.push(spawn(false, palette));
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      hold(null);
      button.style.display = blowerButton.style.display = "none";
      ctx.clearRect(0, 0, w, h);
    };

    const start = () => {
      stop();
      const theme = THEMES.find((t) => t.id === root.dataset.palette);
      kind = theme?.particles ?? null;
      hold(null);
      const svg = (icon: string) =>
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;
      if (kind) button.innerHTML = svg(TOOLS[kind].icon);
      blowerButton.innerHTML = svg(BLOWER_ICON);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wx = weather();
      if (!kind || reduce || document.hidden || wx === "off") return;
      resize();
      palette = colors();
      gold = getComputedStyle(root).getPropertyValue("--sun").trim();
      speed = WEATHER[wx].speed;
      particles = Array.from({ length: target(wx) }, () => spawn(true, palette));
      pile = [];
      heights = new Array(Math.ceil(w / COLUMN) + 1).fill(0);
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };

    start();
    // Theme or light/dark changes, and tab visibility
    const observer = new MutationObserver(start);
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette", "data-theme"] });
    const weatherObserver = new MutationObserver(onWeather);
    weatherObserver.observe(root, { attributes: true, attributeFilter: ["data-weather"] });
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
    addEventListener("touchmove", onTouch, { passive: false });
    addEventListener("resize", onResize);

    return () => {
      stop();
      observer.disconnect();
      weatherObserver.disconnect();
      document.removeEventListener("visibilitychange", start);
      removeEventListener("resize", onResize);
      removeEventListener("pointermove", onPointer);
      removeEventListener("touchmove", onTouch);
      button.removeEventListener("click", onToolClick);
      blowerButton.removeEventListener("click", onBlowerClick);
      removeEventListener("keydown", onKey);
      root.style.cursor = "";
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />
      {/* The clean-up tools; shown, placed and labelled by the effect above */}
      <button ref={blowerRef} aria-pressed="false" className={`${TOOL_BUTTON} right-15 sm:right-17`} />
      <button ref={toolButton} aria-pressed="false" className={`${TOOL_BUTTON} right-4 sm:right-6`} />
      <span
        ref={toolNote}
        aria-live="polite"
        className="pointer-events-none fixed right-27 z-30 -mt-0.5 whitespace-nowrap py-2 font-mono text-xs text-accent opacity-0 transition-opacity duration-500 sm:right-29"
      />
    </>
  );
}
