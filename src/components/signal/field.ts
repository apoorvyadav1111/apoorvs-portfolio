// The Signal cloud: tens of thousands of points drawn with WebGL, morphing
// from one shape (./shapes.ts) to the next. Each point has its own head
// start and its own detour, so a morph scatters and re-forms rather than
// sliding.
//
// Two ways to move it:
//   scrub(a, b, t)  the intro: the cloud sits centre stage and scrolling
//                   drives it, t = 0 is shape a, t = 1 is shape b. Scroll back
//                   and it plays backwards.
//   show(shape)     the rest of the site: it morphs on its own, over
//                   MORPH_MS, off to the side and faint (or centre stage).
// Text faces the reader; the "entity" swirls and jitters like something
// alive; other shapes turn or sway and lean toward the pointer, and points
// near the pointer get pushed aside.
//
// With motion off (reduced motion or the console), it draws one still frame
// whenever the shape changes, and nothing in between.

import { buildShape, textGap, isText, type Shape } from "./shapes";

const MORPH_MS = 1700;
const SPREAD = 0.45; // how far apart the first and last points set off, as a fraction of the morph
const ENTITY = "entity";

const VERT = `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aSeed; // x: head start, yzw: detour direction
uniform float uT;
uniform float uTime;
uniform float uSwirlFrom; // 1 when that end is the entity, which swirls
uniform float uSwirlTo;
uniform float uDetour;
uniform vec2 uTurn; // yaw, pitch
uniform vec2 uMouse; // clip space
uniform float uAspect;
uniform vec2 uCenter;
uniform float uScale;
uniform float uSize;
uniform float uCrispFrom; // 1 when that end is text: its letters' particles are bright and steady
uniform float uCrispTo;
uniform float uTextSize; // letter particles' size, as a multiple of the usual
varying float vGlow;
varying float vCrisp;
varying float vDepth;

// The entity's churn: every point orbits at its own speed
vec3 swirl(vec3 v) {
  float a = uTime * (0.35 + aSeed.x * 0.9);
  float c = cos(a), s = sin(a);
  return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

void main() {
  float p = smoothstep(aSeed.x * ${SPREAD.toFixed(2)}, aSeed.x * ${SPREAD.toFixed(2)} + ${(1 - SPREAD).toFixed(2)}, uT);
  vec3 a = uSwirlFrom > 0.5 ? swirl(aFrom) : aFrom;
  vec3 b = uSwirlTo > 0.5 ? swirl(aTo) : aTo;
  vec3 pos = mix(a, b, p) + aSeed.yzw * sin(p * 3.14159) * uDetour;

  // The entity also pulses and twitches, frame to frame
  float entity = uSwirlFrom * (1.0 - p) + uSwirlTo * p;
  if (entity > 0.0) {
    pos *= 1.0 + entity * 0.04 * sin(uTime * 1.6 + aSeed.x * 2.0);
    float tick = floor(uTime * 14.0);
    vec3 jitter = vec3(
      fract(sin(tick * 12.9898 + aSeed.x * 78.233) * 43758.5453),
      fract(sin(tick * 39.3468 + aSeed.y * 11.135) * 24634.6345),
      fract(sin(tick * 73.1561 + aSeed.z * 55.871) * 35723.2341)) - 0.5;
    float burst = step(0.985, fract(sin(tick * 3.1 + aSeed.w * 91.7) * 4375.85));
    pos += jitter * entity * (0.012 + burst * 0.09);
  }
  // On text, the points on the page plane (z = 0) are the letters; the rest
  // are a haze around them. Either only counts while settled: in flight,
  // points are on their own again.
  float settled = 1.0 - smoothstep(0.02, 0.2, min(p, 1.0 - p));
  float onA = 1.0 - step(0.00001, abs(aFrom.z));
  float onB = 1.0 - step(0.00001, abs(aTo.z));
  float crisp = mix(uCrispFrom * onA, uCrispTo * onB, p) * settled;
  float haze = mix(uCrispFrom * (1.0 - onA), uCrispTo * (1.0 - onB), p) * settled;
  // Breathing (barely, on a letter)
  pos += aSeed.yzw * 0.01 * (1.0 - 0.85 * crisp) * sin(uTime * 0.9 + aSeed.x * 40.0);

  float cy = cos(uTurn.x), sy = sin(uTurn.x), cp = cos(uTurn.y), sp = sin(uTurn.y);
  pos = vec3(pos.x * cy + pos.z * sy, pos.y, -pos.x * sy + pos.z * cy);
  pos = vec3(pos.x, pos.y * cp - pos.z * sp, pos.y * sp + pos.z * cp);

  float w = 3.2 - pos.z;
  vec2 clip = pos.xy * uScale * 2.6 / w;
  clip.x /= uAspect;
  clip += uCenter;

  // Make way for the pointer
  vec2 d = clip - uMouse;
  d.x *= uAspect;
  float r = length(d);
  float push = smoothstep(0.13, 0.0, r);
  clip += (d / max(r, 1e-4)) * push * 0.035 * vec2(1.0 / uAspect, 1.0);

  gl_Position = vec4(clip, 0.0, 1.0);
  float twinkle = mix(0.65 + 0.35 * sin(uTime * 2.3 + aSeed.x * 97.0), 0.92 + 0.08 * sin(uTime * 2.3 + aSeed.x * 97.0), crisp);
  float vary = mix(0.7 + 0.6 * fract(aSeed.x * 13.0), 0.85 + 0.3 * fract(aSeed.x * 13.0), crisp);
  gl_PointSize = uSize * (3.2 / w) * vary * mix(1.0, uTextSize, crisp);
  vCrisp = crisp;
  float glow = twinkle * (1.0 + push * 1.5);
  vGlow = mix(glow * (0.85 + 0.4 * sin(p * 3.14159)) * (1.0 - 0.7 * haze), glow * 1.15, crisp);
  vDepth = clamp((pos.z + 1.0) * 0.5, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
uniform float uDepthFade; // 0–1: how much the far side fades, for a sense of depth
varying float vGlow;
varying float vDepth;
varying float vCrisp;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  // A bright core with a soft edge; a letter's particles are fuller and
  // lit in the accent (leaning a little toward the text colour), at full
  // strength
  float a = mix(smoothstep(0.5, 0.12, d), smoothstep(0.5, 0.3, d), vCrisp);
  float depth = mix(1.0, 0.25 + 0.75 * vDepth * vDepth, uDepthFade);
  vec3 col = mix(mix(uColorB, uColorA, vDepth), mix(uColorA, uColorB, 0.2), vCrisp);
  gl_FragColor = vec4(col, a * vGlow * mix(uAlpha * depth, 1.0, vCrisp));
}`;

export interface Field {
  show(shape: Shape, stage: boolean): void;
  scrub(a: Shape, b: Shape, t: number): void;
  setMotion(on: boolean): void;
  stop(): void;
}

// CSS colour → [r, g, b] in 0–1
function rgb(css: string): [number, number, number] {
  const c = document.createElement("canvas").getContext("2d")!;
  c.fillStyle = css;
  c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

// Round things spin; flat ones (a book, a monogram) sway, so they never
// turn edge-on; text faces the reader
const SPINS: Shape[] = ["globe", "network", "orb", ENTITY];

export function startField(canvas: HTMLCanvasElement, first: Shape, firstStage: boolean, motion: boolean): Field | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  const small = matchMedia("(max-width: 768px)").matches || navigator.hardwareConcurrency <= 4;
  const N = small ? 16000 : 42000;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = {
    t: u("uT"), time: u("uTime"), swirlFrom: u("uSwirlFrom"), swirlTo: u("uSwirlTo"), detour: u("uDetour"),
    turn: u("uTurn"), mouse: u("uMouse"), aspect: u("uAspect"), center: u("uCenter"), scale: u("uScale"),
    size: u("uSize"), a: u("uColorA"), b: u("uColorB"), alpha: u("uAlpha"), depthFade: u("uDepthFade"),
    crispFrom: u("uCrispFrom"), crispTo: u("uCrispTo"), textSize: u("uTextSize"),
  };

  // Per-point randomness
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z) * (0.3 + Math.random() * 0.7);
    seed.set([Math.random(), Math.cos(a) * s, z * (0.3 + Math.random() * 0.7), Math.sin(a) * s], i * 4);
  }
  const buffer = (data: Float32Array, name: string, size: number) => {
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    const loc = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  // Start as a loose haze, so the first shape gathers out of nothing
  let from: Float32Array = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) from.set([seed[i * 4 + 1] * 2.2, seed[i * 4 + 2] * 2.2, seed[i * 4 + 3] * 2.2], i * 3);
  let to: Float32Array = from.slice();
  const fromBuf = buffer(from, "aFrom", 3);
  const toBuf = buffer(to, "aTo", 3);
  buffer(seed, "aSeed", 4);
  const upload = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, fromBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, from);
    gl.bindBuffer(gl.ARRAY_BUFFER, toBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, to);
  };

  let colors = { a: rgb("#fff"), b: rgb("#888"), dark: true };
  const readColors = () => {
    const css = getComputedStyle(document.documentElement);
    const dark = document.documentElement.dataset.theme !== "light";
    colors = { a: rgb(css.getPropertyValue("--accent")), b: rgb(css.getPropertyValue("--fg")), dark };
  };
  readColors();
  const themeWatch = new MutationObserver(() => {
    readColors();
    if (!motion) draw(performance.now());
  });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  let w = 0;
  let h = 0;
  let dpr = 1;
  let baseSize = 2.4;
  let stage = firstStage;
  // What the buffers hold: from → to, and whether each end swirls
  let pair: { a: Shape | null; b: Shape | null } = { a: null, b: null };
  let swirlFrom = false;
  let swirlTo = false;
  // The shape it's mostly showing, for how it turns and where it sits
  let current: Shape | null = null;

  // Time-driven morphs: t runs 0 → 1 over MORPH_MS from `began`.
  // Scrubbed ones: t follows the scroll (eased a little, so it glides).
  let began = -Infinity;
  let scrubbing = false;
  let scrubT = 0;
  let scrubGoal = 0;
  const progress = (now: number) => (scrubbing ? scrubT : Math.min(1, (now - began) / MORPH_MS));

  // Eased values, so moving between stage and backdrop glides
  const ease = { cx: 0, cy: 0, scale: 1, alpha: 0, lx: 0, ly: 0, tx: 0, ty: 0 };
  let yaw = 0;
  let clock = 0; // the shader's time: stops while the tab is hidden
  let last = performance.now();

  // Leaning toward the pointer
  const mouse = { x: 9, y: 9 };
  const onMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / w) * 2 - 1;
    mouse.y = 1 - (e.clientY / h) * 2;
    ease.tx = mouse.x * 0.25;
    ease.ty = -mouse.y * 0.15;
  };
  const onLeave = () => {
    mouse.x = mouse.y = 9;
  };

  // Where things should be for the current shape and place
  function targets() {
    const wide = w > 1100;
    const aspect = w / h;
    const text = current !== null && isText(current);
    if (stage) {
      return {
        cx: 0,
        cy: text ? 0.1 : 0.06,
        scale: text ? 1 : Math.min(0.78, 0.7 * aspect),
        alpha: text ? (colors.dark ? 0.95 : 0.9) : current === "globe" ? 1.1 : colors.dark ? 0.75 : 0.64,
      };
    }
    return {
      cx: wide ? 0.38 : 0,
      cy: wide ? 0 : 0.05,
      scale: wide ? Math.min(1.5, (h / w) * 2.1) : Math.min(1.3, (h / w) * 1.7),
      alpha: colors.dark ? (wide ? 0.3 : 0.18) : wide ? 0.16 : 0.07,
    };
  }

  function draw(now: number) {
    if (motion) clock += Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = motion ? clock : 0;
    if (scrubbing) scrubT += (scrubGoal - scrubT) * (motion ? 0.14 : 1);
    const t = motion ? progress(now) : scrubbing ? scrubGoal : 1;
    if (scrubbing) current = t < 0.5 ? pair.a : pair.b;

    const goal = targets();
    const k = motion ? 0.06 : 1;
    ease.cx += (goal.cx - ease.cx) * k;
    ease.cy += (goal.cy - ease.cy) * k;
    ease.scale += (goal.scale - ease.scale) * k;
    ease.alpha += (goal.alpha - ease.alpha) * k;
    ease.lx += (ease.tx - ease.lx) * 0.04;
    ease.ly += (ease.ty - ease.ly) * 0.04;

    const text = current !== null && isText(current);
    const spin = current !== null && SPINS.includes(current);
    const want = !motion
      ? text ? 0 : spin ? 0.5 : 0.25
      : text ? Math.sin(time * 0.4) * 0.06
      : spin ? time * 0.15
      : Math.sin(time * 0.3) * 0.45;
    // Ease toward it, the short way round
    const off = Math.atan2(Math.sin(yaw - want), Math.cos(yaw - want));
    yaw = motion ? want + off * 0.96 : want;
    const lean = text ? 0.3 : 1;

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    // Light adds up into a glow on dark; on light it's ink, layered normally
    // (on light, the canvas's own alpha builds up properly too, so dots
    // stacked on a letter end up solid)
    if (colors.dark) gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE);
    else gl!.blendFuncSeparate(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA, gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.uniform1f(U.t, t);
    gl!.uniform1f(U.time, time);
    gl!.uniform1f(U.swirlFrom, motion && swirlFrom ? 1 : 0);
    gl!.uniform1f(U.swirlTo, motion && swirlTo ? 1 : 0);
    gl!.uniform1f(U.detour, stage ? 0.8 : 0.55);
    gl!.uniform2f(U.turn, yaw + ease.lx * lean, (text ? 0 : 0.1) + ease.ly * lean);
    gl!.uniform2f(U.mouse, motion ? mouse.x : 9, motion ? mouse.y : 9);
    gl!.uniform1f(U.aspect, w / h);
    gl!.uniform2f(U.center, ease.cx, ease.cy);
    gl!.uniform1f(U.scale, ease.scale);
    gl!.uniform3fv(U.a, colors.a);
    gl!.uniform3fv(U.b, colors.b);
    gl!.uniform1f(U.alpha, ease.alpha);
    gl!.uniform1f(U.depthFade, text ? 0 : current === "globe" ? 1 : 0.6);
    // Letter particles sized to about touch their neighbours on screen
    const gap = textGap.get(t < 0.5 && scrubbing ? from : to) ?? textGap.get(from) ?? textGap.get(to);
    const gapPx = gap ? gap * ease.scale * (2.6 / 3.2) * (h / 2) * dpr : 0;
    gl!.uniform1f(U.crispFrom, textGap.has(from) ? 1 : 0);
    gl!.uniform1f(U.crispTo, textGap.has(to) ? 1 : 0);
    gl!.uniform1f(U.textSize, gapPx ? Math.min(6, Math.max(1, (gapPx * 1.05) / baseSize)) : 1);
    gl!.drawArrays(gl!.POINTS, 0, N);
  }

  // Where each point is right now (mirrors the shader, without the breathing
  // and jitter), so a new morph can set off from there
  function snapshot(now: number) {
    const t = motion ? progress(now) : 1;
    const detour = stage ? 0.8 : 0.55;
    const time = clock;
    const out = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const s = seed[i * 4] * SPREAD;
      const x = Math.min(1, Math.max(0, (t - s) / (1 - SPREAD)));
      const p = x * x * (3 - 2 * x);
      const bump = Math.sin(p * Math.PI) * detour;
      const ang = time * (0.35 + seed[i * 4] * 0.9);
      const c = Math.cos(ang), sn = Math.sin(ang);
      let ax = from[i * 3], az = from[i * 3 + 2];
      let bx = to[i * 3], bz = to[i * 3 + 2];
      if (motion && swirlFrom) [ax, az] = [ax * c + az * sn, -ax * sn + az * c];
      if (motion && swirlTo) [bx, bz] = [bx * c + bz * sn, -bx * sn + bz * c];
      out[i * 3] = ax + (bx - ax) * p + seed[i * 4 + 1] * bump;
      out[i * 3 + 1] = from[i * 3 + 1] + (to[i * 3 + 1] - from[i * 3 + 1]) * p + seed[i * 4 + 2] * bump;
      out[i * 3 + 2] = az + (bz - az) * p + seed[i * 4 + 3] * bump;
    }
    return out;
  }

  // Each request bumps the token; a slower one that finishes late is dropped
  let token = 0;
  let heading: Shape | null = null; // where the free morph is going

  // Morph on its own to `shape`, from wherever the points are now
  async function morphTo(shape: Shape, mine: number) {
    heading = shape;
    const target = await buildShape(shape, N, w / h, h);
    if (mine !== token) return false;
    const now = performance.now();
    from = snapshot(now);
    to = target;
    swirlFrom = false;
    swirlTo = shape === ENTITY;
    pair = { a: null, b: shape };
    scrubbing = false;
    current = shape;
    upload();
    began = now;
    if (!motion) draw(now);
    return true;
  }

  async function show(shape: Shape, onStage: boolean) {
    stage = onStage;
    if (!scrubbing && shape === heading) return;
    await morphTo(shape, ++token);
  }

  // Let the scroll drive it: shape a at t = 0, shape b at t = 1
  async function scrub(a: Shape, b: Shape, t: number) {
    stage = true;
    scrubGoal = t;
    if (scrubbing && pair.a === a && pair.b === b) {
      if (!motion) draw(performance.now());
      return;
    }
    const mine = ++token;
    // Coming in from a free morph: arrive at the nearer end first, then hand over
    if (!scrubbing) {
      const near = scrubGoal < 0.5 ? a : b;
      if (heading !== near && !(await morphTo(near, mine))) return;
      const wait = Math.max(0, began + MORPH_MS - performance.now());
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (mine !== token) return;
    }
    const [fa, fb] = await Promise.all([buildShape(a, N, w / h, h), buildShape(b, N, w / h, h)]);
    if (mine !== token) return;
    from = fa;
    to = fb;
    swirlFrom = a === ENTITY;
    swirlTo = b === ENTITY;
    pair = { a, b };
    scrubT = scrubGoal;
    scrubbing = true;
    upload();
    if (!motion) draw(performance.now());
  }

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
    const aspectBefore = w / h;
    const hBefore = h;
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    baseSize = (small ? 2.3 : 2.4) * dpr;
    gl.uniform1f(U.size, baseSize);
    // Text is laid out for the screen's shape; lay it out again
    if (Math.abs(aspectBefore - w / h) > 0.05 || Math.abs(hBefore - h) > h * 0.25) {
      if (scrubbing && pair.a && pair.b && (isText(pair.a) || isText(pair.b))) {
        const { a, b } = pair;
        pair = { a: null, b: null };
        scrub(a, b, scrubGoal);
      } else if (!scrubbing && current && isText(current)) {
        heading = null;
        show(current, stage);
      }
    }
    if (!motion) draw(performance.now());
  };

  let frame = 0;
  const loop = (now: number) => {
    draw(now);
    frame = requestAnimationFrame(loop);
  };
  const run = () => {
    cancelAnimationFrame(frame);
    last = performance.now();
    if (motion && !document.hidden) frame = requestAnimationFrame(loop);
    else draw(performance.now());
  };
  // Pause in hidden tabs, and pick up where it was
  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.hidden) hiddenAt = performance.now();
    else began += performance.now() - hiddenAt;
    run();
  };

  resize();
  const start = targets();
  Object.assign(ease, { cx: start.cx, cy: start.cy, scale: start.scale, alpha: start.alpha });
  addEventListener("resize", resize);
  addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  run();
  show(first, firstStage);

  return {
    show,
    scrub,
    setMotion(on) {
      motion = on;
      run();
    },
    stop() {
      cancelAnimationFrame(frame);
      themeWatch.disconnect();
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
