import type { Theme } from "./types";

// Spring only: new-leaf paper, deep green ink and cherry blossom. Things open
// up like buds, and a few petals drift by.
export const bloom: Theme = {
  id: "bloom",
  name: "Bloom",
  season: "spring",
  particles: "petals",
  fonts: {
    display: "var(--font-dm-sans)",
    body: "var(--font-dm-sans)",
    mono: "var(--font-space-mono)",
  },
  display: { weight: 700, tracking: "-0.04em", leading: "0.98" },
  emphasis: { style: "normal", color: "accent" },
  radius: "20px",
  pill: "999px",
  grain: 0.04,
  motion: { reveal: "bloom", duration: 700, ease: "cubic-bezier(0.34, 1.56, 0.64, 1)", stagger: 60, tilt: 4, glow: 0.9 },
  light: {
    bg: "#f5f6ee",
    surface: "#e9eedf",
    fg: "#1f2a1c",
    muted: "#5b6a53",
    line: "#d6dfc8",
    accent: "#c4466c",
    accentFg: "#ffffff",
    sun: "#d39a1c",
  },
  dark: {
    bg: "#141a12",
    surface: "#1c2419",
    fg: "#eef2e6",
    muted: "#9fae95",
    line: "#2b3627",
    accent: "#f28fab",
    accentFg: "#141a12",
    sun: "#f5d76e",
  },
};
