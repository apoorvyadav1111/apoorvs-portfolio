import type { Theme } from "./types";

// Black-and-white photo zine: pure grays, a serif masthead, film grain, and
// photos shown in monochrome until you hover them.
export const graphite: Theme = {
  id: "graphite",
  name: "Graphite",
  fonts: {
    display: "var(--font-fraunces)",
    body: "var(--font-inter)",
    mono: "var(--font-plex-mono)",
  },
  display: { weight: 500, tracking: "-0.03em", leading: "1" },
  // No accent color to lean on, so emphasis is italic instead
  emphasis: { style: "italic", color: "muted" },
  radius: "2px",
  pill: "2px",
  grain: 0.07,
  photoFilter: "grayscale(1) contrast(1.05)",
  light: {
    bg: "#f4f4f4",
    surface: "#e9e9e9",
    fg: "#131313",
    muted: "#6a6a6a",
    line: "#d4d4d4",
    accent: "#131313",
    accentFg: "#f4f4f4",
    sun: "#4d4d4d",
  },
  dark: {
    bg: "#101010",
    surface: "#1a1a1a",
    fg: "#ececec",
    muted: "#8c8c8c",
    line: "#2b2b2b",
    accent: "#ececec",
    accentFg: "#101010",
    sun: "#bdbdbd",
  },
};
