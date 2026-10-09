export interface Palette {
  bg: string;
  surface: string; // cards, code blocks, hover fills
  fg: string;
  muted: string; // secondary text
  line: string; // borders and rules
  accent: string;
  accentFg: string; // text drawn on top of `accent`
}

export interface Theme {
  id: string;
  name: string;
  fonts: {
    // CSS font-family values, usually `var(--font-…)` from ./fonts.ts
    display: string;
    body: string;
    mono: string;
  };
  display: {
    weight: number;
    tracking: string; // letter-spacing for headings
    leading: string; // line-height for big headlines
    case?: "none" | "uppercase";
  };
  // How the emphasised half of a headline is styled
  emphasis: { style: "normal" | "italic"; color: "accent" | "muted" };
  radius: string; // cards and panels
  pill: string; // buttons and tags
  grain: number; // paper-texture opacity, 0 to disable
  light: Palette;
  dark: Palette;
}
