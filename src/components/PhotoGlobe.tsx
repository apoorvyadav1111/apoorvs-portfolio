"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Minus, Plus, RotateCcw } from "lucide-react";
import landDots from "@/data/globe-land.json";
import type { Photo } from "@/lib/photos";

// A spinning globe drawn from dots (or characters, with the Terminal font)
// with photos pinned at their approximate locations. Zoomed out they glow
// as points; zoom in and they become thumbnails that open the viewer.
// The side of the Earth in daylight right now is lit in sun-yellow.
//
// Projection: orthographic. A point's unit vector is rotated by `yaw`
// (around the vertical axis) then `pitch` (around the horizontal one);
// whatever ends up facing the viewer (z > 0) is drawn at (x, y).

type Vec = [number, number, number];

const DEG = Math.PI / 180;
const MIN_ZOOM = 1;
const MAX_ZOOM = 18;
const THUMBS_FROM = 2.4; // zoom at which photo points become thumbnails
const START = { lat: 37, lng: -112, zoom: 1 }; // the American West, where most photos are
const SPIN = 4 * DEG; // idle auto-spin, per second
const SHADES = 9; // brightness levels, light falls off toward the globe's edge
const CHARS = ".:-=+*#%@"; // one glyph per shade, for character mode
const CHAR_PX = 10; // character mode's text size; the grid cell is a little larger

const toVec = (lat: number, lng: number): Vec => {
  const p = lat * DEG;
  const l = lng * DEG;
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
};

// Land dots as unit vectors. The coarse set ships with the globe; the fine
// one (a more detailed coastline) loads the first time someone zooms in.
const toVectors = (d: number[]) => {
  const out = new Float32Array((d.length / 2) * 3);
  for (let i = 0, j = 0; i < d.length; i += 2, j += 3) {
    const [x, y, z] = toVec(d[i] / 10, d[i + 1] / 10);
    out[j] = x;
    out[j + 1] = y;
    out[j + 2] = z;
  }
  return out;
};
const LAND = toVectors(landDots as number[]);
const FINE_FROM = 1.8; // zoom at which the fine dots take over
let fineLand: Float32Array | null = null;
let fineLoading = false;
const loadFineLand = () => {
  if (fineLand || fineLoading) return;
  fineLoading = true;
  import("@/data/globe-land-fine.json")
    .then((m) => (fineLand = toVectors(m.default as number[])))
    .catch(() => (fineLoading = false));
};

interface Located {
  photo: Photo;
  vec: Vec;
}

interface Cluster {
  rep: number; // index into `placed` of the photo shown for the group
  members: number[];
  x: number;
  y: number;
}

// Where the sun is directly overhead right now, as a unit vector. NOAA's
// approximation: declination from the day of the year, longitude from UTC
// time plus the "equation of time". Good to about a degree.
function sunVector(date: Date): Vec {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24);
  const declination =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const equationOfTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  return toVec(declination / DEG, -15 * (hours - 12 + equationOfTime / 60));
}

const TWILIGHT = 0.1; // sun up to ~6° below the horizon still glows faintly

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export default function PhotoGlobe({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (photos: Photo[], index: number) => void;
}) {
  const placed: Located[] = useMemo(
    () =>
      photos
        .filter((p) => p.coords)
        .map((p) => ({ photo: p, vec: toVec(p.coords![0], p.coords![1]) })),
    [photos],
  );

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const badges = useRef<(HTMLSpanElement | null)[]>([]);
  // Everything the animation loop and handlers share; mutable, never rendered
  const state = useRef({
    yaw: -START.lng * DEG,
    pitch: START.lat * DEG,
    zoom: START.zoom,
    target: null as null | { yaw: number; pitch: number; zoom: number },
    vyaw: 0,
    vpitch: 0,
    lastInput: 0,
    dragged: false,
    clusters: [] as Cluster[],
    radius: 1,
    baseRadius: 1,
  });
  // The animation loop reads the latest list through a ref
  const placedRef = useRef(placed);
  useEffect(() => {
    placedRef.current = placed;
  }, [placed]);

  useEffect(() => {
    const el = wrap.current!;
    const cvs = canvas.current!;
    const ctx = cvs.getContext("2d")!;
    const s = state.current;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme colors and mode, refreshed whenever the Appearance menu changes them
    let colors = { muted: "#888", accent: "#f80", surface: "#222", line: "#333", sun: "#ffcc4d" };
    let charMode = false;
    let monoFont = "monospace";
    const readTheme = () => {
      const css = getComputedStyle(document.documentElement);
      const v = (n: string) => css.getPropertyValue(n).trim();
      const root = document.documentElement.dataset;
      // Sunlight: warm yellow, deeper on light backgrounds; Graphite stays monochrome
      const sun = root.palette === "graphite" ? v("--fg") : root.theme === "light" ? "#c98a00" : "#ffcc4d";
      colors = { muted: v("--muted"), accent: v("--accent"), surface: v("--surface"), line: v("--line"), sun };
      charMode = document.documentElement.dataset.font === "terminal";
      monoFont = v("--theme-mono") || "monospace";
      atlasKey = "";
    };
    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.documentElement, { attributes: true });

    // Character mode draws glyphs from a pre-rendered strip (much faster than fillText)
    const atlas = document.createElement("canvas");
    let atlasKey = "";
    let cell = 0;
    const buildAtlas = (px: number) => {
      const key = `${px}|${colors.muted}|${colors.sun}|${monoFont}`;
      if (key === atlasKey) return;
      atlasKey = key;
      cell = Math.ceil(px * 1.05);
      atlas.width = cell * CHARS.length;
      atlas.height = cell * 2; // row 0: night (muted), row 1: daylight (sun)
      const a = atlas.getContext("2d")!;
      a.clearRect(0, 0, atlas.width, atlas.height);
      a.font = `${px}px ${monoFont}`;
      a.textAlign = "center";
      a.textBaseline = "middle";
      [colors.muted, colors.sun].forEach((color, row) => {
        a.fillStyle = color;
        for (let i = 0; i < CHARS.length; i++) a.fillText(CHARS[i], i * cell + cell / 2, row * cell + cell / 2);
      });
    };
    readTheme();

    // Canvas sized to its box at device resolution
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      s.baseRadius = Math.min(w, h) * 0.44;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    // Scratch buffers for the visible dots, grouped by shade (grown for the fine
    // set). Buckets 0…SHADES-1 are night, shaded by how directly they face the
    // viewer; SHADES…2*SHADES-1 are daylight, shaded by how high the sun is.
    const BUCKETS = SHADES * 2;
    let n = LAND.length / 3;
    let bx = Array.from({ length: BUCKETS }, () => new Float32Array(n));
    let by = Array.from({ length: BUCKETS }, () => new Float32Array(n));
    const counts = new Int32Array(BUCKETS);
    let grid = new Int8Array(0); // character mode: brightest bucket per text cell
    let sun = sunVector(new Date());
    let sunAt = 0;

    const project = (v: Vec | Float32Array, o = 0) => {
      const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
      const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
      const x1 = v[o] * cy + v[o + 2] * sy;
      const z1 = -v[o] * sy + v[o + 2] * cy;
      const y2 = v[o + 1] * cp - z1 * sp;
      const z2 = v[o + 1] * sp + z1 * cp;
      return { x: w / 2 + s.radius * x1, y: h / 2 - s.radius * y2, z: z2 };
    };

    let last = performance.now();
    let frame = 0;
    let running = false;

    const draw = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      if (s.lastInput < 0) s.lastInput = now; // handlers flag input; the loop knows the time

      // Motion: fly-to animation, drag inertia, idle spin
      if (s.target) {
        const k = reduceMotion ? 1 : 1 - Math.pow(0.0015, dt);
        s.yaw += angleDiff(s.yaw, s.target.yaw) * k;
        s.pitch += (s.target.pitch - s.pitch) * k;
        s.zoom *= Math.pow(s.target.zoom / s.zoom, k);
        if (Math.abs(angleDiff(s.yaw, s.target.yaw)) < 1e-4 && Math.abs(s.target.zoom / s.zoom - 1) < 1e-3) s.target = null;
      } else if (!reduceMotion) {
        s.yaw += s.vyaw;
        s.pitch = clamp(s.pitch + s.vpitch, -85 * DEG, 85 * DEG);
        s.vyaw *= Math.pow(0.04, dt);
        s.vpitch *= Math.pow(0.04, dt);
        if (now - s.lastInput > 3000 && s.zoom < 1.6) s.yaw += SPIN * dt;
      }
      s.radius = s.baseRadius * s.zoom;

      const R = s.radius;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // The sphere itself: a faint disc and outline
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = colors.surface;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Land dots, front hemisphere only, brighter toward the middle
      if (s.zoom >= FINE_FROM) loadFineLand();
      const land = s.zoom >= FINE_FROM && fineLand ? fineLand : LAND;
      if (land.length / 3 > n) {
        n = land.length / 3;
        bx = Array.from({ length: BUCKETS }, () => new Float32Array(n));
        by = Array.from({ length: BUCKETS }, () => new Float32Array(n));
      }
      if (now - sunAt > 60_000) {
        sun = sunVector(new Date()); // the terminator moves ~1° every 4 minutes
        sunAt = now;
      }
      counts.fill(0);
      const cyw = Math.cos(s.yaw), syw = Math.sin(s.yaw);
      const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
      for (let i = 0; i < land.length; i += 3) {
        const x1 = land[i] * cyw + land[i + 2] * syw;
        const z1 = -land[i] * syw + land[i + 2] * cyw;
        const z2 = land[i + 1] * sp + z1 * cp;
        if (z2 <= 0.03) continue;
        const sx = w / 2 + R * x1;
        const sy = h / 2 - R * (land[i + 1] * cp - z1 * sp);
        if (sx < -8 || sx > w + 8 || sy < -8 || sy > h + 8) continue;
        // Height of the sun above this spot's horizon (sine of its elevation)
        const sunUp = land[i] * sun[0] + land[i + 1] * sun[1] + land[i + 2] * sun[2];
        const bucket =
          sunUp > -TWILIGHT
            ? SHADES + Math.min(SHADES - 1, Math.floor(Math.sqrt((sunUp + TWILIGHT) / (1 + TWILIGHT)) * SHADES))
            : Math.min(SHADES - 1, Math.floor(z2 * SHADES));
        bx[bucket][counts[bucket]] = sx;
        by[bucket][counts[bucket]++] = sy;
      }
      const size = land === LAND ? clamp(1.5 + s.zoom * 0.18, 1.5, 3) : clamp(1.2 + s.zoom * 0.12, 1.5, 3.5);
      if (charMode) {
        // ASCII art: snap to a fixed text grid, one glyph per cell, picked by
        // the brightest land in that cell; ocean inside the globe gets a dot
        buildAtlas(CHAR_PX);
        const cols = Math.ceil(w / cell);
        const rows = Math.ceil(h / cell);
        if (grid.length < cols * rows) grid = new Int8Array(cols * rows);
        grid.fill(-1, 0, cols * rows);
        for (let b = 0; b < BUCKETS; b++)
          for (let i = 0; i < counts[b]; i++) {
            const gx = Math.floor(bx[b][i] / cell);
            const gy = Math.floor(by[b][i] / cell);
            if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
            const k = gy * cols + gx;
            if (b > grid[k]) grid[k] = b;
          }
        for (let gy = 0; gy < rows; gy++)
          for (let gx = 0; gx < cols; gx++) {
            const b = grid[gy * cols + gx];
            const x = gx * cell;
            const y = gy * cell;
            if (b < 0) {
              if (Math.hypot(x + cell / 2 - w / 2, y + cell / 2 - h / 2) > R) continue;
              ctx.globalAlpha = 0.22;
              ctx.drawImage(atlas, 0, 0, cell, cell, x, y, cell, cell);
            } else if (b >= SHADES) {
              // Daylight: denser glyphs the higher the sun
              const lit = b - SHADES;
              ctx.globalAlpha = 0.45 + (0.55 * lit) / (SHADES - 1);
              ctx.drawImage(atlas, lit * cell, cell, cell, cell, x, y, cell, cell);
            } else {
              // Night: only the faint glyphs
              ctx.globalAlpha = 0.3 + (0.35 * b) / (SHADES - 1);
              ctx.drawImage(atlas, Math.min(b, 3) * cell, 0, cell, cell, x, y, cell, cell);
            }
          }
      } else {
        for (let b = 0; b < BUCKETS; b++) {
          const day = b >= SHADES;
          const shade = day ? b - SHADES : b;
          ctx.fillStyle = day ? colors.sun : colors.muted;
          ctx.globalAlpha = day ? 0.35 + (0.65 * shade) / (SHADES - 1) : 0.12 + (0.6 * shade) / (SHADES - 1);
          for (let i = 0; i < counts[b]; i++) ctx.fillRect(bx[b][i] - size / 2, by[b][i] - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;

      // Photos: group those too close to tell apart on screen
      const list = placedRef.current;
      const thumbs = s.zoom >= THUMBS_FROM;
      const thumbSize = clamp(40 + (s.zoom - THUMBS_FROM) * 4, 40, 84);
      const gap = thumbs ? thumbSize * 0.8 : 14;
      const clusters: Cluster[] = [];
      list.forEach((p, i) => {
        const pt = project(p.vec);
        // Behind the globe, or outside the frame when zoomed in
        if (pt.z <= 0.08 || pt.x < -60 || pt.x > w + 60 || pt.y < -60 || pt.y > h + 60) return;
        const near = clusters.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < gap);
        if (near) near.members.push(i);
        else clusters.push({ rep: i, members: [i], x: pt.x, y: pt.y });
      });
      s.clusters = clusters;

      if (!thumbs) {
        const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(now / 450);
        for (const c of clusters) {
          ctx.fillStyle = colors.accent;
          ctx.globalAlpha = 0.18 + 0.12 * pulse;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 9 + Math.min(c.members.length, 6) + 3 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Thumbnails are real buttons, positioned here rather than re-rendered
      const shown = new Map(thumbs ? clusters.map((c) => [c.rep, c] as const) : []);
      list.forEach((_, i) => {
        const m = markers.current[i];
        if (!m) return;
        const c = shown.get(i);
        if (!c) {
          if (m.style.display !== "none") {
            m.style.display = "none";
            m.tabIndex = -1;
          }
          return;
        }
        m.style.display = "block";
        m.tabIndex = 0;
        m.style.width = m.style.height = `${thumbSize}px`;
        m.style.transform = `translate(${c.x - thumbSize / 2}px, ${c.y - thumbSize / 2}px)`;
        const badge = badges.current[i];
        if (badge) {
          badge.textContent = c.members.length > 1 ? `+${c.members.length - 1}` : "";
          badge.style.display = c.members.length > 1 ? "block" : "none";
        }
      });

      if (running) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    // Only animate while on screen and the tab is visible
    let onScreen = false;
    const sync = () => (onScreen && document.visibilityState === "visible" ? start() : stop());
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    // Trackpad pinch (ctrl+wheel) zooms the globe instead of the page
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      s.target = null;
      s.zoom = clamp(s.zoom * Math.exp(-e.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
      s.lastInput = -1; // stamped by the animation loop
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      stop();
      io.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // --- Interaction -------------------------------------------------------

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; dist?: number; zoom?: number } | null>(null);

  const zoomTo = (zoom: number) => {
    const s = state.current;
    s.target = { yaw: s.yaw, pitch: s.pitch, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    s.lastInput = -1; // stamped by the animation loop
  };

  const flyTo = (vec: Vec, zoom: number) => {
    const s = state.current;
    const lat = Math.asin(vec[1]);
    const lng = Math.atan2(vec[0], vec[2]);
    s.target = { yaw: -lng, pitch: lat, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    s.vyaw = s.vpitch = 0;
    s.lastInput = -1; // stamped by the animation loop
  };

  const centroid = (members: number[]): Vec => {
    const sum = members.reduce<Vec>(
      (a, i) => {
        const v = placedRef.current[i].vec;
        return [a[0] + v[0], a[1] + v[1], a[2] + v[2]];
      },
      [0, 0, 0],
    );
    const len = Math.hypot(...sum) || 1;
    return [sum[0] / len, sum[1] / len, sum[2] / len];
  };

  // A group either zooms in to separate, or opens the viewer if its photos
  // are too close together to ever separate on screen.
  const openGroup = (members: number[]) => {
    const s = state.current;
    const list = placedRef.current;
    let spread = 0;
    for (const a of members)
      for (const b of members) {
        const va = list[a].vec, vb = list[b].vec;
        spread = Math.max(spread, Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]));
      }
    const zoomToSeparate = spread > 0 ? 90 / (spread * s.baseRadius) : Infinity;
    if (members.length === 1 || zoomToSeparate > MAX_ZOOM) {
      onOpen(members.map((i) => list[i].photo), 0);
    } else {
      flyTo(centroid(members), Math.max(s.zoom * 1.8, zoomToSeparate * 1.1, THUMBS_FROM * 1.2));
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Capturing a press that starts on a thumbnail would swallow its click
    if (!(e.target as HTMLElement).closest("button")) {
      try {
        wrap.current?.setPointerCapture(e.pointerId);
      } catch {
        // The pointer can already be gone (e.g. a very fast tap); harmless
      }
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = state.current;
    s.target = null;
    s.dragged = false;
    s.vyaw = s.vpitch = 0;
    s.lastInput = -1; // stamped by the animation loop
    const pts = [...pointers.current.values()];
    gesture.current =
      pts.length === 2
        ? { x: 0, y: 0, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom: s.zoom }
        : { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = state.current;
    const g = gesture.current;
    s.lastInput = -1; // stamped by the animation loop
    if (g.dist) {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      s.dragged = true;
      s.zoom = clamp((g.zoom! * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)) / g.dist, MIN_ZOOM, MAX_ZOOM);
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!s.dragged && Math.hypot(dx, dy) < 4) return;
    s.dragged = true;
    s.vyaw = dx / s.radius;
    s.vpitch = dy / s.radius;
    s.yaw += s.vyaw;
    s.pitch = clamp(s.pitch + s.vpitch, -85 * DEG, 85 * DEG);
    g.x = e.clientX;
    g.y = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const s = state.current;
    if (pointers.current.size === 1) {
      // Lifting one finger of a pinch continues as a drag with the other
      const [p] = [...pointers.current.values()];
      gesture.current = { x: p.x, y: p.y };
      return;
    }
    gesture.current = null;
    if (s.dragged || s.zoom >= THUMBS_FROM) return;
    // A tap on a glowing point zooms toward that place
    const r = wrap.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const hit = s.clusters.find((c) => Math.hypot(c.x - x, c.y - y) < 18);
    if (hit) openGroup(hit.members);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const s = state.current;
    const r = wrap.current!.getBoundingClientRect();
    const x1 = (e.clientX - r.left - r.width / 2) / s.radius;
    const y2 = (r.height / 2 - (e.clientY - r.top)) / s.radius;
    if (x1 * x1 + y2 * y2 >= 1) return;
    // Undo the projection to find the point on the globe that was clicked
    const z2 = Math.sqrt(1 - x1 * x1 - y2 * y2);
    const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
    const y = y2 * cp + z2 * sp;
    const z1 = -y2 * sp + z2 * cp;
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    flyTo([x1 * cy - z1 * sy, y, x1 * sy + z1 * cy], s.zoom * 2.5);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const s = state.current;
    const step = 10 * DEG / Math.sqrt(s.zoom);
    const keys: Record<string, () => void> = {
      ArrowLeft: () => (s.yaw += step),
      ArrowRight: () => (s.yaw -= step),
      ArrowUp: () => (s.pitch = clamp(s.pitch - step, -85 * DEG, 85 * DEG)),
      ArrowDown: () => (s.pitch = clamp(s.pitch + step, -85 * DEG, 85 * DEG)),
      "+": () => zoomTo(s.zoom * 1.6),
      "=": () => zoomTo(s.zoom * 1.6),
      "-": () => zoomTo(s.zoom / 1.6),
      "0": () => flyTo(toVec(START.lat, START.lng), START.zoom),
    };
    const action = keys[e.key];
    if (!action || (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    s.target = s.target && e.key.startsWith("Arrow") ? null : s.target;
    s.lastInput = -1; // stamped by the animation loop
    action();
  };

  const control =
    "grid h-9 w-9 place-items-center rounded-pill border border-line text-muted transition-colors hover:border-fg/40 hover:text-fg";

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "min(100%, 78vh)" }}>
      <div
        ref={wrap}
        tabIndex={0}
        role="application"
        aria-label="Photo globe. Drag or use arrow keys to spin, plus and minus to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        className="relative aspect-square w-full cursor-grab touch-none select-none overflow-hidden rounded-theme outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
      >
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        {placed.map(({ photo }, i) => (
          <button
            key={photo.src}
            ref={(el) => {
              markers.current[i] = el;
            }}
            tabIndex={-1}
            onClick={() => {
              const s = state.current;
              if (s.dragged) return;
              const group = s.clusters.find((c) => c.rep === i);
              openGroup(group ? group.members : [i]);
            }}
            aria-label={`${photo.title}${photo.location ? `, ${photo.location}` : ""}`}
            title={photo.location ? `${photo.title} · ${photo.location}` : photo.title}
            className="absolute left-0 top-0 rounded-full border-2 border-bg shadow-lg ring-2 ring-accent transition-[width,height] duration-200 hover:z-10 hover:scale-110"
            style={{ display: "none" }}
          >
            <span className="relative block h-full w-full overflow-hidden rounded-full">
              <Image src={photo.src} alt="" fill sizes="96px" className="photo object-cover" />
            </span>
            <span
              ref={(el) => {
                badges.current[i] = el;
              }}
              className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-accent-fg"
              style={{ display: "none" }}
            />
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          Drag to spin · pinch to zoom
        </p>
        <div className="flex gap-1.5">
          <button onClick={() => zoomTo(state.current.zoom / 1.8)} aria-label="Zoom out" className={control}>
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => zoomTo(state.current.zoom * 1.8)} aria-label="Zoom in" className={control}>
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => flyTo(toVec(START.lat, START.lng), START.zoom)}
            aria-label="Reset view"
            className={control}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[11px] text-muted">
        {placed.length} of {photos.length} photos placed · locations are approximate
      </p>
    </div>
  );
}
