import type { Theme } from "./types";

// Summer only: sand, sea and late sun. Things rise like heat off the road,
// and fireflies drift around after dark (sun motes in light mode).
export const solstice: Theme = {
  id: "solstice",
  name: "Solstice",
  season: "summer",
  particles: "fireflies",
  fonts: {
    display: "var(--font-bricolage)",
    body: "var(--font-dm-sans)",
    mono: "var(--font-jetbrains)",
  },
  display: { weight: 800, tracking: "-0.04em", leading: "0.95" },
  emphasis: { style: "normal", color: "accent" },
  radius: "14px",
  pill: "999px",
  grain: 0.05,
  motion: { reveal: "rise", duration: 650, ease: "cubic-bezier(0.16, 1, 0.3, 1)", stagger: 60, tilt: 4, glow: 1 },
  light: {
    bg: "#fbf3e4",
    surface: "#f4e5c9",
    fg: "#1b2a33",
    muted: "#59676c",
    line: "#ead8b5",
    accent: "#0c7c7c",
    accentFg: "#ffffff",
    sun: "#f08a24",
  },
  dark: {
    bg: "#0f1d24",
    surface: "#16282f",
    fg: "#fbefd9",
    muted: "#9fb2b5",
    line: "#243a42",
    accent: "#3fd0c9",
    accentFg: "#0f1d24",
    sun: "#ffb347",
  },
};
