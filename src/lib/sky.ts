// Plug-in points for the seasonal sky (src/components/SeasonSky.tsx), so a
// feature can add to it without the sky knowing about that feature. Zen mode
// (src/components/zen) plugs in its wind and trail here; game pieces such as a
// watering can or trees would plug in the same way.
//
//   const remove = addToSky({ id: "wind", densityScale: 1.25, push, draw });
//   ...
//   remove();
//
// Settings from every plug-in combine (scales multiply). The sky restarts when
// plug-ins come or go, so scale changes take effect at once.

export interface SkyFrame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  edge: number; // where things land, in viewport px
  t: number; // seconds
  dt: number;
  fg: string; // the falling season's text colour (hex)
}

export interface SkyParticle {
  x: number;
  y: number;
}

export interface SkyPlugin {
  id: string;
  densityScale?: number; // how many fall
  sizeScale?: number; // how big
  speedScale?: number; // how fast
  alwaysOn?: boolean; // fall even when the visitor set particles to Off
  holdTouch?: boolean; // a finger moving over the page drives the plug-in, not scrolling
  pointer?: (x: number, y: number) => void; // the pointer or a finger moved
  push?: (p: SkyParticle, dt: number) => void; // nudge each falling particle, every frame
  draw?: (frame: SkyFrame) => void; // draw over the particles and pile, every frame
}

const plugins = new Map<string, SkyPlugin>();

export function addToSky(plugin: SkyPlugin) {
  plugins.set(plugin.id, plugin);
  dispatchEvent(new Event("sky-plugins"));
  return () => {
    if (plugins.get(plugin.id) !== plugin) return;
    plugins.delete(plugin.id);
    dispatchEvent(new Event("sky-plugins"));
  };
}

export function skyPlugins() {
  return [...plugins.values()];
}

// The combined settings of every plug-in
export function skySettings() {
  const all = skyPlugins();
  const product = (key: "densityScale" | "sizeScale" | "speedScale") => all.reduce((n, p) => n * (p[key] ?? 1), 1);
  return {
    density: product("densityScale"),
    size: product("sizeScale"),
    speed: product("speedScale"),
    alwaysOn: all.some((p) => p.alwaysOn),
    holdTouch: all.some((p) => p.holdTouch),
  };
}
