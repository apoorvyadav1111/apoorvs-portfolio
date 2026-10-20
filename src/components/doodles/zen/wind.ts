import type { SkyPlugin } from "@/lib/sky";

// Zen's wind: the pointer (or a finger) leaves a soft trail that fades behind
// it, and the gust it makes pushes falling things the way it moved. Also sets
// zen's calmer sky: more particles, bigger and slower, even if set to Off.

const REACH = 120; // px around the pointer that the gust moves things
const TRAIL_LIFE = 0.8; // seconds a point of the trail lasts

export function wind(): SkyPlugin {
  let trail: { x: number; y: number; age: number }[] = [];
  const gust = { x: 0, y: 0, vx: 0, vy: 0 };

  return {
    id: "zen-wind",
    densityScale: 1.25,
    sizeScale: 1.25,
    speedScale: 0.7,
    alwaysOn: true,
    holdTouch: true,

    pointer(x, y) {
      const last = trail[trail.length - 1];
      if (last) {
        gust.vx = (x - last.x) * 14;
        gust.vy = (y - last.y) * 14;
      }
      gust.x = x;
      gust.y = y;
      trail.push({ x, y, age: 0 });
      if (trail.length > 40) trail.shift();
    },

    push(p, dt) {
      const dx = p.x - gust.x;
      const dy = p.y - gust.y;
      const near = dx * dx + dy * dy;
      if (near >= REACH * REACH) return;
      const f = 1 - Math.sqrt(near) / REACH;
      p.x += gust.vx * f * dt;
      p.y += gust.vy * f * 0.6 * dt;
    },

    draw({ ctx, dt, fg }) {
      gust.vx *= Math.pow(0.02, dt);
      gust.vy *= Math.pow(0.02, dt);
      if (!trail.length) return;
      for (const pt of trail) pt.age += dt;
      trail = trail.filter((pt) => pt.age < TRAIL_LIFE);
      ctx.strokeStyle = fg;
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const life = 1 - b.age / TRAIL_LIFE;
        ctx.globalAlpha = 0.28 * life;
        ctx.lineWidth = 1 + 3 * life;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    },
  };
}
