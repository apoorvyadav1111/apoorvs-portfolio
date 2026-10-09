// Theme registry.
//
// To add a theme:
//   1. Create `src/themes/<id>.ts` exporting a `Theme` (copy trail.ts as a start).
//   2. Declare any new fonts in `fonts.ts`.
//   3. Add it to THEMES below.
// To change the site's look, change DEFAULT_THEME. Visitors can also pick a
// theme, a font and light/dark mode from the Appearance menu in the header;
// their choices are remembered in localStorage.
import type { Palette, Theme } from "./types";
import { trail } from "./trail";
import { riso } from "./riso";
import { swiss } from "./swiss";
import { graphite } from "./graphite";

export const THEMES: Theme[] = [trail, riso, swiss, graphite];
export const DEFAULT_THEME = "trail";
// What first-time visitors see: "dark", "light", or "system" (follow the device)
export const DEFAULT_MODE: "light" | "dark" | "system" = "dark";

export type { Theme, Palette };

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
// mode. A saved mode is "light", "dark" or "system"; nothing saved means DEFAULT_MODE.
export const themeInitScript = `(function(){var d=document.documentElement,p,f,m;try{p=localStorage.getItem("palette");f=localStorage.getItem("font");m=localStorage.getItem("theme")}catch(e){}if(${JSON.stringify(
  THEMES.map((t) => t.id),
)}.indexOf(p)>-1)d.dataset.palette=p;if(${JSON.stringify(
  FONT_CHOICES.filter((c) => c.display).map((c) => c.id),
)}.indexOf(f)>-1)d.dataset.font=f;if(m!=="light"&&m!=="dark"&&m!=="system")m=${JSON.stringify(DEFAULT_MODE)};if(m==="system")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=m})()`;
