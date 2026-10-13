export interface Palette {
  bg: string;
  surface: string; // cards, code blocks, hover fills
  fg: string;
  muted: string; // secondary text
  line: string; // borders and rules
  accent: string;
  accentFg: string; // text drawn on top of `accent`
  sun?: string; // daylight on the photo globe; defaults to `fg` (monochrome)
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
  photoFilter?: string; // CSS filter for photos, e.g. "grayscale(1)"; hover shows the original
  motion: Motion;
  light: Palette;
  dark: Palette;
}

// How things move in this theme. Visitors who ask for reduced motion get none of it.
export interface Motion {
  // How elements enter, as page loads and as they scroll into view
  //   rise: fade up · misregister: slides into register like a riso print
  //   wipe: rises out of a mask · develop: fades in from a blur, like a print developing
  //   ink: inked in left to right, like a press roller
  reveal: "rise" | "misregister" | "wipe" | "develop" | "ink";
  duration: number; // ms
  ease: string; // CSS timing function
  stagger: number; // ms between elements entering together
  tilt: number; // degrees cards lean toward the cursor (mouse only), 0 for none
  glow: number; // strength of the spotlight following the cursor on cards, 0 to 1
}
