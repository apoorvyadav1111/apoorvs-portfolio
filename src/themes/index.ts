// Theme registry.
//
// To add a theme:
//   1. Create `src/themes/<id>.ts` exporting a `Theme` (copy trail.ts as a start).
//   2. Declare any new fonts in `fonts.ts`.
//   3. Add it to THEMES below.
// A theme with a `season` is only offered during that season (see currentSeason).
// To change the site's look, change DEFAULT_THEME. Visitors can also pick a
// theme, a font and light/dark mode from the Appearance menu in the header;
// their choices are remembered in localStorage.
import type { Motion, Palette, Season, Theme } from "./types";
import { trail } from "./trail";
import { riso } from "./riso";
import { swiss } from "./swiss";
import { graphite } from "./graphite";
import { gazette } from "./gazette";
import { harvest } from "./harvest";
import { frost } from "./frost";
import { bloom } from "./bloom";
import { solstice } from "./solstice";

export const THEMES: Theme[] = [trail, riso, swiss, graphite, gazette, harvest, frost, bloom, solstice];
export const DEFAULT_THEME = "trail";
// What first-time visitors see: "dark", "light", or "system" (follow the device)
export const DEFAULT_MODE: "light" | "dark" | "system" = "dark";

export type { Theme, Palette, Motion, Season };

// Seasons by month, northern hemisphere (where the site's author lives).
// Index 0 is January.
const SEASON_BY_MONTH: Season[] = [
  "winter", "winter", "spring", "spring", "spring", "summer",
  "summer", "summer", "autumn", "autumn", "autumn", "winter",
];

export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

// The season by the calendar, ignoring any preview
export function realSeason(): Season {
  return SEASON_BY_MONTH[new Date().getMonth()];
}

// The season right now. `?season=winter` in the URL previews another one, as
// does `season winter` in the console as root (kept in sessionStorage, so it
// lasts until the tab closes).
export function currentSeason(): Season {
  let preview = new URLSearchParams(location.search).get("season");
  try {
    preview ??= sessionStorage.getItem("season");
  } catch {}
  if (SEASON_BY_MONTH.includes(preview as Season)) return preview as Season;
  return realSeason();
}

// Themes on offer: the regulars plus this season's
export function availableThemes(season: Season) {
  return THEMES.filter((t) => !t.season || t.season === season);
}

// Typefaces visitors can apply on top of any theme. "theme" keeps the theme's own.
export interface FontChoice {
  id: string;
  name: string;
  display?: string;
  body?: string;
  weight?: number; // heading weight, when the face needs a different one
  tracking?: string; // heading letter-spacing, likewise
}

export const FONT_CHOICES: FontChoice[] = [
  { id: "theme", name: "Theme default" },
  { id: "grotesk", name: "Grotesk", display: "var(--font-bricolage)", body: "var(--font-instrument-sans)", weight: 700, tracking: "-0.035em" },
  { id: "editorial", name: "Editorial", display: "var(--font-fraunces)", body: "var(--font-source-serif)", weight: 600, tracking: "-0.02em" },
  { id: "terminal", name: "Terminal", display: "var(--font-jetbrains)", body: "var(--font-jetbrains)", weight: 700, tracking: "-0.04em" },
  { id: "readable", name: "Readable", display: "var(--font-atkinson)", body: "var(--font-atkinson)", weight: 700, tracking: "-0.01em" },
];

function paletteVars(p: Palette) {
  return `--bg:${p.bg};--surface:${p.surface};--fg:${p.fg};--muted:${p.muted};--line:${p.line};--accent:${p.accent};--accent-fg:${p.accentFg};--sun:${p.sun ?? p.fg};`;
}

// Compiles every registered theme into CSS custom properties, scoped by
// `data-palette` (which theme) and `data-theme` (light or dark).
export function themeCss() {
  return THEMES.map((t) => {
    const sel = `:root[data-palette="${t.id}"]`;
    const base = [
      `--theme-display:${t.fonts.display}`,
      `--theme-body:${t.fonts.body}`,
      `--theme-mono:${t.fonts.mono}`,
      `--display-weight:${t.display.weight}`,
      `--display-tracking:${t.display.tracking}`,
      `--display-leading:${t.display.leading}`,
      `--display-case:${t.display.case ?? "none"}`,
      `--em-style:${t.emphasis.style}`,
      `--em-color:var(--${t.emphasis.color})`,
      `--theme-radius:${t.radius}`,
      `--theme-pill:${t.pill}`,
      `--theme-grain:${t.grain}`,
      `--photo-filter:${t.photoFilter ?? "none"}`,
      `--reveal:reveal-${t.motion.reveal}`,
      `--motion-dur:${t.motion.duration}ms`,
      `--motion-ease:${t.motion.ease}`,
      `--stagger:${t.motion.stagger}ms`,
      `--tilt:${t.motion.tilt}deg`,
      `--glow:${t.motion.glow}`,
    ].join(";");
    return [
      `${sel}{${base}}`,
      `${sel},${sel}[data-theme="light"]{${paletteVars(t.light)}color-scheme:light}`,
      `${sel}[data-theme="dark"]{${paletteVars(t.dark)}color-scheme:dark}`,
    ].join("\n");
  })
    .concat(
      // Emitted after the themes so a font choice wins over the theme's fonts
      FONT_CHOICES.filter((f) => f.display).map(
        (f) =>
          `:root[data-font="${f.id}"]{--theme-display:${f.display};--theme-body:${f.body};--display-weight:${f.weight};--display-tracking:${f.tracking}}`,
      ),
    )
    .join("\n");
}

// Runs before first paint: restores the visitor's theme, font and light/dark
// mode, any features switched off in the console (as `data-off`, see
// src/lib/features.ts), and turns on motion (see Motion.tsx) unless the
// visitor prefers less or switched it off.
// A saved mode is "light", "dark" or "system"; nothing saved means DEFAULT_MODE.
// A saved seasonal theme only applies during its season. The console's root
// mode can pick any theme for the session: that choice is kept in
// sessionStorage, never localStorage, so it can't outlast the tab.
export const themeInitScript = `(function(){var d=document.documentElement,p,f,m,w,o,P,Z;try{p=localStorage.getItem("palette");f=localStorage.getItem("font");m=localStorage.getItem("theme");w=localStorage.getItem("weather");o=localStorage.getItem("off");P=sessionStorage.getItem("palette");Z=sessionStorage.getItem("season")}catch(e){}if(w==="off"||w==="slow"||w==="fast")d.dataset.weather=w;if(o&&/^[a-z ]+$/.test(o))d.dataset.off=o;else o="";var S=${JSON.stringify(
  SEASON_BY_MONTH,
)},q=new URLSearchParams(location.search).get("season"),s=S.indexOf(q)>-1?q:S.indexOf(Z)>-1?Z:S[new Date().getMonth()],T=${JSON.stringify(
  Object.fromEntries(THEMES.map((t) => [t.id, t.season ?? ""])),
)};if(P in T)d.dataset.palette=P;else if(p in T&&(!T[p]||T[p]===s))d.dataset.palette=p;if(${JSON.stringify(
  FONT_CHOICES.filter((c) => c.display).map((c) => c.id),
)}.indexOf(f)>-1)d.dataset.font=f;if(m!=="light"&&m!=="dark"&&m!=="system")m=${JSON.stringify(DEFAULT_MODE)};if(m==="system")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=m;if((" "+o+" ").indexOf(" motion ")<0&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&"IntersectionObserver" in window){d.dataset.motion="";setTimeout(function(){if(d.dataset.motionReady===undefined)delete d.dataset.motion},4000)}})()`;
