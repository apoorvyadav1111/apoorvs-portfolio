import { SEASONS, THEMES, currentSeason } from "@/themes";
import type { Palette, Season } from "@/themes";

// A year going by: the site moves through each season's theme, blending the
// colours over the last few seconds of each one (the particles mix too; see
// SeasonSky.tsx). Started from the footer or the "seasons" easter egg it goes
// once round and ends where it began; root's `timelapse` in the shell loops.
//
// Nothing is saved: the theme is set on <html> only, and the visitor's own
// comes back when it ends or is stopped. Picking a theme meanwhile stops it.
// <html> carries data-timelapse while it runs, and data-season-next (the theme
// coming up) while it blends. Listen for the "timelapse" event to show progress.

export interface TimelapseStatus {
  running: boolean;
  season: Season | null;
  step: number; // seasons shown so far, once round (1–4)
  loop: boolean;
  progress: () => number; // 0–1 through the current season
}

const SPEED = { slow: 0.5, normal: 1, fast: 2, off: 1 } as const; // follows the particle speed
const VARS: [keyof Palette, string][] = [
  ["bg", "--bg"],
  ["surface", "--surface"],
  ["fg", "--fg"],
  ["muted", "--muted"],
  ["line", "--line"],
  ["accent", "--accent"],
  ["accentFg", "--accent-fg"],
  ["sun", "--sun"],
];

const root = () => document.documentElement;
const themeFor = (s: Season) => THEMES.find((t) => t.season === s)!.id;
const palette = (id: string): Palette => {
  const t = THEMES.find((x) => x.id === id)!;
  const p = t[root().dataset.theme === "light" ? "light" : "dark"];
  return { ...p, sun: p.sun ?? p.fg };
};

let run: null | {
  every: number; // seconds per season
  loop: boolean;
  start: string; // the theme before it began
  queue: string[]; // themes still to come (once round); empty when looping
  showing: string; // the theme on the page
  season: Season | null;
  step: number;
  elapsed: number; // seconds into the current season
  last: number;
  frame: number;
  watcher: MutationObserver;
} = null;

function emit() {
  dispatchEvent(new CustomEvent<TimelapseStatus>("timelapse", { detail: timelapseStatus() }));
}

export function timelapseStatus(): TimelapseStatus {
  return {
    running: run !== null,
    season: run?.season ?? null,
    step: run?.step ?? 0,
    loop: run?.loop ?? false,
    progress: () => (run ? Math.min(1, run.elapsed / run.every) : 0),
  };
}

function clearBlend() {
  for (const [, v] of VARS) root().style.removeProperty(v);
  delete root().dataset.seasonNext;
}

// Puts a theme on <html> directly (never saved), noting it as ours so the
// watcher can tell it apart from the visitor picking one
function show(id: string) {
  if (!run) return;
  run.showing = id;
  clearBlend();
  root().dataset.palette = id;
  run.season = THEMES.find((t) => t.id === id)?.season ?? null;
}

function next(): string | null {
  if (!run) return null;
  if (!run.loop) return run.queue[0] ?? null;
  const i = run.season ? SEASONS.indexOf(run.season) : -1;
  return themeFor(SEASONS[(i + 1) % SEASONS.length]);
}

function tick(now: number) {
  if (!run) return;
  const weather = (root().dataset.weather ?? "normal") as keyof typeof SPEED;
  const dt = Math.min(now - run.last, 100) / 1000;
  run.last = now;
  run.elapsed += dt * (SPEED[weather] ?? 1);

  const to = next();
  if (!to) return stopTimelapse(false);
  const fade = Math.min(3, run.every * 0.4);
  const into = run.elapsed - (run.every - fade);
  if (into > 0) {
    // The last few seconds: blend every colour toward the next theme
    root().dataset.seasonNext = to;
    const a = palette(run.showing);
    const b = palette(to);
    const p = Math.min(1, into / fade);
    const eased = p * p * (3 - 2 * p);
    for (const [k, v] of VARS)
      root().style.setProperty(v, `color-mix(in oklab, ${a[k]} ${((1 - eased) * 100).toFixed(1)}%, ${b[k]})`);
  }
  if (run.elapsed >= run.every) {
    if (!run.loop) run.queue.shift();
    show(to);
    run.elapsed = 0;
    if (run.season) run.step = run.loop ? run.step + 1 : Math.min(run.step + 1, 4);
    emit();
    if (!run.loop && run.queue.length === 0) return stopTimelapse(false);
  }
  run.frame = requestAnimationFrame(tick);
}

export function startTimelapse({ every = 8, loop = false }: { every?: number; loop?: boolean } = {}) {
  stopTimelapse();
  const r = root();
  const start = r.dataset.palette ?? THEMES[0].id;
  const first = currentSeason();
  const i = SEASONS.indexOf(first);
  // Once round: into this season's theme (if it isn't on), round the year back
  // to it, then back to whatever theme was on before
  const year = [1, 2, 3, 4].map((k) => themeFor(SEASONS[(i + k) % 4]));
  const queue = [...(start === themeFor(first) ? [] : [themeFor(first)]), ...year, ...(start === themeFor(first) ? [] : [start])];

  const watcher = new MutationObserver(() => {
    // Someone else changed the theme (the Appearance menu, the shell): stop here
    if (run && r.dataset.palette !== run.showing) stopTimelapse(false);
  });
  run = {
    every,
    loop,
    start,
    queue: loop ? [] : queue,
    showing: start,
    season: THEMES.find((t) => t.id === start)?.season ?? null,
    step: 0,
    // Not on this season's theme yet: start blending into it straight away
    elapsed: start === themeFor(first) ? 0 : every - Math.min(3, every * 0.4),
    last: performance.now(),
    frame: 0,
    watcher,
  };
  if (loop && start !== themeFor(first)) run.season = SEASONS[(i + 3) % 4]; // so the first step lands on `first`
  if (run.season === first) run.step = 1;
  r.dataset.timelapse = loop ? "loop" : "once";
  watcher.observe(r, { attributes: true, attributeFilter: ["data-palette"] });
  run.frame = requestAnimationFrame(tick);
  emit();
}

// Stops the year. `restore` (stopping partway) puts the visitor's theme back;
// finishing once round has already arrived there.
export function stopTimelapse(restore = true) {
  if (!run) return;
  const { frame, watcher, start, showing } = run;
  cancelAnimationFrame(frame);
  watcher.disconnect();
  clearBlend();
  run = null;
  const r = root();
  if (restore && r.dataset.palette === showing) r.dataset.palette = start;
  // Cleared a beat later, so the particles still see this last change as part
  // of the timelapse and drift out gently rather than resetting
  setTimeout(() => run === null && delete r.dataset.timelapse, 50);
  emit();
}
