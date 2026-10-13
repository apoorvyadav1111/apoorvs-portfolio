import type { Theme } from "./types";

// Winter only: cold paper, slate ink and an icy blue. Things thaw out of a
// blur, and a light snow falls.
export const frost: Theme = {
  id: "frost",
  name: "Frost",
  season: "winter",
  particles: "snow",
  fonts: {
    display: "var(--font-instrument-sans)",
    body: "var(--font-inter)",
    mono: "var(--font-plex-mono)",
  },
  display: { weight: 600, tracking: "-0.035em", leading: "0.98" },
  emphasis: { style: "normal", color: "accent" },
  radius: "12px",
  pill: "999px",
  grain: 0.03,
  motion: { reveal: "frost", duration: 1000, ease: "cubic-bezier(0.25, 1, 0.5, 1)", stagger: 70, tilt: 2, glow: 0.7 },
  light: {
    bg: "#eef3f7",
    surface: "#e1e9f0",
    fg: "#12202e",
    muted: "#56677a",
    line: "#cfdae4",
    accent: "#2d6fa8",
    accentFg: "#ffffff",
    sun: "#8fa9bf",
  },
  dark: {
    bg: "#0d1620",
    surface: "#142130",
    fg: "#e6eef5",
    muted: "#8ea2b5",
    line: "#22344a",
    accent: "#8cc8ff",
    accentFg: "#0d1620",
    sun: "#dfe9f2",
  },
};
