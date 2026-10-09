// Theme registry.
//
// To add a theme:
//   1. Create `src/themes/<id>.ts` exporting a `Theme` (copy trail.ts as a start).
//   2. Declare any new fonts in `fonts.ts`.
//   3. Add it to THEMES below.
// To change the site's look, change DEFAULT_THEME. Visitors can also pick a
// theme from the footer; their choice is remembered in localStorage.
import type { Palette, Theme } from "./types";
import { trail } from "./trail";
import { riso } from "./riso";
import { swiss } from "./swiss";

export const THEMES: Theme[] = [trail, riso, swiss];
export const DEFAULT_THEME = "trail";

export type { Theme, Palette };

function paletteVars(p: Palette) {
  return `--bg:${p.bg};--surface:${p.surface};--fg:${p.fg};--muted:${p.muted};--line:${p.line};--accent:${p.accent};--accent-fg:${p.accentFg};`;
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
    ].join(";");
    return [
      `${sel}{${base}}`,
      `${sel},${sel}[data-theme="light"]{${paletteVars(t.light)}color-scheme:light}`,
      `${sel}[data-theme="dark"]{${paletteVars(t.dark)}color-scheme:dark}`,
    ].join("\n");
  }).join("\n");
}

// Runs before first paint: restores the visitor's theme and light/dark mode.
export const themeInitScript = `(function(){var d=document.documentElement,p,m;try{p=localStorage.getItem("palette");m=localStorage.getItem("theme")}catch(e){}if(${JSON.stringify(
  THEMES.map((t) => t.id),
)}.indexOf(p)>-1)d.dataset.palette=p;if(m!=="light"&&m!=="dark")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=m})()`;
