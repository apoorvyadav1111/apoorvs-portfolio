"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { Shape } from "./signal/shapes";
import type { Field } from "./signal/field";

// The Signal theme's moving part (src/themes/signal.ts): the point cloud
// behind the page (./signal/field.ts). This file is all that loads with the
// other themes; the rest is fetched the first time Signal is switched on.
//
// Which shape the cloud takes: on the home page, the section nearest the
// middle of the screen says so with `data-signal="<shape>"`; elsewhere it
// goes by the page (SHAPE_BY_PAGE). Doodles have the screen to themselves.
// On the home page the intro (./signal/Intro.tsx) comes first: while it's on
// screen, the scroll drives the cloud centre stage, and the page is marked
// `data-intro` (the header steps aside).

const SHAPE_BY_PAGE: [RegExp, Shape][] = [
  [/^\/photos/, "globe"],
  [/^\/blog/, "book"],
  [/^\/reading/, "pages"],
  [/^\/doodles/, "paw"],
];

// The fastest the intro moves on, in steps per second, however fast the
// scroll: a fling still plays every shape through instead of skipping
const MAX_STEPS_PER_S = 0.9;

function pageShape(path: string): Shape {
  return SHAPE_BY_PAGE.find(([re]) => re.test(path))?.[1] ?? "orb";
}

export default function Signal() {
  const fieldCanvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<Field | null>(null);
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;

  // The intro, if it's on this page and showing, and how far through it the
  // scroll is: `x` runs 0 → steps − 1, a whole number at each shape
  const introAt = () => {
    const intro = document.querySelector<HTMLElement>(".signal-intro");
    if (!intro || intro.offsetHeight === 0) return null;
    const r = intro.getBoundingClientRect();
    if (r.bottom < innerHeight * 0.5) return null; // scrolled past: the site has the screen
    const steps: Shape[] = JSON.parse(intro.dataset.steps ?? "[]");
    const through = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    return { intro, steps, x: through * (steps.length - 1) };
  };

  // The section nearest the middle of the screen, or the page's own shape
  const pick = useRef<() => Shape>(() => "orb");
  pick.current = () => {
    const sections = [...document.querySelectorAll<HTMLElement>("main [data-signal]")];
    if (!sections.length) return pageShape(path.current);
    const mid = innerHeight * 0.5;
    let best: HTMLElement = sections[0];
    let bestDist = Infinity;
    sections.forEach((s) => {
      const r = s.getBoundingClientRect();
      const dist = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    });
    return best.dataset.signal as Shape;
  };

  // Points the cloud at wherever the visitor is: in the intro, the scroll
  // drives it between two shapes, holding each for a while (the morph runs
  // from 25% to 85% of the way between them) and fading in its caption;
  // elsewhere it morphs to the section's shape by itself
  const update = useRef(() => {});
  // Where the intro is showing (trailing the scroll when it's quick), and a
  // frame queued to keep catching up
  const shown = useRef<{ x: number; at: number } | null>(null);
  const chase = useRef(0);
  update.current = () => {
    const root = document.documentElement;
    const at = root.dataset.palette === "signal" ? introAt() : null;
    if (at) {
      root.dataset.intro = "";
      const { intro, steps } = at;
      const now = performance.now();
      const was = shown.current;
      let x = at.x;
      if (was && root.hasAttribute("data-motion")) {
        const dt = Math.min(0.05, (now - was.at) / 1000);
        const gap = at.x - was.x;
        // ease in when near, never faster than the limit
        const step = Math.sign(gap) * Math.min(Math.abs(gap), Math.max(Math.abs(gap) * 0.2, 0.02), MAX_STEPS_PER_S * dt);
        x = Math.abs(gap) < 0.002 ? at.x : was.x + step;
      }
      shown.current = { x, at: now };
      cancelAnimationFrame(chase.current);
      if (x !== at.x) chase.current = requestAnimationFrame(() => update.current());
      const seg = Math.min(Math.floor(x), steps.length - 2);
      const f = (x - seg - 0.25) / 0.6;
      const c = Math.min(1, Math.max(0, f));
      field.current?.scrub(steps[seg], steps[seg + 1], c * c * (3 - 2 * c));
      intro.querySelectorAll<HTMLElement>("[data-caption]").forEach((el) => {
        const off = Math.abs(x - Number(el.dataset.caption));
        el.style.opacity = String(Math.min(1, Math.max(0, 1 - (off - 0.12) * 4)));
      });
    } else {
      shown.current = null;
      delete root.dataset.intro;
      field.current?.show(pick.current(), false);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    let starting = false;
    let alive = true;

    const motionOn = () => root.hasAttribute("data-motion");
    const sync = async () => {
      const on = root.dataset.palette === "signal";
      if (!on) {
        delete root.dataset.intro;
        field.current?.stop();
        field.current = null;
        return;
      }
      if (field.current) {
        field.current.setMotion(motionOn());
        update.current();
      } else if (!starting) {
        starting = true;
        const { startField } = await import("./signal/field");
        starting = false;
        if (!alive || root.dataset.palette !== "signal" || field.current) return;
        const at = introAt();
        field.current = at ? startField(fieldCanvas.current!, at.steps[0], true, motionOn()) : startField(fieldCanvas.current!, pick.current(), false, motionOn());
        update.current();
      }
    };
    sync();
    const watcher = new MutationObserver(sync);
    watcher.observe(root, { attributes: true, attributeFilter: ["data-palette", "data-motion"] });

    let queued = 0;
    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        update.current();
      });
    };
    addEventListener("scroll", onScroll, { passive: true });

    return () => {
      alive = false;
      watcher.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(queued);
      cancelAnimationFrame(chase.current);
      field.current?.stop();
      field.current = null;
      delete root.dataset.intro;
    };
  }, []);

  // A new page: its own shape (wait a frame for its sections to mount)
  useEffect(() => {
    const id = requestAnimationFrame(() => update.current());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return <canvas ref={fieldCanvas} aria-hidden className="signal-field pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
