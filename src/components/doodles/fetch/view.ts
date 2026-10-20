// The camera for fetch: looking across the garden at a gentle angle rather
// than straight down. The lawn is a ground plane, x across and d into the
// distance (0 at your feet, `depth` at the far fence); things can also be z
// above it. Near things sit low on the screen and full size; far things rise
// toward the horizon, closer together and smaller.

export interface View {
  w: number;
  h: number;
  horizon: number; // screen y where the lawn meets the sky
  depth: number; // how far back the lawn goes, in ground px
  squash: number; // how flat the ground looks, for things lying on it
  project: (x: number, d: number, z?: number) => { x: number; y: number; s: number };
  unproject: (X: number, Y: number) => { x: number; d: number };
}

const SHRINK = 0.5; // the far fence is drawn at half size
const CURVE = 1.2; // >1 crowds the distance toward the horizon, as perspective does
const SQUASH = 0.6;

export function makeView(w: number, h: number): View {
  const horizon = h * 0.2;
  const depth = h * 1.6;
  const near = h * 1.04; // your feet are just below the bottom of the screen
  const scale = (t: number) => 1 - SHRINK * t;
  const cx = w / 2;

  return {
    w,
    h,
    horizon,
    depth,
    squash: SQUASH,
    project(x, d, z = 0) {
      const t = Math.max(0, Math.min(1.2, d / depth));
      const s = scale(t);
      return {
        x: cx + (x - cx) * s,
        y: horizon + (near - horizon) * Math.pow(Math.max(0, 1 - t), CURVE) - z * s * 0.9,
        s,
      };
    },
    unproject(X, Y) {
      const f = Math.max(0, Math.min(1, (Y - horizon) / (near - horizon)));
      const t = 1 - Math.pow(f, 1 / CURVE);
      return { x: cx + (X - cx) / scale(t), d: t * depth };
    },
  };
}
