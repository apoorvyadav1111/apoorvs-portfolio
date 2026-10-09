import type { Theme } from "./types";

// Morning paper: ink on newsprint, heavy Didone headlines, a serif to read by,
// square corners, and a red you'd see in a masthead. Dark mode is the night edition.
export const gazette: Theme = {
  id: "gazette",
  name: "Gazette",
  fonts: {
    display: "var(--font-playfair)",
    body: "var(--font-source-serif)",
    mono: "var(--font-plex-mono)",
  },
  display: { weight: 800, tracking: "-0.02em", leading: "1.02" },
  emphasis: { style: "italic", color: "accent" },
  radius: "0px",
  pill: "0px",
  grain: 0.08,
  // Slightly faded, warm, like a photo printed on cheap paper
  photoFilter: "grayscale(0.85) sepia(0.15) contrast(1.08)",
  light: {
    bg: "#f2ede1",
    surface: "#e7e0d0",
    fg: "#1b1a17",
    muted: "#5f5a4f",
    line: "#cfc6b2",
    accent: "#a3221c",
    accentFg: "#f2ede1",
    sun: "#9a7a2c",
  },
  dark: {
    bg: "#171613",
    surface: "#211f1b",
    fg: "#e9e3d4",
    muted: "#9a9384",
    line: "#35322b",
    accent: "#e2584c",
    accentFg: "#171613",
    sun: "#d8c48e",
  },
};
