"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, currentSeason } from "@/themes";
import type { Season } from "@/themes";
import { addToSky } from "@/lib/sky";
import { themeColor } from "../colors";
import Doodle from "../Doodle";
import { LEG_COLOUR, MOUTH, drawDog, drawPaws, paws } from "./dog";
import type { DogPose } from "./dog";
import { drawGround, scenery } from "./lawn";
import { makeView } from "./view";
import { TOYS, TOY_KINDS, drawTreat } from "./toys";
import type { ToyKind } from "./toys";

// Fetch (/doodles/fetch), in a garden seen across at a gentle angle (view.ts).
// Pick a toy, grab it and flick it anywhere across the lawn (up the screen
// is further away), or tap where it should land. It rises into the air over
// its shadow, lands, bounces or slides by its own nature (toys.ts). The dog chases it, leaps to catch it
// in the air when it can, otherwise picks it up, and brings it back to
// wherever you are (your pointer), dropping it at your feet. Tap the dog for
// a pat, or hold and stroke it: it closes its eyes, wags, and hearts float up.
// Or give it a treat (the Treat button): a biscuit appears in your hand, the
// dog drops whatever it has, runs to you, sits, takes it with a hop, munches,
// and jumps about happily.

const RUN = 420; // the dog's top speed after the toy, px/s
const TROT = 280; // bringing it back
const TURN = 8; // how fast it can turn, rad/s
const DOG_GRAVITY = 1500;
// A flick's strength: screen speed × POWER, at most MAX_THROW across the lawn
const POWER = 0.55;
const MAX_THROW = 1500;
const DOG_SIZE = 1.25; // the dog sprite's scale, up close
const LEGS = 9; // how high its body stands off the grass

type Mode = "waiting" | "chasing" | "picking" | "returning" | "begging" | "munching" | "celebrating";

const seasonNow = (): Season =>
  THEMES.find((t) => t.id === document.documentElement.dataset.palette)?.season ?? currentSeason();

export default function FetchGame() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<ToyKind>("ball");
  const kindRef = useRef<ToyKind>("ball");
  const treatAsked = useRef(0); // bumped by the Treat button

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
    let view = makeView(innerWidth, innerHeight);
    let things = scenery(view, seasonNow());
    const ground = document.createElement("canvas");
    const night = () => document.documentElement.dataset.theme !== "light";
    const paintGround = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      ground.width = w * dpr;
      ground.height = h * dpr;
      const g = ground.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawGround(g, view, seasonNow(), night());
      things = scenery(view, seasonNow());
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      view = makeView(w, h);
      paintGround();
    };
    resize();

    // Everything lives on the ground plane: x across, d back from you, z up
    const toy = { x: w * 0.52, d: view.depth * 0.22, z: 0, vx: 0, vd: 0, vz: 0, angle: 0, held: false, mouth: false, still: true };
    const dog = { x: w * 0.45, d: view.depth * 0.18, angle: Math.PI / 2, speed: 0, z: 0, vz: 0, mode: "waiting" as Mode, timer: 0, idle: 0 };
    const pose: DogPose = { run: 0, moving: false, sit: 1, wag: 0, blink: false, happy: 0 };
    let pats = 0;
    let treats = 0;
    let treatSeen = 0;
    const treat = { offered: false, x: 0, d: 0, hopped: false };
    let hops = 0;
    let lastJoy = 0;
    let patting = 0; // seconds of happiness left
    let stroking = false; // holding down on the dog
    let lastHeart = 0;
    let hearts: { x: number; y: number; vx: number; age: number; size: number }[] = [];
    const you = { x: w * 0.5, d: view.depth * 0.08 };
    let fetches = 0;
    let thrown = false;
    let bubble = { text: "", until: 0 };
    let samples: { X: number; Y: number; t: number }[] = []; // the hand, on screen
    let down: { X: number; Y: number; t: number } | null = null;

    const say = (text: string, ms = 1100) => (bubble = { text, until: performance.now() + ms });
    const free = () => !toy.held && !toy.mouth;
    const mouth = () => ({ x: dog.x + Math.cos(dog.angle) * MOUTH * DOG_SIZE, d: dog.d + Math.sin(dog.angle) * MOUTH * DOG_SIZE });
    const onLawn = (p: { x: number; d: number }) => ({
      x: Math.max(16, Math.min(w - 16, p.x)),
      d: Math.max(8, Math.min(view.depth * 0.97, p.d)),
    });

    const launch = (vx: number, vd: number, vz: number) => {
      const speed = Math.hypot(vx, vd);
      const k = speed > MAX_THROW ? MAX_THROW / speed : 1;
      Object.assign(toy, { vx: vx * k, vd: vd * k, vz, held: false, still: false });
      thrown = true;
      // A treat beats a toy: it'll chase this once it's done
      if (dog.mode !== "begging" && dog.mode !== "munching" && dog.mode !== "celebrating") dog.mode = "chasing";
    };

    // Where the dog is on screen, and whether a point is on it
    const onDog = (X: number, Y: number) => {
      const p = view.project(dog.x, dog.d, LEGS + dog.z);
      return Math.hypot(X - p.x, (Y - p.y) / 0.8) < 34 * p.s * DOG_SIZE;
    };
    // A pat: happy for a moment, and a heart or two
    const pat = (X: number, Y: number, count: number) => {
      patting = Math.max(patting, 1.6);
      lastHeart = performance.now();
      for (let i = 0; i < count; i++)
        hearts.push({ x: X + (Math.random() - 0.5) * 24, y: Y - 10, vx: (Math.random() - 0.5) * 30, age: -i * 0.12, size: 7 + Math.random() * 4 });
    };

    // ---- Your hand: the screen point under it, found on the lawn ----
    const HAND = 26; // a held toy is lifted this high
    const under = (X: number, Y: number) => onLawn(view.unproject(X, Y));
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest?.("button, a")) return;
      Object.assign(you, under(e.clientX, e.clientY));
      down = { X: e.clientX, Y: e.clientY, t: e.timeStamp };
      const seen = view.project(toy.x, toy.d, toy.z);
      if (free() && Math.hypot(e.clientX - seen.x, e.clientY - seen.y) < 46) {
        toy.held = true;
        toy.still = false;
        samples = [{ X: e.clientX, Y: e.clientY, t: e.timeStamp }];
      } else if (onDog(e.clientX, e.clientY)) {
        stroking = true;
        pats++;
        pat(e.clientX, e.clientY, 2);
      }
    };
    const onMove = (e: PointerEvent) => {
      Object.assign(you, under(e.clientX, e.clientY));
      // A hand over the dog, ready to pat it
      document.documentElement.style.cursor = !toy.held && onDog(e.clientX, e.clientY) ? "pointer" : "";
      // Stroking: a heart every so often as your hand moves over it
      if (stroking && onDog(e.clientX, e.clientY) && performance.now() - lastHeart > 260) pat(e.clientX, e.clientY, 1);
      if (!toy.held) return;
      // Held up in your hand: the toy shows at the pointer, its shadow below
      const g = under(e.clientX, e.clientY);
      const s = view.project(g.x, g.d).s;
      Object.assign(toy, under(e.clientX, e.clientY + HAND * s * 0.9), { z: HAND });
      samples.push({ X: e.clientX, Y: e.clientY, t: e.timeStamp });
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      if (stroking) {
        // A pat is a pat, not a throw
        stroking = false;
        down = null;
        return;
      }
      const t = TOYS[kindRef.current];
      if (toy.held) {
        // Let go: it leaves with your hand's speed as you see it on screen,
        // turned into lawn distance at the toy's own spot (the far end of the
        // screen covers much more lawn, which made flicks up it far too strong)
        const first = samples[0];
        const dt = Math.max((e.timeStamp - first.t) / 1000, 0.016);
        const sx = (e.clientX - first.X) / dt;
        const sy = (e.clientY - first.Y) / dt;
        const at = view.project(toy.x, toy.d);
        const perX = 1 / at.s; // lawn per screen px, across
        const perD = view.unproject(at.x, at.y - 1).d - toy.d; // and back
        const vx = sx * perX * POWER;
        const vd = -sy * perD * POWER;
        const speed = Math.hypot(vx, vd);
        if (speed < 60) {
          toy.held = false;
          toy.still = false;
          toy.vx = toy.vd = toy.vz = 0;
        } else launch(vx, vd, Math.min(180 + speed * 0.2, 520) * t.lift);
      } else if (free() && e.timeStamp - down.t < 350 && Math.hypot(e.clientX - down.X, e.clientY - down.Y) < 12) {
        // A tap: lob it to land about there
        const aim = under(e.clientX, e.clientY);
        const dx = aim.x - toy.x;
        const dd = aim.d - toy.d;
        const flight = 0.55 + Math.hypot(dx, dd) / 1600;
        launch(dx / flight, dd / flight, (t.gravity * flight) / 2);
      }
      down = null;
    };
    const onTouch = (e: TouchEvent) => (toy.held || stroking) && e.cancelable && e.preventDefault();

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
          toy.vd *= keep;
          toy.angle += t.spin * dt;
          if (toy.z <= 0) {
            toy.z = 0;
            toy.vz = -toy.vz * t.bounce;
            if (toy.vz < 60) toy.vz = 0;
          }
        } else {
          const keep = Math.pow(t.roll, dt);
          toy.vx *= keep;
          toy.vd *= keep;
          if (kindRef.current === "ball") toy.angle += Math.hypot(toy.vx, toy.vd) * dt * 0.1;
          if (Math.hypot(toy.vx, toy.vd) < 8) {
            toy.vx = toy.vd = 0;
            toy.still = true;
          }
        }
        toy.x += toy.vx * dt;
        toy.d += toy.vd * dt;
        // The garden's edges send it back
        const kept = onLawn(toy);
        if (kept.x !== toy.x) toy.vx = -toy.vx * 0.5;
        if (kept.d !== toy.d) toy.vd = -toy.vd * 0.5;
        Object.assign(toy, kept);
      }

      // The dog: turn toward somewhere and run there, stopping `short` of it
      // (its nose is ahead of its middle: it stops with its nose at a toy)
      const head = (tx: number, td: number, top: number, short = 0) => {
        const dx = tx - dog.x;
        const dd = td - dog.d;
        const dist = Math.hypot(dx, dd);
        if (dist > 3) {
          let turn = Math.atan2(dd, dx) - dog.angle;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          dog.angle += Math.max(-TURN * dt, Math.min(TURN * dt, turn));
        }
        const left = Math.max(0, dist - short);
        const want = Math.min(top, left * 4);
        dog.speed += (want - dog.speed) * Math.min(1, dt * 5);
        const stepLen = Math.min(left, dog.speed * dt);
        dog.x += Math.cos(dog.angle) * stepLen;
        dog.d += Math.sin(dog.angle) * stepLen;
        return dist;
      };
      if (dog.z > 0 || dog.vz > 0) {
        dog.vz -= DOG_GRAVITY * dt;
        dog.z = Math.max(0, dog.z + dog.vz * dt);
        if (dog.z === 0) dog.vz = 0;
      }

      // A treat on offer: drop everything (literally) and come
      if (treatAsked.current !== treatSeen) {
        treatSeen = treatAsked.current;
        if (!treat.offered && dog.mode !== "munching" && dog.mode !== "celebrating") {
          treat.offered = true;
          treat.hopped = false;
          if (toy.mouth) {
            const m0 = mouth();
            toy.mouth = false;
            Object.assign(toy, { x: m0.x, d: m0.d, z: 8, vx: 0, vd: 0, vz: 60, still: false });
          }
          dog.mode = "begging";
          dog.timer = 0;
        }
      }
      if (treat.offered) {
        // It's in your hand, wherever that is (above the toy picker)
        treat.x = you.x;
        treat.d = Math.max(you.d, view.unproject(w / 2, h - 130).d);
      }

      const m = mouth();
      switch (dog.mode) {
        case "begging": {
          const close = head(treat.x, treat.d, RUN * 0.85, MOUTH * DOG_SIZE - 2) < MOUTH * DOG_SIZE + 8;
          if (!close || dog.z > 0) break;
          // Sit nicely, then a little hop up to take it
          dog.timer += dt;
          if (dog.timer > 0.45 && !treat.hopped) {
            treat.hopped = true;
            dog.vz = 260;
          } else if (treat.hopped && dog.timer > 0.9) {
            treat.offered = false;
            treats++;
            say("yum!");
            dog.mode = "munching";
            dog.timer = 1.1;
          }
          break;
        }
        case "munching": {
          dog.speed *= Math.pow(0.001, dt);
          dog.timer -= dt;
          if (dog.timer <= 0) {
            dog.mode = "celebrating";
            dog.timer = 1.8;
            hops = 3;
          }
          break;
        }
        case "celebrating": {
          // Happy jumps and a spin, with hearts
          dog.speed = 0;
          dog.timer -= dt;
          dog.angle += 7 * dt;
          if (dog.z === 0 && hops > 0 && dog.timer < 1.7) {
            hops--;
            dog.vz = 330;
          }
          if (now - lastJoy > 220) {
            lastJoy = now;
            const p = view.project(dog.x, dog.d, LEGS + dog.z + 30);
            hearts.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y, vx: (Math.random() - 0.5) * 40, age: 0, size: 7 + Math.random() * 4 });
          }
          if (dog.timer <= 0 && dog.z === 0) {
            dog.mode = "waiting";
            dog.idle = 0;
          }
          break;
        }
        case "waiting": {
          dog.speed *= Math.pow(0.01, dt);
          dog.idle += dt;
          // Watch the toy if it's moving or in your hand; otherwise watch you
          const look = toy.held || (free() && !toy.still) ? toy : you;
          const want = Math.atan2(look.d - dog.d, look.x - dog.x);
          const turn = Math.atan2(Math.sin(want - dog.angle), Math.cos(want - dog.angle));
          dog.angle += Math.max(-4 * dt, Math.min(4 * dt, turn));
          if (free() && toy.still && Math.hypot(toy.x - dog.x, toy.d - dog.d) > 140 && dog.idle > 1.5) dog.mode = "chasing";
          if (dog.idle > 9 && Math.random() < dt * 0.25) say("woof?");
          break;
        }
        case "chasing": {
          if (!free()) {
            dog.mode = "waiting";
            break;
          }
          const lead = toy.still ? 0 : 0.2;
          head(toy.x + toy.vx * lead, toy.d + toy.vd * lead, RUN, toy.z > 8 ? 0 : MOUTH * DOG_SIZE - 6);
          const reach = Math.hypot(toy.x - m.x, toy.d - m.d);
          // Coming past within reach and not too high: leap for it
          if (toy.z > 14 && toy.z < 120 && reach < 64 && dog.z === 0 && toy.vz < 200) dog.vz = Math.sqrt(2 * DOG_GRAVITY * toy.z) * 0.85;
          const caught = toy.z > 8 ? reach < 24 && Math.abs(toy.z - (dog.z + 18)) < 32 : reach < 16 && dog.z === 0;
          if (caught) {
            toy.mouth = true;
            if (toy.z > 8) {
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
          // To you, but no lower than just above the toy picker
          const nearest = view.unproject(w / 2, h - 130).d;
          if (head(you.x, Math.max(you.d, nearest), TROT) < 50 && dog.z === 0) {
            // Drop it at your feet
            toy.mouth = false;
            Object.assign(toy, { x: m.x + Math.cos(dog.angle) * 8, d: m.d + Math.sin(dog.angle) * 8, z: 10, vx: 0, vd: 0, vz: 80, still: false });
            fetches++;
            if (fetches % 3 === 0) say(fetches % 6 === 0 ? "again!" : "woof!");
            dog.mode = "waiting";
            dog.idle = 0;
          }
          break;
        }
      }
      Object.assign(dog, onLawn(dog));

      const joyful = dog.mode === "munching" || dog.mode === "celebrating";
      const sitting = (dog.mode === "waiting" && !toy.held) || (dog.mode === "begging" && dog.timer > 0 && !treat.hopped) || dog.mode === "munching";
      pose.moving = (dog.speed > 25 && dog.mode !== "waiting" && dog.mode !== "picking") || dog.mode === "celebrating";
      pose.run += dt * (dog.mode === "celebrating" ? 300 : dog.speed) * 0.06;
      pose.sit += ((sitting ? 1 : 0) - pose.sit) * Math.min(1, dt * 4);
      if (joyful) patting = Math.max(patting, 0.2);
      // Being patted: eyes close, the tail goes, it leans in and sits
      patting = Math.max(0, patting - dt);
      pose.happy += ((patting > 0 ? 1 : 0) - pose.happy) * Math.min(1, dt * 8);
      if (patting > 0 && dog.mode === "waiting") pose.sit += (1 - pose.sit) * Math.min(1, dt * 6);
      pose.wag += dt * (patting > 0 ? 30 : toy.held || dog.mode === "returning" ? 22 : dog.mode === "waiting" ? 9 : 14);
      pose.blink = now % 3800 < 140;
      for (const heart of hearts) {
        heart.age += dt;
        heart.y -= 46 * dt;
        heart.x += heart.vx * dt;
      }
      hearts = hearts.filter((heart) => heart.age < 1.4);
    };

    // Lying on the ground at (x, d), facing `angle`: what's drawn after this
    // sits flat on the lawn, foreshortened by the view
    const onGround = (x: number, d: number, z: number, angle: number, size: number) => {
      const p = view.project(x, d, z);
      ctx.translate(p.x, p.y);
      ctx.scale(p.s * size, -p.s * size * view.squash);
      ctx.rotate(angle);
      return p;
    };

    const drawToy = () => {
      const t = TOYS[kindRef.current];
      // Its shadow on the grass, and the toy above it
      const shadow = view.project(toy.x, toy.d);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, 9 * shadow.s * (1 - Math.min(toy.z, 200) / 400), 9 * shadow.s * view.squash * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      const p = view.project(toy.x, toy.d, toy.z + 6);
      ctx.translate(p.x, p.y);
      // A ball is round from any angle; flat toys tip with the lawn
      if (kindRef.current === "ball") ctx.scale(p.s, p.s);
      else ctx.scale(p.s, -p.s * (toy.z > 4 ? 0.85 : view.squash));
      ctx.rotate(toy.angle);
      t.draw(ctx);
      ctx.restore();
    };

    const drawTheDog = () => {
      // Shadow, paws on the grass, legs up to the body, then the body
      const g = view.project(dog.x, dog.d);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, 30 * g.s * DOG_SIZE * (1 - Math.min(dog.z, 160) / 320), 14 * g.s * DOG_SIZE * view.squash, 0, 0, Math.PI * 2);
      ctx.fill();

      const lift = LEGS + dog.z;
      ctx.save();
      onGround(dog.x, dog.d, dog.z, dog.angle, DOG_SIZE);
      const feet = ctx.getTransform();
      if (dog.z < 4) drawPaws(ctx, pose);
      ctx.restore();
      ctx.save();
      onGround(dog.x, dog.d, lift, dog.angle, DOG_SIZE);
      const body = ctx.getTransform();
      ctx.restore();

      // Legs: from each paw up to where it meets the body
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = Math.min(devicePixelRatio, 2);
      ctx.strokeStyle = LEG_COLOUR;
      ctx.lineCap = "round";
      ctx.lineWidth = 5 * g.s * DOG_SIZE * dpr;
      for (const paw of paws(pose)) {
        if (!paw.front && pose.sit > 0.6) continue;
        const a = feet.transformPoint(new DOMPoint(paw.x, paw.y));
        const b = body.transformPoint(new DOMPoint(paw.x * 0.85, paw.y * 0.8));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      onGround(dog.x, dog.d, lift, dog.angle, DOG_SIZE);
      const carried = TOYS[kindRef.current];
      drawDog(
        ctx,
        pose,
        themeColor("--accent"),
        dog.mode === "munching"
          ? () => {
              ctx.rotate(Math.PI / 2);
              ctx.scale(0.8, 0.8);
              drawTreat(ctx);
            }
          : toy.mouth
            ? () => {
                if (carried.crosswise) ctx.rotate(Math.PI / 2);
                carried.draw(ctx);
              }
            : undefined,
      );
      ctx.restore();
    };

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      step(dt, now);
      ctx.drawImage(ground, 0, 0, w, h);

      // Everything standing, far to near, so nearer things cover farther ones.
      // A toy high in the air goes over everything.
      const order: { d: number; draw: () => void }[] = things.map((t) => ({ d: t.d, draw: () => t.draw(ctx) }));
      order.push({ d: dog.d, draw: drawTheDog });
      if (!toy.mouth) order.push({ d: toy.z > 50 ? -1 : toy.d, draw: drawToy });
      order.sort((a, b) => b.d - a.d);
      for (const o of order) o.draw();

      // The same golden light over what stands in the garden, so it all matches
      if (night()) {
        ctx.fillStyle = "rgba(255, 150, 70, 0.08)";
        ctx.fillRect(0, view.horizon - 20, w, h);
      }

      // The treat, held out in your hand
      if (treat.offered) {
        const ground = view.project(treat.x, treat.d);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath();
        ctx.ellipse(ground.x, ground.y, 8 * ground.s, 3 * ground.s, 0, 0, Math.PI * 2);
        ctx.fill();
        const p = view.project(treat.x, treat.d, 34);
        ctx.save();
        ctx.translate(p.x, p.y + Math.sin(now / 250) * 2);
        ctx.scale(p.s * 1.5, p.s * 1.5);
        ctx.rotate(-0.3);
        drawTreat(ctx);
        ctx.restore();
      }

      // Hearts from pats, floating up and fading
      for (const heart of hearts) {
        if (heart.age < 0) continue;
        const a = Math.min(1, heart.age * 6) * (1 - heart.age / 1.4);
        const r = heart.size * (0.6 + Math.min(heart.age, 0.3));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#ef5a7a";
        ctx.beginPath();
        ctx.moveTo(heart.x, heart.y + r * 0.9);
        ctx.bezierCurveTo(heart.x - r * 1.4, heart.y - r * 0.2, heart.x - r * 0.6, heart.y - r * 1.2, heart.x, heart.y - r * 0.45);
        ctx.bezierCurveTo(heart.x + r * 0.6, heart.y - r * 1.2, heart.x + r * 1.4, heart.y - r * 0.2, heart.x, heart.y + r * 0.9);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Speech bubble
      if (now < bubble.until) {
        const p = view.project(dog.x, dog.d, dog.z + 70);
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        const tw = ctx.measureText(bubble.text).width;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.roundRect(p.x - tw / 2 - 8, p.y - 15, tw + 16, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#2a1d14";
        ctx.textAlign = "center";
        ctx.fillText(bubble.text, p.x, p.y + 2);
      }

      // How to play (until the first throw), and the tally
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 4;
      if (!thrown) {
        ctx.textAlign = "center";
        ctx.fillText("DRAG THE TOY AND LET GO · OR TAP WHERE TO THROW", w / 2, view.horizon + 40);
        ctx.fillText("TAP THE DOG FOR A PAT", w / 2, view.horizon + 58);
      }
      const tally = [
        fetches && `${fetches} ${fetches === 1 ? "FETCH" : "FETCHES"}`,
        pats && `${pats} ${pats === 1 ? "PAT" : "PATS"}`,
        treats && `${treats} ${treats === 1 ? "TREAT" : "TREATS"}`,
      ].filter(Boolean);
      if (tally.length) {
        // Up in the sky: dark on a day sky, light on a sunset
        ctx.textAlign = "right";
        if (!night()) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(30, 45, 70, 0.7)";
        }
        ctx.fillText(tally.join(" · "), w - 24, 34);
      }
      ctx.shadowBlur = 0;

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    // A new season or light/dark repaints the garden
    const watcher = new MutationObserver(paintGround);
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
      document.documentElement.style.cursor = "";
    };
  }, []);

  return (
    <Doodle title="Fetch: a dog in a garden waits for you to throw its toy. Pick a toy, drag it and let go, or tap where you want it to land.">
      <canvas
        ref={canvas}
        role="img"
        aria-label="A garden, with a dog waiting for its toy"
        className="pointer-events-none fixed inset-0 z-[35] h-full w-full touch-none"
      />
      {/* Which toy to throw, and a treat to give */}
      <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Toy"
        className="flex gap-1 rounded-pill border border-white/30 bg-black/35 p-1 shadow-lg backdrop-blur"
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
            <Icon draw={TOYS[k].draw} tilt={k === "stick" || k === "bone"} />
            <span className="hidden sm:inline">{TOYS[k].name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => treatAsked.current++}
        aria-label="Give the dog a treat"
        className="flex items-center gap-1.5 rounded-pill border border-white/30 bg-[#c98a45] px-3 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Icon draw={drawTreat} tilt />
        <span className="hidden sm:inline">Treat</span>
      </button>
      </div>
    </Doodle>
  );
}

// A toy (or the treat), drawn small for its button
function Icon({ draw, tilt = false }: { draw: (ctx: CanvasRenderingContext2D) => void; tilt?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(devicePixelRatio, 2);
    c.width = 22 * dpr;
    c.height = 22 * dpr;
    g.setTransform(dpr * 0.55, 0, 0, dpr * 0.55, 11 * dpr, 11 * dpr);
    if (tilt) g.rotate(-0.6);
    draw(g);
  }, [draw, tilt]);
  return <canvas ref={ref} aria-hidden className="h-[22px] w-[22px]" />;
}
