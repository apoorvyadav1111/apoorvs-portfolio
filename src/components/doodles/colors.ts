// Colours for drawing zen on canvas. Theme colours are hex, or
// color-mix(in oklab, #a N%, #b) while a timelapse blends, which canvas can't
// be trusted with, so they're mixed here.

export type RGB = [number, number, number];

export function hex(value: string): RGB {
  let h = value.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function color(value: string): RGB {
  const m = value.match(/color-mix\(in oklab,\s*(#[0-9a-f]{3,8})\s+([\d.]+)%,\s*(#[0-9a-f]{3,8})\)/i);
  if (!m) return hex(value.trim());
  const [a, b, p] = [hex(m[1]), hex(m[3]), Number(m[2]) / 100];
  return a.map((v, i) => v * p + b[i] * (1 - p)) as RGB;
}
export const rgba = (c: RGB, a = 1) => `rgba(${c.map(Math.round).join(",")},${a})`;
export const mix = (a: RGB, b: RGB, p: number) => a.map((v, i) => v * p + b[i] * (1 - p)) as RGB;

// A theme colour, by CSS variable name, ready for canvas
export function themeColor(name: string, alpha = 1) {
  return rgba(color(getComputedStyle(document.documentElement).getPropertyValue(name)), alpha);
}
