import type { Theme } from "./types";

// International style: black, white, one loud cobalt. No curves, no texture.
export const swiss: Theme = {
  id: "swiss",
  name: "Swiss",
  fonts: {
    display: "var(--font-archivo)",
    body: "var(--font-inter)",
    mono: "var(--font-plex-mono)",
  },
  display: { weight: 800, tracking: "-0.045em", leading: "0.92" },
  emphasis: { style: "normal", color: "accent" },
  radius: "0px",
  pill: "0px",
  grain: 0,
  light: {
    bg: "#ffffff",
    surface: "#f2f2f2",
    fg: "#0b0b0b",
    muted: "#5f5f5f",
    line: "#dcdcdc",
    accent: "#1f3cff",
    accentFg: "#ffffff",
  },
  dark: {
    bg: "#0a0a0a",
    surface: "#161616",
    fg: "#f4f4f4",
    muted: "#8f8f8f",
    line: "#2a2a2a",
    accent: "#6b80ff",
    accentFg: "#0a0a0a",
  },
};
