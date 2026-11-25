import type { Theme } from "./types";

// Hi-tech and dark: a cloud of glowing points behind the page reshapes itself
// for each section as you scroll (a monogram, a network, brackets, a book, the
// globe). It lives in src/components/signal and only loads while this theme
// is on.
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
  // Gold on warm black (or deep gold on warm paper)
  light: {
    bg: "#f4f1ea",
    surface: "rgba(255, 253, 248, 0.62)",
    fg: "#16130c",
    muted: "#6b6455",
    line: "#ddd6c6",
    accent: "#8f5d00",
    accentFg: "#ffffff",
    sun: "#8f5d00",
  },
  dark: {
    bg: "#070605",
    surface: "rgba(28, 24, 16, 0.6)",
    fg: "#f2ece0",
    muted: "#948b78",
    line: "#2a251b",
    accent: "#f3b94a",
    accentFg: "#1a1203",
    sun: "#f3b94a",
  },
};
