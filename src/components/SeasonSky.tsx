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
//
// In spring and summer, grass grows along the footer's edge while you're on
// the page; once it's long, a lawnmower turns up to cut it (it grows back).
//
// In zen mode (/zen, data-zen on <html>) things land on the landscape's ground
// rather than the footer, there are more of them, bigger and slower, the tools
// stay away, and the pointer leaves a soft trail that stirs them like wind.
//
// During a timelapse (src/lib/timelapse.ts) the seasons hand over instead of
// resetting: what's falling finishes its fall while new arrivals are the next
// season's, snow on the footer melts, fireflies fade, leaves stay to be buried
// by the first snow and rot away in spring (petals likewise, a season later),
// and the grass withers or sprouts.

type Kind = NonNullable<(typeof THEMES)[number]["particles"]>;

interface Particle {
  kind: Kind; // each keeps its own season, so seasons can mix in a timelapse
  x: number;
  y: number;
  size: number;
  speed: number; // px per second, downward (fireflies wander instead)
  sway: number; // sideways amplitude
  phase: number;
  spin: number;
  color: string;
  whole: boolean; // petals: a whole blossom rather than a single petal
  fade?: number; // fireflies out of season fade away
  dead?: boolean; // nothing to replace it with (the timelapse ended on a plain theme)
}

// Something resting on the footer, or kicked off it and flying
interface Piece {
  kind: Kind;
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
  life?: number; // swept pieces fade out over a second; melting ones slower
  making?: boolean; // fading to make room on a full pile
}

// Each kind's season, in the order the year goes
const ORDER: Kind[] = ["petals", "fireflies", "leaves", "snow"];

// How many of each fall at once, per 1440×900 of screen (it scales with the
// window). The visitor's speed setting multiplies this (WEATHER below), as
// does zen mode (ZEN_DENSITY). Lower these for a quieter page.
const DENSITY: Record<Kind, number> = { leaves: 8, snow: 18, petals: 9, fireflies: 12 };
const ZEN_DENSITY = 1.25;
const COLUMN = 8; // px; the pile's height is tracked per column
const MAX_PIECES = 110;
const MAX_HEIGHT = 22; // px; deeper than this and things fall behind the footer
const MAX_FIREFLIES = 6;
const KICK_REACH = 38; // px around the pointer
const TOOL_FROM = 12; // pieces in the pile before the tool turns up (fireflies: 4)
const TOOL_REACH = 30; // px around the tool's head
const BLOW_REACH = 190; // px of air in front of the blower's nozzle
// Grass: one blade every few px, growing from freshly mown to long
const GRASS_GAP = 4;
const GRASS_CUT = 2.5; // px, just mown
const GRASS_LONG = 7; // px on average before the mower turns up
const GRASS_MAX = 16;
const GRASS_GROWTH = 4 / 60; // px per second: a few px a minute
const MOWER_ICON =
  '<path d="M3 15h13l2-4h-9"/><circle cx="6" cy="18" r="2"/><circle cx="15" cy="18" r="2"/><path d="M18 11l3-7"/>';
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
  const mowerRef = useRef<HTMLButtonElement>(null);

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
    let speed = 1;
    const weather = () => (root.dataset.weather ?? "normal") as Weather;
    let pile: Piece[] = [];
    let heights: number[] = [];
    let grass: number[] = []; // blade heights, empty when the season has none
    let clippings: { x: number; y: number; vx: number; vy: number; life: number; rot: number }[] = [];
    let mowed = 0;
    const grassy = () => kind === "petals" || kind === "fireflies";
    // Fresh lawn (`sprout`: just coming up, as spring arrives in a timelapse)
    const plant = (sprout = false) => {
      grass = grassy()
        ? Array.from({ length: Math.ceil(w / GRASS_GAP) + 1 }, () =>
            sprout ? 0.3 + Math.random() * 0.6 : GRASS_CUT + Math.random() * 1.5,
          )
        : [];
      clippings = [];
    };
    const grassAverage = () => (grass.length ? grass.reduce((a, b) => a + b, 0) / grass.length : 0);
    let edge = Infinity; // where things land: the footer's top (zen: the ground's), in viewport px
    const zen = () => root.hasAttribute("data-zen");
    // Zen ignores "off": the particles are the point of it
    const weatherNow = (): Weather => (zen() && weather() === "off" ? "normal" : weather());
    // The pointer's trail and the gust it makes, in zen
    let trail: { x: number; y: number; age: number }[] = [];
    const gust = { x: 0, y: 0, vx: 0, vy: 0 };

    // Colours come from each kind's own theme, so a season's particles keep
    // theirs while the page blends into the next
    const paletteOf = (k: Kind) => {
      const p = THEMES.find((t) => t.particles === k)![root.dataset.theme === "light" ? "light" : "dark"];
      return { ...p, sun: p.sun ?? p.fg };
    };
    const colors = (k: Kind) => {
      const p = paletteOf(k);
      if (k === "leaves") return [p.accent, p.sun, p.muted];
      // Blossom pinks: the theme's own, plus two soft ones
      if (k === "petals") return [p.accent, "#f4b3c6", "#f9d0dc"];
      if (k === "snow") return [p.fg];
      return [p.sun];
    };

    // What new arrivals are: the coming season's while a timelapse blends
    const arriving = (): Kind | null => {
      const next = root.dataset.seasonNext;
      if (next) return THEMES.find((t) => t.id === next)?.particles ?? null;
      return kind;
    };

    const spawn = (anywhere: boolean, k: Kind): Particle => {
      const palette = colors(k);
      return {
        kind: k,
        x: Math.random() * w,
        y: anywhere || k === "fireflies" ? Math.random() * h : -20,
        size: (k === "snow" ? 4 + Math.random() * 4 : k === "fireflies" ? 1.5 + Math.random() * 1.5 : 7 + Math.random() * 6) * (zen() ? 1.25 : 1),
        speed: k === "snow" ? 15 + Math.random() * 25 : k === "fireflies" ? 8 + Math.random() * 10 : 20 + Math.random() * 25,
        sway: k === "snow" ? 10 : 30 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2,
        color: palette[Math.floor(Math.random() * palette.length)],
        whole: k === "petals" && Math.random() < 0.3,
      };
    };
    // Replaces a particle that fell off the page or landed, or retires it
    const renew = (p: Particle, anywhere: boolean) => {
      const k = arriving();
      if (k) Object.assign(p, spawn(anywhere || k === "fireflies", k), { fade: undefined });
      else p.dead = true;
    };

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
      const kind = p.kind;
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
          drawBlossom(ctx, p.size * 1.6, paletteOf("petals").sun);
        } else {
          drawPetal(ctx, p.size);
        }
        ctx.restore();
      }
    };

    // A resting angle: roughly flat, either way round
    const lying = () => (Math.random() - 0.5) * 0.9 + (Math.random() < 0.5 ? 0 : Math.PI);

    const column = (x: number) => Math.max(0, Math.min(heights.length - 1, Math.floor(x / COLUMN)));

    // Adds something to the pile where it landed. A full pile turns over
    // rather than letting things fall through: the oldest piece fades to make
    // room, and a deep spot stops growing taller.
    const settle = (x: number, from: Particle | Piece) => {
      const fireflies = from.kind === "fireflies";
      const same = fireflies ? pile.filter((p) => p.kind === "fireflies") : pile;
      const room = same.filter((p) => !p.flying && !p.making).length;
      if (room >= (fireflies ? MAX_FIREFLIES : MAX_PIECES)) {
        const oldest = same.find((p) => !p.flying && !p.making);
        if (oldest) oldest.making = true;
      }
      const c = column(x);
      const full = heights[c] >= MAX_HEIGHT;
      const thick = fireflies || full ? 0 : from.size * (from.kind === "snow" ? 0.3 : 0.35);
      pile.push({
        kind: from.kind,
        x,
        y: Math.min(heights[c], MAX_HEIGHT) + thick * 0.5,
        vx: 0,
        vy: 0,
        rot: fireflies || from.kind === "snow" ? 0 : lying(),
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
      if (p.fade !== undefined) return false;
      if (p.kind === "fireflies") return Math.abs(p.y - (edge - 3)) < 2 && settle(p.x, p);
      return p.y >= surface && p.y < edge + 30 && settle(p.x, p);
    };

    // Kicked pieces fly up, fall back and settle again
    const updatePile = (dt: number) => {
      pile = pile.filter((piece) => {
        if (!piece.flying && piece.making) {
          piece.life = (piece.life ?? 1) - dt * 0.8;
          if (piece.life > 0) return true;
          const c = column(piece.x);
          heights[c] = Math.max(0, heights[c] - piece.thick);
          return false;
        }
        if (!piece.flying) {
          // Out of season (a timelapse moved on): snow melts and fireflies
          // leave as soon as theirs ends; leaves and petals linger one more
          // season (autumn leaves under the winter snow) and then rot away
          const age = kind ? (ORDER.indexOf(kind) - ORDER.indexOf(piece.kind) + 4) % 4 : 4;
          const lingers = piece.kind === "leaves" || piece.kind === "petals";
          if (age < (lingers ? 2 : 1)) return true;
          piece.life = (piece.life ?? 1) - dt * (lingers ? 0.1 : 0.35) * speed;
          if (piece.life > 0) return true;
          const c = column(piece.x);
          heights[c] = Math.max(0, heights[c] - piece.thick);
          return false;
        }
        if (piece.gone) {
          piece.vy += 300 * dt;
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
          piece.rot += piece.spin * dt;
          piece.life = (piece.life ?? 1) - dt * 1.2;
          // Caught fireflies drift into the jar
          if (piece.kind === "fireflies" && pointer) {
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
      if (tool === "blower" || tool === "mower") {
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
    const stirAt = (x: number, y: number) => {
      if (!zen()) return;
      if (trail.length) {
        const lastPoint = trail[trail.length - 1];
        gust.vx = (x - lastPoint.x) * 14;
        gust.vy = (y - lastPoint.y) * 14;
      }
      gust.x = x;
      gust.y = y;
      trail.push({ x, y, age: 0 });
      if (trail.length > 40) trail.shift();
    };
    const onPointer = (e: PointerEvent) => {
      stirAt(e.clientX, e.clientY);
      kick(e.clientX, e.clientY);
      // Holding a tool over the pile: the tool is the cursor
      if (tool && e.pointerType === "mouse") root.style.cursor = nearPile(e.clientY) ? "none" : "";
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      // Sweeping with a finger shouldn't scroll the page
      if (((tool && nearPile(t.clientY)) || zen()) && e.cancelable) e.preventDefault();
      stirAt(t.clientX, t.clientY);
      kick(t.clientX, t.clientY);
    };

    // ---- The tool ----
    let tool: null | "hand" | "blower" | "mower" = null;
    let swept = 0;
    let facing = -1; // the blower's nozzle: -1 left, 1 right
    const button = toolButton.current!;
    const blowerButton = blowerRef.current!;
    const mowerButton = mowerRef.current!;
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
      label(mowerButton, "lawnmower", which === "mower");
      mowerButton.setAttribute("aria-label", which === "mower" ? "Put down the lawnmower" : "Mow the grass");
      mowerButton.title = which === "mower" ? "Put down the lawnmower (Esc)" : "Mow the grass";
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

    // ---- The lawn ----
    const growGrass = (dt: number) => {
      if (!grassy()) {
        // Autumn and winter in a timelapse: the lawn withers away
        for (let i = 0; i < grass.length; i++) grass[i] = Math.max(0, grass[i] - 1.2 * speed * dt);
        if (grass.length && grass.every((g) => g < 0.3)) grass = [];
        return;
      }
      if (!grass.length) plant(true);
      // Sprouting fast in a timelapse, so there's a lawn before the season ends
      const rate = root.dataset.timelapse ? 1.2 : GRASS_GROWTH;
      for (let i = 0; i < grass.length; i++)
        if (grass[i] < GRASS_MAX) grass[i] += rate * speed * dt * (0.6 + ((i * 7) % 5) / 6);
    };

    const drawGrass = (t: number) => {
      // Spring is fresh green; summer a deeper, sun-bleached one
      const shades = !grassy() ? ["#a08c58", "#857247"] : kind === "petals" ? ["#6cb34f", "#4f9a3c"] : ["#7d9a3e", "#5f7f33"];
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let s = 0; s < 2; s++) {
        ctx.strokeStyle = shades[s];
        ctx.beginPath();
        for (let i = s; i < grass.length; i += 2) {
          const x = i * GRASS_GAP + ((i * 13) % 3);
          const len = grass[i];
          const sway = Math.sin(t * 1.4 + i * 0.6) * len * 0.15;
          ctx.moveTo(x, edge);
          ctx.quadraticCurveTo(x + sway * 0.4, edge - len * 0.6, x + sway, edge - len);
        }
        ctx.stroke();
      }
      // Clippings
      ctx.strokeStyle = shades[0];
      for (const c of clippings) {
        ctx.globalAlpha = Math.max(0, c.life);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.cos(c.rot) * 3, c.y + Math.sin(c.rot) * 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const updateClippings = (dt: number) => {
      clippings = clippings.filter((c) => {
        c.vy += 500 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += 8 * dt;
        c.life -= dt * 1.4;
        return c.life > 0;
      });
    };

    // Cuts the grass under the mower's deck, throwing clippings out the side;
    // petals in the way get mulched
    const mow = (x: number) => {
      for (let i = Math.max(0, Math.floor((x - 22) / GRASS_GAP)); i <= Math.min(grass.length - 1, (x + 22) / GRASS_GAP); i++) {
        if (grass[i] <= GRASS_CUT + 0.5) continue;
        grass[i] = GRASS_CUT + Math.random() * 0.5;
        mowed++;
        if (clippings.length < 160)
          clippings.push({
            x: i * GRASS_GAP,
            y: edge - 4,
            vx: -facing * (60 + Math.random() * 160),
            vy: -(80 + Math.random() * 180),
            life: 1,
            rot: Math.random() * Math.PI,
          });
      }
      for (const piece of pile) {
        if (piece.flying || Math.abs(piece.x - x) > 22) continue;
        const c = column(piece.x);
        heights[c] = Math.max(0, heights[c] - piece.thick);
        Object.assign(piece, { flying: true, gone: true, life: 0.6, y: edge - piece.y, vx: -facing * 120, vy: -160, spin: 12 });
      }
      if (mowed > 20 && grass.every((g) => g <= GRASS_CUT + 0.6)) {
        hold(null);
        note.textContent = "Lawn mowed ✓";
        note.style.opacity = "1";
        setTimeout(() => (note.style.opacity = "0"), 2200);
        mowed = 0;
      }
    };

    const drawMower = (x: number) => {
      const css = getComputedStyle(root);
      const fg = css.getPropertyValue("--fg").trim();
      const accent = css.getPropertyValue("--accent").trim();
      ctx.save();
      // Rolls along the edge, wherever the pointer is up or down
      ctx.translate(x, edge);
      ctx.scale(facing, 1);
      ctx.globalAlpha = 1;
      // Handle, trailing behind
      ctx.strokeStyle = fg;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.lineTo(-34, -40);
      ctx.lineTo(-40, -40);
      ctx.stroke();
      // Deck and engine
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(-20, -14, 40, 10, 4);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.roundRect(-8, -21, 16, 8, 3);
      ctx.fill();
      // Wheels
      for (const wx of [-13, 13]) {
        ctx.beginPath();
        ctx.arc(wx, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // The buttons sit on the footer's edge, at the right, right to left:
    // the season's tool, the blower, the mower (whichever are on offer)
    const placeButton = () => {
      const visible = edge < h - 20 && kind !== null && !zen();
      const pileReady = resting() >= (kind === "fireflies" ? 4 : TOOL_FROM) && featureOn("eggs");
      const lawnReady = grassy() && grass.length > 0 && grassAverage() >= GRASS_LONG && featureOn("eggs");
      const shown: HTMLElement[] = [];
      const showIf = (el: HTMLElement, on: boolean) => {
        el.style.display = on ? "grid" : "none";
        if (on) shown.push(el);
      };
      const toolsOut = tool === "hand" || tool === "blower" || (tool === null && pileReady);
      showIf(button, visible && toolsOut);
      showIf(blowerButton, visible && toolsOut && kind !== "fireflies");
      showIf(mowerButton, visible && (tool === "mower" || (tool === null && lawnReady)));
      const base = innerWidth >= 640 ? 24 : 16;
      shown.forEach((el, i) => {
        el.style.right = `${base + i * 44}px`;
        el.style.top = `${edge - 46}px`;
      });
      note.style.right = `${base + Math.max(shown.length, 1) * 44 + 4}px`;
      note.style.top = `${edge - 46}px`;
    };

    const onToolClick = () => hold(tool === "hand" ? null : "hand");
    const onBlowerClick = () => hold(tool === "blower" ? null : "blower");
    const onMowerClick = () => hold(tool === "mower" ? null : "mower");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && tool && hold(null);
    button.addEventListener("click", onToolClick);
    blowerButton.addEventListener("click", onBlowerClick);
    mowerButton.addEventListener("click", onMowerClick);
    addEventListener("keydown", onKey);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const ground = document.querySelector("[data-ground]") ?? document.querySelector("footer");
      edge = ground ? ground.getBoundingClientRect().top : Infinity;

      const coming = arriving();
      for (const p of particles) {
        if (p.kind === "fireflies") {
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
        // Zen: the pointer's gust pushes whatever it passes
        const gx = p.x - gust.x;
        const gy = p.y - gust.y;
        const near = gx * gx + gy * gy;
        if (near < 120 * 120) {
          const f = 1 - Math.sqrt(near) / 120;
          p.x += gust.vx * f * dt;
          p.y += gust.vy * f * 0.6 * dt;
        }
        // Out of season, things fade rather than linger: fireflies (they never
        // fall off the page) as soon as the next season blends in, anything
        // older than the season just ending once it's gone
        if ((p.kind === "fireflies" && coming !== "fireflies") || (p.kind !== kind && p.kind !== coming)) {
          p.fade = (p.fade ?? 1) - dt * 0.45;
          if (p.fade <= 0) renew(p, false);
        }
        if (edge < h && landed(p)) renew(p, p.kind === "fireflies");
        if (p.y > h + 20) renew(p, false);
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        if (!p.dead) shape(p.x, p.y, p, t, false, p.fade ?? 1);
      }
      if (particles.some((p) => p.dead)) particles = particles.filter((p) => !p.dead);

      placeButton();
      growGrass(dt);
      if (edge < h + 40) {
        updateClippings(dt);
        if (grass.length) drawGrass(t);
        updatePile(dt);
        for (const piece of pile) {
          const y = piece.flying ? piece.y : edge - piece.y;
          if (y > -20 && y < h + 20) shape(piece.x, y, piece, t, !piece.flying, piece.life ?? 1);
        }
      }
      // Zen: the pointer's trail, fading behind it
      if (trail.length) {
        for (const pt of trail) pt.age += dt;
        trail = trail.filter((pt) => pt.age < 0.8);
        const fg = (kind ? paletteOf(kind) : { fg: "#888888" }).fg;
        ctx.strokeStyle = fg;
        ctx.lineCap = "round";
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1];
          const b = trail[i];
          const life = 1 - b.age / 0.8;
          ctx.globalAlpha = 0.28 * life;
          ctx.lineWidth = 1 + 3 * life;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      gust.vx *= Math.pow(0.02, dt);
      gust.vy *= Math.pow(0.02, dt);

      if (tool && pointer && nearPile(pointer.y)) {
        if (tool === "blower") {
          blow(pointer.x, pointer.y, dt);
          drawBlower(pointer.x, pointer.y, t);
        } else if (tool === "mower") {
          mow(pointer.x);
          drawMower(pointer.x);
        } else drawTool(pointer.x, pointer.y);
      }
      ctx.globalAlpha = 1;
      // A timelapse ended on a plain theme: stop once the last of it is gone
      if (!kind && !particles.length && !pile.length && !grass.length && !clippings.length) return stop();
      frame = requestAnimationFrame(draw);
    };

    const target = (wx: keyof typeof WEATHER, k = kind) =>
      k ? Math.max(4, Math.round((DENSITY[k] * WEATHER[wx].density * (zen() ? ZEN_DENSITY : 1) * (w * h)) / (1440 * 900))) : 0;

    // A new speed setting: adjust in place, keeping what's on screen and the pile
    const onWeather = () => {
      const wx = weatherNow();
      if (wx === "off" || !frame) return start();
      speed = WEATHER[wx].speed * (zen() ? 0.7 : 1);
      const n = target(wx);
      if (n < particles.length) particles = particles.slice(0, n);
      while (kind && particles.length < n) particles.push(spawn(false, kind));
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      hold(null);
      button.style.display = blowerButton.style.display = mowerButton.style.display = "none";
      ctx.clearRect(0, 0, w, h);
    };

    const svg = (icon: string) =>
      `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;

    // A new theme during a timelapse: hand over to the next season in place
    const handOver = () => {
      kind = THEMES.find((t) => t.id === root.dataset.palette)?.particles ?? null;
      hold(null);
      if (kind) {
        button.innerHTML = svg(TOOLS[kind].icon);
        const wx = weatherNow();
        const n = target(wx === "off" ? "normal" : wx);
        while (particles.length < n) particles.push(spawn(false, kind));
      }
    };
    const onPalette = () => (root.dataset.timelapse && frame ? handOver() : start());

    const start = () => {
      stop();
      const theme = THEMES.find((t) => t.id === root.dataset.palette);
      kind = theme?.particles ?? null;
      hold(null);
      if (kind) button.innerHTML = svg(TOOLS[kind].icon);
      blowerButton.innerHTML = svg(BLOWER_ICON);
      mowerButton.innerHTML = svg(MOWER_ICON);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wx = weatherNow();
      if (!kind || reduce || document.hidden || wx === "off") return;
      resize();
      speed = WEATHER[wx].speed * (zen() ? 0.7 : 1);
      particles = Array.from({ length: target(wx) }, () => spawn(true, kind!));
      pile = [];
      heights = new Array(Math.ceil(w / COLUMN) + 1).fill(0);
      plant();
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };

    start();
    // Theme or light/dark changes, and tab visibility
    const observer = new MutationObserver(onPalette);
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette"] });
    const modeObserver = new MutationObserver(start);
    modeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-zen"] });
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
        w = innerWidth;
        plant();
      }
      resize();
    };
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("touchmove", onTouch, { passive: false });
    addEventListener("resize", onResize);

    return () => {
      stop();
      observer.disconnect();
      modeObserver.disconnect();
      weatherObserver.disconnect();
      document.removeEventListener("visibilitychange", start);
      removeEventListener("resize", onResize);
      removeEventListener("pointermove", onPointer);
      removeEventListener("touchmove", onTouch);
      button.removeEventListener("click", onToolClick);
      blowerButton.removeEventListener("click", onBlowerClick);
      mowerButton.removeEventListener("click", onMowerClick);
      removeEventListener("keydown", onKey);
      root.style.cursor = "";
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />
      {/* The clean-up tools; shown, placed and labelled by the effect above */}
      {/* Placed right to left by placeButton() */}
      <button ref={mowerRef} aria-pressed="false" className={TOOL_BUTTON} />
      <button ref={blowerRef} aria-pressed="false" className={TOOL_BUTTON} />
      <button ref={toolButton} aria-pressed="false" className={TOOL_BUTTON} />
      <span
        ref={toolNote}
        aria-live="polite"
        className="pointer-events-none fixed z-30 -mt-0.5 whitespace-nowrap py-2 font-mono text-xs text-accent opacity-0 transition-opacity duration-500"
      />
    </>
  );
}
