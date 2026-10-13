import type { Theme } from "./types";

// Autumn only: toasted paper, bark-brown ink and a burnt-orange accent.
// Things drift into place like falling leaves, and a few leaves blow past.
export const harvest: Theme = {
  id: "harvest",
  name: "Harvest",
  season: "autumn",
  particles: "leaves",
  fonts: {
    display: "var(--font-fraunces)",
    body: "var(--font-instrument-sans)",
    mono: "var(--font-jetbrains)",
  },
  display: { weight: 700, tracking: "-0.03em", leading: "1" },
  emphasis: { style: "italic", color: "accent" },
  radius: "10px",
  pill: "999px",
  grain: 0.06,
  motion: { reveal: "fall", duration: 900, ease: "cubic-bezier(0.22, 1, 0.36, 1)", stagger: 70, tilt: 3, glow: 0.8 },
  light: {
    bg: "#f4ead9",
    surface: "#ead9bf",
    fg: "#2b1a10",
    muted: "#77573f",
    line: "#dcc6a5",
    accent: "#b4441a",
    accentFg: "#fff6ea",
    sun: "#c98a12",
  },
  dark: {
    bg: "#1d130d",
    surface: "#2a1c13",
    fg: "#f3e2c7",
    muted: "#b08f72",
    line: "#3b2a1e",
    accent: "#f07a3a",
    accentFg: "#1d130d",
    sun: "#f4c25a",
  },
};
