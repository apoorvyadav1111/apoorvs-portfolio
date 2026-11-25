// The shapes the Signal cloud takes, one per section. Each fills a Float32Array
// with `n` points (x, y, z) inside roughly a unit sphere, y up. Points are
// shuffled, so when the cloud changes shape, any one point travels somewhere
// arbitrary, and the morph reads as a swarm rather than a slide.

//
// A shape is named by a string: one of the built-in ones below, or
// "text:<line>|<line>…" for words spelled out in points (the intro's slides).
// Text is laid out for the screen's shape (`aspect`, width / height), filling
// the middle of the screen when the cloud is centred (see field.ts).

export type Shape = string;

// The shapes that are flat on purpose (they face the reader rather than turn)
export const isText = (s: Shape) => s.startsWith("text:");

const TAU = Math.PI * 2;

// Seeded so a shape looks the same every time it's built
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(TAU * r());
}

// Points sampled from whatever `paint` draws on a 2D canvas, given depth
// (`depth` thick, more of them near the middle) so it has some body when it turns
function fromPainting(n: number, seed: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, depth = 0.16) {
  const w = 360;
  const h = 240;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  paint(ctx, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const lit: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) lit.push(x, y);
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const count = lit.length / 2;
  const scale = 2 / w;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * count) * 2;
    out[i * 3] = (lit[k] + r() - w / 2) * scale;
    out[i * 3 + 1] = -(lit[k + 1] + r() - h / 2) * scale;
    out[i * 3 + 2] = gauss(r) * depth * 0.5;
  }
  return out;
}

// The page's own font (next/font gives it a generated family name), loaded
async function font(variable: string, weight: number, size: number) {
  const family = getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || "sans-serif";
  const f = `${weight} ${size}px ${family}`;
  await document.fonts.load(f).catch(() => {});
  return f;
}

async function monogram(n: number) {
  const f = await font("--font-space-grotesk", 700, 187);
  return fromPainting(n, 1, (ctx, w, h) => {
    ctx.font = f;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AY", w / 2, h / 2 + h * 0.04);
  }, 0.22);
}

async function code(n: number) {
  const f = await font("--font-jetbrains", 600, 158);
  return fromPainting(n, 2, (ctx, w, h) => {
    ctx.font = f;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", w / 2, h / 2);
  }, 0.2);
}

function paw(n: number) {
  return fromPainting(n, 3, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 52, 44, 0, 0, TAU);
    ctx.fill();
    for (const [dx, dy, rot] of [[-70, -22, -0.5], [-26, -62, -0.15], [26, -62, 0.15], [70, -22, 0.5]]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + dy, 21, 28, rot, 0, TAU);
      ctx.fill();
    }
  }, 0.24);
}

// Services talking to each other: a few clusters joined by streams of points
function network(n: number) {
  const r = rng(4);
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const u = r() * 2 - 1;
    const a = r() * TAU;
    const rad = 0.55 + r() * 0.35;
    const s = Math.sqrt(1 - u * u);
    nodes.push([Math.cos(a) * s * rad * 1.25, u * rad * 0.8, Math.sin(a) * s * rad]);
  }
  nodes.push([0, 0, 0]);
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push([i, nodes.length - 1]);
    edges.push([i, (i + 1 + Math.floor(r() * 3)) % (nodes.length - 1)]);
  }
  const out = new Float32Array(n * 3);
  // A few points are packets: each sits on a node and travels an edge to
  // the next (the shader moves it), carrying information about
  const flow = new Float32Array(n * 4);
  const packets = Math.round(n * 0.006);
  for (let i = 0; i < n; i++) {
    let x: number, y: number, z: number;
    if (i < packets) {
      const e = edges[i % edges.length];
      const [a, b] = r() < 0.5 ? e : [e[1], e[0]];
      [x, y, z] = nodes[a];
      flow.set([nodes[b][0] - x, nodes[b][1] - y, nodes[b][2] - z, 1], i * 4);
    } else if (r() < 0.45) {
      const [nx, ny, nz] = nodes[Math.floor(r() * nodes.length)];
      const s = 0.05 + r() * 0.04;
      x = nx + gauss(r) * s;
      y = ny + gauss(r) * s;
      z = nz + gauss(r) * s;
    } else {
      const [a, b] = edges[Math.floor(r() * edges.length)];
      const t = r();
      const j = 0.012;
      x = nodes[a][0] + (nodes[b][0] - nodes[a][0]) * t + gauss(r) * j;
      y = nodes[a][1] + (nodes[b][1] - nodes[a][1]) * t + gauss(r) * j;
      z = nodes[a][2] + (nodes[b][2] - nodes[a][2]) * t + gauss(r) * j;
    }
    out.set([x, y, z], i * 3);
  }
  flows.set(out, flow);
  return out;
}

// An open book, its pages curving up from the spine, a few lifting as if turning
function book(n: number) {
  const r = rng(5);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const u = r(); // 0 at the spine, 1 at the edge
    const v = r() * 2 - 1;
    let x: number, y: number;
    if (r() < 0.18) {
      // A page mid-turn, standing up from the spine
      const lift = 0.35 + r() * 0.5;
      x = side * Math.cos(lift * Math.PI * 0.5) * u * 1.05;
      y = Math.sin(lift * Math.PI * 0.5) * u * 1.05 - 0.15;
    } else {
      x = side * u * 1.05;
      y = Math.sqrt(u) * 0.28 - 0.15 - (r() * 0.04);
    }
    out.set([x, y, v * 0.72], i * 3);
  }
  // Turn it to face the reader a little
  return tilt(out, -0.9, 0);
}

// A fanned stack of sheets
function pages(n: number) {
  const r = rng(6);
  const out = new Float32Array(n * 3);
  const sheets = 6;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * sheets);
    const a = (k - (sheets - 1) / 2) * 0.16;
    const px = (r() * 2 - 1) * 0.55;
    const py = (r() * 2 - 1) * 0.75;
    const z = (k - sheets / 2) * 0.07 + gauss(r) * 0.004;
    out.set([px * Math.cos(a) - py * Math.sin(a), px * Math.sin(a) + py * Math.cos(a), z], i * 3);
  }
  return tilt(out, 0.25, -0.35);
}

// The earth: continents dense (from the photo globe's land dots), oceans faint
async function globe(n: number) {
  const land: number[] = (await import("@/data/globe-land.json")).default;
  const r = rng(7);
  const out = new Float32Array(n * 3);
  const dots = land.length / 2;
  const R = 0.95;
  for (let i = 0; i < n; i++) {
    let lat: number, lng: number;
    if (r() < 0.88) {
      const k = Math.floor(r() * dots) * 2;
      lat = (land[k] / 10 + (r() - 0.5) * 1.4) * (Math.PI / 180);
      lng = (land[k + 1] / 10 + (r() - 0.5) * 1.4) * (Math.PI / 180);
    } else {
      lat = Math.asin(r() * 2 - 1);
      lng = r() * TAU;
    }
    const c = Math.cos(lat);
    out.set([Math.sin(lng) * c * R, Math.sin(lat) * R, Math.cos(lng) * c * R], i * 3);
  }
  return out;
}

// The intro's resting state: a churning shell with a dense core, a little
// lopsided (wider than tall, lumpy, the core off-centre) so you can see it
// turn. field.ts turns it on a tilted axis, jittering, while it's on screen.
function entity(n: number) {
  const r = rng(9);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1;
    const a = r() * TAU;
    const s = Math.sqrt(1 - u * u);
    const core = r() < 0.25;
    const lump = 1 + 0.11 * Math.sin(2 * a + 0.8) * s + 0.07 * u + 0.05 * Math.sin(3 * u + a);
    const rad = core ? Math.abs(gauss(r)) * 0.18 : 0.72 * lump + gauss(r) * 0.06;
    const [ox, oy] = core ? [0.06, -0.04] : [0, 0];
    out.set([Math.cos(a) * s * rad * 1.08 + ox, u * rad * 0.93 + oy, Math.sin(a) * s * rad], i * 3);
  }
  return out;
}

// Words in points. The first line is the title, the rest smaller; long lines
// wrap. Fits within the area a centred cloud fills on this screen: clip
// space is x·0.81/aspect, y·0.81 at scale 1 (see field.ts), and the text
// takes up to 82% of the width and 60% of the height, above any caption.
async function text(n: number, lines: string[], aspect: number, screenH: number) {
  const big = await font("--font-space-grotesk", 600, 140);
  const small = await font("--font-space-grotesk", 500, 70);
  const wrapAt = aspect > 1.2 ? 1500 : Math.max(720, 1500 * (aspect / 1.2));
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const rows: { text: string; font: string; size: number }[] = [];
  lines.forEach((line, i) => {
    const f = i === 0 ? big : small;
    const size = i === 0 ? 140 : 70;
    ctx.font = f;
    let row = "";
    for (const word of line.split(/\s+/)) {
      const next = row ? `${row} ${word}` : word;
      if (row && ctx.measureText(next).width > wrapAt) {
        rows.push({ text: row, font: f, size });
        row = word;
      } else row = next;
    }
    if (row) rows.push({ text: row, font: f, size });
  });
  let width = 0;
  for (const row of rows) {
    ctx.font = row.font;
    width = Math.max(width, ctx.measureText(row.text).width);
  }
  const gap = 1.25;
  const height = rows.reduce((h, row, i) => h + row.size * (i === 0 ? 1.1 : gap) + (i === 1 ? 30 : 0), 0);
  const W = Math.ceil(width) + 20;
  const H = Math.ceil(height) + 20;
  c.width = W;
  c.height = H;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  let y = 10;
  rows.forEach((row, i) => {
    ctx.font = row.font;
    if (i === 1) y += 30;
    ctx.fillText(row.text, W / 2, y);
    y += row.size * (i === 0 ? 1.1 : gap);
  });
  const data = ctx.getImageData(0, 0, W, H).data;
  const on = (x: number, y: number) => data[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 110;
  let lit = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 110) lit++;
  const k = Math.min((2 * 0.82 * aspect) / 0.81 / W, (2 * 0.6) / 0.81 / H);
  const r = rng(10);
  // One particle per spot, spread evenly over the letters (dropped purely
  // at random they clump and leave gaps, and read as grain) but each loose
  // within its spot, so it's a swarm rather than a grid. They sit GAP_PX
  // apart on screen, closer where the smallest line would get too few to
  // read (on a phone). The points left over hang around the words as a
  // faint haze; they're the only ones off the page plane (z ≠ 0), which is
  // how field.ts tells them apart.
  const perPx = (2.6 / 3.2) * (screenH / 2); // screen px per unit, centred at scale 1
  const smallest = Math.min(...rows.map((row) => row.size));
  const step = Math.max(Math.min(GAP_PX / perPx / k, smallest / 16), Math.sqrt(lit / n) * 1.05);
  const pts: number[] = [];
  // A spot counts wherever it touches a letter, so thin strokes don't break up
  const q = step * 0.3;
  const near = (x: number, y: number) =>
    on(x, y) || on(x - q, y) || on(x + q, y) || on(x, y - q) || on(x, Math.min(H - 1, y + q));
  for (let y = step / 2; y < H; y += step)
    for (let x = step / 2; x < W; x += step) {
      if (!near(x, y)) continue;
      let px = x;
      let py = y;
      for (let tries = 0; tries < 3; tries++) {
        const jx = x + (r() - 0.5) * step * 0.9;
        const jy = y + (r() - 0.5) * step * 0.9;
        if (on(jx, Math.min(H - 1, Math.max(0, jy)))) {
          px = jx;
          py = jy;
          break;
        }
      }
      pts.push(px, py);
    }
  const sites = Math.min(n, pts.length / 2);
  // Which points land on letters is shuffled, so a morph is a swarm
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out = new Float32Array(n * 3);
  order.forEach((i, rank) => {
    if (rank < sites) {
      out[i * 3] = (pts[rank * 2] - W / 2) * k;
      out[i * 3 + 1] = -(pts[rank * 2 + 1] - H / 2) * k;
      out[i * 3 + 2] = 0;
    } else {
      const j = Math.floor(r() * sites) * 2;
      out[i * 3] = (pts[j] - W / 2) * k + gauss(r) * 0.07;
      out[i * 3 + 1] = -(pts[j + 1] - H / 2) * k + gauss(r) * 0.05;
      const z = gauss(r) * 0.12;
      out[i * 3 + 2] = z + (z < 0 ? -0.002 : 0.002);
    }
  });
  textGap.set(out, step * k);
  return out;
}

// How far apart the particles on text sit on screen, in CSS px
const GAP_PX = 2.8;

// How far apart a text shape's particles are, so field.ts can size them
export const textGap = new WeakMap<Float32Array, number>();

// For shapes with packets (the network): per point, the way it travels
// (x, y, z) and whether it's a packet at all (w)
export const flows = new WeakMap<Float32Array, Float32Array>();

// A soft sphere with rings, for pages without a shape of their own
function orb(n: number) {
  const r = rng(8);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (r() < 0.6) {
      const u = r() * 2 - 1;
      const a = r() * TAU;
      const s = Math.sqrt(1 - u * u);
      const rad = 0.55 + gauss(r) * 0.015;
      out.set([Math.cos(a) * s * rad, u * rad, Math.sin(a) * s * rad], i * 3);
    } else {
      const a = r() * TAU;
      const ring = r() < 0.5 ? 0.85 : 1.02;
      const rad = ring + gauss(r) * 0.01;
      out.set([Math.cos(a) * rad, gauss(r) * 0.006, Math.sin(a) * rad], i * 3);
    }
  }
  return tilt(out, 0.42, 0.3);
}

function tilt(p: Float32Array, pitch: number, roll: number) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  for (let i = 0; i < p.length; i += 3) {
    let x = p[i], y = p[i + 1], z = p[i + 2];
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    [x, y] = [x * cr - y * sr, x * sr + y * cr];
    p[i] = x;
    p[i + 1] = y;
    p[i + 2] = z;
  }
  return p;
}

const BUILDERS: Record<Shape, (n: number) => Float32Array | Promise<Float32Array>> = {
  monogram,
  network,
  code,
  book,
  pages,
  globe,
  paw,
  orb,
  entity,
};

const cache = new Map<string, Promise<Float32Array>>();

// Text depends on the screen's shape and size, so it's cached per (rounded) both
export function buildShape(shape: Shape, n: number, aspect: number, screenH: number) {
  const a = Math.round(aspect * 10) / 10;
  const sh = Math.round(screenH / 50) * 50;
  const key = isText(shape) ? `${shape}@${a}x${sh}:${n}` : `${shape}:${n}`;
  if (!cache.has(key)) {
    const make = isText(shape)
      ? text(n, shape.slice(5).split("|"), a, sh)
      : Promise.resolve((BUILDERS[shape] ?? BUILDERS.orb)(n));
    cache.set(key, make);
  }
  return cache.get(key)!;
}
