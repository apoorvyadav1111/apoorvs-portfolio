import type { Theme } from "./types";

// Hi-tech and dark: a cloud of glowing points behind the page reshapes itself
// for each section as you scroll (a monogram, a network, brackets, a book, the
// globe), and headings assemble out of particles as they arrive. Both live in
// src/components/signal and only load while this theme is on.
export const signal: Theme = {
  id: "signal",
  name: "Signal",
  fonts: {
    display: "var(--font-space-grotesk)",
    body: "var(--font-inter)",
    mono: "var(--font-jetbrains)",
  },
  display: { weight: 600, tracking: "-0.035em", leading: "1.02" },
  emphasis: { style: "normal", color: "accent" },
  radius: "10px",
  pill: "6px",
  grain: 0,
  // Quick and clean: things flicker on like a display waking up
  motion: { reveal: "assemble", duration: 700, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)", stagger: 60, tilt: 3, glow: 0.9 },
  // Surfaces are see-through so the cloud shows behind cards (blurred, see globals.css)
  light: {
    bg: "#eef2f8",
    surface: "rgba(255, 255, 255, 0.62)",
    fg: "#0a1222",
    muted: "#55617a",
    line: "#cdd6e4",
    accent: "#1157e8",
    accentFg: "#ffffff",
    sun: "#1157e8",
  },
  dark: {
    bg: "#04060c",
    surface: "rgba(14, 20, 38, 0.6)",
    fg: "#e4eeff",
    muted: "#7b88a5",
    line: "#1a2340",
    accent: "#5eecff",
    accentFg: "#03121a",
    sun: "#5eecff",
  },
};
