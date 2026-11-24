// Signal's headings assemble out of particles: the first time a big heading
// scrolls into view, a swarm of dots flies in and settles into its letters,
// then the real text fades up underneath and the dots let go. The text is
// in the page all along (just faint while the dots arrive), so it's there
// for screen readers, search, and copying.

const SELECTOR = "main :is(h1, h2).display";
const FLY_MS = 1100;
const SETTLE_MS = 450;
const MAX_DOTS = 2600;

interface Dot {
  x: number; // page coordinates, so they scroll with the heading
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  delay: number; // 0–1, share of the flight spent waiting
  color: string;
}

interface Swarm {
  el: HTMLElement;
  dots: Dot[];
  start: number;
  step: number; // sampling step: dot size
}

// Every word in the heading, with where it sits and how it's set
function words(el: HTMLElement) {
  const out: { text: string; rect: DOMRect; font: string; color: string; spacing: string }[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const parent = node.parentElement!;
    const css = getComputedStyle(parent);
    const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    for (const m of text.matchAll(/\S+/g)) {
      range.setStart(node, m.index!);
      range.setEnd(node, m.index! + m[0].length);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0) out.push({ text: m[0], rect, font, color: css.color, spacing: css.letterSpacing });
    }
  }
  return out;
}

// Dots on the heading's letters, sampled from the words drawn onto a canvas
function sample(el: HTMLElement): { dots: Dot[]; step: number } {
  const box = el.getBoundingClientRect();
  const ws = words(el);
  if (!ws.length || box.width < 1) return { dots: [], step: 3 };
  const W = Math.ceil(box.width) + 4;
  const H = Math.ceil(box.height) + 4;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.textBaseline = "alphabetic";
  const colorAt: string[] = [];
  ws.forEach((w, i) => {
    ctx.font = w.font;
    if ("letterSpacing" in ctx && w.spacing !== "normal") (ctx as { letterSpacing: string }).letterSpacing = w.spacing;
    const m = ctx.measureText(w.text);
    const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    const baseline = w.rect.top - box.top + 2 + (w.rect.height + asc - desc) / 2;
    // Each word in its own red level, to remember its colour per pixel
    ctx.fillStyle = `rgb(${i + 1},0,0)`;
    ctx.fillText(w.text, w.rect.left - box.left + 2, baseline);
    colorAt[i + 1] = w.color;
  });
  const data = ctx.getImageData(0, 0, W, H).data;
  const size = parseFloat(getComputedStyle(el).fontSize) || 40;
  // Bigger type, coarser dots; never more than MAX_DOTS
  let step = Math.max(2, Math.round(size / 18));
  let lit = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 140) lit++;
  while (lit / (step * step) > MAX_DOTS) step++;
  const dots: Dot[] = [];
  const ox = box.left + scrollX - 2;
  const oy = box.top + scrollY - 2;
  const spread = Math.max(innerWidth, 600) * 0.5;
  for (let y = 0; y < H; y += step)
    for (let x = 0; x < W; x += step) {
      const k = (y * W + x) * 4;
      if (data[k + 3] <= 140) continue;
      const a = Math.random() * Math.PI * 2;
      const r = spread * (0.35 + Math.random() * 0.65);
      const tx = ox + x;
      const ty = oy + y;
      dots.push({
        x: tx, y: ty,
        sx: tx + Math.cos(a) * r, sy: ty + Math.sin(a) * r * 0.6,
        tx, ty,
        delay: Math.random() * 0.35 + (x / W) * 0.15,
        color: colorAt[data[k]] ?? "#fff",
      });
    }
  return { dots, step };
}

export function startType(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const root = document.documentElement;
  const done = new WeakSet<Element>();
  const swarms: Swarm[] = [];
  let frame = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  const tick = (now: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = swarms.length - 1; i >= 0; i--) {
      const s = swarms[i];
      const t = (now - s.start) / FLY_MS;
      if (t >= 1 && !s.el.hasAttribute("data-assembled")) s.el.setAttribute("data-assembled", "");
      const fade = t < 1 ? 1 : 1 - (now - s.start - FLY_MS) / SETTLE_MS;
      if (fade <= 0) {
        s.el.removeAttribute("data-assembling");
        s.el.removeAttribute("data-assembled");
        swarms.splice(i, 1);
        continue;
      }
      const r = Math.max(1, s.step * 0.55);
      ctx.globalAlpha = Math.max(0, fade);
      let last = "";
      for (const d of s.dots) {
        const p = ease(Math.min(1, Math.max(0, (t - d.delay) / (1 - d.delay))));
        // A little swirl on the way in
        const swirl = Math.sin(p * Math.PI) * 30;
        d.x = d.sx + (d.tx - d.sx) * p + swirl;
        d.y = d.sy + (d.ty - d.sy) * p - swirl * 0.4;
        if (d.color !== last) ctx.fillStyle = last = d.color;
        ctx.fillRect(d.x - scrollX - r / 2, d.y - scrollY - r / 2, r, r);
      }
    }
    ctx.globalAlpha = 1;
    frame = swarms.length ? requestAnimationFrame(tick) : 0;
  };

  const assemble = (el: HTMLElement) => {
    if (done.has(el)) return;
    done.add(el);
    const { dots, step } = sample(el);
    if (!dots.length) return;
    el.setAttribute("data-assembling", "");
    swarms.push({ el, dots, start: performance.now(), step });
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        observer.unobserve(e.target);
        // Wait for the layout to settle (fonts, reveal) before sampling
        requestAnimationFrame(() => assemble(e.target as HTMLElement));
      }
    },
    { threshold: 0.6 },
  );
  const watch = () => {
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
      if (!done.has(el)) observer.observe(el);
    });
  };
  // Pages change without a reload; new headings arrive with them
  const pages = new MutationObserver(watch);
  document.fonts.ready.then(() => {
    watch();
    pages.observe(document.body, { childList: true, subtree: true });
  });
  addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    pages.disconnect();
    removeEventListener("resize", resize);
    for (const s of swarms) {
      s.el.removeAttribute("data-assembling");
      s.el.removeAttribute("data-assembled");
    }
    root.querySelectorAll("[data-assembling]").forEach((el) => el.removeAttribute("data-assembling"));
  };
}
