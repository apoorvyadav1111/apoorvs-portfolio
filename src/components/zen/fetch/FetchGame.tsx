"use client";

import { useEffect, useRef } from "react";
import { BALL, drawDog, mouthOffset } from "./dog";
import type { DogPose } from "./dog";
import { themeColor } from "../colors";

// Fetch, in the zen park (/zen/fetch). Grab the ball and flick it, or tap
// where you'd like it to go. The dog chases it, leaps for it if it can,
// otherwise picks it up, and trots it back to wherever you are (your pointer),
// dropping it at your feet. The ground is zen's (the [data-ground] strip).

const R = 9; // ball radius
const GRAVITY = 1700; // px/s²
const RUN = 440; // the dog's top speed after the ball, px/s
const TROT = 300; // bringing it back
const MAX_THROW = 2400;

type Mode = "waiting" | "chasing" | "picking" | "returning";

export default function FetchGame() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    let w = 0;
    let h = 0;
    let ground = 0;
    let frame = 0;
    let last = performance.now();

    const ball = { x: 0, y: 0, vx: 0, vy: 0, held: false, mouth: false, still: true };
    const dog = { x: 0, y: 0, vy: 0, dir: 1, speed: 0, mode: "waiting" as Mode, timer: 0, idle: 0 };
    const pose: DogPose = { run: 0, moving: false, sit: 1, crouch: 0, air: false, wag: 0, tilt: 0, ball: false, blink: false };
    let you = 0; // where you are: the pointer's x
    let fetches = 0;
    let thrown = false; // the hint goes once you've thrown
    let bubble = { text: "", until: 0 };
    let samples: { x: number; y: number; t: number }[] = [];
    let down: { x: number; y: number; t: number; grabbed: boolean } | null = null;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ground = document.querySelector("[data-ground]")?.getBoundingClientRect().top ?? h * 0.92;
    };
    resize();
    // Start: the dog sits a third of the way in, the ball at its feet
    dog.x = w * 0.32;
    you = w * 0.32;
    ball.x = dog.x + 46;
    ball.y = ground - R;

    const say = (text: string, ms = 1100) => (bubble = { text, until: performance.now() + ms });
    const free = () => !ball.held && !ball.mouth;

    const throwBall = (vx: number, vy: number) => {
      const speed = Math.hypot(vx, vy);
      const k = speed > MAX_THROW ? MAX_THROW / speed : 1;
      ball.vx = vx * k;
      ball.vy = vy * k;
      ball.held = false;
      ball.still = false;
      thrown = true;
      dog.mode = "chasing";
    };

    // ---- Your hand ----
    const isControl = (e: PointerEvent) => (e.target as Element).closest?.("button, a");
    const onDown = (e: PointerEvent) => {
      if (isControl(e)) return;
      you = e.clientX;
      down = { x: e.clientX, y: e.clientY, t: e.timeStamp, grabbed: false };
      // Grab the ball if it's free and within reach of the pointer
      if (free() && Math.hypot(e.clientX - ball.x, e.clientY - ball.y) < 44) {
        ball.held = true;
        ball.still = false;
        down.grabbed = true;
        samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
      }
    };
    const onMove = (e: PointerEvent) => {
      you = e.clientX;
      if (!ball.held) return;
      ball.x = Math.max(R, Math.min(w - R, e.clientX));
      ball.y = Math.min(ground - R, e.clientY);
      ball.vx = ball.vy = 0;
      samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      if (ball.held) {
        // Let go: the ball leaves with the hand's recent velocity
        const first = samples[0];
        const dt = Math.max((e.timeStamp - first.t) / 1000, 0.016);
        const vx = (e.clientX - first.x) / dt;
        const vy = (e.clientY - first.y) / dt;
        if (Math.hypot(vx, vy) < 90) {
          ball.held = false; // just dropped
          ball.still = false;
        } else throwBall(vx, vy);
      } else if (free() && !down.grabbed && e.timeStamp - down.t < 350 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12) {
        // A tap elsewhere: lob it toward the tap
        const dx = e.clientX - ball.x;
        throwBall(dx * 1.15, -(520 + Math.min(Math.abs(dx), 900) * 0.45));
      }
      down = null;
    };
    // Holding the ball on a phone shouldn't scroll the page
    const onTouch = (e: TouchEvent) => ball.held && e.cancelable && e.preventDefault();

    // ---- The world ----
    const step = (dt: number, now: number) => {
      // Ball
      if (free()) {
        ball.vy += GRAVITY * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < R) {
          ball.x = R;
          ball.vx = Math.abs(ball.vx) * 0.6;
        }
        if (ball.x > w - R) {
          ball.x = w - R;
          ball.vx = -Math.abs(ball.vx) * 0.6;
        }
        if (ball.y >= ground - R) {
          ball.y = ground - R;
          if (ball.vy > 140) {
            ball.vy = -ball.vy * 0.55;
            ball.vx *= 0.85;
          } else {
            ball.vy = 0;
            ball.vx *= Math.pow(0.2, dt);
            if (Math.abs(ball.vx) < 6) {
              ball.vx = 0;
              ball.still = true;
            }
          }
        }
      }

      // Dog
      const mouth = mouthOffset(pose);
      const mouthX = dog.x + dog.dir * mouth.x;
      const mouthY = ground + dog.y + mouth.y;
      const runTo = (target: number, top: number) => {
        const dx = target - dog.x;
        if (Math.abs(dx) > 2) dog.dir = Math.sign(dx);
        const want = Math.min(top, Math.abs(dx) * 4);
        dog.speed += (want - dog.speed) * Math.min(1, dt * 5);
        dog.x += Math.sign(dx) * Math.min(Math.abs(dx), dog.speed * dt);
        dog.x = Math.max(30, Math.min(w - 30, dog.x));
        return Math.abs(dx);
      };

      if (dog.y < 0 || dog.vy < 0) {
        dog.vy += GRAVITY * dt;
        dog.y = Math.min(0, dog.y + dog.vy * dt);
        if (dog.y === 0) dog.vy = 0;
      }

      switch (dog.mode) {
        case "waiting": {
          dog.speed *= Math.pow(0.01, dt);
          dog.idle += dt;
          if (ball.held || (free() && !ball.still)) dog.dir = ball.x > dog.x ? 1 : -1;
          // A ball left lying far off is fair game
          if (free() && ball.still && Math.abs(ball.x - dog.x) > 120 && dog.idle > 1.5) dog.mode = "chasing";
          if (dog.idle > 9 && Math.random() < dt * 0.25) say("woof?");
          break;
        }
        case "chasing": {
          if (!free()) {
            dog.mode = "waiting";
            break;
          }
          // Run to where the ball is, a step ahead of it
          const lead = ball.still ? 0 : ball.vx * 0.15;
          runTo(ball.x - dog.dir * (mouth.x - 4) + lead, RUN);
          // A ball sailing past at head height: leap for it
          const airborne = ball.y < ground - R - 4;
          if (airborne && dog.y === 0 && Math.abs(ball.x - mouthX) < 46 && ground - ball.y > 30 && ground - ball.y < 150 && ball.vy > -200) {
            dog.vy = -Math.sqrt(2 * GRAVITY * Math.max(10, ground - ball.y - 50));
          }
          // Caught in the air at the mouth, or lying under its nose
          const caught = airborne ? Math.hypot(ball.x - mouthX, ball.y - mouthY) < 20 : Math.abs(ball.x - mouthX) < 16 && dog.y === 0;
          if (caught) {
            // Caught it (in the air, or scooped off the ground)
            ball.mouth = true;
            if (airborne) {
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
          const home = Math.max(70, Math.min(w - 70, you));
          if (runTo(home, TROT) < 8 && dog.y === 0) {
            // Drop it at your feet
            ball.mouth = false;
            ball.x = Math.max(R, Math.min(w - R, dog.x + dog.dir * 44));
            ball.y = ground - R;
            ball.vx = dog.dir * 30;
            ball.vy = -120;
            ball.still = false;
            fetches++;
            if (fetches % 3 === 0) say(fetches % 6 === 0 ? "again!" : "woof!");
            dog.mode = "waiting";
            dog.idle = 0;
          }
          break;
        }
      }

      // Pose follows what it's doing
      const moving = dog.speed > 25 && dog.mode !== "waiting" && dog.mode !== "picking";
      pose.moving = moving;
      pose.air = dog.y < -2;
      pose.run += dt * dog.speed * 0.055;
      pose.sit += ((dog.mode === "waiting" && !ball.held ? 1 : 0) - pose.sit) * Math.min(1, dt * 4);
      pose.crouch += ((ball.held ? 1 : 0) - pose.crouch) * Math.min(1, dt * 6);
      pose.wag += dt * (ball.held || dog.mode === "returning" ? 22 : dog.mode === "waiting" ? 9 : 14);
      pose.tilt = dog.mode === "picking" ? 0.5 : dog.mode === "waiting" && dog.idle > 6 ? Math.sin(now / 900) * 0.18 : 0;
      pose.ball = ball.mouth;
      pose.blink = now % 3800 < 140;
    };

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      step(dt, now);
      ctx.clearRect(0, 0, w, h);
      const fg = themeColor("--fg");

      // Shadows on the grass
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(dog.x, ground + 2, 30 * (1 + dog.y / 300), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!ball.mouth) {
        const height = Math.max(0, ground - R - ball.y);
        ctx.beginPath();
        ctx.ellipse(ball.x, ground + 1, Math.max(3, 9 - height / 30), 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // The dog
      ctx.save();
      ctx.translate(dog.x, ground + dog.y);
      ctx.scale(dog.dir * 1.15, 1.15);
      drawDog(ctx, pose, themeColor("--accent"));
      ctx.restore();

      // The ball, with a seam so you can see it spin
      if (!ball.mouth) {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.x / R);
        ctx.fillStyle = BALL;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-R * 0.9, 0, R * 0.75, -0.9, 0.9);
        ctx.arc(R * 0.9, 0, R * 0.75, Math.PI - 0.9, Math.PI + 0.9);
        ctx.stroke();
        ctx.restore();
      }

      // Speech bubble
      if (now < bubble.until) {
        const bx = dog.x + dog.dir * 18;
        const by = ground + dog.y - 92;
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        const tw = ctx.measureText(bubble.text).width;
        ctx.fillStyle = themeColor("--bg", 0.9);
        ctx.beginPath();
        ctx.roundRect(bx - tw / 2 - 8, by - 15, tw + 16, 24, 12);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.textAlign = "center";
        ctx.fillText(bubble.text, bx, by + 2);
      }

      // How to play (until the first throw), and the tally
      ctx.textAlign = "center";
      ctx.font = "11px ui-monospace, monospace";
      if (!thrown) {
        ctx.fillStyle = themeColor("--fg", 0.6);
        ctx.fillText("DRAG THE BALL AND LET GO · OR TAP WHERE TO THROW", w / 2, ground - 150);
      }
      if (fetches) {
        ctx.textAlign = "right";
        ctx.fillStyle = themeColor("--fg", 0.5);
        ctx.fillText(`${fetches} ${fetches === 1 ? "FETCH" : "FETCHES"}`, w - 24, 34);
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerup", onUp);
    addEventListener("touchmove", onTouch, { passive: false });
    addEventListener("resize", resize);
    const onVisible = () => (last = performance.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("touchmove", onTouch);
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <canvas ref={canvas} role="img" aria-label="A dog in a park, waiting for you to throw the ball" className="pointer-events-none fixed inset-0 z-[35] h-full w-full touch-none" />;
}
