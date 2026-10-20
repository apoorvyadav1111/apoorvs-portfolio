"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, currentSeason } from "@/themes";
import type { Season } from "@/themes";
import { addToSky } from "@/lib/sky";
import { themeColor } from "../colors";
import Doodle from "../Doodle";
import { MOUTH, drawDog } from "./dog";
import type { DogPose } from "./dog";
import { drawLawn } from "./lawn";
import { TOYS, TOY_KINDS } from "./toys";
import type { ToyKind } from "./toys";

// Fetch (/doodles/fetch), in a garden seen from above. Pick a toy, grab it
// and flick it anywhere across the lawn, or tap where it should land. It
// flies with a little height (its shadow shows how much), lands, bounces or
// slides by its own nature (toys.ts). The dog chases it, leaps to catch it
// in the air when it can, otherwise picks it up, and brings it back to
// wherever you are (your pointer), dropping it at your feet.

const RUN = 420; // the dog's top speed after the toy, px/s
const TROT = 280; // bringing it back
const TURN = 8; // how fast it can turn, rad/s
const DOG_GRAVITY = 1500;
const MAX_THROW = 2200;

type Mode = "waiting" | "chasing" | "picking" | "returning";

const seasonNow = (): Season =>
  THEMES.find((t) => t.id === document.documentElement.dataset.palette)?.season ?? currentSeason();

export default function FetchGame() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<ToyKind>("ball");
  const kindRef = useRef<ToyKind>("ball");

  useEffect(() => {
    kindRef.current = kind;
  }, [kind]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    // Its own world: no seasonal sky falling over the garden
    const removeSky = addToSky({ id: "fetch", hidden: true });

    let w = 0;
    let h = 0;
    let frame = 0;
    let last = performance.now();
    const lawn = document.createElement("canvas");
    const paintLawn = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      lawn.width = w * dpr;
      lawn.height = h * dpr;
      const g = lawn.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLawn(g, w, h, seasonNow(), document.documentElement.dataset.theme !== "light");
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintLawn();
    };
    resize();

    // The toy: position on the lawn, height above it (z), and how it's moving
    const toy = { x: w * 0.5, y: h * 0.62, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, held: false, mouth: false, still: true };
    const dog = { x: w * 0.5 - 50, y: h * 0.62, angle: 0, speed: 0, z: 0, vz: 0, mode: "waiting" as Mode, timer: 0, idle: 0 };
    const pose: DogPose = { run: 0, moving: false, sit: 1, wag: 0, blink: false };
    const you = { x: w * 0.5, y: h * 0.75 };
    let fetches = 0;
    let thrown = false;
    let bubble = { text: "", until: 0 };
    let samples: { x: number; y: number; t: number }[] = [];
    let down: { x: number; y: number; t: number } | null = null;

    const say = (text: string, ms = 1100) => (bubble = { text, until: performance.now() + ms });
    const free = () => !toy.held && !toy.mouth;
    const mouth = () => ({ x: dog.x + Math.cos(dog.angle) * MOUTH, y: dog.y + Math.sin(dog.angle) * MOUTH });

    const launch = (vx: number, vy: number, vz: number) => {
      const speed = Math.hypot(vx, vy);
      const k = speed > MAX_THROW ? MAX_THROW / speed : 1;
      Object.assign(toy, { vx: vx * k, vy: vy * k, vz, held: false, still: false });
      thrown = true;
      dog.mode = "chasing";
    };

    // ---- Your hand ----
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest?.("button, a")) return;
      you.x = e.clientX;
      you.y = e.clientY;
      down = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      if (free() && Math.hypot(e.clientX - toy.x, e.clientY - toy.y) < 44) {
        toy.held = true;
        toy.still = false;
        samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
      }
    };
    const onMove = (e: PointerEvent) => {
      you.x = e.clientX;
      you.y = e.clientY;
      if (!toy.held) return;
      toy.x = e.clientX;
      toy.y = e.clientY;
      toy.z = 24; // lifted in your hand
      samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const t = TOYS[kindRef.current];
      if (toy.held) {
        // Let go: it leaves with your hand's recent speed, and a little height
        const first = samples[0];
        const dt = Math.max((e.timeStamp - first.t) / 1000, 0.016);
        const vx = (e.clientX - first.x) / dt;
        const vy = (e.clientY - first.y) / dt;
        const speed = Math.hypot(vx, vy);
        if (speed < 90) {
          toy.held = false;
          toy.still = false;
          toy.vx = toy.vy = toy.vz = 0;
        } else launch(vx, vy, Math.min(220 + speed * 0.25, 650) * t.lift);
      } else if (free() && e.timeStamp - down.t < 350 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12) {
        // A tap: lob it to land about there
        const dx = e.clientX - toy.x;
        const dy = e.clientY - toy.y;
        const flight = 0.55 + Math.hypot(dx, dy) / 1600;
        launch(dx / flight, dy / flight, (t.gravity * flight) / 2);
      }
      down = null;
    };
    const onTouch = (e: TouchEvent) => toy.held && e.cancelable && e.preventDefault();

    // ---- The world ----
    const step = (dt: number, now: number) => {
      const t = TOYS[kindRef.current];

      // The toy
      if (free()) {
        if (toy.z > 0 || toy.vz > 0) {
          toy.vz -= t.gravity * dt;
          toy.z += toy.vz * dt;
          const keep = Math.pow(t.drag, dt);
          toy.vx *= keep;
          toy.vy *= keep;
          toy.angle += t.spin * dt;
          if (toy.z <= 0) {
            toy.z = 0;
            toy.vz = -toy.vz * t.bounce;
            if (toy.vz < 60) toy.vz = 0;
          }
        } else {
          const keep = Math.pow(t.roll, dt);
          toy.vx *= keep;
          toy.vy *= keep;
          if (kindRef.current === "ball") toy.angle += Math.hypot(toy.vx, toy.vy) * dt * 0.1;
          if (Math.hypot(toy.vx, toy.vy) < 8) {
            toy.vx = toy.vy = 0;
            toy.still = true;
          }
        }
        toy.x += toy.vx * dt;
        toy.y += toy.vy * dt;
        // The garden's edges send it back
        if (toy.x < 12 || toy.x > w - 12) {
          toy.vx = -toy.vx * 0.5;
          toy.x = Math.max(12, Math.min(w - 12, toy.x));
        }
        if (toy.y < 12 || toy.y > h - 12) {
          toy.vy = -toy.vy * 0.5;
          toy.y = Math.max(12, Math.min(h - 12, toy.y));
        }
      }

      // The dog: turn toward somewhere and run there
      const head = (tx: number, ty: number, top: number) => {
        const dx = tx - dog.x;
        const dy = ty - dog.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          let turn = Math.atan2(dy, dx) - dog.angle;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          dog.angle += Math.max(-TURN * dt, Math.min(TURN * dt, turn));
        }
        const want = Math.min(top, dist * 4);
        dog.speed += (want - dog.speed) * Math.min(1, dt * 5);
        const stepLen = Math.min(dist, dog.speed * dt);
        dog.x += Math.cos(dog.angle) * stepLen;
        dog.y += Math.sin(dog.angle) * stepLen;
        return dist;
      };
      if (dog.z > 0 || dog.vz > 0) {
        dog.vz -= DOG_GRAVITY * dt;
        dog.z = Math.max(0, dog.z + dog.vz * dt);
        if (dog.z === 0) dog.vz = 0;
      }

      const m = mouth();
      switch (dog.mode) {
        case "waiting": {
          dog.speed *= Math.pow(0.01, dt);
          dog.idle += dt;
          // Watch the toy if it's moving or in your hand; otherwise watch you
          const look = toy.held || (free() && !toy.still) ? toy : you;
          const turn = Math.atan2(Math.sin(Math.atan2(look.y - dog.y, look.x - dog.x) - dog.angle), Math.cos(Math.atan2(look.y - dog.y, look.x - dog.x) - dog.angle));
          dog.angle += Math.max(-4 * dt, Math.min(4 * dt, turn));
          if (free() && toy.still && Math.hypot(toy.x - dog.x, toy.y - dog.y) > 130 && dog.idle > 1.5) dog.mode = "chasing";
          if (dog.idle > 9 && Math.random() < dt * 0.25) say("woof?");
          break;
        }
        case "chasing": {
          if (!free()) {
            dog.mode = "waiting";
            break;
          }
          const lead = toy.still ? 0 : 0.2;
          head(toy.x + toy.vx * lead, toy.y + toy.vy * lead, RUN);
          const reach = Math.hypot(toy.x - m.x, toy.y - m.y);
          // Coming past within reach and not too high: leap for it
          if (toy.z > 12 && toy.z < 110 && reach < 60 && dog.z === 0 && toy.vz < 200) dog.vz = Math.sqrt(2 * DOG_GRAVITY * toy.z) * 0.9;
          const caught = toy.z > 6 ? reach < 22 && Math.abs(toy.z - dog.z) < 30 : reach < 15 && dog.z === 0;
          if (caught) {
            toy.mouth = true;
            if (toy.z > 6) {
              say("woof!");
              dog.mode = "returning";
            } else {
              dog.mode = "picking";
              dog.timer = 0.25;
            }
          }
          break;
        }
        case "picking": {
          dog.speed *= Math.pow(0.001, dt);
          dog.timer -= dt;
          if (dog.timer <= 0) dog.mode = "returning";
          break;
        }
        case "returning": {
          if (head(you.x, you.y, TROT) < 46 && dog.z === 0) {
            // Drop it at your feet
            toy.mouth = false;
            Object.assign(toy, { x: m.x + Math.cos(dog.angle) * 6, y: m.y + Math.sin(dog.angle) * 6, z: 4, vx: 0, vy: 0, vz: 60, still: false });
            fetches++;
            if (fetches % 3 === 0) say(fetches % 6 === 0 ? "again!" : "woof!");
            dog.mode = "waiting";
            dog.idle = 0;
          }
          break;
        }
      }
      dog.x = Math.max(20, Math.min(w - 20, dog.x));
      dog.y = Math.max(20, Math.min(h - 20, dog.y));

      pose.moving = dog.speed > 25 && dog.mode !== "waiting" && dog.mode !== "picking";
      pose.run += dt * dog.speed * 0.06;
      pose.sit += ((dog.mode === "waiting" && !toy.held ? 1 : 0) - pose.sit) * Math.min(1, dt * 4);
      pose.wag += dt * (toy.held || dog.mode === "returning" ? 22 : dog.mode === "waiting" ? 9 : 14);
      pose.blink = now % 3800 < 140;
    };

    const drawToy = (x: number, y: number, z: number) => {
      // Its shadow, further off the higher it is (light from the top left)
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(x + 3 + z * 0.35, y + 4 + z * 0.55, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 + z / 220, 1 + z / 220);
      ctx.rotate(toy.angle);
      TOYS[kindRef.current].draw(ctx);
      ctx.restore();
    };

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      step(dt, now);
      ctx.drawImage(lawn, 0, 0, w, h);

      const toyLow = free() && toy.z < 20;
      if (toyLow) drawToy(toy.x, toy.y, toy.z);

      // The dog, its shadow, and anything in its mouth
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(dog.x + 4 + dog.z * 0.35, dog.y + 6 + dog.z * 0.55, 30, 15, dog.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(dog.x, dog.y);
      ctx.rotate(dog.angle);
      ctx.scale(1.2 + dog.z / 200, 1.2 + dog.z / 200);
      const carried = TOYS[kindRef.current];
      drawDog(
        ctx,
        pose,
        themeColor("--accent"),
        toy.mouth
          ? () => {
              if (carried.crosswise) ctx.rotate(Math.PI / 2);
              carried.draw(ctx);
            }
          : undefined,
      );
      ctx.restore();

      if (!toyLow && !toy.mouth) drawToy(toy.x, toy.y, toy.z);

      // Night settles over everything in the garden, the dog included
      if (document.documentElement.dataset.theme !== "light") {
        ctx.fillStyle = "rgba(10, 16, 34, 0.25)";
        ctx.fillRect(0, 0, w, h);
      }

      // Speech bubble
      if (now < bubble.until) {
        const bx = dog.x;
        const by = dog.y - 46 - dog.z * 0.5;
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        const tw = ctx.measureText(bubble.text).width;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.roundRect(bx - tw / 2 - 8, by - 15, tw + 16, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#2a1d14";
        ctx.textAlign = "center";
        ctx.fillText(bubble.text, bx, by + 2);
      }

      // How to play (until the first throw), and the tally
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 4;
      if (!thrown) {
        ctx.textAlign = "center";
        ctx.fillText("DRAG THE TOY AND LET GO · OR TAP WHERE TO THROW", w / 2, h * 0.36);
      }
      if (fetches) {
        ctx.textAlign = "right";
        ctx.fillText(`${fetches} ${fetches === 1 ? "FETCH" : "FETCHES"}`, w - 24, 34);
      }
      ctx.shadowBlur = 0;

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    // A new season or light/dark repaints the garden
    const watcher = new MutationObserver(paintLawn);
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-theme"] });
    addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerup", onUp);
    addEventListener("touchmove", onTouch, { passive: false });
    addEventListener("resize", resize);
    const onVisible = () => (last = performance.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(frame);
      removeSky();
      watcher.disconnect();
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("touchmove", onTouch);
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <Doodle title="Fetch: a dog in a garden waits for you to throw its toy. Pick a toy, drag it and let go, or tap where you want it to land.">
      <canvas
        ref={canvas}
        role="img"
        aria-label="A garden seen from above, with a dog waiting for its toy"
        className="pointer-events-none fixed inset-0 z-[35] h-full w-full touch-none"
      />
      {/* Which toy to throw */}
      <div
        role="radiogroup"
        aria-label="Toy"
        className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-pill border border-white/30 bg-black/35 p-1 shadow-lg backdrop-blur"
      >
        {TOY_KINDS.map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
              kind === k ? "bg-white text-neutral-900" : "text-white/85 hover:bg-white/15"
            }`}
          >
            <ToyIcon kind={k} />
            {TOYS[k].name}
          </button>
        ))}
      </div>
    </Doodle>
  );
}

// The toy, drawn small for its button
function ToyIcon({ kind }: { kind: ToyKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(devicePixelRatio, 2);
    c.width = 22 * dpr;
    c.height = 22 * dpr;
    g.setTransform(dpr * 0.55, 0, 0, dpr * 0.55, 11 * dpr, 11 * dpr);
    if (kind === "stick" || kind === "bone") g.rotate(-0.6);
    TOYS[kind].draw(g);
  }, [kind]);
  return <canvas ref={ref} aria-hidden className="h-[22px] w-[22px]" />;
}
