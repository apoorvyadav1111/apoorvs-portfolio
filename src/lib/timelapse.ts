import { SEASONS, THEMES } from "@/themes";
import type { Palette, Season } from "@/themes";

// A year going by: the site moves through each season's theme, blending the
// colours over the last few seconds of each one (the particles mix too; see
// SeasonSky.tsx). It only runs from a seasonal theme, starting at that theme's
// season. Started from the footer or the "seasons" easter egg it goes once
// round (at least a minute) and ends on the season it began; root's
// `timelapse` in the shell loops.
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

// Seasons take longer with slow particles, but never get shorter than
// MIN_SEASON, so each one has time to look its best
const SPEED = { slow: 0.5, normal: 1, fast: 1, off: 1 } as const;
export const MIN_SEASON = 15; // seconds, so a year is at least a minute
const BLEND = 4; // seconds of each season spent blending into the next
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
  const fade = BLEND;
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

// Whether a timelapse can start: only from a seasonal theme
export const canTimelapse = () => Boolean(THEMES.find((t) => t.id === root().dataset.palette)?.season);

export function startTimelapse({ every = MIN_SEASON, loop = false }: { every?: number; loop?: boolean } = {}) {
  const r = root();
  const first = THEMES.find((t) => t.id === r.dataset.palette)?.season;
  if (!first) return false;
  stopTimelapse();
  const start = themeFor(first);
  const i = SEASONS.indexOf(first);
  // Once round: the next three seasons, then back to this one
  const queue = [1, 2, 3, 4].map((k) => themeFor(SEASONS[(i + k) % 4]));

  const watcher = new MutationObserver(() => {
    // Someone else changed the theme (the Appearance menu, the shell): stop here
    if (run && r.dataset.palette !== run.showing) stopTimelapse(false);
  });
  run = {
    every: Math.max(MIN_SEASON, every),
    loop,
    start,
    queue: loop ? [] : queue,
    showing: start,
    season: first,
    step: 1,
    elapsed: 0,
    last: performance.now(),
    frame: 0,
    watcher,
  };
  r.dataset.timelapse = loop ? "loop" : "once";
  watcher.observe(r, { attributes: true, attributeFilter: ["data-palette"] });
  run.frame = requestAnimationFrame(tick);
  emit();
  return true;
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
