import type { Theme } from "./types";

// Forest floor and late-afternoon sun. Chunky grotesk, mustard highlights.
export const trail: Theme = {
  id: "trail",
  name: "Trail",
  fonts: {
    display: "var(--font-bricolage)",
    body: "var(--font-instrument-sans)",
    mono: "var(--font-jetbrains)",
  },
  display: { weight: 700, tracking: "-0.035em", leading: "0.98" },
  emphasis: { style: "normal", color: "accent" },
  radius: "6px",
  pill: "6px",
  grain: 0.05,
  light: {
    bg: "#e8eadf",
    surface: "#dde1d1",
    fg: "#14251c",
    muted: "#56685b",
    line: "#c4ccb8",
    accent: "#9a5b00",
    accentFg: "#f7f3e6",
  },
  dark: {
    bg: "#11211a",
    surface: "#182c23",
    fg: "#ebe5d2",
    muted: "#93a596",
    line: "#26402f",
    accent: "#f2b632",
    accentFg: "#11211a",
  },
};
