import type { Theme } from "./types";

// Risograph zine: navy ink on cool paper with a fluorescent pink second pass.
export const riso: Theme = {
  id: "riso",
  name: "Riso",
  fonts: {
    display: "var(--font-space-grotesk)",
    body: "var(--font-dm-sans)",
    mono: "var(--font-space-mono)",
  },
  display: { weight: 700, tracking: "-0.04em", leading: "0.95" },
  emphasis: { style: "normal", color: "accent" },
  radius: "18px",
  pill: "999px",
  grain: 0.08,
  light: {
    bg: "#f1f1ee",
    surface: "#e6e6f0",
    fg: "#1d1b52",
    muted: "#5f5d8f",
    line: "#d3d2e3",
    accent: "#e8357a",
    accentFg: "#ffffff",
  },
  dark: {
    bg: "#17163d",
    surface: "#201f4d",
    fg: "#f2f0ff",
    muted: "#a3a1d2",
    line: "#2f2e66",
    accent: "#ff6aa2",
    accentFg: "#17163d",
  },
};
